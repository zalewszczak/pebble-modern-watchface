#include <pebble.h>
#include "./watchface_ui.h"
#include "../data/watch_ui.h"
#include "../rendering/dial/dial_layer.h"
#include "../rendering/status/status_label.h"
#include "./layout_controller.h"
#include "../features/features_layer.h"
#include "../input/input.h"
#include "../power/battery_saver.h"

static WatchData *s_data;

void watchface_ui_init(WatchData *data) {
  s_data = data;
}

void watchface_ui_deinit(void) {
  s_data = NULL;
}

void watchface_ui_refresh_status(void) {
  if (!s_data) return;

  // Only the battery saver has something to say; otherwise the label is hidden.
  char text[16] = "";
  bool hide_label = true;
  if (battery_saver_phase() == BATTERY_SAVER_DEEP_SLEEP) {
    snprintf(text, sizeof(text), "Zzzzzzz");
    hide_label = false;
  } else if (battery_saver_phase() == BATTERY_SAVER_SLEEP) {
    snprintf(text, sizeof(text), "Zzz");
    hide_label = false;
  }

  GColor bg, main_color, accent_color;
  watch_ui_get_active_color_scheme(s_data, time(NULL), &bg, &main_color, &accent_color);
  status_label_set(text, main_color, hide_label);

  if (layout_controller_dial_layer()) layer_mark_dirty(layout_controller_dial_layer());
  if (layout_controller_hands_layer()) layer_mark_dirty(layout_controller_hands_layer());
}

static void input_wake_handler(void *context) {
  (void)context;
  watchface_ui_refresh_status();
}

static void input_animation_frame_handler(void *context) {
  (void)context;
  if (layout_controller_hands_layer()) layer_mark_dirty(layout_controller_hands_layer());
}

static void input_shake_features_changed_handler(void *context) {
  (void)context;
  // The weather border (in the dial's cached background) may be shake-only.
  if (layout_controller_dial_layer()) layer_mark_dirty(layout_controller_dial_layer());
  Layer *features = layout_controller_features_layer();
  if (!features) return;
  features_layer_refresh_values(features); // values of hidden slots were not kept fresh
}

static void input_compass_feature_refresh_handler(void *context) {
  (void)context;
  if (layout_controller_features_layer()) features_layer_refresh_content(layout_controller_features_layer(), 85);
}

const InputCallbacks *watchface_ui_input_callbacks(void) {
  static const InputCallbacks callbacks = {
    .wake = input_wake_handler,
    .animation_frame = input_animation_frame_handler,
    .compass_feature_refresh = input_compass_feature_refresh_handler,
    .shake_features_changed = input_shake_features_changed_handler,
    .context = NULL,
  };
  return &callbacks;
}
