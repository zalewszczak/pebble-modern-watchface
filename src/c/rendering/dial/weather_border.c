#include "./weather_border.h"
#include "../../features/feature_colors.h"
#include <string.h>

// Forecast slot of "h hours from now" (h = 1..12): 1-6 h are slots 0-5,
// 7-12 h are slots 9-14 (see watch_data.h).
static int slot_for_hour(int h) { return h <= 6 ? h - 1 : 9 + (h - 7); }

// ---- colour schemes (mirrored by config/config-border.js) --------------------

typedef struct { uint8_t r, g, b; } Rgb;

// Weather classes: 0 clear, 1 partly, 2 overcast, 3 fog, 4 drizzle, 5 rain,
// 6 heavy rain, 7 snow, 8 thunder, 9 sleet.

// Scheme 0, classic: only six looks.
// Scheme 1, detailed: every class its own colour.
// Scheme 2, hazard: green -> red severity.
static const Rgb WX_DETAILED[10] = {
  {0, 0, 0}, {170, 170, 170}, {0, 0, 0}, {85, 85, 85}, {170, 255, 255},
  {0, 85, 255}, {0, 0, 170}, {255, 255, 255}, {255, 255, 0}, {85, 170, 255}
};
static const Rgb WX_HAZARD[10] = {
  {0, 0, 0}, {170, 255, 170}, {0, 255, 0}, {255, 255, 85}, {255, 255, 0},
  {255, 170, 0}, {255, 0, 0}, {170, 0, 255}, {255, 0, 255}, {255, 0, 170}
};

// Temperature schemes 1 and 2: equally spaced stops across -10..40 C.
static const Rgb TEMP_COLD_HOT[5] = {
  {0, 0, 255}, {85, 170, 255}, {255, 255, 255}, {255, 170, 0}, {255, 0, 0}
};
static const Rgb TEMP_HEAT_MAP[5] = {
  {0, 0, 170}, {170, 0, 170}, {255, 0, 0}, {255, 170, 0}, {255, 255, 255}
};
// Rain-chance scheme 1 stops across 0..100 %.
static const Rgb RAIN_BLUE[3] = { {170, 255, 255}, {0, 170, 255}, {0, 0, 170} };

static GColor rgb_color(Rgb c) { return GColorFromRGB(c.r, c.g, c.b); }

static Rgb lerp_stops(const Rgb *stops, int n, int value, int min_v, int max_v) {
  if (value <= min_v) return stops[0];
  if (value >= max_v) return stops[n - 1];
  int segs = n - 1;
  int pos = ((value - min_v) * 1000 * segs) / (max_v - min_v);
  int seg = pos / 1000;
  if (seg > segs - 1) seg = segs - 1;
  int frac = pos - seg * 1000;
  Rgb a = stops[seg], b = stops[seg + 1], o;
  o.r = (uint8_t)(a.r + ((b.r - a.r) * frac) / 1000);
  o.g = (uint8_t)(a.g + ((b.g - a.g) * frac) / 1000);
  o.b = (uint8_t)(a.b + ((b.b - a.b) * frac) / 1000);
  return o;
}

static void set_color(uint8_t *c0, uint8_t *c1, GColor c) { *c0 = *c1 = c.argb; }

static void fill_conditions(const WatchData *d, int scheme, int slot, uint8_t *c0, uint8_t *c1) {
  int wx = d->forecast_wx[slot];
  if (wx > 9) wx = 0;
  *c0 = *c1 = 0;
  if (scheme == 0) {
    switch (wx) {
      case 0: return; // clear: transparent
      case 1: set_color(c0, c1, GColorLightGray); return;
      case 2: *c0 = GColorDarkGray.argb; *c1 = GColorLightGray.argb; return; // overcast checker
      case 3: set_color(c0, c1, GColorDarkGray); return;
      case 7: set_color(c0, c1, GColorWhite); return;
      default: set_color(c0, c1, feature_colors_white_to_turquoise_gradient(100, 0, 100)); return; // any rain
    }
  }
  const Rgb *table = scheme == 1 ? WX_DETAILED : WX_HAZARD;
  if (wx == 0) return;
  if (scheme == 1 && wx == 2) { *c0 = GColorDarkGray.argb; *c1 = GColorLightGray.argb; return; }
  set_color(c0, c1, rgb_color(table[wx]));
}

static void fill_temperature(const WatchData *d, int scheme, int slot, uint8_t *c0, uint8_t *c1) {
  int t = d->forecast_temp_c[slot];
  GColor c;
  if (scheme == 1) c = rgb_color(lerp_stops(TEMP_COLD_HOT, 5, t, -10, 40));
  else if (scheme == 2) c = rgb_color(lerp_stops(TEMP_HEAT_MAP, 5, t, -10, 40));
  else if (d->forecast_temp_display[slot][0] != '\0') c.argb = d->forecast_temp_color[slot];
  else c = feature_colors_seven_stop_gradient(t, -10, 40);
  set_color(c0, c1, c);
}

