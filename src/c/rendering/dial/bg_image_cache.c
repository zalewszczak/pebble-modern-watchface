#include "./bg_image_cache.h"
#include "./bg_image_store.h"
#include "../../generated/background_presets.h"

uint32_t bg_image_signature(const WatchData *d) {
  if (d->custom_bg_mode == 1 && bg_preset_resource_id(d->custom_bg_preset) != 0) {
    return 0x10000u | d->custom_bg_preset;
  }
  if (d->custom_bg_mode == 2) {
    // 0x2... = "uploaded"; the slot's stamp is 0 while that slot is empty or
    // still being transferred, and changes when its image is replaced.
    return (bg_image_store_stamp(d->custom_bg_preset) ^ 0x20000000u) + d->custom_bg_preset;
  }
  return 0;
}

bool bg_image_draw(GContext *ctx, const WatchData *d, GRect bounds, GPoint origin) {
  if (d->custom_bg_mode == 1) {
    uint32_t res_id = bg_preset_resource_id(d->custom_bg_preset);
    if (res_id == 0) return true; // that predefined image is not in this build
    GBitmap *bm = gbitmap_create_with_resource(res_id);
    if (!bm) return false;
    GRect b = gbitmap_get_bounds(bm);
    GRect dest = GRect(bounds.origin.x + (bounds.size.w - b.size.w) / 2,
                       bounds.origin.y + (bounds.size.h - b.size.h) / 2,
                       b.size.w, b.size.h);
    graphics_context_set_compositing_mode(ctx, GCompOpSet);
    graphics_draw_bitmap_in_rect(ctx, bm, dest);
    gbitmap_destroy(bm);
  } else if (d->custom_bg_mode == 2) {
    if (bg_image_store_stamp(d->custom_bg_preset) == 0) return true; // slot empty / not received yet
    if (!bg_image_store_draw(d->custom_bg_preset, ctx, bounds, origin)) return false;
  }
  return true;
}
