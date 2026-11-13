#include "./weather_border.h"
#include "../../platform/platform_bw.h"
#include <string.h>

#ifdef PBL_BW
// Is pixel (x, y) drawn at pattern density `level`? (0 empty, 1 one in four, 2 checkerboard,
// 3 three in four, 4 solid.)
static bool pattern_on(uint8_t level, int x, int y) {
  switch (level) {
    case 1: return ((x & 1) == 0) && ((y & 1) == 0);
    case 2: return ((x + y) & 1) == 0;
    case 3: return !(((x & 1) == 1) && ((y & 1) == 1));
    case 4: return true;
    default: return false;
  }
}
#endif // PBL_BW

// Decodes the phone-built ring (WatchData.border_data, format in weather_border.h). Everything that
// decides what the ring shows (weather style and colour scheme, calendar events and colours) was
// already worked out on the phone; the watch only validates and unpacks it.
// Seconds since the ring started waiting for its first data (0 = not waiting).
static time_t s_wait_start;

static void make_placeholder(WeatherBorderLook *out, time_t now) {
  if (s_wait_start == 0) s_wait_start = now;
  const bool pending = (now - s_wait_start) < BORDER_WAIT_S;
  const int step = (int)(now % 12);
  out->state = pending ? WEATHER_BORDER_PENDING : WEATHER_BORDER_MISSING;
  out->layers = 1;
  out->semi = 0;
  for (int s = 0; s < 12; s++) {
    const bool lit = !pending || ((s - step + 12) % 12) < 4;
#ifdef PBL_BW
    out->c0[0][s] = lit ? (pending ? 3 : 2) : 0;
#else
    out->c0[0][s] = lit ? (pending ? GColorOrange.argb : GColorRed.argb) : 0;
    out->c1[0][s] = pending ? out->c0[0][s] : 0; // missing: every other pixel -> checkerboard
#endif
  }
}

// Decodes the phone-built ring (WatchData.border_data, format in weather_border.h). Everything that
// decides what the ring shows (weather style and colour scheme, calendar events and colours) was
// already worked out on the phone; the watch only validates and unpacks it.
bool weather_border_compute(const WatchData *d, time_t now, WeatherBorderLook *out) {
  memset(out, 0, sizeof(*out));
  if (d->border_weather_mode == 0) { s_wait_start = 0; return false; }
  int px = d->border_weather_px;
  if (px < 2) px = 2;
  if (px > 40) px = 40;
  out->px = (uint8_t)px;
  out->semi = d->border_weather_semi ? 1 : 0;

  const uint8_t *b = d->border_data;
  const int layers = b[0];
  bool ok = layers >= 1 && layers <= WEATHER_BORDER_MAX_LAYERS;
#ifdef PBL_BW
  out->layers = 1; // a pattern ring has one stripe; its levels are the first layer's c0
#else
  out->layers = (uint8_t)layers;
#endif

  int pos = 1;
  for (int l = 0; ok && l < layers; l++) {
    if (pos + 14 > BORDER_DATA_MAX) { ok = false; break; }
    const uint8_t *c0 = &b[pos];
    const uint16_t mask = (uint16_t)(b[pos + 12] | (b[pos + 13] << 8));
    pos += 14;
    for (int s = 0; s < 12; s++) {
      uint8_t second = c0[s];
      if (mask & (1u << s)) {
        if (pos >= BORDER_DATA_MAX) { ok = false; break; }
        second = b[pos++];
      }
#ifdef PBL_BW
      if (l == 0) out->c0[0][s] = c0[s] > 4 ? 4 : c0[s];
      (void)second;
#else
      out->c0[l][s] = c0[s];
      out->c1[l][s] = second;
#endif
    }
  }
  if (!ok) {
    memset(out->c0, 0, sizeof(out->c0));
    memset(out->c1, 0, sizeof(out->c1));
    make_placeholder(out, now);
    return true;
  }
  s_wait_start = 0;
  out->state = WEATHER_BORDER_DATA;
  return true;
}

uint32_t weather_border_signature(const WeatherBorderLook *look) {
  uint32_t h = 2166136261u;
  h = (h ^ look->px) * 16777619u;
  h = (h ^ look->semi) * 16777619u;
  h = (h ^ look->layers) * 16777619u;
  h = (h ^ look->ink) * 16777619u;
  h = (h ^ look->state) * 16777619u;
  for (int l = 0; l < WEATHER_BORDER_MAX_LAYERS; l++) {
    for (int i = 0; i < 12; i++) {
      h = (h ^ look->c0[l][i]) * 16777619u;
      h = (h ^ look->c1[l][i]) * 16777619u;
    }
  }
  return h ? h : 1u;
}

// Clock sector (0-11, 0 = 12 o'clock, clockwise) of the pixel at offset
// (dx, dy) from the centre (dy grows downwards). Sector s covers
// s*30 deg +- 15 deg. Integer-only: classifies the angle from the vertical
// axis against 15 / 45 / 75 degrees (tan = 0.268 / 1 / 3.732).
static int sector_of(int dx, int dy) {
  int ax = dx < 0 ? -dx : dx;
  int ay = dy < 0 ? -dy : dy;
  int band; // 0..3 -> 0, 30, 60, 90 degrees from the vertical axis
  if (ax * 1000 < ay * 268) band = 0;
  else if (ax < ay) band = 1;
  else if (ax * 1000 < ay * 3732) band = 2;
  else band = 3;
  if (dy < 0) return dx >= 0 ? band : (12 - band) % 12;       // upper half
  return dx >= 0 ? (6 - band) : (6 + band) % 12;               // lower half
}

