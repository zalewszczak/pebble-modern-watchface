#pragma once

#include <pebble.h>

// Procedural feature icons that are small vector drawings rather than
void feature_vector_icons_battery(GContext *ctx, GPoint top_left, GColor color, int charge);
void feature_vector_icons_pressure_trend(GContext *ctx, GPoint top_left, uint8_t trend, GColor color);
void feature_vector_icons_wind_direction(GContext *ctx, GPoint top_left, int16_t from_deg, GColor color);
void feature_vector_icons_compass(GContext *ctx, GPoint top_left, int16_t heading_deg,
                                  GColor north_color, GColor other_color);
void feature_vector_icons_compass_sleep(GContext *ctx, GPoint top_left, GColor color);
// Phone glyph; `level` 0-100 fills the little battery bar along its bottom, unknown = outline only.
void feature_vector_icons_phone(GContext *ctx, GPoint top_left, int size, GColor color, int level, bool unknown);
// Media state glyph: state 1 = play triangle, 2 = pause bars, 0 = music note.
void feature_vector_icons_media_state(GContext *ctx, GPoint top_left, int size, GColor color, uint8_t state);
// Tiny album art: size x size GColor8 bytes (transparent bytes skipped); falls back to a framed note when empty.
void feature_vector_icons_media_art(GContext *ctx, GPoint top_left, int size, const uint8_t *pixels, GColor frame);
// Progress bar `width` x 5; pct 0-100, unknown = dashed track.
void feature_vector_icons_progress_bar(GContext *ctx, GPoint top_left, int width, int pct, bool unknown, GColor color);
void feature_vector_icons_mountain(GContext *ctx, GPoint top_left, GColor color);
