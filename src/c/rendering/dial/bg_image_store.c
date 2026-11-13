// B&W watches have no uploaded / plugin / preset background pictures: compiled out.
#include <pebble.h>
#ifndef PBL_BW
#include "./fb_row.h"
#include "./bg_image_store.h"
#include <string.h>
#include "../../platform/platform_bw.h"

// Persist key layout. Slot headers: 201..209. Chunks: every slot owns a block
// of BG_CHUNK_KEY_SPAN keys (a full 200x228 image needs 135, a 260x260 one 199, the largest
// accepted image 302), so slot s chunk c lives at 1000 + s * 400 + c.
#define PERSIST_KEY_BG_HEADER_BASE 200
#define PERSIST_KEY_BG_CHUNK_BASE 1000
#define BG_CHUNK_KEY_SPAN 400

static uint32_t header_key(uint8_t slot) { return PERSIST_KEY_BG_HEADER_BASE + slot; }
static uint32_t chunk_key(uint8_t slot, uint16_t chunk) {
  return PERSIST_KEY_BG_CHUNK_BASE + (uint32_t)slot * BG_CHUNK_KEY_SPAN + chunk;
}
static bool slot_ok(uint8_t slot) { return slot >= 1 && slot <= BG_IMG_PLUGIN_SLOT; }
// The plugin slot lives in RAM unless the phone asked for it to be cached (BEGIN flag): then it is
// stored in persistent storage like a user slot and survives a restart of the watchface.
static bool s_plugin_persist;
static bool is_ram(uint8_t slot) { return slot == BG_IMG_PLUGIN_SLOT && !s_plugin_persist; }

// Free heap that must stay available after the plugin picture is allocated: the
// dial cache and the other layers need room too.
#define BG_RAM_HEAP_RESERVE 4096

typedef struct __attribute__((packed)) {
  uint32_t stamp;
  uint16_t w;
  uint16_t h;
  uint16_t chunks;
} BgHeader;

static bool s_loaded[BG_IMG_PLUGIN_SLOT + 1];
static BgHeader s_header[BG_IMG_PLUGIN_SLOT + 1]; // valid when .stamp != 0
static uint8_t *s_ram;                       // plugin slot: the packed picture (NULL = none)
static void (*s_relief)(void);               // frees rebuildable memory when the heap is full
static bool s_ram_failed;                    // plugin slot: the last allocation failed
static uint32_t s_ram_filled;                // plugin slot: bytes received so far
static BgHeader s_pending;                   // transfer in progress
static uint8_t s_pending_slot;               // 0 = none
static uint16_t s_pending_written;           // highest chunk index written + 1
static uint16_t s_old_chunks;                // chunk count of the image being replaced

static uint32_t packed_bytes(uint16_t w, uint16_t h) {
  return ((((uint32_t)w * h) + 3) / 4) * 3;
}

static uint16_t expected_chunks(uint16_t w, uint16_t h) {
  uint32_t bytes = packed_bytes(w, h);
  return (uint16_t)((bytes + BG_IMG_CHUNK_BYTES - 1) / BG_IMG_CHUNK_BYTES);
}

static void ram_free(void) {
  if (s_ram) free(s_ram);
  s_ram = NULL;
  s_ram_filled = 0;
}

static void load_header(uint8_t slot) {
  if (!slot_ok(slot) || s_loaded[slot]) return;
  s_loaded[slot] = true;
  memset(&s_header[slot], 0, sizeof(BgHeader));
  if (is_ram(slot)) {
    // The plugin slot starts empty unless a cached picture was left in persistent storage.
    if (slot != BG_IMG_PLUGIN_SLOT) return;
    s_plugin_persist = true; // tentatively: read the header the persistent way
  }
  BgHeader h;
  if (persist_exists(header_key(slot)) &&
      persist_get_size(header_key(slot)) == (int)sizeof(h) &&
      persist_read_data(header_key(slot), &h, sizeof(h)) == (int)sizeof(h) &&
      h.stamp != 0 && h.w != 0 && h.h != 0 && h.chunks == expected_chunks(h.w, h.h)) {
    s_header[slot] = h;
  } else if (slot == BG_IMG_PLUGIN_SLOT) {
    s_plugin_persist = false; // nothing cached: RAM mode
  }
}

