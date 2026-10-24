#include "./weather_border.h"
#include "../../features/feature_colors.h"
#include <string.h>

// Forecast slot of "h hours from now" (h = 1..12): 1-6 h are slots 0-5,
// 7-12 h are slots 9-14 (see watch_data.h).
static int slot_for_hour(int h) { return h <= 6 ? h - 1 : 9 + (h - 7); }

// Weather condition class -> sector colour.
enum { WB_CLEAR, WB_PARTLY, WB_OVERCAST, WB_FOG, WB_RAIN, WB_SNOW };

static int condition_class(const WatchData *d, int slot) {
  switch (d->forecast_condition[slot]) {
    case 1: return WB_FOG;
    case 2: return WB_RAIN;
    case 3: return WB_SNOW;
    case 4: return WB_RAIN; // storm: shown as rain
    default: break;
  }
  uint8_t cloud = d->forecast_cloud_pct[slot];
  if (cloud < 20) return WB_CLEAR;
  if (cloud < 60) return WB_PARTLY;
  return WB_OVERCAST;
}

static void set_solid(WeatherBorderLook *o, int s, GColor c) {
  o->c0[s] = o->c1[s] = c.argb;
}

bool weather_border_compute(const WatchData *d, time_t now, WeatherBorderLook *out) {
  memset(out, 0, sizeof(*out));
  if (d->border_weather_mode != 1 && d->border_weather_mode != 2) return false;
  int px = d->border_weather_px;
  if (px < 2) px = 2;
  if (px > 40) px = 40;
  out->px = (uint8_t)px;

  struct tm *t = localtime(&now);
  int hour12 = t ? (t->tm_hour % 12) : 0;
  const GColor rain = feature_colors_white_to_turquoise_gradient(100, 0, 100);

  for (int h = 1; h <= 12; h++) {
    int slot = slot_for_hour(h);
    int sector = (hour12 + h) % 12;
    if (d->forecast_temp_c[slot] <= -128) continue; // no data: stay transparent
    if (d->border_weather_mode == 2) {
      GColor c;
      if (d->forecast_temp_display[slot][0] != '\0') {
        c.argb = d->forecast_temp_color[slot];
      } else {
        c = feature_colors_seven_stop_gradient(d->forecast_temp_c[slot], -10, 40);
      }
      set_solid(out, sector, c);
    } else {
      switch (condition_class(d, slot)) {
        case WB_RAIN: set_solid(out, sector, rain); break;
        case WB_SNOW: set_solid(out, sector, GColorWhite); break;
        case WB_FOG: set_solid(out, sector, GColorDarkGray); break;
        case WB_OVERCAST: // gray: checker of dark and light gray
          out->c0[sector] = GColorDarkGray.argb;
          out->c1[sector] = GColorLightGray.argb;
          break;
        case WB_PARTLY: set_solid(out, sector, GColorLightGray); break;
        default: break; // clear: transparent
      }
    }
  }
  return true;
}

uint32_t weather_border_signature(const WeatherBorderLook *look) {
  uint32_t h = 2166136261u ^ look->px;
  h *= 16777619u;
  for (int i = 0; i < 12; i++) {
    h = (h ^ look->c0[i]) * 16777619u;
    h = (h ^ look->c1[i]) * 16777619u;
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
    const bool full_row = (y < t) || (y >= h - t);
    const int dy2 = 2 * y + 1 - h; // doubled offsets keep the centre exact
    for (int x = 0; x < w; x++) {
      if (!full_row && x >= t && x < w - t) { x = w - t - 1; continue; } // skip the interior
      int s = sector_of(2 * x + 1 - w, dy2);
      uint8_t c = ((x + y) & 1) ? look->c1[s] : look->c0[s];
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
