// Plugin background images: everything that happens to a picture between the
// plugin (Pebble.subscribeToSource, shape "image") and the packed bytes that go
// to the watch. The watch never sees any of the style settings -- it receives a
// finished 64-colour picture, exactly like an uploaded one.
//
// Pure ES5 with no PKJS/DOM dependencies, so it can be exercised from Node.
//
// Pipeline:  plugin payload { pixels, palette, width, height }
//   -> decodeImagePayload()   RGBA pixels
//   -> render(img, opts)      fit (scale/crop) -> colour processing -> dither
//                             -> 6-bit pixels -> packed bytes
//
// Output format = the format of the uploaded images (see bg-image-codec.js):
// 6 bits per pixel (0bRRGGBB), row-major, 4 pixels -> 3 bytes. Unlike uploaded
// images the size is NOT always 200x228: modes that leave part of the screen
// empty ("show full image", 75 %, 50 %, original size) send only the picture
// itself, and the watch centres it -- the rest of the dial keeps its plain
// background colour, and less data goes over Bluetooth.
//
// Options (all strings, the values the settings page stores):
//   dither  none | fs | atkinson | bayer4 | bayer8
//   color   neutral | vivid | bw | sepia
//   fit     fill | full | 75 | 50 | center
//
// The colour and dither maths is the same as the editor for uploaded images
// (config/config-background.js, CLIENT_BODY): keep the two in step.

var SCREEN_W = 200;
var SCREEN_H = 228;

var DITHERS = ['none', 'fs', 'atkinson', 'bayer4', 'bayer8'];
var COLORS = ['neutral', 'vivid', 'bw', 'sepia'];
var FITS = ['fill', 'full', '75', '50', 'center'];
var DEFAULT_OPTIONS = { dither: 'fs', color: 'neutral', fit: 'fill' };

// ---- typed-array helpers (plain arrays if the engine has none) -------------------

function newFloats(n) {
  if (typeof Float32Array !== 'undefined') return new Float32Array(n);
  var a = new Array(n);
  for (var i = 0; i < n; i++) a[i] = 0;
  return a;
}
function newBytes(n) {
  if (typeof Uint8Array !== 'undefined') return new Uint8Array(n);
  var a = new Array(n);
  for (var i = 0; i < n; i++) a[i] = 0;
  return a;
}

// ---- base64 ------------------------------------------------------------------------

var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
var B64_REV = (function () {
  var t = {};
  for (var i = 0; i < B64.length; i++) t[B64.charAt(i)] = i;
  t['-'] = 62; // base64url
  t['_'] = 63;
  return t;
})();

// Standard or URL-safe base64, padded or not, whitespace and a data: prefix
// tolerated. Returns an array of byte values, or null when it is not base64.
function base64Decode(str) {
  if (typeof str !== 'string') return null;
  var comma = str.indexOf('base64,');
  if (comma >= 0) str = str.slice(comma + 7);
  var out = [];
  var acc = 0, bits = 0;
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (ch === '=' || ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') continue;
    var v = B64_REV[ch];
    if (v === undefined) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xFF);
      acc &= (1 << bits) - 1;
    }
  }
  return out;
}

// ---- plugin payload -> RGBA -----------------------------------------------------------

function level(v) { return (v & 3) * 85; }

// Pebble's own 8-bit colour: 0bAARRGGBB, two bits per channel.
function fromGColor8(b) {
  return [level(b >> 4), level(b >> 2), level(b), level(b >> 6)];
}

function parseHexColor(s) {
  var m = /^#?([0-9a-fA-F]{3,8})$/.exec(String(s).replace(/^0x/i, ''));
  if (!m) return null;
  var h = m[1];
  if (h.length === 3 || h.length === 4) {
    var e = '';
    for (var i = 0; i < h.length; i++) e += h.charAt(i) + h.charAt(i);
    h = e;
  }
  if (h.length === 6) return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), 255];
  if (h.length === 8) return [parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16), parseInt(h.substr(6, 2), 16), parseInt(h.substr(0, 2), 16)]; // AARRGGBB
  return null;
}