uint32_t bg_image_store_stamp(uint8_t slot) {
  if (!slot_ok(slot)) return 0;
  load_header(slot);
  return s_header[slot].stamp;
}

void bg_image_store_stamps(uint32_t out[BG_IMG_REPORTED_SLOTS]) {
  for (uint8_t s = 1; s <= BG_IMG_REPORTED_SLOTS; s++) out[s - 1] = bg_image_store_stamp(s);
}

static void delete_chunks(uint8_t slot, uint16_t from, uint16_t to) {
  if (is_ram(slot)) return;
  for (uint16_t i = from; i < to; i++) {
    if (persist_exists(chunk_key(slot, i))) persist_delete(chunk_key(slot, i));
  }
}

void bg_image_store_clear(uint8_t slot) {
  if (!slot_ok(slot)) return;
  load_header(slot);
  if (s_pending_slot == slot) bg_image_store_abort();
  uint16_t n = s_header[slot].chunks;
  if (is_ram(slot)) {
    ram_free();
    s_ram_failed = false;
  } else if (persist_exists(header_key(slot))) {
    persist_delete(header_key(slot));
  }
  memset(&s_header[slot], 0, sizeof(BgHeader));
  delete_chunks(slot, 0, n);
  if (slot == BG_IMG_PLUGIN_SLOT) s_plugin_persist = false;
}

uint8_t bg_image_store_pending_slot(void) { return s_pending_slot; }
uint16_t bg_image_store_pending_progress(void) { return s_pending_slot ? s_pending_written : 0; }
uint16_t bg_image_store_pending_chunks(void) { return s_pending_slot ? s_pending.chunks : 0; }

// Forgets the active transfer's bookkeeping (what has been stored stays).
static void pending_reset(void) {
  memset(&s_pending, 0, sizeof(s_pending));
  s_pending_slot = 0;
  s_pending_written = 0;
}

void bg_image_store_set_memory_relief(void (*relief)(void)) { s_relief = relief; }
bool bg_image_store_ram_failed(void) { return s_ram_failed; }

void bg_image_store_abort(void) {
  // A half-received plugin picture is useless: give its memory back.
  if (is_ram(s_pending_slot)) ram_free();
  pending_reset();
}

