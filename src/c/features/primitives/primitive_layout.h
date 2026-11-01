#pragma once

// Computes primitive widths and offsets when feature data changes, not while drawing.
// Layout depends only on resolved primitive types and payloads, not their meaning.

#include <pebble.h>
#include "./primitive_storage.h"

typedef struct FeatureSlot FeatureSlot; // feature_slot.h

// Alignment and available width come from the feature slot's layout settings.
void primitive_layout_compute(PrimitiveFeature *feature, const FeatureSlot *slot, GFont font, int16_t font_h);
