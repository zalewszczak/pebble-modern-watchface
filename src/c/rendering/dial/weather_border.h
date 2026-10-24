#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// Weather border: a band along the screen edge (2-40 px) that shows the next
// 12 hours. It is laid out like the watch face: the sector at a clock
// position shows the weather for the hour that will next be at that position
// (at 14:20 the 3 o'clock sector is 15:00, i.e. +1 h, and 2 o'clock is +12 h).
// Drawn into the dial's static cache below the indices, so it costs nothing
// per tick.

// Per-sector colours. Two ARGB bytes per sector so overcast can be a 50 %
// checker of two grays (the 64-colour palette has only two mid grays);
// 0 = transparent (nothing drawn).
typedef struct {
  uint8_t c0[12];
  uint8_t c1[12];
  uint8_t px;
} WeatherBorderLook;

// Returns false when the border is off (or has no data at all).
bool weather_border_compute(const WatchData *d, time_t now, WeatherBorderLook *out);

// Hash of everything weather_border_compute() produced, for the cache signature.
uint32_t weather_border_signature(const WeatherBorderLook *look);

void weather_border_draw(GContext *ctx, const WeatherBorderLook *look, GRect bounds, GPoint origin);
