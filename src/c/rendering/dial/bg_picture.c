#include <pebble.h>
#ifndef PBL_BW
#include "./bg_picture.h"

bool bg_picture_draw(GContext *ctx, GRect bounds, BgPicture pic) {
  int16_t y = bounds.origin.y;
  bool first = true;
  graphics_context_set_compositing_mode(ctx, GCompOpSet);
  for (int i = 0; i < BG_PICTURE_MAX_PARTS && pic.id[i]; i++) {
    GBitmap *bm = gbitmap_create_with_resource(pic.id[i]);
    if (!bm) {
      APP_LOG(APP_LOG_LEVEL_WARNING, "bg picture part %d: no memory (heap free %u, used %u)", i,
              (unsigned)heap_bytes_free(), (unsigned)heap_bytes_used());
      return false;
    }
    const GRect b = gbitmap_get_bounds(bm);
    if (first) {
      // Parts are equal bands (the last one at most a row shorter), so the whole picture is
      // about 2 x the first band tall when it has two parts; a full-size picture needs no shift.
      const int16_t total = (pic.id[1] ? (int16_t)(2 * b.size.h) : b.size.h);
      y = bounds.origin.y + (bounds.size.h - total) / 2;
      first = false;
    }
    graphics_draw_bitmap_in_rect(ctx, bm, GRect(bounds.origin.x + (bounds.size.w - b.size.w) / 2, y, b.size.w, b.size.h));
    y += b.size.h;
    gbitmap_destroy(bm); // before the next band is decoded
  }
  return true;
}
#endif // !PBL_BW
