#include <pebble.h>
#include "./feature_value_weather.h"
#include "./feature_value_helpers.h"
#include "./feature_slot.h"
#include "../data/watch_data.h"

// Phase 13 (IMPLEMENTATION_NOTES.md Update 33): every content id this file used to render
// (4-9, 14, 15, 31, 32, 34-38, 73-77, 87-97, 107 -- temperatures, UV, rain/humidity/wind,
// visibility, cloud cover, pressure, wind direction, AQI, dew point, altitude, forecasts,
// weather-refresh status) now has full primitive-transport coverage
// (primitive_resolver.c, since Updates 24-25). primitive_transport_try_build() always tries
// the transported sequence first for every one of them; this function's `default` case (a
// blank render) is now the only body left, matching feature_value_composite.c's post-cleanup
// shape. Removed along with the 32 cases: temp_display_or_fallback(), temp_display_and_color(),
// weather_icon_category_or_fallback(), weather_condition_color_or_fallback() -- all four were
// only called from the removed cases.
void __attribute__((noinline)) feature_value_weather_compute(FeatureSlot *slot, uint8_t content, const WatchData *data,
                                uint8_t color_mode, GColor main_color, GColor accent_color, GColor bg_color) {
  (void)content; (void)data; (void)color_mode; (void)main_color; (void)accent_color; (void)bg_color;
  slot->segment_count = 0;
}
