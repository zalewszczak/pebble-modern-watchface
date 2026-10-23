#include "./bg_image_store.h"
#include <string.h>

// Persist key layout. Slot headers: 201..209. Chunks: every slot owns a block
// of BG_CHUNK_KEY_SPAN keys (a full 200x228 image needs 135, the largest
// accepted image 302), so slot s chunk c lives at 1000 + s * 400 + c.
#define PERSIST_KEY_BG_HEADER_BASE 200
#define PERSIST_KEY_BG_CHUNK_BASE 1000
#define BG_CHUNK_KEY_SPAN 400

static uint32_t header_key(uint8_t slot) { return PERSIST_KEY_BG_HEADER_BASE + slot; }
static uint32_t chunk_key(uint8_t slot, uint16_t chunk) {
  return PERSIST_KEY_BG_CHUNK_BASE + (uint32_t)slot * BG_CHUNK_KEY_SPAN + chunk;
}
static bool slot_ok(uint8_t slot) { return slot >= 1 && slot <= BG_IMG_SLOTS; }

typedef struct __attribute__((packed)) {
  uint32_t stamp;
  uint16_t w;
  uint16_t h;
  uint16_t chunks;
} BgHeader;

static bool s_loaded[BG_IMG_SLOTS + 1];
static BgHeader s_header[BG_IMG_SLOTS + 1]; // valid when .stamp != 0
static BgHeader s_pending;                   // transfer in progress
static uint8_t s_pending_slot;               // 0 = none
static uint16_t s_pending_written;           // highest chunk index written + 1
static uint16_t s_old_chunks;                // chunk count of the image being replaced

static uint16_t expected_chunks(uint16_t w, uint16_t h) {
  uint32_t groups = ((uint32_t)w * h + 3) / 4;
  uint32_t bytes = groups * 3;
  return (uint16_t)((bytes + BG_IMG_CHUNK_BYTES - 1) / BG_IMG_CHUNK_BYTES);
}

static void load_header(uint8_t slot) {
  if (!slot_ok(slot) || s_loaded[slot]) return;
  s_loaded[slot] = true;
  memset(&s_header[slot], 0, sizeof(BgHeader));
  BgHeader h;
  if (persist_exists(header_key(slot)) &&
      persist_get_size(header_key(slot)) == (int)sizeof(h) &&
      persist_read_data(header_key(slot), &h, sizeof(h)) == (int)sizeof(h) &&
      h.stamp != 0 && h.w != 0 && h.h != 0 && h.chunks == expected_chunks(h.w, h.h)) {
    s_header[slot] = h;
  }
}

uint32_t bg_image_store_stamp(uint8_t slot) {
  if (!slot_ok(slot)) return 0;
  load_header(slot);
  return s_header[slot].stamp;
}

void bg_image_store_stamps(uint32_t out[BG_IMG_SLOTS]) {
  for (uint8_t s = 1; s <= BG_IMG_SLOTS; s++) out[s - 1] = bg_image_store_stamp(s);
}

static void delete_chunks(uint8_t slot, uint16_t from, uint16_t to) {
  for (uint16_t i = from; i < to; i++) {
    if (persist_exists(chunk_key(slot, i))) persist_delete(chunk_key(slot, i));
  }
}

void bg_image_store_clear(uint8_t slot) {
  if (!slot_ok(slot)) return;
  load_header(slot);
  if (s_pending_slot == slot) bg_image_store_abort();
  uint16_t n = s_header[slot].chunks;
  if (persist_exists(header_key(slot))) persist_delete(header_key(slot));
  memset(&s_header[slot], 0, sizeof(BgHeader));
  delete_chunks(slot, 0, n);
}

uint8_t bg_image_store_pending_slot(void) { return s_pending_slot; }
uint16_t bg_image_store_pending_progress(void) { return s_pending_slot ? s_pending_written : 0; }
uint16_t bg_image_store_pending_chunks(void) { return s_pending_slot ? s_pending.chunks : 0; }

void bg_image_store_abort(void) {
  memset(&s_pending, 0, sizeof(s_pending));
  s_pending_slot = 0;
  s_pending_written = 0;
}

bool bg_image_store_begin(uint8_t slot, uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h) {
  bg_image_store_abort();
  if (!slot_ok(slot)) return false;
  load_header(slot);
  s_old_chunks = s_header[slot].chunks;
  // Drop the header first: a transfer that dies half-way must never leave a
  // header pointing at a mix of old and new chunks.
  if (persist_exists(header_key(slot))) persist_delete(header_key(slot));
  memset(&s_header[slot], 0, sizeof(BgHeader));
  if (stamp == 0 || w == 0 || h == 0 || (uint32_t)w * h > BG_IMG_MAX_PIXELS ||
      chunks != expected_chunks(w, h) || chunks > BG_CHUNK_KEY_SPAN) return false;
  s_pending.stamp = stamp;
  s_pending.w = w;
  s_pending.h = h;
  s_pending.chunks = chunks;
  s_pending_slot = slot;
  s_pending_written = 0;
  return true;
}

bool bg_image_store_write(uint16_t first_chunk, const uint8_t *data, uint16_t len) {
  if (s_pending_slot == 0 || s_pending.stamp == 0) return false;
  bool ok = true;
  uint16_t chunk = first_chunk;
  while (len > 0) {
    if (chunk >= s_pending.chunks) return false;
    uint16_t n = len < BG_IMG_CHUNK_BYTES ? len : BG_IMG_CHUNK_BYTES;
    if (persist_write_data(chunk_key(s_pending_slot, chunk), data, n) != (int)n) ok = false;
    data += n;
    len -= n;
    chunk++;
  }
  if (chunk > s_pending_written) s_pending_written = chunk;
  if (!ok) bg_image_store_abort(); // abandon; commit will fail
  return ok;
}

bool bg_image_store_commit(uint32_t stamp) {
  if (s_pending_slot == 0 || s_pending.stamp == 0 || s_pending.stamp != stamp) return false;
  const uint8_t slot = s_pending_slot;
  BgHeader h = s_pending;
  bg_image_store_abort();
  uint32_t total_bytes = (((uint32_t)h.w * h.h + 3) / 4) * 3;
  for (uint16_t i = 0; i < h.chunks; i++) {
    int want = (i + 1 < h.chunks) ? BG_IMG_CHUNK_BYTES
                                  : (int)(total_bytes - (uint32_t)i * BG_IMG_CHUNK_BYTES);
    if (!persist_exists(chunk_key(slot, i)) ||
        persist_get_size(chunk_key(slot, i)) != want) return false;
  }
  // A smaller image replacing a larger one leaves the tail chunks behind.
  delete_chunks(slot, h.chunks, s_old_chunks);
  s_old_chunks = 0;
  if (persist_write_data(header_key(slot), &h, sizeof(h)) != (int)sizeof(h)) return false;
  s_header[slot] = h;
  s_loaded[slot] = true;
  return true;
}

bool bg_image_store_draw(uint8_t slot, GContext *ctx, GRect bounds, GPoint origin) {
  if (!slot_ok(slot)) return false;
  load_header(slot);
  const BgHeader hdr = s_header[slot];
  if (hdr.stamp == 0) return false;
  const int16_t w = (int16_t)hdr.w, h = (int16_t)hdr.h;

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

  for (uint16_t c = 0; c < hdr.chunks && pixel < total && ok; c++) {
    int n = persist_read_data(chunk_key(slot, c), buf, sizeof(buf));
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
