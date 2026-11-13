#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"
#include "../../data/marker_types.h"
#include "../../fonts/font_lookup.h"
#include "../../graphics/subpixel.h"

// State owned exclusively by the marker renderer. The background canvas
typedef struct {
  GBitmap *bitmap;
  uint8_t bitmap_style;
  bool bitmap_tinted;
  GColor bitmap_tint_color;
  bool bitmap_tint_transparent;
  GPoint draw_origin; // layer origin in the frame buffer (needed by the invert blend)
  FontSlot text_font_slot;
} MarkerLayerState;

void marker_layer_init(MarkerLayerState *state);
void marker_layer_deinit(MarkerLayerState *state);
// Frees the bitmap and font the markers need while drawing (they are reloaded
// on demand by the next marker_layer_draw()).
void marker_layer_release_resources(MarkerLayerState *state);

// Which part of the markers to draw. The launch animation only moves the hour ring, so the dial
// draws everything else once (MARKER_DRAW_BASE: the second ring) into its cache and then draws just the
// hour ring and numerals (MARKER_DRAW_HOUR) on top of it every frame.
typedef enum {
  MARKER_DRAW_ALL = 0,
  MARKER_DRAW_BASE,
  MARKER_DRAW_HOUR,
} MarkerDrawPart;

void marker_layer_draw(GContext *ctx, MarkerLayerState *state, GPoint center, GRect screen,
                       const WatchData *data, GColor main_color, GColor accent_color,
                       GColor bg_color, MarkerDrawPart part, bool anim_active, int32_t anim_progress_1000,
                       bool draw_debug);

GPoint marker_layer_point_on_ring(GPoint center, GRect screen, int32_t angle,
                     uint8_t pct, uint8_t eccentricity_pct);

// Startup animation helper: each mark starts a little later than the one before.
int32_t marker_anim_mark_progress_1000_raw(int mark_index, int marks, int32_t overall_progress_1000);
