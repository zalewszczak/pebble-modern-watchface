// Packs an opaque RGB color into Pebble's one-byte GColor8 format.
// Each channel is truncated to its two most significant bits.
function packGColorByte(r, g, b) {
  var a2 = 3;
  var r2 = (r >> 6) & 0x03;
  var g2 = (g >> 6) & 0x03;
  var b2 = (b >> 6) & 0x03;
  return (a2 << 6) | (r2 << 4) | (g2 << 2) | b2;
}

module.exports = {
  packGColorByte: packGColorByte
};
