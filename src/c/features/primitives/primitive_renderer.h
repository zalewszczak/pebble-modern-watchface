#pragma once

// Draws resolved feature primitives without interpreting their data.
// Text outlines are drawn in a separate pass before text content. Icon outlines
// remain part of each icon's draw call because icon renderers expose no separate
// outline pass; feature primitives do not overlap, so this does not affect output.

#include <pebble.h>
#include "./primitive_storage.h"

typedef struct FeatureSlot FeatureSlot; // feature_slot.h

void primitive_renderer_draw_feature(GContext *ctx, int16_t box_x, int16_t box_y, int16_t row_height,
                                     const PrimitiveFeature *feature, const FeatureSlot *slot,
                                     GFont font, int16_t font_h, int16_t font_offset,
                                     uint8_t outline_style, uint8_t icon_style, bool draw_debug);
