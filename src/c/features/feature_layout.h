#pragma once

#include <pebble.h>
#include "../data/watch_data.h"
#include "./feature_slot.h"

// Settings-driven feature layout. This module decides which cached slots
// are active and where they sit around the dial (four corners plus the
// upper/bottom/left/right edge slots, which stay clear of the marker art).
void feature_layout_recompute(FeaturesState *state);
