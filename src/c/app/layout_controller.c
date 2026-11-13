#include <pebble.h>
#include "./layout_controller.h"
#include "../rendering/dial/dial_layer.h"
#include "../rendering/dial/bg_progress.h"
#include "../rendering/dial/bg_image_store.h"
#include "../rendering/status/status_label.h"
#include "../features/features_layer.h"
#include "../hands/hands_controller.h"

static WatchData *s_data;
static Window *s_window;
static Layer *s_dial_layer;
static Layer *s_progress_layer;
static Layer *s_hands_layer;
static Layer *s_features_layer;
static bool s_current_draw_features_beneath_hands;

Layer *layout_controller_dial_layer(void) { return s_dial_layer; }
Layer *layout_controller_bg_progress_layer(void) { return s_progress_layer; }
Layer *layout_controller_hands_layer(void) { return s_hands_layer; }
Layer *layout_controller_features_layer(void) { return s_features_layer; }

// The plugin background picture needs a RAM buffer about the size of the dial cache.
// When the heap is too full for both, the cache is dropped (it is rebuilt on the next
// draw, uncached if there is still no room).
#ifndef PBL_BW
static void release_dial_cache_for_picture(void) { dial_layer_release_cache(s_dial_layer); }
#endif

void layout_controller_init(WatchData *data, Window *window) {
#ifndef PBL_BW
  bg_image_store_set_memory_relief(release_dial_cache_for_picture);
#endif
  s_data = data;
  s_window = window;
  s_current_draw_features_beneath_hands = false;
}

void layout_controller_unload(void) {
  if (s_dial_layer) {
    dial_layer_destroy(s_dial_layer);
    s_dial_layer = NULL;
  }
  if (s_progress_layer) {
#ifndef PBL_BW
    bg_progress_layer_destroy(s_progress_layer);
#endif
    s_progress_layer = NULL;
  }
  if (s_hands_layer) {
    hands_controller_destroy_layer(s_hands_layer);
    s_hands_layer = NULL;
  }
  if (s_features_layer) {
    features_layer_destroy(s_features_layer);
    s_features_layer = NULL;
  }
}

void layout_controller_deinit(void) {
  layout_controller_unload();
  s_data = NULL;
  s_window = NULL;
}

void layout_controller_handle_unobstructed(AnimationProgress progress) {
  (void)progress;
  if (!s_window || !s_data) return;

  Layer *root = window_get_root_layer(s_window);
  GRect unobstructed = layer_get_unobstructed_bounds(root);

  // The dial shrinks from the bottom so it stays centered in the visible area.
  if (s_dial_layer) {
    int16_t new_h = unobstructed.size.h;
    if (new_h < 0) new_h = 0;
    GRect frame = layer_get_frame(s_dial_layer);
    if (frame.size.h != new_h) {
      frame.size.h = new_h;
      layer_set_frame(s_dial_layer, frame);
    }
    layer_mark_dirty(s_dial_layer);
  }
  if (s_progress_layer) {
    GRect frame = layer_get_frame(s_progress_layer);
    if (s_dial_layer) frame.size.h = layer_get_frame(s_dial_layer).size.h;
    layer_set_frame(s_progress_layer, frame);
    layer_mark_dirty(s_progress_layer);
  }

  if (s_hands_layer) layer_mark_dirty(s_hands_layer);
  if (s_features_layer) layer_mark_dirty(s_features_layer);
}

void layout_controller_apply(void) {
  if (!s_window || !s_data) return;

  Layer *root = window_get_root_layer(s_window);
  GRect bounds = layer_get_bounds(root);
  bool beneath_hands = s_data->draw_features_beneath_hands;

  if (beneath_hands == s_current_draw_features_beneath_hands && s_dial_layer != NULL) {
    return;
  }

  s_current_draw_features_beneath_hands = beneath_hands;
  layout_controller_unload();

  s_dial_layer = dial_layer_create(GRect(0, 0, bounds.size.w, bounds.size.h));
  layer_add_child(root, s_dial_layer);

#ifndef PBL_BW
  s_progress_layer = bg_progress_layer_create(GRect(0, 0, bounds.size.w, bounds.size.h));
  if (s_progress_layer) layer_add_child(root, s_progress_layer);
#endif

  s_hands_layer = hands_controller_create_layer(GRect(0, 0, bounds.size.w, bounds.size.h));
  s_features_layer = features_layer_create(GRect(0, 0, bounds.size.w, bounds.size.h));
  if (beneath_hands) {
    layer_add_child(root, s_features_layer);
    layer_add_child(root, s_hands_layer);
  } else {
    layer_add_child(root, s_hands_layer);
    layer_add_child(root, s_features_layer);
  }

  status_label_bring_to_front(root);
  dial_layer_set_data(s_dial_layer, s_data);
#ifndef PBL_BW
  bg_progress_layer_set_data(s_progress_layer, s_data);
#endif
  features_layer_set_data(s_features_layer, s_data);

  layout_controller_handle_unobstructed(0);
}
