#pragma once

#include <pebble.h>
#include "../data/watch_data.h"
#include "../input/input.h"

// Coordinates visual status updates and the presentation-side callbacks from
// the input subsystem. This module owns how application events invalidate or
// update visible layers; policy/state remains in the corresponding services.
void watchface_ui_init(WatchData *data);
void watchface_ui_deinit(void);

void watchface_ui_refresh_status(void);

const InputCallbacks *watchface_ui_input_callbacks(void);
