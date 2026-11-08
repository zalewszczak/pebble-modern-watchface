'use strict';
// Minimal PNG decoder/encoder (8-bit, non-interlaced) using only Node built-ins.
// decode() returns { width, height, data } with data as RGBA bytes (Buffer, 4 per pixel).
var zlib = require('zlib');

var SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

var CRC_TABLE = (function () {
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  return t;
})();

function crc32(buf) {
  var c = 0xffffffff;
  for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  var td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function paeth(a, b, c) {
  var p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
}

function decode(buf) {
  if (buf.length < 8 || !buf.slice(0, 8).equals(SIG)) throw new Error('not a PNG file');
  var pos = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  var idat = [], plte = null, trns = null;
  while (pos + 8 <= buf.length) {
    var len = buf.readUInt32BE(pos);
    var type = buf.toString('ascii', pos + 4, pos + 8);
    var data = buf.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
  }
  if (!w || !h) throw new Error('PNG has no IHDR');
  if (interlace) throw new Error('interlaced PNG is not supported');
  if (depth !== 8 && !(ctype === 3 && depth <= 8)) throw new Error('unsupported PNG bit depth ' + depth + ' (colour type ' + ctype + ')');
  var chans = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ctype];
  if (!chans) throw new Error('unsupported PNG colour type ' + ctype);
  var bitsPerPixel = chans * depth;
  var bpp = Math.max(1, bitsPerPixel >> 3);
  var stride = Math.ceil(w * bitsPerPixel / 8);
  var raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * h) throw new Error('PNG data is truncated');
  var cur = Buffer.alloc(stride * h);
  for (var y = 0; y < h; y++) {
    var ft = raw[y * (stride + 1)];
    var src = y * (stride + 1) + 1, dst = y * stride;
    for (var x = 0; x < stride; x++) {
      var a = x >= bpp ? cur[dst + x - bpp] : 0;
      var b = y > 0 ? cur[dst - stride + x] : 0;
      var c = (x >= bpp && y > 0) ? cur[dst - stride + x - bpp] : 0;
      var v = raw[src + x];
      switch (ft) {
        case 0: break;
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: v += paeth(a, b, c); break;
        default: throw new Error('bad PNG filter ' + ft);
      }
      cur[dst + x] = v & 255;
    }
  }
  var out = Buffer.alloc(w * h * 4);
  for (var yy = 0; yy < h; yy++) {
    for (var xx = 0; xx < w; xx++) {
      var o = (yy * w + xx) * 4, r, g, bl, al = 255;
      if (ctype === 6) { var i6 = yy * stride + xx * 4; r = cur[i6]; g = cur[i6 + 1]; bl = cur[i6 + 2]; al = cur[i6 + 3]; }
      else if (ctype === 2) { var i2 = yy * stride + xx * 3; r = cur[i2]; g = cur[i2 + 1]; bl = cur[i2 + 2]; }
      else if (ctype === 0) { r = g = bl = cur[yy * stride + xx]; }
      else if (ctype === 4) { var i4 = yy * stride + xx * 2; r = g = bl = cur[i4]; al = cur[i4 + 1]; }
      else {
        var idx;
        if (depth === 8) idx = cur[yy * stride + xx];
        else { var bit = xx * depth; idx = (cur[yy * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1); }
        if (!plte) throw new Error('palette PNG without PLTE');
        r = plte[idx * 3]; g = plte[idx * 3 + 1]; bl = plte[idx * 3 + 2];
        if (trns && idx < trns.length) al = trns[idx];
      }
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
  }
  return { width: w, height: h, data: out };
}

function encode(img) {
  var w = img.width, h = img.height, d = img.data;
  var raw = Buffer.alloc((w * 4 + 1) * h);
  for (var y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    d.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { decode: decode, encode: encode, crc32: crc32 };
