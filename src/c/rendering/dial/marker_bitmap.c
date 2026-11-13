#include "./marker_bitmap.h"
#include "../status/status_label.h"
#include "../../platform/platform_bw.h"

void marker_bitmap_release(GBitmap **bitmap, uint8_t *bitmap_style, bool *bitmap_tinted) {
  if (*bitmap) {
    gbitmap_destroy(*bitmap);
    *bitmap = NULL;
  }
  *bitmap_style = 255;
  *bitmap_tinted = false;
}

static uint32_t marker_bitmap_resource_id(uint8_t style) {
  switch (style) {
    case 3: return RESOURCE_ID_MODERN_BACKGROUND;
    case 4: return RESOURCE_ID_SHADOW_BACKGROUND;
    case 5: return RESOURCE_ID_TALLY_BACKGROUND;
    case 6: return RESOURCE_ID_BELL_BACKGROUND;
    case 7: return RESOURCE_ID_FANCY_BACKGROUND;
    case 11: return RESOURCE_ID_MODERN_BOLD_BACKGROUND;
    case 12: return RESOURCE_ID_MODERN_F_BACKGROUND;
    case 13: return RESOURCE_ID_MODERN_H_BACKGROUND;
    case 14: return RESOURCE_ID_MODERN_P_BACKGROUND;
    case 15: return RESOURCE_ID_MODERN_PR_BACKGROUND;
    case 16: return RESOURCE_ID_MODERN_S_BACKGROUND;
    case 17: return RESOURCE_ID_MODERN_W_BACKGROUND;
    case 18: return RESOURCE_ID_MODERN_WR_BACKGROUND;
    case 19: return RESOURCE_ID_ROMAN_BACKGROUND;
    default: return 0;
  }
}

void marker_bitmap_ensure(GBitmap **bitmap, uint8_t *bitmap_style, bool *bitmap_tinted,
                          GColor *tint_color, bool *tint_transparent, uint8_t style) {
  if (!marker_style_is_bitmap(style)) { // not a bitmap style (custom rings draw instead)
    if (*bitmap) {
      gbitmap_destroy(*bitmap);
      *bitmap = NULL;
    }
    *bitmap_style = 255;
    *bitmap_tinted = false;
    return;
  }

  if (*bitmap_style == style && *bitmap) return;

  if (*bitmap) {
    gbitmap_destroy(*bitmap);
    *bitmap = NULL;
  }

  uint32_t res_id = marker_bitmap_resource_id(style);
  if (res_id != 0) {
    *bitmap = gbitmap_create_with_resource(res_id);
    if (!*bitmap) {
      // OUT OF MEMORY? Log the heap so `pebble logs` shows how much was left (gabbro PNG decode failures).
      APP_LOG(APP_LOG_LEVEL_ERROR, "marker bitmap %d: no memory (heap free %u, used %u)",
              (int)style, (unsigned)heap_bytes_free(), (unsigned)heap_bytes_used());
      status_label_set("MALLOC: Restart watch", STATUS_WARNING_COLOR, false);
    }
  }
  
  *bitmap_style = style;
  *bitmap_tinted = false;
  *tint_color = GColorClear;
  *tint_transparent = false;
}

void marker_bitmap_tint(GBitmap *bitmap, bool *bitmap_tinted, GColor *tint_color,
                        bool *tint_transparent, GColor tint, bool transparent) {
  if (!bitmap) return;
  if (*bitmap_tinted && tint_color->argb == tint.argb &&
      *tint_transparent == transparent) return;

#ifdef PBL_BW
  // No alpha on a 1-bit screen: the ink is always opaque and always black or white. The
  // semi-transparent option is a no-op here (the "inverted" blend below has a checkerboard version).
  tint = bw_color(tint);
  transparent = false;
#endif
  uint8_t forced_alpha_bits = transparent ? 0x80 : 0xC0;
  GBitmapFormat format = gbitmap_get_format(bitmap);

  if (format == GBitmapFormat1BitPalette || format == GBitmapFormat2BitPalette ||
      format == GBitmapFormat4BitPalette) {
    GColor *palette = gbitmap_get_palette(bitmap);
    if (palette) {
      int count = (format == GBitmapFormat1BitPalette) ? 2 :
                  (format == GBitmapFormat2BitPalette) ? 4 : 16;
      for (int i = 0; i < count; i++) {
        if ((palette[i].argb & 0xC0) == 0) continue;
        GColor new_color;
        new_color.argb = forced_alpha_bits | (tint.argb & 0x3F);
        palette[i] = new_color;
      }
    }
  } else if (format == GBitmapFormat8Bit) {
    uint8_t *data = gbitmap_get_data(bitmap);
    uint16_t stride = gbitmap_get_bytes_per_row(bitmap);
    GRect bounds = gbitmap_get_bounds(bitmap);
    for (int16_t y = 0; y < bounds.size.h; y++) {
      uint8_t *row = data + (int32_t)y * stride;
      for (int16_t x = 0; x < bounds.size.w; x++) {
        if ((row[x] & 0xC0) == 0) continue;
        row[x] = forced_alpha_bits | (tint.argb & 0x3F);
      }
    }
  }

  *bitmap_tinted = true;
  *tint_transparent = transparent;
  *tint_color = tint;
}

