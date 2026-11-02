#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// The dial: background fill plus the hour/second markers (a bitmap style or
// custom rings with numerals).
Layer *dial_layer_create(GRect frame);
void dial_layer_destroy(Layer *layer);
void dial_layer_set_data(Layer *layer, WatchData *data);

// Frees the dial's cached bitmap (about 45 KB) and drawing resources; the next
// draw rebuilds them. Used to make room for the plugin background picture.
void dial_layer_release_cache(Layer *layer);

// Updates the launch marker-animation state used by the renderer.
void dial_layer_set_animation(Layer *layer, bool active, uint16_t elapsed_ms);
