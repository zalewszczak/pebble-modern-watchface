#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// Weather border: a band along the screen edge (2-40 px) that shows the next
// 12 hours. It is laid out like the watch face: the sector at a clock
// position shows the weather for the hour that will next be at that position
// (at 14:20 the 3 o'clock sector is 15:00, i.e. +1 h, and 2 o'clock is +12 h).
// Drawn into the dial's static cache below the indices, so it costs nothing
// per tick.
//
// Styles (border_weather_mode): 1 conditions, 2 temperature, 3 rain chance,
// 4 all three as stripes (outer = temperature, middle = conditions,
// inner = rain chance). Each style has three colour schemes
// (border_weather_scheme 0-2).

#define WEATHER_BORDER_MAX_LAYERS 3

// Per-sector colours for each stripe. Two ARGB bytes per sector so overcast
// can be a 50 % checker of two grays (the 64-colour palette has only two mid
// grays); 0 = transparent (nothing drawn). Layer 0 is the outermost stripe.
typedef struct {
  uint8_t c0[WEATHER_BORDER_MAX_LAYERS][12];
  uint8_t c1[WEATHER_BORDER_MAX_LAYERS][12];
  uint8_t layers;  // 1 or 3
  uint8_t px;      // total thickness
  uint8_t semi;    // draw only every other pixel
} WeatherBorderLook;

// Returns false when the border is off.
bool weather_border_compute(const WatchData *d, time_t now, WeatherBorderLook *out);

// Hash of everything weather_border_compute() produced, for the cache signature.
uint32_t weather_border_signature(const WeatherBorderLook *look);

void weather_border_draw(GContext *ctx, const WeatherBorderLook *look, GRect bounds, GPoint origin);