bool bg_image_store_begin(uint8_t slot, uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h, bool persist) {
  bg_image_store_abort();
  if (!slot_ok(slot)) return false;
  load_header(slot);
  s_old_chunks = s_header[slot].chunks;
  // Drop the header first: a transfer that dies half-way must never leave a
  // header pointing at a mix of old and new chunks.
  if (is_ram(slot)) {
    ram_free();
  } else if (persist_exists(header_key(slot))) {
    persist_delete(header_key(slot));
  }
  memset(&s_header[slot], 0, sizeof(BgHeader));
  if (slot == BG_IMG_PLUGIN_SLOT) {
    // Leaving the cache: give the old chunks back before the slot becomes RAM-only.
    if (s_plugin_persist && !persist) delete_chunks(slot, 0, s_old_chunks);
    if (s_plugin_persist != persist) s_old_chunks = 0;
    s_plugin_persist = persist;
  }
  if (stamp == 0 || w == 0 || h == 0 || (uint32_t)w * h > BG_IMG_MAX_PIXELS ||
      chunks != expected_chunks(w, h) || chunks > BG_CHUNK_KEY_SPAN) return false;
  if (is_ram(slot)) {
    // The old picture is already gone, so the whole heap is available for the new one.
    const uint32_t bytes = packed_bytes(w, h);
    s_ram_failed = false;
    if (heap_bytes_free() < bytes + BG_RAM_HEAP_RESERVE && s_relief) s_relief();
    if (heap_bytes_free() >= bytes + BG_RAM_HEAP_RESERVE) s_ram = (uint8_t *)malloc(bytes);
    if (!s_ram) { s_ram_failed = true; return false; }
    s_ram_filled = 0;
  }
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
  if (is_ram(s_pending_slot)) {
    // No gaps: a chunk may repeat (the phone retried), never skip ahead.
    if (!s_ram || first_chunk > s_pending_written) { bg_image_store_abort(); return false; }
  }
  while (len > 0) {
    if (chunk >= s_pending.chunks) return false;
    uint16_t n = len < BG_IMG_CHUNK_BYTES ? len : BG_IMG_CHUNK_BYTES;
    if (is_ram(s_pending_slot)) {
      const uint32_t off = (uint32_t)chunk * BG_IMG_CHUNK_BYTES;
      if (off + n > packed_bytes(s_pending.w, s_pending.h)) { ok = false; break; }
      memcpy(s_ram + off, data, n);
      if (off + n > s_ram_filled) s_ram_filled = off + n;
    } else if (persist_write_data(chunk_key(s_pending_slot, chunk), data, n) != (int)n) {
      ok = false;
    }
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
  const uint32_t total_bytes = packed_bytes(h.w, h.h);
  if (is_ram(slot)) {
    const bool complete = s_ram && s_ram_filled == total_bytes && s_pending_written == h.chunks;
    pending_reset(); // the buffer stays: it becomes the slot's image (or is freed just below)
    if (!complete) { ram_free(); return false; }
    s_header[slot] = h;
    s_loaded[slot] = true;
    return true;
  }
  pending_reset();
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

// One chunk of the packed image: from persistent storage, or from the plugin
// slot's RAM copy. Returns the byte count, or <= 0 when it cannot be read.
static int read_chunk(uint8_t slot, const BgHeader *hdr, uint16_t c, uint8_t *buf) {
  if (is_ram(slot)) {
    const uint32_t total = packed_bytes(hdr->w, hdr->h);
    const uint32_t off = (uint32_t)c * BG_IMG_CHUNK_BYTES;
    if (!s_ram || off >= total) return -1;
    uint32_t n = total - off;
    if (n > BG_IMG_CHUNK_BYTES) n = BG_IMG_CHUNK_BYTES;
    memcpy(buf, s_ram + off, n);
    return (int)n;
  }
  return persist_read_data(chunk_key(slot, c), buf, BG_IMG_CHUNK_BYTES);
}

bool bg_image_store_draw(uint8_t slot, GContext *ctx, GRect bounds, GPoint origin) {
  if (!slot_ok(slot)) return false;
  load_header(slot);
  const BgHeader hdr = s_header[slot];
  if (hdr.stamp == 0) return false;
  const int16_t w = (int16_t)hdr.w, h = (int16_t)hdr.h;

  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (!fb) return false;
#ifdef PBL_BW
  const GBitmapFormat want_format = GBitmapFormat1Bit;
#else
  const GBitmapFormat want_format = GBitmapFormat8Bit;
#endif
#ifdef PBL_BW
  if (gbitmap_get_format(fb) != want_format) {
#else
  if (!fb_is_8bit(fb)) { // plain or circular 8-bit (gabbro)
#endif
    graphics_release_frame_buffer(ctx, fb);
    return false;
  }
#ifdef PBL_BW
  uint8_t *screen = gbitmap_get_data(fb);
  const uint16_t stride = gbitmap_get_bytes_per_row(fb);
#else
  FbRow row = {NULL, 0, -1};
  int16_t row_y = -1;
#endif
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
    int n = read_chunk(slot, &hdr, c, buf);
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
#ifdef PBL_BW
          // The phone sends only the values 0 and 63 to a B&W watch (wire format A in
          // legacy_support.md, section 8.1); anything above the middle is white.
          bw_fb_put(screen, stride, sx, sy, v[k] > 31);
#else
          if (sy != row_y) { row = fb_row8(fb, sy); row_y = sy; }
          if (sx >= row.min_x && sx <= row.max_x) row.data[sx] = (uint8_t)(0xC0 | v[k]); // opaque GColor8
#endif
        }
        pixel++;
        if (++x == w) { x = 0; y++; }
      }
    }
  }
  graphics_release_frame_buffer(ctx, fb);
  return ok && pixel == total;
}

#endif // !PBL_BW