function paletteFromBytes(bytes) {
  var n = bytes.length, out = [], i;
  if (n <= 16 || (n !== 48 && n !== 64 && n % 4 !== 0 && n % 3 !== 0)) {
    for (i = 0; i < n; i++) out.push(fromGColor8(bytes[i])); // one GColor8 per entry
  } else if (n === 48 || (n % 4 !== 0 && n % 3 === 0)) {
    for (i = 0; i + 2 < n; i += 3) out.push([bytes[i], bytes[i + 1], bytes[i + 2], 255]); // RGB
  } else {
    for (i = 0; i + 3 < n; i += 4) out.push([bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]]); // RGBA
  }
  return out;
}

// The palette is not specified in Pebble's documentation, so accept the forms it
// could reasonably take: an array of "#rrggbb" / "#aarrggbb" strings, 0xRRGGBB /
// 0xAARRGGBB numbers (or 0..255 numbers = GColor8), [r,g,b(,a)] arrays or
// {r,g,b,a} objects; or a base64 string of GColor8 / RGB / RGBA bytes.
// Returns [[r,g,b,a], ...] or null.
function parsePalette(p) {
  if (typeof p === 'string') {
    var bytes = base64Decode(p);
    return bytes && bytes.length ? paletteFromBytes(bytes) : null;
  }
  if (!p || typeof p.length !== 'number') return null;
  var allSmall = p.length > 0, i;
  for (i = 0; i < p.length; i++) if (typeof p[i] !== 'number' || p[i] < 0 || p[i] > 255) { allSmall = false; break; }
  if (allSmall && p.length <= 16) return paletteFromBytes([].slice.call(p));
  var out = [];
  for (i = 0; i < p.length; i++) {
    var e = p[i], c = null;
    if (typeof e === 'string') c = parseHexColor(e);
    else if (typeof e === 'number') {
      c = e > 0xFFFFFF ? [(e >>> 16) & 255, (e >>> 8) & 255, e & 255, (e >>> 24) & 255] : [(e >> 16) & 255, (e >> 8) & 255, e & 255, 255];
    } else if (e && typeof e.length === 'number' && e.length >= 3) {
      c = [e[0] | 0, e[1] | 0, e[2] | 0, e.length > 3 ? e[3] | 0 : 255];
    } else if (e && typeof e === 'object') {
      var r = e.r !== undefined ? e.r : e.red, g = e.g !== undefined ? e.g : e.green, b = e.b !== undefined ? e.b : e.blue;
      var a = e.a !== undefined ? e.a : (e.alpha !== undefined ? e.alpha : 255);
      if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') c = [r | 0, g | 0, b | 0, a | 0];
    }
    if (!c) return null;
    out.push(c);
  }
  return out.length ? out : null;
}

// Pixels: base64 of 4-bit palette indices, two per byte, FIRST pixel in the HIGH
// nibble (Pebble's own bitmap layout). Rows are either tight (ceil(w/2) bytes),
// padded (e.g. to a multiple of 4 bytes, as Pebble bitmaps are) or not padded
// at all; the row stride is worked out from the data length.
var HIGH_NIBBLE_FIRST = true;

// { pixels, palette, width, height } -> { w, h, rgba, signature } or null.
function decodeImagePayload(img) {
  if (!img || typeof img !== 'object') return null;
  var w = parseInt(img.width !== undefined ? img.width : img.w, 10);
  var h = parseInt(img.height !== undefined ? img.height : img.h, 10);
  if (!(w > 0 && h > 0) || w * h > 1024 * 1024) return null;
  var bytes = base64Decode(img.pixels);
  var palette = parsePalette(img.palette);
  if (!bytes || !bytes.length || !palette) return null;

  var tight = (w + 1) >> 1;
  var stride = Math.floor(bytes.length / h);
  var continuous = stride < tight; // odd widths packed without any row padding
  if (continuous && bytes.length < Math.ceil(w * h / 2)) return null;
  var rgba = newBytes(w * h * 4);
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      var idx = continuous ? y * w + x : y * stride * 2 + x; // pixel number in nibbles
      var b = bytes[idx >> 1];
      var nib = ((idx & 1) === 0) === HIGH_NIBBLE_FIRST ? (b >> 4) & 15 : b & 15;
      var c = palette[nib < palette.length ? nib : palette.length - 1];
      var p = (y * w + x) * 4;
      rgba[p] = c[0]; rgba[p + 1] = c[1]; rgba[p + 2] = c[2]; rgba[p + 3] = c[3];
    }
  }
  // Cheap identity of this exact picture: lets the caller skip identical updates.
  return { w: w, h: h, rgba: rgba, signature: w + 'x' + h + ':' + String(img.pixels).length + ':' + hashString(String(img.pixels)) + ':' + hashString(JSON.stringify(img.palette)) };
}