#ifdef PBL_ROUND
// Integer square root (floor) for the circular border depth.
static int32_t border_isqrt(int32_t v) {
  if (v <= 0) return 0;
  int32_t r = 0, bit = 1 << 30;
  while (bit > v) bit >>= 2;
  while (bit) {
    if (v >= r + bit) { v -= r + bit; r = (r >> 1) + bit; } else { r >>= 1; }
    bit >>= 2;
  }
  return r;
}
#endif

void weather_border_draw(GContext *ctx, const WeatherBorderLook *look, GRect bounds, GPoint origin) {
  const int w = bounds.size.w, h = bounds.size.h;
  const int t = look->px;
  const int layers = look->layers ? look->layers : 1;
  const bool semi = look->semi != 0;
  GBitmap *fb = graphics_capture_frame_buffer(ctx);
#ifdef PBL_BW
  uint8_t *data = NULL;
  uint16_t stride = 0;
  GColor ink_color; ink_color.argb = look->ink;
  const bool ink_white = bw_color_is_white(ink_color);
  if (fb && gbitmap_get_format(fb) == GBitmapFormat1Bit) {
    GRect fbb = gbitmap_get_bounds(fb);
    if (origin.x >= fbb.origin.x && origin.y >= fbb.origin.y &&
        origin.x + w <= fbb.origin.x + fbb.size.w && origin.y + h <= fbb.origin.y + fbb.size.h) {
      data = gbitmap_get_data(fb);
      stride = gbitmap_get_bytes_per_row(fb);
    }
  }
  if (fb && !data) { graphics_release_frame_buffer(ctx, fb); fb = NULL; }
#else
  // Round screens (gabbro) keep their frame buffer in a circular 8-bit format whose rows have
  // different lengths, so rows are always addressed through gbitmap_get_data_row_info (valid for
  // every 8-bit format). While the frame buffer is captured, ordinary drawing calls draw nothing,
  // so a frame buffer that cannot be written directly is released before the per-pixel fallback.
  if (fb) {
    const GBitmapFormat f = gbitmap_get_format(fb);
    if (f != GBitmapFormat8Bit && f != GBitmapFormat8BitCircular) {
      static bool logged;
      if (!logged) { logged = true; APP_LOG(APP_LOG_LEVEL_WARNING, "border: fb format %d unsupported", (int)f); }
      graphics_release_frame_buffer(ctx, fb);
      fb = NULL;
    }
  }
#endif

  for (int y = 0; y < h; y++) {
    const int dy2 = 2 * y + 1 - h; // doubled offsets keep the centre exact
#ifndef PBL_BW
    uint8_t *row_data = NULL;
    int row_min = 1, row_max = 0; // empty range unless a frame-buffer row is available
    if (fb) {
      const GBitmapDataRowInfo ri = gbitmap_get_data_row_info(fb, (uint16_t)(origin.y + y));
      row_data = ri.data; row_min = ri.min_x; row_max = ri.max_x;
    }
#endif
#ifdef PBL_ROUND
    // Circular ring: depth is the distance inward from the circle edge. Doubled
    // coordinates again, so the circle radius is w (= 2 * w / 2).
    const int inner2 = w - 2 * t;
    const int ax_in = (inner2 > 0 && dy2 > -inner2 && dy2 < inner2)
      ? (int)border_isqrt((int32_t)inner2 * inner2 - (int32_t)dy2 * dy2) : 0; // interior half-width
    for (int x = 0; x < w; x++) {
      const int dx2 = 2 * x + 1 - w;
      if (ax_in > 0 && dx2 > -ax_in && dx2 < ax_in) { x = (w + ax_in) / 2 - 1; continue; } // skip the interior
      const int d2 = (int)border_isqrt((int32_t)dx2 * dx2 + (int32_t)dy2 * dy2);
      if (d2 >= w) continue; // outside the circle
      const int depth = (w - d2) / 2;
      if (depth >= t) continue;
#else
    const int dist_y = y < h - 1 - y ? y : h - 1 - y;
    const bool full_row = dist_y < t;
    for (int x = 0; x < w; x++) {
      if (!full_row && x >= t && x < w - t) { x = w - t - 1; continue; } // skip the interior
      const int dist_x = x < w - 1 - x ? x : w - 1 - x;
      const int depth = dist_x < dist_y ? dist_x : dist_y; // pixels from the nearest screen edge
      if (depth >= t) continue;
#endif
      if (semi && ((x + y) & 1)) continue; // checkerboard: draw every other pixel
      int layer = (depth * layers) / t;    // 0 = outermost stripe
      int s = sector_of(2 * x + 1 - w, dy2);
#ifdef PBL_BW
      (void)layer;
      if (!pattern_on(look->c0[0][s], x, y)) continue;
      if (data) {
        bw_fb_put(data, stride, origin.x + x, origin.y + y, ink_white);
      } else {
        graphics_context_set_stroke_color(ctx, ink_white ? GColorWhite : GColorBlack);
        graphics_draw_pixel(ctx, GPoint(x, y));
      }
      continue;
#else
      // Overcast's two grays alternate per pixel; in semi mode the drawn
      // pixels are all one parity, so alternate per row instead.
      uint8_t c = (semi ? (y & 1) : ((x + y) & 1)) ? look->c1[layer][s] : look->c0[layer][s];
      if (!c) continue;
      if (fb) {
        const int fx = origin.x + x;
        if (fx >= row_min && fx <= row_max) row_data[fx] = c;
      } else {
        GColor gc; gc.argb = c;
        graphics_context_set_stroke_color(ctx, gc);
        graphics_draw_pixel(ctx, GPoint(x, y));
      }
#endif
    }
  }
  if (fb) graphics_release_frame_buffer(ctx, fb);
}
