// Pure helpers for the custom-background image format shared with the
// settings page (config/config-background.js) and the watch
// (rendering/dial/bg_image_store.c):
//   64 colours, 6 bits per pixel (0bRRGGBB), row-major 200x228, packed
//   4 pixels -> 3 bytes, stored/transported as base64url without padding.

var BG_W = 200;
var BG_H = 228;
var PACKED_BYTES = ((BG_W * BG_H + 3) >> 2) * 3; // 34200
var SLOT_CHARS = Math.ceil(PACKED_BYTES * 4 / 3); // 45600
var SLOT_RE = /^[A-Za-z0-9_-]+$/;

var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
var LOOKUP = (function () {
  var t = {};
  for (var i = 0; i < ALPHABET.length; i++) t[ALPHABET.charAt(i)] = i;
  return t;
})();

// Returns an array of byte values, or null if the string is not valid base64url.
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

// A stored slot is valid when it decodes to exactly one full image.
function isValidSlot(str) {
  return typeof str === 'string' && str.length === SLOT_CHARS && SLOT_RE.test(str);
}

// FNV-1a over the slot's characters; never 0 (0 means "no image" on the watch).
function stampFor(str) {
  var h = 0x811C9DC5;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  h = h >>> 0;
  return h === 0 ? 1 : h;
}

module.exports = {
  BG_W: BG_W,
  BG_H: BG_H,
  PACKED_BYTES: PACKED_BYTES,
  SLOT_CHARS: SLOT_CHARS,
  b64urlDecode: b64urlDecode,
  isValidSlot: isValidSlot,
  stampFor: stampFor
};
