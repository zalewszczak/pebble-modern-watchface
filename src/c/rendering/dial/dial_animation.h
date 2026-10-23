#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// Duration of the launch animation. The hands use the same length.
#define DIAL_ANIMATION_DURATION_MS 1400

// Starts the one-shot launch animation of the hour markers when the current
// settings ask for it.
void dial_animation_start(WatchData *data, Layer *dial_layer);

// Cancels any pending animation timer. Call during app shutdown.
void dial_animation_deinit(void);
