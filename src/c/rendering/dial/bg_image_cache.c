// B&W watches have no uploaded / plugin / preset background pictures: compiled out.
#include <pebble.h>
#ifndef PBL_BW
#include "./bg_image_cache.h"
#include "./bg_image_store.h"
#include "./bg_picture.h"
#include "./fb_row.h"
#include "../../generated/background_presets.h"
#include "../../generated/weather_backgrounds.h"
#include "../../data/watch_ui.h"
#include "../../platform/platform_bw.h"

// Weather background (mode 3): style = custom_bg_preset (1-based). The picture
// follows the current weather class and day/night (sunrise/sunset).
static BgPicture weather_bg_picture(const WatchData *d) {
  bool night = !watch_ui_is_daylight(d, time(NULL));
  uint8_t wx = d->valid ? d->weather_wx_now : 0;
  return weatherbg_picture(d->custom_bg_preset, wx, night);
}

uint32_t bg_image_signature(const WatchData *d) {
  if (d->custom_bg_mode == 1 && bg_preset_resource_id(d->custom_bg_preset) != 0) {
    return 0x10000u | d->custom_bg_preset;
  }
  if (d->custom_bg_mode == 3) {
    uint32_t id = weather_bg_picture(d).id[0];
    return id ? (0x30000000u | id) : 0;
  }
  if (d->custom_bg_mode == 4) {
    // 0x4... = "from a plugin": the RAM picture's stamp is 0 while there is none (not
    // received yet, emptied, or the watchface just restarted) and changes with every new picture.
    return 0x40000000u | (bg_image_store_stamp(BG_IMG_PLUGIN_SLOT) & 0x3FFFFFFFu);
  }
  if (d->custom_bg_mode == 2) {
    // 0x2... = "uploaded"; the slot's stamp is 0 while that slot is empty or
    // still being transferred, and changes when its image is replaced.
    return (bg_image_store_stamp(d->custom_bg_preset) ^ 0x20000000u) + d->custom_bg_preset;
  }
  return 0;
}

// Translucent mode: replace every other pixel (checkerboard, same parity the
// weather border leaves free) of the freshly drawn image with the background
// colour. Works directly on the frame buffer (8-bit, or 1-bit on the B&W watches); skipped if it cannot be
// captured (then the image just stays opaque).
static void bg_make_translucent(GContext *ctx, GRect bounds, GPoint origin, GColor bg) {
  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (!fb) return;
#ifdef PBL_BW
  if (gbitmap_get_format(fb) == GBitmapFormat1Bit) {
    // Same checkerboard in bits.
    const GRect fbb = gbitmap_get_bounds(fb);
    const int w = bounds.size.w, h = bounds.size.h;
    if (origin.x >= fbb.origin.x && origin.y >= fbb.origin.y &&
        origin.x + w <= fbb.origin.x + fbb.size.w && origin.y + h <= fbb.origin.y + fbb.size.h) {
      uint8_t *data = gbitmap_get_data(fb);
      const uint16_t stride = gbitmap_get_bytes_per_row(fb);
      const bool white = bw_color_is_white(bg);
      for (int y = 0; y < h; y++) {
        for (int x = (y & 1) ? 0 : 1; x < w; x += 2) bw_fb_put(data, stride, origin.x + x, origin.y + y, white);
      }
    }
  }
#else
  if (fb_is_8bit(fb)) {
    const GRect fbb = gbitmap_get_bounds(fb);
    const int w = bounds.size.w, h = bounds.size.h;
    if (origin.x >= fbb.origin.x && origin.y >= fbb.origin.y &&
        origin.x + w <= fbb.origin.x + fbb.size.w && origin.y + h <= fbb.origin.y + fbb.size.h) {
      for (int y = 0; y < h; y++) {
        const FbRow row = fb_row8(fb, (int16_t)(origin.y + y));
        for (int x = (y & 1) ? 0 : 1; x < w; x += 2) {
          const int fx = origin.x + x;
          if (fx >= row.min_x && fx <= row.max_x) row.data[fx] = bg.argb; // odd (x + y)
        }
      }
    }
  }
#endif
  graphics_release_frame_buffer(ctx, fb);
}

bool bg_image_draw(GContext *ctx, const WatchData *d, GRect bounds, GPoint origin, GColor bg) {
  if (d->custom_bg_mode == 1 || d->custom_bg_mode == 3) {
    BgPicture pic = (d->custom_bg_mode == 3) ? weather_bg_picture(d) : bg_preset_picture(d->custom_bg_preset);
    if (pic.id[0] == 0) return true; // that predefined image is not in this build
    if (!bg_picture_draw(ctx, bounds, pic)) return false;
  } else if (d->custom_bg_mode == 2) {
    if (bg_image_store_stamp(d->custom_bg_preset) == 0) return true; // slot empty / not received yet
    if (!bg_image_store_draw(d->custom_bg_preset, ctx, bounds, origin)) return false;
  } else if (d->custom_bg_mode == 4) {
    // The picture is already processed and sized by the phone; it is drawn centred.
    if (bg_image_store_stamp(BG_IMG_PLUGIN_SLOT) == 0) return !bg_image_store_ram_failed(); // none yet / removed; false = out of memory (reported by the dial)
    if (!bg_image_store_draw(BG_IMG_PLUGIN_SLOT, ctx, bounds, origin)) return false;
  }
  if (d->bg_translucent && d->custom_bg_mode >= 1 && d->custom_bg_mode <= 4) {
    bg_make_translucent(ctx, bounds, origin, bg);
  }
  return true;
}

#endif // !PBL_BW
