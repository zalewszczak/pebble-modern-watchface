#include "./dial_animation.h"
#include "./dial_layer.h"
#include "./marker_bitmap.h"

#define DIAL_ANIMATION_FRAME_MS 40

static AppTimer *s_timer;
static Layer *s_dial_layer;
static bool s_played;
static uint16_t s_elapsed_ms;
static int32_t s_start_ms; // wall clock (seconds * 1000 + ms, wrapped to 32 bits) when the animation began

// Frames take longer than DIAL_ANIMATION_FRAME_MS to draw, so counting nominal frame lengths made the
// animation run several times longer than its duration. Progress follows the clock instead.
static int32_t now_ms32(void) {
  time_t sec; uint16_t ms;
  time_ms(&sec, &ms);
  return (int32_t)((uint32_t)sec * 1000u + ms);
}

static void animation_timer_callback(void *context) {
  (void)context;

  bool active = true;
  int32_t elapsed = now_ms32() - s_start_ms;
  s_elapsed_ms = elapsed < 0 ? 0 : (elapsed > DIAL_ANIMATION_DURATION_MS ? DIAL_ANIMATION_DURATION_MS : (uint16_t)elapsed);
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
  s_start_ms = now_ms32();
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
