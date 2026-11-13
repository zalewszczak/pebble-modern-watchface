#pragma once

#include <pebble.h>

#ifndef PBL_BW
// Row access to a captured 8-bit frame buffer. The round watch (gabbro) stores its frame buffer in
// the circular format whose rows differ in length and start, so pixels must be addressed through
// gbitmap_get_data_row_info: row.data[x] is valid for x in [min_x, max_x] (all rows of the plain
// 8-bit format cover the whole width).
typedef struct { uint8_t *data; int16_t min_x, max_x; } FbRow;

static inline bool fb_is_8bit(GBitmap *fb) {
  const GBitmapFormat f = gbitmap_get_format(fb);
  return f == GBitmapFormat8Bit || f == GBitmapFormat8BitCircular;
}

static inline FbRow fb_row8(GBitmap *fb, int16_t y) {
  const GBitmapDataRowInfo ri = gbitmap_get_data_row_info(fb, (uint16_t)y);
  return (FbRow){ ri.data, (int16_t)ri.min_x, (int16_t)ri.max_x };
}
#endif