void marker_bitmap_draw(GContext *ctx, GBitmap *bitmap, GRect bounds,
                        bool anim_active, int32_t anim_progress_1000) {
  if (!bitmap) return;

  GRect bmp_bounds = gbitmap_get_bounds(bitmap);
  GRect dest = GRect(bounds.origin.x + (bounds.size.w - bmp_bounds.size.w) / 2,
                     bounds.origin.y + (bounds.size.h - bmp_bounds.size.h) / 2,
                     bmp_bounds.size.w, bmp_bounds.size.h);
  graphics_context_set_compositing_mode(ctx, GCompOpSet);

  // Bitmap marker styles currently draw immediately. The animation arguments
  // are retained so the renderer can share one call shape with procedural and
  // text markers if a true bitmap reveal is implemented later.
  (void)anim_active;
  (void)anim_progress_1000;
  graphics_draw_bitmap_in_rect(ctx, bitmap, dest);
}

// Index of pixel (x, y) in a palette bitmap (1/2/4 bits per pixel, MSB first).
static uint8_t bitmap_pixel_index(const uint8_t *data, uint16_t stride, int bpp, int16_t x, int16_t y) {
  const uint8_t *row = data + (int32_t)y * stride;
  int per_byte = 8 / bpp;
  uint8_t byte = row[x / per_byte];
  int shift = 8 - bpp * ((x % per_byte) + 1);
  return (uint8_t)((byte >> shift) & ((1 << bpp) - 1));
}

