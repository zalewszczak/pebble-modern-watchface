#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// The dial: background fill plus the hour/second markers (a bitmap style or
// custom rings with numerals).
Layer *dial_layer_create(GRect frame);
void dial_layer_destroy(Layer *layer);
void dial_layer_set_data(Layer *layer, WatchData *data);

// Updates the launch marker-animation state used by the renderer.
void dial_layer_set_animation(Layer *layer, bool active, uint16_t elapsed_ms);
