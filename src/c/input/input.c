#include <pebble.h>
#include "../data/watch_data.h"
#include "../power/battery_saver.h"
#include "./input.h"
#include "../features/feature_controller.h"

static WatchData *s_data;
static InputCallbacks s_callbacks;

#define SHAKE_ANIM_FRAME_MS 33

// Shake modes: 0=off, 1=smooth second hand.

static AppTimer *s_shake_anim_timer = NULL;
static bool s_shake_anim_active = false;
static AppTimer *s_shake_features_timer = NULL;
static bool s_shake_features_active = false;
static int64_t s_shake_anim_start_ms = 0;
static uint32_t s_shake_anim_duration_ms = 3000;

// Shared compass heading state.  Pebble reports counter-clockwise angles;
// the watchface uses clockwise degrees from true north.  Keep the raw target
// separate from the displayed heading so every compass-based readout gets the
// same smoothing behaviour.
static int32_t s_compass_heading_target_deg = 0;
static int32_t s_compass_heading_smoothed_fp = 0;
static int32_t s_compass_heading_velocity_fp = 0;
static bool s_compass_heading_has_reading = false;

static int32_t compass_heading_to_degrees(CompassHeadingData data) {
  CompassHeading clockwise = TRIG_MAX_ANGLE - data.true_heading;
  int32_t heading = (int32_t)(((int64_t)clockwise * 360) / TRIG_MAX_ANGLE) % 360;
  if (heading < 0) heading += 360;
  return heading;
}

static void shared_compass_handler(CompassHeadingData data) {
  if (data.compass_status == CompassStatusDataInvalid) return;

  s_compass_heading_target_deg = compass_heading_to_degrees(data);

  if (!s_compass_heading_has_reading) {
    s_compass_heading_smoothed_fp = s_compass_heading_target_deg << 8;
    s_compass_heading_velocity_fp = 0;
    s_compass_heading_has_reading = true;
  }
}

static void compass_heading_physics_step(void) {
  if (!s_compass_heading_has_reading) return;

  AccelData accel = { 0 };
  int32_t flatness_pct = 0;
  if (accel_service_peek(&accel) == 0) {
    int32_t az = accel.z < 0 ? -accel.z : accel.z;
    int32_t axy = (accel.x < 0 ? -accel.x : accel.x) +
                  (accel.y < 0 ? -accel.y : accel.y);
    flatness_pct = (az * 100) / (az + axy + 1);
  }

  // Flattened watches use slower attraction and stronger damping.
  int32_t attraction_pct = 32 - ((32 - 14) * flatness_pct) / 100;
  int32_t friction_pct   = 55 + ((80 - 55) * flatness_pct) / 100;

  int32_t smoothed_deg = s_compass_heading_smoothed_fp >> 8;
  int32_t delta = ((s_compass_heading_target_deg - smoothed_deg + 540) % 360) - 180;

  s_compass_heading_velocity_fp += (delta * 256 * attraction_pct) / 100;
  s_compass_heading_velocity_fp =
      (s_compass_heading_velocity_fp * (100 - friction_pct)) / 100;
  s_compass_heading_smoothed_fp += s_compass_heading_velocity_fp;

  while (s_compass_heading_smoothed_fp < 0)
    s_compass_heading_smoothed_fp += (360 << 8);
  while (s_compass_heading_smoothed_fp >= (360 << 8))
    s_compass_heading_smoothed_fp -= (360 << 8);
}

#define COMPASS_FEATURE_DURATION_MS 15000
#define COMPASS_FEATURE_FRAME_MS 300

static AppTimer *s_compass_feature_timer = NULL;
static bool s_compass_feature_active = false;
static uint32_t s_compass_feature_elapsed_ms = 0;

// One high-frequency smoothing timer drives the Compass feature.  The
// CompassService callback only updates the target; consumers read the
// smoothed heading.
static AppTimer *s_compass_heading_timer = NULL;
static bool compass_heading_needed(void) {
  return s_compass_feature_active;
}

static void compass_heading_timer_callback(void *data) {
  (void)data;
  if (!compass_heading_needed()) {
    s_compass_heading_timer = NULL;
    return;
  }

  compass_heading_physics_step();
  s_compass_heading_timer = app_timer_register(SHAKE_ANIM_FRAME_MS,
                                                compass_heading_timer_callback,
                                                NULL);
}

static void compass_heading_timer_ensure(void) {
  if (compass_heading_needed() && !s_compass_heading_timer) {
    s_compass_heading_timer = app_timer_register(SHAKE_ANIM_FRAME_MS,
                                                  compass_heading_timer_callback,
                                                  NULL);
  }
}

static bool s_compass_service_subscribed = false;

static void compass_heading_service_ensure(void) {
  if (!compass_heading_needed()) return;
  if (!s_compass_service_subscribed) {
    compass_service_subscribe(shared_compass_handler);
    s_compass_service_subscribed = true;
  }
  compass_heading_timer_ensure();
}

static void compass_heading_service_maybe_unsubscribe(void) {
  if (!compass_heading_needed()) {
    if (s_compass_service_subscribed) {
      compass_service_unsubscribe();
      s_compass_service_subscribed = false;
    }
    if (s_compass_heading_timer) {
      app_timer_cancel(s_compass_heading_timer);
      s_compass_heading_timer = NULL;
    }
  }
}

static void compass_feature_timer_callback(void *data) {
  (void)data;
  s_compass_feature_elapsed_ms += COMPASS_FEATURE_FRAME_MS;
  if (s_compass_feature_elapsed_ms >= COMPASS_FEATURE_DURATION_MS) {
    s_compass_feature_active = false;
    s_compass_feature_timer = NULL;
    compass_heading_service_maybe_unsubscribe();
  } else {
    s_compass_feature_timer = app_timer_register(COMPASS_FEATURE_FRAME_MS,
                                                  compass_feature_timer_callback,
                                                  NULL);
  }
  if (s_callbacks.compass_feature_refresh)
    s_callbacks.compass_feature_refresh(s_callbacks.context);
}

