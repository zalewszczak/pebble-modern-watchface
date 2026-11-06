#pragma once

#include <pebble.h>

// Pebble 2 Duo (flint) and Pebble 2 (diorite): 144x168, black and white (PBL_BW).
// Everything that differs between the colour watches (emery, gabbro) and the B&W ones lives
// behind PBL_BW, and the numbers that are only geometry live here, so there is one place to tune.
//
// Scale used for the B&W layout: 144/200 = 0.72, rounded to whole pixels (legacy_support.md, 6).

#ifdef PBL_BW

// ---- 1-bit frame buffer ---------------------------------------------------------------
// Rows are padded (use gbitmap_get_bytes_per_row()). The bit order of the SDK's 1-bit frame buffer
// is least significant bit = leftmost pixel. legacy_support.md lists this as unverified until it is
// run on the emulator: if the dial shows mirrored 8-pixel groups, set this to 0 and nothing else
// has to change.
#define BW_FB_LSB_FIRST 1

static inline uint8_t bw_fb_mask(int16_t x) {
  return BW_FB_LSB_FIRST ? (uint8_t)(1u << (x & 7)) : (uint8_t)(0x80u >> (x & 7));
}
static inline bool bw_fb_get(const uint8_t *data, uint16_t stride, int16_t x, int16_t y) {
  return (data[(int32_t)y * stride + (x >> 3)] & bw_fb_mask(x)) != 0;
}
static inline void bw_fb_put(uint8_t *data, uint16_t stride, int16_t x, int16_t y, bool white) {
  uint8_t *b = &data[(int32_t)y * stride + (x >> 3)];
  if (white) *b |= bw_fb_mask(x); else *b &= (uint8_t)~bw_fb_mask(x);
}
static inline void bw_fb_toggle(uint8_t *data, uint16_t stride, int16_t x, int16_t y) {
  data[(int32_t)y * stride + (x >> 3)] ^= bw_fb_mask(x);
}

// ---- colour -> black or white ---------------------------------------------------------
// Luminance threshold over the 2-bit channels (weights 3/6/1, range 0..30). The SDK's own
// conversion of mid greys on a 1-bit screen is not documented, so computed colours go through this.
static inline bool bw_color_is_white(GColor c) {
  int lum = ((c.argb >> 4) & 3) * 3 + ((c.argb >> 2) & 3) * 6 + (c.argb & 3);
  return lum > 15;
}
static inline GColor bw_color(GColor c) { return bw_color_is_white(c) ? GColorWhite : GColorBlack; }

// ---- geometry -------------------------------------------------------------------------
#define PL_CORNER_ROW_H 17            // text row height of a feature slot   (emery 24)
#define PL_CORNER_BOX_W 50            // width of a feature slot box          (emery 68)
#define PL_PILL_PAD 11                // horizontal padding of a "pill" slot  (emery 15)
#define PL_ICON_W 12                  // icon width in layout                 (emery 16)
#define PL_ICON_ROWS 9                // icon height used for vertical centring (emery 12)
#define PL_ICON_DRAW 12               // drawn size of every square icon      (emery 16)
#define PL_SUN_ICON_DRAW_W 15         // sunrise/sunset glyph width           (emery 20)
#define PL_SUN_ICON_ROWS 8            // sunrise/sunset glyph rows            (emery 10)
#define PL_ICON_TEXT_GAP 5            // gap between text and a following icon (emery 7)
#define PL_ICON_PX(n) (((n) * 3) / 4) // a pixel distance that scales with the icon size
#define PL_BITMAP_MARGIN_X(v) (((v) * 18) / 25)  // bitmap-marker margins: x 144/200 ...
#define PL_BITMAP_MARGIN_Y(v) (((v) * 37) / 50)  // ... y 168/228
#define PL_DEFAULT_UPPER_OFFSET 18    // custom-ring layout fallbacks (emery 24 / 20)
#define PL_DEFAULT_BOTTOM_SHIFT 15
// Feature items per slot: the wire format carries 10, the watch keeps the first 6 (RAM).
#define PL_PRIMITIVE_FEATURE_MAX 6

#else

#define PL_CORNER_ROW_H 24
#define PL_CORNER_BOX_W 68
#define PL_PILL_PAD 15
#define PL_ICON_W 16
#define PL_ICON_ROWS 12
#define PL_ICON_DRAW 16
#define PL_SUN_ICON_DRAW_W 20
#define PL_SUN_ICON_ROWS 10
#define PL_ICON_TEXT_GAP 7
#define PL_ICON_PX(n) (n)
#define PL_DEFAULT_UPPER_OFFSET 24
#define PL_DEFAULT_BOTTOM_SHIFT 20
#define PL_PRIMITIVE_FEATURE_MAX 10

#endif