function hashString(s) {
  var h = 0x811C9DC5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return (h >>> 0).toString(16);
}

// ---- fitting ---------------------------------------------------------------------------

// Where the picture goes. src: the part of the source to use (can be a centred
// crop), dw x dh: the size of the picture that is sent (the watch centres it).
function planFit(sw, sh, fit) {
  var W = SCREEN_W, H = SCREEN_H;
  var contain = Math.min(W / sw, H / sh);
  var s;
  if (fit === 'fill') {
    s = Math.max(W / sw, H / sh);
    return { src: { x: (sw - W / s) / 2, y: (sh - H / s) / 2, w: W / s, h: H / s }, dw: W, dh: H };
  }
  if (fit === 'center') {
    var cw = Math.min(sw, W), ch = Math.min(sh, H);
    return { src: { x: (sw - cw) / 2, y: (sh - ch) / 2, w: cw, h: ch }, dw: cw, dh: ch };
  }
  s = fit === '75' ? contain * 0.75 : (fit === '50' ? contain * 0.5 : contain); // 'full' and fallback
  return {
    src: { x: 0, y: 0, w: sw, h: sh },
    dw: Math.max(1, Math.min(W, Math.round(sw * s))),
    dh: Math.max(1, Math.min(H, Math.round(sh * s)))
  };
}

// Weights for one axis: for every destination index, which source indices count and how much.
// Shrinking = area average (box filter with fractional edges); enlarging = linear interpolation.
function axisWeights(srcStart, srcLen, dstLen, srcSize) {
  var out = [];
  var ratio = srcLen / dstLen;
  for (var d = 0; d < dstLen; d++) {
    var idx = [], wt = [], sum = 0, i;
    if (ratio > 1) {
      var a = srcStart + d * ratio, b = a + ratio;
      var i0 = Math.max(0, Math.floor(a)), i1 = Math.min(srcSize, Math.ceil(b));
      for (i = i0; i < i1; i++) {
        var ov = Math.min(b, i + 1) - Math.max(a, i);
        if (ov > 0) { idx.push(i); wt.push(ov); sum += ov; }
      }
    } else {
      var pos = srcStart + (d + 0.5) * ratio - 0.5;
      var lo = Math.floor(pos), f = pos - lo;
      var l0 = Math.min(srcSize - 1, Math.max(0, lo)), l1 = Math.min(srcSize - 1, Math.max(0, lo + 1));
      idx.push(l0); wt.push(1 - f);
      if (l1 !== l0 && f > 0) { idx.push(l1); wt.push(f); }
      sum = 1 - f + (l1 !== l0 && f > 0 ? f : 0);
    }
    if (!idx.length) { idx.push(Math.min(srcSize - 1, Math.max(0, Math.floor(srcStart + d * ratio)))); wt.push(1); sum = 1; }
    for (i = 0; i < wt.length; i++) wt[i] /= sum;
    out.push({ idx: idx, wt: wt });
  }
  return out;
}

