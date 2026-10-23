#pragma once
#include <pebble.h>
#include "../data/watch_data.h"

typedef struct {
  void (*wake)(void *context);
  void (*animation_frame)(void *context);
  void (*compass_feature_refresh)(void *context);
  // The "show on shake" window opened or closed: show/hide those features.
  void (*shake_features_changed)(void *context);
  void *context;
} InputCallbacks;

void input_init(WatchData *data, InputCallbacks callbacks, void *context);
void input_deinit(void);
// True for shake_seconds after a shake: features flagged "show on shake"
// are drawn only while this is true (independent of the shake animation mode).
bool input_shake_features_active(void);
// True while a shake-triggered smooth-second animation is running.
bool input_shake_animation_active(void);
int32_t input_compass_feature_heading_deg(void);
bool input_compass_feature_is_asleep(void);
