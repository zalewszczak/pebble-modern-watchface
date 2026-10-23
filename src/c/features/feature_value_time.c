#include <pebble.h>
#include "./feature_value_time.h"
#include "./feature_value_helpers.h"
#include "./feature_slot.h"
#include "../data/watch_data.h"
#include "./feature_colors.h"

// Phase 13 (IMPLEMENTATION_NOTES.md Update 33): calendar/date content ids (12, 19, 21-30,
// 98, 99, 106) are fully primitive-transport-covered (primitive_resolver.c, since Update 25)
// and removed here, same reasoning as feature_value_weather.c/feature_value_composite.c's
// cleanup. The core clock cases (18, 63-72, 86 -- the actual H:MM/seconds/hour/minute/AM-PM
// display) are KEPT here deliberately, even though they're transport-covered too: this is
// the single most safety-critical rendering path in the app (the primary reason a watch
// exists), and primitive_transport_try_build() failing for these specific contents for any
// reason -- a future bug, a transport-layer edge case -- would mean a blank clock instead of
// the old renderer catching it, unlike every other case removed across this refactor's
// cleanup, where the worst case is a missing status readout. See Update 33's own writeup for
// why this one is called out explicitly rather than folded into the general cleanup.
void __attribute__((noinline)) feature_value_date_compute(FeatureSlot *slot, uint8_t content, const WatchData *data,
                                uint8_t color_mode, GColor main_color, GColor accent_color, time_t now, struct tm *t) {
  char buf[24];
  GColor dyn = main_color;

  switch (content) {
    case 18: { // digital time ("Time") -- day/night gradient off the actual sunrise/sunset
      strftime(buf, sizeof(buf), clock_is_24h_style() ? "%H:%M" : "%I:%M %p", t);
      dyn = feature_colors_daynight_gradient(now, data->sun_rise, data->sun_set);
      break;
    }
    case 63: { // full time with seconds -- day/night gradient, same as digital time
      strftime(buf, sizeof(buf), clock_is_24h_style() ? "%H:%M:%S" : "%I:%M:%S %p", t);
      dyn = feature_colors_daynight_gradient(now, data->sun_rise, data->sun_set);
      break;
    }
    case 64: snprintf(buf, sizeof(buf), "%02d", t->tm_hour); dyn = feature_colors_linear_white_black(t->tm_hour, 0, 23); break;
    case 65: snprintf(buf, sizeof(buf), "%d", t->tm_hour); dyn = feature_colors_linear_white_black(t->tm_hour, 0, 23); break;
    case 66: {
      int hour12 = t->tm_hour % 12; if (hour12 == 0) hour12 = 12;
      snprintf(buf, sizeof(buf), "%d", hour12); dyn = feature_colors_linear_white_black(hour12, 1, 12);
      break;
    }
    case 67: snprintf(buf, sizeof(buf), "%d", t->tm_min); dyn = feature_colors_linear_white_black(t->tm_min, 0, 59); break;
    case 68: snprintf(buf, sizeof(buf), "%02d", t->tm_min); dyn = feature_colors_linear_white_black(t->tm_min, 0, 59); break;
    case 69: snprintf(buf, sizeof(buf), "%d", t->tm_sec); dyn = feature_colors_linear_white_black(t->tm_sec, 0, 59); break;
    case 70: snprintf(buf, sizeof(buf), "%02d", t->tm_sec); dyn = feature_colors_linear_white_black(t->tm_sec, 0, 59); break;
    case 71: snprintf(buf, sizeof(buf), "%d", t->tm_sec / 10); dyn = feature_colors_linear_white_black(t->tm_sec / 10, 0, 5); break;
    case 72: snprintf(buf, sizeof(buf), "%d", t->tm_sec % 10); dyn = feature_colors_linear_white_black(t->tm_sec % 10, 0, 9); break;
    case 86: snprintf(buf, sizeof(buf), "%s", t->tm_hour < 12 ? "AM" : "PM"); dyn = (t->tm_hour < 12) ? GColorBlack : GColorWhite; break;
    default:
      slot->segment_count = 0;
      return;
  }
  slot->segment_count = 1;
  feature_value_set_text_segment(slot, 0, buf, feature_value_resolve_flat_color(color_mode, dyn, main_color, accent_color));
}

// Phase 13 (Update 33): the timezone cluster (content 44-62) is fully
// primitive-transport-covered (PRIM_TIMEZONE_ABBR/_TIME/_AMPM, resolved per-zone from the aux
// byte -- primitive_resolver.c). This function is never reached in normal operation anymore;
// kept as a stub (rather than removed entirely) so feature_values_compute_slot()'s dispatch
// table doesn't need restructuring for a content range that still conceptually exists.
void __attribute__((noinline)) feature_value_timezone_compute(FeatureSlot *slot, uint8_t content, uint8_t color_mode,
                                    GColor main_color, GColor accent_color, time_t now) {
  (void)content; (void)color_mode; (void)main_color; (void)accent_color; (void)now;
  slot->segment_count = 0;
}

// Phase 13 (Update 33): the astronomy cluster (11, 13, 16, 79-85 -- moon phase, location,
// sun event, planets visible, meteor shower, Saturn rings, next planet rise, ISS pass,
// aurora Kp, compass) is fully primitive-transport-covered (primitive_resolver.c, since
// Update 24). Same low-stakes "status readout" risk tier as the weather/composite cleanups
// already done -- removed in full, stub only.
void __attribute__((noinline)) feature_value_astro_compute(FeatureSlot *slot, uint8_t content, const WatchData *data,
                               uint8_t color_mode, GColor main_color, GColor accent_color, time_t now) {
  (void)content; (void)data; (void)color_mode; (void)main_color; (void)accent_color; (void)now;
  slot->segment_count = 0;
}