// RGBA source -> float RGB (alpha composited over black) of dw x dh.
function resample(img, plan) {
  var sw = img.w, sh = img.h, rgba = img.rgba;
  var dw = plan.dw, dh = plan.dh;
  var wx = axisWeights(plan.src.x, plan.src.w, dw, sw);
  var wy = axisWeights(plan.src.y, plan.src.h, dh, sh);
  // Horizontal pass: only the source rows that are needed.
  var rows = {};
  var out = newFloats(dw * dh * 3);
  var x, y, k, c;
  function rowOf(sy) {
    if (rows[sy]) return rows[sy];
    var r = newFloats(dw * 3);
    for (var dx = 0; dx < dw; dx++) {
      var e = wx[dx], rr = 0, gg = 0, bb = 0;
      for (var j = 0; j < e.idx.length; j++) {
        var p = (sy * sw + e.idx[j]) * 4;
        var a = rgba[p + 3] / 255, wgt = e.wt[j];
        rr += rgba[p] * a * wgt; gg += rgba[p + 1] * a * wgt; bb += rgba[p + 2] * a * wgt;
      }
      r[dx * 3] = rr; r[dx * 3 + 1] = gg; r[dx * 3 + 2] = bb;
    }
    rows[sy] = r;
    return r;
  }
  for (y = 0; y < dh; y++) {
    var ey = wy[y];
    for (k = 0; k < ey.idx.length; k++) {
      var r = rowOf(ey.idx[k]), wg = ey.wt[k];
      for (x = 0; x < dw * 3; x++) out[y * dw * 3 + x] += r[x] * wg;
    }
    // Rows are visited top to bottom; drop the ones no later row can need.
    var firstNeeded = y + 1 < dh ? wy[y + 1].idx[0] : 0;
    for (var key in rows) if (rows.hasOwnProperty(key) && parseInt(key, 10) < firstNeeded) delete rows[key];
  }
  for (c = 0; c < out.length; c++) out[c] = out[c] < 0 ? 0 : (out[c] > 255 ? 255 : out[c]);
  return out;
}

// ---- colour, dither (same maths as the uploaded-image editor) ---------------------------

function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

function applyColor(f, n, style) {
  if (style !== 'bw' && style !== 'sepia' && style !== 'vivid') return;
  for (var i = 0; i < n; i++) {
    var q = i * 3;
    var r = f[q], g = f[q + 1], b = f[q + 2];
    if (style === 'bw') {
      r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;
    } else if (style === 'sepia') {
      var r2 = 0.393 * r + 0.769 * g + 0.189 * b;
      var g2 = 0.349 * r + 0.686 * g + 0.168 * b;
      var b2 = 0.272 * r + 0.534 * g + 0.131 * b;
      r = r2; g = g2; b = b2;
    } else {
      var y = 0.299 * r + 0.587 * g + 0.114 * b;
      r = (y + (r - y) * 1.5 - 128) * 1.1 + 128;
      g = (y + (g - y) * 1.5 - 128) * 1.1 + 128;
      b = (y + (b - y) * 1.5 - 128) * 1.1 + 128;
    }
    f[q] = clamp255(r); f[q + 1] = clamp255(g); f[q + 2] = clamp255(b);
  }
}

function bayerMatrix(n) {
  if (n === 2) return [0, 2, 3, 1];
  var h = n / 2;
  var s = bayerMatrix(h);
  var m = new Array(n * n);
  for (var y = 0; y < n; y++) {
    for (var x = 0; x < n; x++) {
      m[y * n + x] = 4 * s[(y % h) * h + (x % h)] + [0, 2, 3, 1][(y >= h ? 2 : 0) + (x >= h ? 1 : 0)];
    }
  }
  return m;
}

function levelOf(v) {
  var l = Math.floor(v / 85 + 0.5);
  return l < 0 ? 0 : (l > 3 ? 3 : l);
}

