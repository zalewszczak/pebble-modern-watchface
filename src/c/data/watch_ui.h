#pragma once

#include <pebble.h>
#include "./watch_data.h"

// True while the Sun is up or within about half an hour of it (civil
// twilight). Based on the phone-supplied sunrise/sunset; defaults to true
// when they are unknown.
bool watch_ui_is_daylight(const WatchData *data, time_t now);

// Resolves the active day/night color scheme.
void watch_ui_get_active_color_scheme(const WatchData *data, time_t now,
                                      GColor *background, GColor *text, GColor *accent);

// Returns the next sunrise or sunset from the supplied daily times.
bool watch_ui_get_next_sun_event(time_t now, time_t sunrise, time_t sunset,
                                 time_t sunrise_tomorrow, time_t *event_time,
                                 bool *is_sunrise);
