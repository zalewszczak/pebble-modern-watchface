#include <pebble.h>
#include "./watch_ui.h"

#define TWILIGHT_S 1800

static GColor watch_ui_color_from_packed(uint8_t packed) {
  GColor color;
  color.argb = packed;
  return color;
}

bool watch_ui_is_daylight(const WatchData *d, time_t now) {
  if (!d->valid || d->sun_rise == 0 || d->sun_set == 0) return true;
  // The stored times may be from an earlier day, so compare time-of-day
  // offsets from the (twilight-extended) sunrise rather than absolute times.
  int32_t start = (int32_t)(d->sun_rise - TWILIGHT_S);
  int32_t span = (int32_t)(d->sun_set + TWILIGHT_S) - start;
  span %= SECONDS_PER_DAY;
  if (span <= 0) span += SECONDS_PER_DAY;
  int32_t offset = (int32_t)((now - start) % SECONDS_PER_DAY);
  if (offset < 0) offset += SECONDS_PER_DAY;
  return offset <= span;
}

void watch_ui_get_active_color_scheme(const WatchData *data, time_t now,
                                      GColor *background, GColor *text, GColor *accent) {
  const bool night = data->night_scheme_enabled && !watch_ui_is_daylight(data, now);
  if (night) {
    *background = watch_ui_color_from_packed(data->night_custom_bg);
    *text = watch_ui_color_from_packed(data->night_custom_text);
    *accent = watch_ui_color_from_packed(data->night_custom_accent);
  } else {
    *background = watch_ui_color_from_packed(data->custom_bg);
    *text = watch_ui_color_from_packed(data->custom_text);
    *accent = watch_ui_color_from_packed(data->custom_accent);
  }
}

bool watch_ui_get_next_sun_event(time_t now, time_t sunrise, time_t sunset,
                                 time_t sunrise_tomorrow, time_t *event_time,
                                 bool *is_sunrise) {
  if (sunrise != 0 && now < sunrise) {
    *event_time = sunrise;
    *is_sunrise = true;
    return true;
  }
  if (sunset != 0 && now < sunset) {
    *event_time = sunset;
    *is_sunrise = false;
    return true;
  }
  if (sunrise_tomorrow != 0) {
    *event_time = sunrise_tomorrow;
    *is_sunrise = true;
    return true;
  }
  return false;
}
