#include "./marker_download.h"
#include <stdlib.h>

#define KEY_HEADER 199
#define KEY_CHUNK_BASE 6000
#define CHUNK_BYTES 255

typedef struct { uint32_t stamp; uint16_t w, h, chunks; } DlHeader;

static DlHeader s_hdr;       // the stored image; stamp 0 = none
static bool s_loaded;
static bool s_pending;
static DlHeader s_pend;

static uint32_t stride_of(uint16_t w) { return (uint32_t)(((w + 31) >> 5) << 2); }
static uint16_t chunks_for(uint16_t w, uint16_t h) {
  return (uint16_t)((stride_of(w) * h + CHUNK_BYTES - 1) / CHUNK_BYTES);
}

static void load(void) {
  if (s_loaded) return;
  s_loaded = true;
  s_hdr = (DlHeader){0};
  DlHeader h;
  if (persist_exists(KEY_HEADER) && persist_read_data(KEY_HEADER, &h, sizeof(h)) == (int)sizeof(h) &&
      h.stamp && h.w && h.h && h.chunks == chunks_for(h.w, h.h)) s_hdr = h;
}

uint32_t marker_download_stamp(void) { load(); return s_hdr.stamp; }
bool marker_download_active(void) { return s_pending; }
void marker_download_abort(void) { s_pending = false; }

void marker_download_clear(void) {
  load();
  persist_delete(KEY_HEADER);
  s_hdr = (DlHeader){0};
  s_pending = false;
}

void marker_download_begin(uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h) {
  s_pending = false;
  if (!w || !h || chunks != chunks_for(w, h)) return;
  s_pend = (DlHeader){ stamp, w, h, chunks };
  s_pending = true;
}

void marker_download_write(uint16_t index, const uint8_t *data, uint16_t len) {
  if (!s_pending || index >= s_pend.chunks || len > CHUNK_BYTES) { s_pending = false; return; }
  if (persist_write_data(KEY_CHUNK_BASE + index, data, len) != (int)len) {
    APP_LOG(APP_LOG_LEVEL_ERROR, "downloaded index: storage write failed at chunk %d", (int)index);
    s_pending = false;
  }
}

bool marker_download_commit(uint32_t stamp) {
  bool ok = s_pending && stamp == s_pend.stamp;
  s_pending = false;
  if (!ok) { APP_LOG(APP_LOG_LEVEL_ERROR, "downloaded index: transfer incomplete"); return false; }
  if (persist_write_data(KEY_HEADER, &s_pend, sizeof(s_pend)) != (int)sizeof(s_pend)) return false;
  s_hdr = s_pend;
  s_loaded = true;
  return true;
}

// Draws the image centred in `bounds` as runs of 1-pixel-high rectangles, straight from persistent storage through a
// small buffer: no bitmap is ever allocated (the colour watches have little heap to spare for a full-screen picture).
void marker_download_draw(GContext *ctx, GRect bounds, GColor color) {
  load();
  if (!s_hdr.stamp) return;
  const uint32_t stride = stride_of(s_hdr.w), total = stride * s_hdr.h;
  const int16_t ox = bounds.origin.x + (bounds.size.w - (int16_t)s_hdr.w) / 2;
  const int16_t oy = bounds.origin.y + (bounds.size.h - (int16_t)s_hdr.h) / 2;
  graphics_context_set_fill_color(ctx, color);
  uint8_t buf[CHUNK_BYTES];
  int16_t run_start = -1;
  for (uint16_t i = 0; i < s_hdr.chunks; i++) {
    const uint32_t off = (uint32_t)i * CHUNK_BYTES;
    const uint32_t n = total - off < CHUNK_BYTES ? total - off : CHUNK_BYTES;
    if (persist_read_data(KEY_CHUNK_BASE + i, buf, n) != (int)n) {
      APP_LOG(APP_LOG_LEVEL_ERROR, "downloaded index: chunk %d missing in storage", (int)i);
      return;
    }
    for (uint32_t k = 0; k < n; k++) {
      const uint32_t o = off + k;
      const int16_t y = (int16_t)(o / stride), bx = (int16_t)((o % stride) * 8);
      for (int b = 0; b < 8; b++) {
        const int16_t x = (int16_t)(bx + b);
        const bool ink = x < (int16_t)s_hdr.w && ((buf[k] >> b) & 1);
        if (ink && run_start < 0) run_start = x;
        if (run_start >= 0 && (!ink || x == (int16_t)s_hdr.w - 1)) {
          const int16_t end = ink ? x + 1 : x;
          graphics_fill_rect(ctx, GRect(ox + run_start, oy + y, end - run_start, 1), 0, GCornerNone);
          run_start = -1;
        }
      }
      if ((o % stride) == stride - 1) run_start = -1; // a run never continues into the next row
    }
  }
}
