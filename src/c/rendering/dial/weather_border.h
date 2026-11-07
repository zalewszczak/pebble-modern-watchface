#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// Border ring: a band along the screen edge (2-40 px) split into 12 clock sectors. It is laid out
// like the watch face: the sector at a clock position shows what happens the next time the hour hand
// is there. Drawn into the dial's static cache below the indices, so it costs nothing per tick.
//
// The watch does not know what the ring means. The phone (src/pkjs/border/border-data.js) builds it
// from the weather forecast or from the calendar and sends one BORDER_DATA block (WatchData.border_data):
//
//   byte 0        layers: 0 = no data, 1..3 stripes, outermost first
//   per layer     12 bytes  c0[sector]   GColor8 (0 = transparent); on B&W a pattern level 0-4
//                  2 bytes  mask (LE)    bit s set -> sector s has its own second colour
//                  n bytes  c1[s] for each set bit, ascending s (otherwise c1 = c0)
//
// c0 and c1 alternate per pixel, which gives overcast its two greys and lets a sector show two
// calendars or a half-density tint.

#define WEATHER_BORDER_MAX_LAYERS 3

// B&W watches (flint, diorite) have no colour, so the border becomes a pattern ring: each sector's
// density (0 nothing, 1 sparse dots, 2 checkerboard, 3 dense, 4 solid) is the phone's grey-scale
// equivalent of the colour, drawn in the text colour (`ink`). The levels live in c0[0][sector]; c1 is unused.
// `ink` is filled in by the dial layer (the compute step does not know the colour scheme).
//
// Per-sector colours for each stripe. Two ARGB bytes per sector so overcast
// can be a 50 % checker of two grays (the 64-colour palette has only two mid
// grays); 0 = transparent (nothing drawn). Layer 0 is the outermost stripe.
typedef struct {
  uint8_t c0[WEATHER_BORDER_MAX_LAYERS][12];
  uint8_t c1[WEATHER_BORDER_MAX_LAYERS][12];
  uint8_t layers;  // 1 or 3
  uint8_t px;      // total thickness
  uint8_t semi;    // draw only every other pixel
  uint8_t ink;     // B&W only: packed GColor of the pattern pixels
} WeatherBorderLook;

// Returns false when the ring is off or no data has arrived yet.
bool weather_border_compute(const WatchData *d, time_t now, WeatherBorderLook *out);

// Hash of everything weather_border_compute() produced, for the cache signature.
uint32_t weather_border_signature(const WeatherBorderLook *look);

void weather_border_draw(GContext *ctx, const WeatherBorderLook *look, GRect bounds, GPoint origin);
