#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// The custom background image, drawn behind the markers. Never kept in RAM:
// it is only ever drawn while the dial's static cache is (re)built
// (dial_cache.c), then forgotten.

// Draws the selected image (predefined resource, or the uploaded one from
// persistent storage) centred in `bounds`. `origin` is the layer's screen
// position. Does nothing when the feature is off.
void bg_image_draw(GContext *ctx, const WatchData *d, GRect bounds, GPoint origin);

// Identifies what bg_image_draw() would draw (0 = nothing), for the cache
// signature: changes whenever the selected image changes.
uint32_t bg_image_signature(const WatchData *d);
