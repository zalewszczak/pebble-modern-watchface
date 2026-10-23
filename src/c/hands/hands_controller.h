#pragma once

#include <pebble.h>
#include "../data/watch_data.h"

typedef void (*HandsControllerInvalidateHandler)(void *context);

// Controls the hand layer and one-shot startup animation.


void hands_controller_init(WatchData *data, HandsControllerInvalidateHandler handler, void *context);
void hands_controller_deinit(void);

Layer *hands_controller_create_layer(GRect frame);
void hands_controller_destroy_layer(Layer *layer);

void hands_controller_start_startup_animation(void);