static void maybe_start_compass_feature(void) {
  if (!feature_controller_primitive_in_use(s_data, PRIM_COMPASS_DIR_TEXT)) return;
  // A new compass presentation starts from the next sensor reading rather
  // than inheriting a stale heading from a previous activation.
  s_compass_heading_has_reading = false;
  s_compass_heading_velocity_fp = 0;
  s_compass_feature_active = true;
  s_compass_feature_elapsed_ms = 0;
  if (s_compass_feature_timer) app_timer_cancel(s_compass_feature_timer);
  s_compass_feature_timer = app_timer_register(COMPASS_FEATURE_FRAME_MS,
                                                compass_feature_timer_callback,
                                                NULL);
  compass_heading_service_ensure();
}

static int64_t shake_now_ms(void) {
  time_t sec;
  uint16_t ms;
  time_ms(&sec, &ms);
  return (int64_t)sec * 1000 + ms;
}

static void shake_anim_timer_callback(void *data) {
  (void)data;
  // Use wall-clock time: frames render slower than SHAKE_ANIM_FRAME_MS, so
  // counting nominal frame lengths made the animation outlast the slider.
  int64_t elapsed = shake_now_ms() - s_shake_anim_start_ms;

  bool still_active = elapsed < (int64_t)s_shake_anim_duration_ms;
  if (!still_active) {
    s_shake_anim_active = false;
    s_shake_anim_timer = NULL;
  } else {
    s_shake_anim_timer = app_timer_register(SHAKE_ANIM_FRAME_MS,
                                             shake_anim_timer_callback, NULL);
  }
  if (s_callbacks.animation_frame)
    s_callbacks.animation_frame(s_callbacks.context);
}

static void shake_features_timer_callback(void *data) {
  (void)data;
  s_shake_features_timer = NULL;
  s_shake_features_active = false;
  if (s_callbacks.shake_features_changed) s_callbacks.shake_features_changed(s_callbacks.context);
}

// Opens (or extends) the window during which "show on shake" features are
// visible; it lasts as long as the shake animation does (shake_seconds).
static void maybe_start_shake_features(void) {
  bool border_on_shake = s_data->border_weather_mode != 0 && s_data->border_weather_shake;
  if (s_data->shake_only_mask == 0 && !border_on_shake) return;
  uint8_t seconds = s_data->shake_seconds > 0 ? s_data->shake_seconds : 3;
  bool was_active = s_shake_features_active;
  s_shake_features_active = true;
  if (s_shake_features_timer) app_timer_cancel(s_shake_features_timer);
  s_shake_features_timer = app_timer_register((uint32_t)seconds * 1000,
                                               shake_features_timer_callback, NULL);
  if (!was_active && s_callbacks.shake_features_changed)
    s_callbacks.shake_features_changed(s_callbacks.context);
}

static void maybe_start_shake_animation(void) {
  if (s_data->shake_anim_mode == 0) return;
  s_shake_anim_active = true;
  s_shake_anim_start_ms = shake_now_ms();
  uint8_t seconds = s_data->shake_seconds > 0 ? s_data->shake_seconds : 3;
  s_shake_anim_duration_ms = (uint32_t)seconds * 1000;
  if (s_shake_anim_timer) app_timer_cancel(s_shake_anim_timer);
  s_shake_anim_timer = app_timer_register(SHAKE_ANIM_FRAME_MS,
                                           shake_anim_timer_callback, NULL);
}

static void tap_handler(AccelAxisType axis, int32_t direction) {
  (void)axis; (void)direction;
  time_t now = time(NULL);
  bool was_resting = battery_saver_phase() != BATTERY_SAVER_AWAKE;
  battery_saver_note_activity(now);
  battery_saver_update(now);
  if (was_resting && s_callbacks.wake) s_callbacks.wake(s_callbacks.context);
  maybe_start_shake_features();
  maybe_start_shake_animation();
  maybe_start_compass_feature();
}

void input_init(WatchData *data, InputCallbacks callbacks, void *context) {
  s_data = data; s_callbacks = callbacks; s_callbacks.context = context;
  accel_tap_service_subscribe(tap_handler);
}

void input_deinit(void) {
  accel_tap_service_unsubscribe();
  if (s_compass_service_subscribed) {
    compass_service_unsubscribe();
    s_compass_service_subscribed = false;
  }
  if (s_shake_anim_timer) { app_timer_cancel(s_shake_anim_timer); s_shake_anim_timer = NULL; }
  if (s_shake_features_timer) { app_timer_cancel(s_shake_features_timer); s_shake_features_timer = NULL; }
  s_shake_features_active = false;
  if (s_compass_feature_timer) { app_timer_cancel(s_compass_feature_timer); s_compass_feature_timer = NULL; }
  if (s_compass_heading_timer) { app_timer_cancel(s_compass_heading_timer); s_compass_heading_timer = NULL; }
  s_compass_feature_active = false;
  s_shake_anim_active = false;
  s_data = NULL; s_callbacks = (InputCallbacks){0};
}

bool input_shake_animation_active(void) { return s_shake_anim_active; }
bool input_shake_features_active(void) { return s_shake_features_active; }
int32_t input_compass_feature_heading_deg(void) { return s_compass_heading_smoothed_fp >> 8; }
bool input_compass_feature_is_asleep(void) { return !s_compass_feature_active; }
