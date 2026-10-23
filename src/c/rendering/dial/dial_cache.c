#include "./dial_cache.h"
#include <string.h>

void dial_cache_init(DialCache *cache) {
  memset(cache, 0, sizeof(*cache));
}

void dial_cache_release(DialCache *cache) {
  if (cache->bitmap) {
    gbitmap_destroy(cache->bitmap);
    cache->bitmap = NULL;
  }
  cache->signature = 0;
  cache->size = GSize(0, 0);
}

bool dial_cache_valid(const DialCache *cache, uint32_t signature, GSize size) {
  return cache->bitmap && cache->signature == signature &&
         cache->size.w == size.w && cache->size.h == size.h;
}

bool dial_cache_failed(const DialCache *cache, uint32_t signature) {
  return cache->failed && cache->failed_signature == signature;
}

bool dial_cache_blit(GContext *ctx, const DialCache *cache, GPoint origin) {
  if (!cache->bitmap) return false;
  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (fb) {
    if (gbitmap_get_format(fb) == GBitmapFormat8Bit) {
      uint8_t *dst = gbitmap_get_data(fb);
      const uint16_t dst_stride = gbitmap_get_bytes_per_row(fb);
      const uint8_t *src = gbitmap_get_data(cache->bitmap);
      const uint16_t src_stride = gbitmap_get_bytes_per_row(cache->bitmap);
      const GRect fb_bounds = gbitmap_get_bounds(fb);
      // Whole rows only when the layer sits fully inside the frame buffer
      // (always the case for the full-screen dial layer).
      if (origin.x >= fb_bounds.origin.x && origin.y >= fb_bounds.origin.y &&
          origin.x + cache->size.w <= fb_bounds.origin.x + fb_bounds.size.w &&
          origin.y + cache->size.h <= fb_bounds.origin.y + fb_bounds.size.h) {
        for (int16_t y = 0; y < cache->size.h; y++) {
          memcpy(dst + (int32_t)(origin.y + y) * dst_stride + origin.x,
                 src + (int32_t)y * src_stride, (size_t)cache->size.w);
        }
        graphics_release_frame_buffer(ctx, fb);
        return true;
      }
    }
    graphics_release_frame_buffer(ctx, fb);
  }
  // Fallback: ordinary (slower) bitmap draw.
  graphics_context_set_compositing_mode(ctx, GCompOpAssign);
  graphics_draw_bitmap_in_rect(ctx, cache->bitmap,
                               GRect(origin.x, origin.y, cache->size.w, cache->size.h));
  return true;
}

bool dial_cache_capture(GContext *ctx, DialCache *cache, GSize size, GPoint origin, uint32_t signature) {
  dial_cache_release(cache);
  cache->failed = false;

  GBitmap *copy = gbitmap_create_blank(size, GBitmapFormat8Bit);
  GBitmap *fb = copy ? graphics_capture_frame_buffer(ctx) : NULL;
  bool ok = false;
  if (copy && fb && gbitmap_get_format(fb) == GBitmapFormat8Bit) {
    const GRect fb_bounds = gbitmap_get_bounds(fb);
    if (origin.x >= fb_bounds.origin.x && origin.y >= fb_bounds.origin.y &&
        origin.x + size.w <= fb_bounds.origin.x + fb_bounds.size.w &&
        origin.y + size.h <= fb_bounds.origin.y + fb_bounds.size.h) {
      const uint8_t *src = gbitmap_get_data(fb);
      const uint16_t src_stride = gbitmap_get_bytes_per_row(fb);
      uint8_t *dst = gbitmap_get_data(copy);
      const uint16_t dst_stride = gbitmap_get_bytes_per_row(copy);
      for (int16_t y = 0; y < size.h; y++) {
        memcpy(dst + (int32_t)y * dst_stride,
               src + (int32_t)(origin.y + y) * src_stride + origin.x, (size_t)size.w);
      }
      ok = true;
    }
  }
  if (fb) graphics_release_frame_buffer(ctx, fb);

  if (!ok) {
    if (copy) gbitmap_destroy(copy);
    cache->failed = true;
    cache->failed_signature = signature;
    return false;
  }
  cache->bitmap = copy;
  cache->signature = signature;
  cache->size = size;
  return true;
}
