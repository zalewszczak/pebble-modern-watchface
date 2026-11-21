// Pure helpers for the custom-background image format shared with the
var platform = require('../platform');
var BG_W = platform.w;
var BG_H = platform.h;
var PACKED_BYTES = ((BG_W * BG_H + 3) >> 2) * 3;
var SLOT_CHARS = Math.ceil(PACKED_BYTES * 4 / 3);
var SLOT_RE = /^[A-Za-z0-9_-]+$/;

var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
var LOOKUP = (function () {
  var t = {};
  for (var i = 0; i < ALPHABET.length; i++) t[ALPHABET.charAt(i)] = i;
  return t;
})();

function b64urlDecode(str) {
  if (typeof str !== 'string' || !SLOT_RE.test(str)) return null;
  var out = [];
  var acc = 0, bits = 0;
  for (var i = 0; i < str.length; i++) {
    acc = (acc << 6) | LOOKUP[str.charAt(i)];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((acc >> bits) & 0xFF);
      acc &= (1 << bits) - 1;
    }
  }
  return out;
}

function isValidSlot(str) {
  return typeof str === 'string' && str.length === SLOT_CHARS && SLOT_RE.test(str);
}

function stampFor(str) {
  var h = 0x811C9DC5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h = h >>> 0;
  return h === 0 ? 1 : h;
}

// Mean perceived brightness (0-255) of a stored slot (6-bit pixels, 2 bits per channel, row-major). On the round
// watch only the inscribed circle counts (the bezel hides the corners). null for anything that is not a valid slot.
function slotLuma(str) {
  var bytes = isValidSlot(str) ? b64urlDecode(str) : null;
  if (!bytes) return null;
  var cx = BG_W / 2, cy = BG_H / 2, r2 = Math.min(cx, cy) * Math.min(cx, cy), round = platform.round;
  var sum = 0, n = 0, n_px = BG_W * BG_H;
  for (var i = 0; i < n_px; i++) {
    var o = (i >> 2) * 3, k = i & 3, b0 = bytes[o] || 0, b1 = bytes[o + 1] || 0, b2 = bytes[o + 2] || 0;
    var v = k === 0 ? (b0 >> 2) : (k === 1 ? (((b0 & 3) << 4) | (b1 >> 4)) : (k === 2 ? (((b1 & 15) << 2) | (b2 >> 6)) : (b2 & 63)));
    if (round) {
      var dx = (i % BG_W) + 0.5 - cx, dy = Math.floor(i / BG_W) + 0.5 - cy;
      if (dx * dx + dy * dy > r2) continue;
    }
    sum += 0.299 * (((v >> 4) & 3) * 85) + 0.587 * (((v >> 2) & 3) * 85) + 0.114 * ((v & 3) * 85);
    n++;
  }
  return n ? sum / n : null;
}

module.exports = {
  slotLuma: slotLuma,
  BG_W: BG_W,
  BG_H: BG_H,
  PACKED_BYTES: PACKED_BYTES,
  SLOT_CHARS: SLOT_CHARS,
  b64urlDecode: b64urlDecode,
  isValidSlot: isValidSlot,
  stampFor: stampFor
};