// Blends the bitmap into what is already drawn as a contrast colour: pixels
// over a light background become black, over a dark background white. The
// bitmap's own colours are ignored; its palette alpha (anti-aliasing) is the
// coverage. `semi` halves the coverage, like the semi-transparent option.
// `origin` is the layer's position in the frame buffer.
void marker_bitmap_draw_inverted(GContext *ctx, GBitmap *bitmap, GRect bounds, GPoint origin, bool semi) {
  if (!bitmap) return;
#ifdef PBL_BW
  // 1-bit version: wherever the art covers at least half (palette alpha >= 2 of 3) the screen pixel
  // is inverted, which is exactly "light background -> black, dark background -> white" in two
  // colours. `semi` inverts only every other pixel (checkerboard).
  GBitmapFormat bw_format = gbitmap_get_format(bitmap);
  int bw_bpp = (bw_format == GBitmapFormat1BitPalette) ? 1 : (bw_format == GBitmapFormat2BitPalette) ? 2 :
               (bw_format == GBitmapFormat4BitPalette) ? 4 : (bw_format == GBitmapFormat8Bit) ? 8 : 0;
  if (bw_bpp == 0) return;
  const GColor *bw_palette = (bw_bpp < 8) ? gbitmap_get_palette(bitmap) : NULL;
  if (bw_bpp < 8 && !bw_palette) return;
  GRect bw_bounds = gbitmap_get_bounds(bitmap);
  const uint8_t *bw_src = gbitmap_get_data(bitmap);
  const uint16_t bw_src_stride = gbitmap_get_bytes_per_row(bitmap);
  int16_t bw_dx = origin.x + bounds.origin.x + (bounds.size.w - bw_bounds.size.w) / 2;
  int16_t bw_dy = origin.y + bounds.origin.y + (bounds.size.h - bw_bounds.size.h) / 2;
  GBitmap *bw_fb = graphics_capture_frame_buffer(ctx);
  if (!bw_fb) return;
  if (gbitmap_get_format(bw_fb) == GBitmapFormat1Bit) {
    uint8_t *dst = gbitmap_get_data(bw_fb);
    const uint16_t dst_stride = gbitmap_get_bytes_per_row(bw_fb);
    const GRect fbb = gbitmap_get_bounds(bw_fb);
    for (int16_t y = 0; y < bw_bounds.size.h; y++) {
      int16_t fy = bw_dy + y;
      if (fy < fbb.origin.y || fy >= fbb.origin.y + fbb.size.h) continue;
      for (int16_t x = 0; x < bw_bounds.size.w; x++) {
        int16_t fx = bw_dx + x;
        if (fx < fbb.origin.x || fx >= fbb.origin.x + fbb.size.w) continue;
        if (semi && ((fx + fy) & 1)) continue;
        uint8_t argb = (bw_bpp == 8) ? bw_src[(int32_t)y * bw_src_stride + x]
                                     : bw_palette[bitmap_pixel_index(bw_src, bw_src_stride, bw_bpp, x, y)].argb;
        if (((argb >> 6) & 3) < 2) continue;
        bw_fb_toggle(dst, dst_stride, fx, fy);
      }
    }
  }
  graphics_release_frame_buffer(ctx, bw_fb);
  return;
#else
  GBitmapFormat format = gbitmap_get_format(bitmap);
  int bpp = (format == GBitmapFormat1BitPalette) ? 1 : (format == GBitmapFormat2BitPalette) ? 2 :
            (format == GBitmapFormat4BitPalette) ? 4 : (format == GBitmapFormat8Bit) ? 8 : 0;
  if (bpp == 0) return;
  const GColor *palette = (bpp < 8) ? gbitmap_get_palette(bitmap) : NULL;
  if (bpp < 8 && !palette) return;

  GRect bmp_bounds = gbitmap_get_bounds(bitmap);
  const uint8_t *src = gbitmap_get_data(bitmap);
  const uint16_t src_stride = gbitmap_get_bytes_per_row(bitmap);
  int16_t dest_x = origin.x + bounds.origin.x + (bounds.size.w - bmp_bounds.size.w) / 2;
  int16_t dest_y = origin.y + bounds.origin.y + (bounds.size.h - bmp_bounds.size.h) / 2;

  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (!fb) return;
  if (gbitmap_get_format(fb) == GBitmapFormat8Bit) {
    uint8_t *dst = gbitmap_get_data(fb);
    const uint16_t dst_stride = gbitmap_get_bytes_per_row(fb);
    const GRect fb_bounds = gbitmap_get_bounds(fb);
    for (int16_t y = 0; y < bmp_bounds.size.h; y++) {
      int16_t fy = dest_y + y;
      if (fy < fb_bounds.origin.y || fy >= fb_bounds.origin.y + fb_bounds.size.h) continue;
      for (int16_t x = 0; x < bmp_bounds.size.w; x++) {
        int16_t fx = dest_x + x;
        if (fx < fb_bounds.origin.x || fx >= fb_bounds.origin.x + fb_bounds.size.w) continue;
        uint8_t argb;
        if (bpp == 8) argb = src[(int32_t)y * src_stride + x];
        else argb = palette[bitmap_pixel_index(src, src_stride, bpp, x, y)].argb;
        int cover = (argb >> 6) & 3; // 0..3
        if (cover == 0) continue;
        if (semi && cover > 1) cover = 1 + (cover - 1) / 2; // 3->2, 2->1
        uint8_t *px = &dst[(int32_t)fy * dst_stride + fx];
        int r = (*px >> 4) & 3, g = (*px >> 2) & 3, b = *px & 3;
        // Luminance 0..30 (weights 3/6/1 over 2-bit channels, roughly Rec.601).
        int lum = (r * 3 + g * 6 + b * 1);
        int target = (lum > 15) ? 0 : 3; // light background -> black, dark -> white
        // cover/3 mix toward the target, per channel.
        r = (r * (3 - cover) + target * cover + 1) / 3;
        g = (g * (3 - cover) + target * cover + 1) / 3;
        b = (b * (3 - cover) + target * cover + 1) / 3;
        *px = (uint8_t)(0xC0 | (r << 4) | (g << 2) | b);
      }
    }
  }
  graphics_release_frame_buffer(ctx, fb);
#endif // PBL_BW
}
