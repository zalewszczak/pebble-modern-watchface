#include "./dial_animation.h"
#include "./dial_layer.h"
#include "./marker_bitmap.h"

#define DIAL_ANIMATION_FRAME_MS 40

static AppTimer *s_timer;
static Layer *s_dial_layer;
static bool s_played;
static uint16_t s_elapsed_ms;

static void animation_timer_callback(void *context) {
  (void)context;

  bool active = true;
  s_elapsed_ms += DIAL_ANIMATION_FRAME_MS;
  if (s_elapsed_ms >= DIAL_ANIMATION_DURATION_MS) {
    s_elapsed_ms = DIAL_ANIMATION_DURATION_MS;
    active = false;
    s_timer = NULL;
  } else {
    s_timer = app_timer_register(DIAL_ANIMATION_FRAME_MS, animation_timer_callback, NULL);
  }

  if (s_dial_layer) dial_layer_set_animation(s_dial_layer, active, s_elapsed_ms);
}

void dial_animation_start(WatchData *data, Layer *dial_layer) {
  if (s_played || !data || data->bg_anim_mode == 0) return;

  s_played = true;

  // Bitmap markers cannot animate their artwork; skip the pointless redraws.
  bool bitmap_marker = marker_style_is_bitmap(data->big_analog_marker_style);
  if (bitmap_marker) return;

  s_dial_layer = dial_layer;
  s_elapsed_ms = 0;
  if (s_dial_layer) dial_layer_set_animation(s_dial_layer, true, 0);
  s_timer = app_timer_register(DIAL_ANIMATION_FRAME_MS, animation_timer_callback, NULL);
}

void dial_animation_deinit(void) {
  if (s_timer) {
    app_timer_cancel(s_timer);
    s_timer = NULL;
  }
  s_dial_layer = NULL;
}