// Float RGB (0-255) -> 6-bit pixel values, 4 levels per channel.
function quantize(f, w, h, mode) {
  var n = w * h;
  var vals = newBytes(n);
  var i, c, x, y;
  if (mode === 'fs' || mode === 'atkinson') {
    var wk = newFloats(f.length);
    for (i = 0; i < f.length; i++) wk[i] = f[i];
    var fs = mode === 'fs';
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = y * w + x;
        var lv = [0, 0, 0];
        for (c = 0; c < 3; c++) {
          var old = wk[i * 3 + c];
          var l = levelOf(old);
          lv[c] = l;
          var err = old - l * 85;
          if (fs) {
            if (x + 1 < w) wk[(i + 1) * 3 + c] += err * 7 / 16;
            if (y + 1 < h) {
              if (x > 0) wk[(i + w - 1) * 3 + c] += err * 3 / 16;
              wk[(i + w) * 3 + c] += err * 5 / 16;
              if (x + 1 < w) wk[(i + w + 1) * 3 + c] += err / 16;
            }
          } else {
            var e8 = err / 8;
            if (x + 1 < w) wk[(i + 1) * 3 + c] += e8;
            if (x + 2 < w) wk[(i + 2) * 3 + c] += e8;
            if (y + 1 < h) {
              if (x > 0) wk[(i + w - 1) * 3 + c] += e8;
              wk[(i + w) * 3 + c] += e8;
              if (x + 1 < w) wk[(i + w + 1) * 3 + c] += e8;
            }
            if (y + 2 < h) wk[(i + 2 * w) * 3 + c] += e8;
          }
        }
        vals[i] = (lv[0] << 4) | (lv[1] << 2) | lv[2];
      }
    }
    return vals;
  }
  var bn = mode === 'bayer8' ? 8 : (mode === 'bayer4' ? 4 : 0);
  var bm = bn ? bayerMatrix(bn) : null;
  for (y = 0; y < h; y++) {
    for (x = 0; x < w; x++) {
      i = y * w + x;
      var t = bm ? ((bm[(y % bn) * bn + (x % bn)] + 0.5) / (bn * bn) - 0.5) * 85 : 0;
      vals[i] = (levelOf(f[i * 3] + t) << 4) | (levelOf(f[i * 3 + 1] + t) << 2) | levelOf(f[i * 3 + 2] + t);
    }
  }
  return vals;
}

// 6-bit values -> packed bytes, 4 pixels -> 3 bytes (bg-image-codec.js).
function pack(vals) {
  var n = vals.length;
  var out = new Array(Math.ceil(n / 4) * 3);
  for (var i = 0, o = 0; i < n; i += 4, o += 3) {
    var v0 = vals[i];
    var v1 = i + 1 < n ? vals[i + 1] : 0;
    var v2 = i + 2 < n ? vals[i + 2] : 0;
    var v3 = i + 3 < n ? vals[i + 3] : 0;
    out[o] = (v0 << 2) | (v1 >> 4);
    out[o + 1] = ((v1 & 15) << 4) | (v2 >> 2);
    out[o + 2] = ((v2 & 3) << 6) | v3;
  }
  return out;
}

// FNV-1a over the packed bytes and the size; never 0 (0 = "no image" on the watch).
function stampFor(bytes, w, h) {
  var hash = 0x811C9DC5;
  function mix(b) {
    hash ^= b & 0xFF;
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  mix(w); mix(w >> 8); mix(h); mix(h >> 8);
  for (var i = 0; i < bytes.length; i++) mix(bytes[i]);
  hash = hash >>> 0;
  return hash === 0 ? 1 : hash;
}

function pick(list, value, fallback) { return list.indexOf(value) >= 0 ? value : fallback; }

// Decoded plugin image + options -> { w, h, bytes, stamp, vals } ready for the watch.
function render(img, options) {
  var o = options || {};
  var dither = pick(DITHERS, String(o.dither), DEFAULT_OPTIONS.dither);
  var color = pick(COLORS, String(o.color), DEFAULT_OPTIONS.color);
  var fit = pick(FITS, String(o.fit), DEFAULT_OPTIONS.fit);
  var plan = planFit(img.w, img.h, fit);
  var f = resample(img, plan);
  applyColor(f, plan.dw * plan.dh, color);
  var vals = quantize(f, plan.dw, plan.dh, dither);
  var bytes = pack(vals);
  return { w: plan.dw, h: plan.dh, bytes: bytes, stamp: stampFor(bytes, plan.dw, plan.dh), vals: vals };
}

module.exports = {
  SCREEN_W: SCREEN_W,
  SCREEN_H: SCREEN_H,
  DITHERS: DITHERS,
  COLORS: COLORS,
  FITS: FITS,
  DEFAULT_OPTIONS: DEFAULT_OPTIONS,
  base64Decode: base64Decode,
  parsePalette: parsePalette,
  decodeImagePayload: decodeImagePayload,
  planFit: planFit,
  render: render,
  stampFor: stampFor
};
