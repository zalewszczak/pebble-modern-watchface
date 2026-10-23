#pragma once

#include <pebble.h>
#include "../data/watch_data.h"

// Owns the application-level composition of the dial, hands, feature and
// status layers.
void layout_controller_init(WatchData *data, Window *window);
void layout_controller_deinit(void);

void layout_controller_apply(void);
void layout_controller_unload(void);
void layout_controller_handle_unobstructed(AnimationProgress progress);

Layer *layout_controller_dial_layer(void);
Layer *layout_controller_bg_progress_layer(void);
Layer *layout_controller_hands_layer(void);
Layer *layout_controller_features_layer(void);
