#include "./bg_image_store.h"
#include <string.h>

#define PERSIST_KEY_BG_HEADER 200
#define PERSIST_KEY_BG_CHUNK_BASE 300

typedef struct __attribute__((packed)) {
  uint32_t stamp;
  uint16_t w;
  uint16_t h;
  uint16_t chunks;
} BgHeader;

static bool s_header_loaded;
static BgHeader s_header;       // valid when s_header.stamp != 0
static BgHeader s_pending;      // transfer in progress
static uint16_t s_old_chunks;   // chunk count of the image being replaced

static uint16_t expected_chunks(uint16_t w, uint16_t h) {
  uint32_t groups = ((uint32_t)w * h + 3) / 4;
  uint32_t bytes = groups * 3;
  return (uint16_t)((bytes + BG_IMG_CHUNK_BYTES - 1) / BG_IMG_CHUNK_BYTES);
}

static void load_header(void) {
  if (s_header_loaded) return;
  s_header_loaded = true;
  memset(&s_header, 0, sizeof(s_header));
  BgHeader h;
  if (persist_exists(PERSIST_KEY_BG_HEADER) &&
      persist_get_size(PERSIST_KEY_BG_HEADER) == (int)sizeof(h) &&
      persist_read_data(PERSIST_KEY_BG_HEADER, &h, sizeof(h)) == (int)sizeof(h) &&
      h.stamp != 0 && h.w != 0 && h.h != 0 && h.chunks == expected_chunks(h.w, h.h)) {
    s_header = h;
  }
}

uint32_t bg_image_store_stamp(void) {
  load_header();
  return s_header.stamp;
}

bool bg_image_store_begin(uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h) {
  load_header();
  s_old_chunks = s_header.chunks;
  // Drop the header first: a transfer that dies half-way must never leave a
  // header pointing at a mix of old and new chunks.
  if (persist_exists(PERSIST_KEY_BG_HEADER)) persist_delete(PERSIST_KEY_BG_HEADER);
  memset(&s_header, 0, sizeof(s_header));
  memset(&s_pending, 0, sizeof(s_pending));
  if (stamp == 0 || w == 0 || h == 0 || (uint32_t)w * h > BG_IMG_MAX_PIXELS ||
      chunks != expected_chunks(w, h)) return false;
  s_pending.stamp = stamp;
  s_pending.w = w;
  s_pending.h = h;
  s_pending.chunks = chunks;
  return true;
}

bool bg_image_store_write(uint16_t first_chunk, const uint8_t *data, uint16_t len) {
  if (s_pending.stamp == 0) return false;
  bool ok = true;
  uint16_t chunk = first_chunk;
  while (len > 0) {
    if (chunk >= s_pending.chunks) return false;
    uint16_t n = len < BG_IMG_CHUNK_BYTES ? len : BG_IMG_CHUNK_BYTES;
    if (persist_write_data(PERSIST_KEY_BG_CHUNK_BASE + chunk, data, n) != (int)n) ok = false;
    data += n;
    len -= n;
    chunk++;
  }
  if (!ok) memset(&s_pending, 0, sizeof(s_pending)); // abandon; commit will fail
  return ok;
}

bool bg_image_store_commit(uint32_t stamp) {
  if (s_pending.stamp == 0 || s_pending.stamp != stamp) return false;
  BgHeader h = s_pending;
  memset(&s_pending, 0, sizeof(s_pending));
  uint32_t total_bytes = (((uint32_t)h.w * h.h + 3) / 4) * 3;
  for (uint16_t i = 0; i < h.chunks; i++) {
    int want = (i + 1 < h.chunks) ? BG_IMG_CHUNK_BYTES
                                  : (int)(total_bytes - (uint32_t)i * BG_IMG_CHUNK_BYTES);
    if (!persist_exists(PERSIST_KEY_BG_CHUNK_BASE + i) ||
        persist_get_size(PERSIST_KEY_BG_CHUNK_BASE + i) != want) return false;
  }
  // A smaller image replacing a larger one leaves the tail chunks behind.
  for (uint16_t i = h.chunks; i < s_old_chunks; i++) {
    if (persist_exists(PERSIST_KEY_BG_CHUNK_BASE + i)) persist_delete(PERSIST_KEY_BG_CHUNK_BASE + i);
  }
  s_old_chunks = 0;
  if (persist_write_data(PERSIST_KEY_BG_HEADER, &h, sizeof(h)) != (int)sizeof(h)) return false;
  s_header = h;
  return true;
}

bool bg_image_store_draw(GContext *ctx, GRect bounds, GPoint origin) {
  load_header();
  if (s_header.stamp == 0) return false;
  const int16_t w = (int16_t)s_header.w, h = (int16_t)s_header.h;

  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (!fb) return false;
  if (gbitmap_get_format(fb) != GBitmapFormat8Bit) {
    graphics_release_frame_buffer(ctx, fb);
    return false;
  }
  uint8_t *screen = gbitmap_get_data(fb);
  const uint16_t stride = gbitmap_get_bytes_per_row(fb);
  const GRect fb_bounds = gbitmap_get_bounds(fb);

  // Image top-left on screen, and the on-screen rectangle it may touch.
  const int16_t left = origin.x + bounds.origin.x;
  const int16_t top = origin.y + bounds.origin.y;
  const int16_t ox = left + (bounds.size.w - w) / 2;
  const int16_t oy = top + (bounds.size.h - h) / 2;
  const int16_t clip_l = left > fb_bounds.origin.x ? left : fb_bounds.origin.x;
  const int16_t clip_t = top > fb_bounds.origin.y ? top : fb_bounds.origin.y;
  const int16_t r = left + bounds.size.w, b = top + bounds.size.h;
  const int16_t clip_r = r < fb_bounds.origin.x + fb_bounds.size.w ? r : fb_bounds.origin.x + fb_bounds.size.w;
  const int16_t clip_b = b < fb_bounds.origin.y + fb_bounds.size.h ? b : fb_bounds.origin.y + fb_bounds.size.h;

  const uint32_t total = (uint32_t)w * h;
  uint32_t pixel = 0;
  int16_t x = 0, y = 0;
  bool ok = true;
  uint8_t buf[BG_IMG_CHUNK_BYTES];

  for (uint16_t c = 0; c < s_header.chunks && pixel < total && ok; c++) {
    int n = persist_read_data(PERSIST_KEY_BG_CHUNK_BASE + c, buf, sizeof(buf));
    if (n <= 0 || (n % 3) != 0) { ok = false; break; }
    for (int i = 0; i + 2 < n && pixel < total; i += 3) {
      uint8_t b0 = buf[i], b1 = buf[i + 1], b2 = buf[i + 2];
      uint8_t v[4] = {
        (uint8_t)(b0 >> 2),
        (uint8_t)(((b0 & 3) << 4) | (b1 >> 4)),
        (uint8_t)(((b1 & 15) << 2) | (b2 >> 6)),
        (uint8_t)(b2 & 63),
      };
      for (int k = 0; k < 4 && pixel < total; k++) {
        int16_t sx = ox + x, sy = oy + y;
        if (sx >= clip_l && sx < clip_r && sy >= clip_t && sy < clip_b) {
          screen[(int32_t)sy * stride + sx] = (uint8_t)(0xC0 | v[k]); // opaque GColor8
        }
        pixel++;
        if (++x == w) { x = 0; y++; }
      }
    }
  }
  graphics_release_frame_buffer(ctx, fb);
  return ok && pixel == total;
}