static void fill_rain(const WatchData *d, int scheme, int slot, uint8_t *c0, uint8_t *c1) {
  int p = d->forecast_rain_pct[slot];
  if (p > 100) p = 100;
  *c0 = *c1 = 0;
  if (scheme == 0) {
    if (p < 5) return;
    set_color(c0, c1, feature_colors_white_to_turquoise_gradient(p, 0, 100));
  } else if (scheme == 1) {
    if (p < 5) return;
    set_color(c0, c1, rgb_color(lerp_stops(RAIN_BLUE, 3, p, 0, 100)));
  } else {
    if (p < 20) return;
    Rgb c = p < 50 ? (Rgb){255, 255, 0} : (p < 80 ? (Rgb){255, 170, 0} : (Rgb){255, 0, 0});
    set_color(c0, c1, rgb_color(c));
  }
}

bool weather_border_compute(const WatchData *d, time_t now, WeatherBorderLook *out) {
  memset(out, 0, sizeof(*out));
  int mode = d->border_weather_mode;
  if (mode < 1 || mode > 4) return false;
  int px = d->border_weather_px;
  if (px < 2) px = 2;
  if (px > 40) px = 40;
  out->px = (uint8_t)px;
  out->semi = d->border_weather_semi ? 1 : 0;
  out->layers = (mode == 4) ? 3 : 1;
  int scheme = d->border_weather_scheme > 2 ? 0 : d->border_weather_scheme;

  struct tm *t = localtime(&now);
  int hour12 = t ? (t->tm_hour % 12) : 0;

  for (int h = 1; h <= 12; h++) {
    int slot = slot_for_hour(h);
    int sector = (hour12 + h) % 12;
    if (d->forecast_temp_c[slot] <= -128) continue; // no data: stay transparent
    if (mode == 4) {
      fill_temperature(d, scheme, slot, &out->c0[0][sector], &out->c1[0][sector]); // outer
      fill_rain(d, scheme, slot, &out->c0[1][sector], &out->c1[1][sector]);        // middle
      fill_conditions(d, scheme, slot, &out->c0[2][sector], &out->c1[2][sector]);  // inner
    } else if (mode == 1) {
      fill_conditions(d, scheme, slot, &out->c0[0][sector], &out->c1[0][sector]);
    } else if (mode == 2) {
      fill_temperature(d, scheme, slot, &out->c0[0][sector], &out->c1[0][sector]);
    } else {
      fill_rain(d, scheme, slot, &out->c0[0][sector], &out->c1[0][sector]);
    }
  }
  return true;
}

uint32_t weather_border_signature(const WeatherBorderLook *look) {
  uint32_t h = 2166136261u;
  h = (h ^ look->px) * 16777619u;
  h = (h ^ look->semi) * 16777619u;
  h = (h ^ look->layers) * 16777619u;
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

void weather_border_draw(GContext *ctx, const WeatherBorderLook *look, GRect bounds, GPoint origin) {
  const int w = bounds.size.w, h = bounds.size.h;
  const int t = look->px;
  const int layers = look->layers ? look->layers : 1;
  const bool semi = look->semi != 0;
  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  uint8_t *data = NULL;
  uint16_t stride = 0;
  if (fb && gbitmap_get_format(fb) == GBitmapFormat8Bit) {
    GRect fbb = gbitmap_get_bounds(fb);
    if (origin.x >= fbb.origin.x && origin.y >= fbb.origin.y &&
        origin.x + w <= fbb.origin.x + fbb.size.w && origin.y + h <= fbb.origin.y + fbb.size.h) {
      data = gbitmap_get_data(fb);
      stride = gbitmap_get_bytes_per_row(fb);
    }
  }

  for (int y = 0; y < h; y++) {
    const int dy2 = 2 * y + 1 - h; // doubled offsets keep the centre exact
    const int dist_y = y < h - 1 - y ? y : h - 1 - y;
    const bool full_row = dist_y < t;
    for (int x = 0; x < w; x++) {
      if (!full_row && x >= t && x < w - t) { x = w - t - 1; continue; } // skip the interior
      const int dist_x = x < w - 1 - x ? x : w - 1 - x;
      const int depth = dist_x < dist_y ? dist_x : dist_y; // pixels from the nearest screen edge
      if (depth >= t) continue;
      if (semi && ((x + y) & 1)) continue; // checkerboard: draw every other pixel
      int layer = (depth * layers) / t;    // 0 = outermost stripe
      int s = sector_of(2 * x + 1 - w, dy2);
      // Overcast's two grays alternate per pixel; in semi mode the drawn
      // pixels are all one parity, so alternate per row instead.
      uint8_t c = (semi ? (y & 1) : ((x + y) & 1)) ? look->c1[layer][s] : look->c0[layer][s];
      if (!c) continue;
      if (data) {
        data[(int32_t)(origin.y + y) * stride + origin.x + x] = c;
      } else {
        GColor gc; gc.argb = c;
        graphics_context_set_stroke_color(ctx, gc);
        graphics_draw_pixel(ctx, GPoint(x, y));
      }
    }
  }
  if (fb) graphics_release_frame_buffer(ctx, fb);
}
