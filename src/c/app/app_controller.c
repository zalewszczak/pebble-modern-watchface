#include <pebble.h>
#include "../data/watch_data.h"
#include "../data/watch_defaults.h"
#include "../comms/comms.h"
#include "../persistence/persistence.h"
#include "../power/battery_saver.h"
#include "../power/battery_saver_controller.h"
#include "../input/input.h"
#include "../timing/time_service.h"
#include "../rendering/dial/dial_layer.h"
#include "../rendering/dial/dial_animation.h"
#include "../rendering/status/status_label.h"
#include "../features/feature_controller.h"
#include "../features/features_layer.h"
#include "../hands/hands_controller.h"
#include "../timing/hourly_vibration.h"
#include "./layout_controller.h"
#include "./watchface_ui.h"
#include "../timing/feature_refresh.h"

static Window *s_window;
static void hands_controller_invalidate(void *context) {
  (void)context;
  Layer *hands_layer = layout_controller_hands_layer();
  if (hands_layer) layer_mark_dirty(hands_layer);
}

static WatchData s_data;

// Tick subscription policy lives in time_service.c; this callback owns visual work.
// ---- tick + click ---------------------------------------------------------

static void time_service_tick_handler(struct tm *tick_time, TimeUnits units_changed, void *context) {
  (void)context;

  if (units_changed & MINUTE_UNIT) hourly_vibration_handle_minute(tick_time);

  battery_saver_controller_update();

  // Scheduled "My styles": the watch is the only clock that is reliably
  // running, so it is the one that wakes PKJS when a style is due. Runs
  // before the deep-sleep skip below so it is evaluated every minute.
  comms_maybe_request_scheduled_style(&s_data);

  // Deep sleep uses MINUTE_UNIT; process only five-minute boundaries.
  bool deep_sleep_skip = (battery_saver_phase() == BATTERY_SAVER_DEEP_SLEEP) && (tick_time->tm_min % 5 != 0);
  if (!deep_sleep_skip) {
    watchface_ui_refresh_status();
    if (battery_saver_phase() != BATTERY_SAVER_AWAKE && layout_controller_features_layer()) {
      features_layer_refresh_values(layout_controller_features_layer());
    }
  }

  // Seconds-precision feature slots use SECOND_UNIT.
  if (time_service_is_seconds() && layout_controller_features_layer()) {
    features_layer_refresh_second_slots(layout_controller_features_layer());
  }

  // Re-evaluate whether second-precision ticks are still needed.
  time_service_update();
}


// ---- window lifecycle ----------------------------------------------------

// Keep the watchface composition synchronized with Pebble OS system overlays.
// The change callback tracks the obstruction animation, while the final
// callback forces one last layout pass. Some firmware/system overlays can
// finish their transition without the last useful change frame reaching the
// app, so relying on .change alone can leave the face in its pre-obstruction
// layout until the next full app/layout initialization.
static void unobstructed_change_handler(AnimationProgress progress, void *context) {
  (void)context;
  layout_controller_handle_unobstructed(progress);
}

static void unobstructed_did_change_handler(void *context) {
  (void)context;
  // Re-read layer_get_unobstructed_bounds() after the system has committed
  // the final obstruction state. This also corrects any rounding/frame
  // differences left by the animated .change callbacks.
  layout_controller_handle_unobstructed(0);
}

static UnobstructedAreaHandlers s_unobstructed_handlers = {
  .change = unobstructed_change_handler,
  .did_change = unobstructed_did_change_handler
};

static void window_load(Window *window) {
  Layer *root = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(root);

  // Create the status label once; layout changes re-parent it as needed.
  status_label_create(root, GRect(0, 0, bounds.size.w, 20));

  layout_controller_apply();

  watchface_ui_refresh_status();
  hands_controller_start_startup_animation();
  dial_animation_start(&s_data, layout_controller_dial_layer());
}

static void window_unload(Window *window) {
  status_label_destroy();
  layout_controller_unload();
  feature_controller_unload_fonts();
}

static void comms_data_applied(CommsChangeFlags changes, void *context) {
  (void)context;

  if (changes & COMMS_CHANGE_LAYOUT) layout_controller_apply();
  if (layout_controller_dial_layer()) dial_layer_set_data(layout_controller_dial_layer(), &s_data);
  if (layout_controller_hands_layer()) layer_mark_dirty(layout_controller_hands_layer());
  if (layout_controller_features_layer() && (changes & COMMS_CHANGE_FEATURES)) {
    features_layer_set_data(layout_controller_features_layer(), &s_data);
  }

  // Apply early settings, but defer tick-policy changes until valid data exists.
  if (!s_data.valid) {
    persistence_save(&s_data);
    watchface_ui_refresh_status();
    return;
  }

  battery_saver_controller_apply_enabled(s_data.battery_saver_enabled);
  time_service_update();
  persistence_save(&s_data);
  watchface_ui_refresh_status();
}

void app_controller_init(void) {
  // The MESSAGE_KEY_MESSAGE_TYPE + MK_* assumption the decoder relies on
  // is verified where it can be checked for free: at generation
  // time, in scripts/generate-message-keys.js.
  //
  // Stored settings win; a watch that has never been configured (or whose
  // stored layout is from another version) starts from the built-in
  // defaults -- the Modern dial -- before the phone has sent anything.
  if (!persistence_load(&s_data)) watch_defaults_apply(&s_data);
  battery_saver_controller_init(&s_data);

  // Initialize time service before pushing the window; window_load() may run synchronously.
  time_service_init(&s_data, time_service_tick_handler, NULL);
  hands_controller_init(&s_data, hands_controller_invalidate, NULL);
  status_label_init(&s_data);
  hourly_vibration_init(&s_data, hands_controller_invalidate, NULL);

  s_window = window_create();
  window_set_window_handlers(s_window, (WindowHandlers){
    .load = window_load,
    .unload = window_unload,
  });
  layout_controller_init(&s_data, s_window);
  watchface_ui_init(&s_data);

  // Subscribe before the window enters the stack so an obstruction that is
  // already active (or begins during the push/load transition) cannot be
  // missed by the UnobstructedArea service.
  unobstructed_area_service_subscribe(s_unobstructed_handlers, NULL);
  window_stack_push(s_window, true);

  input_init(&s_data, *watchface_ui_input_callbacks(), NULL);
  feature_refresh_init();
  feature_refresh_start();

  comms_init(&s_data, comms_data_applied, NULL);
  battery_saver_controller_update();
}

void app_controller_deinit(void) {
  battery_saver_controller_deinit();
  time_service_deinit();
  input_deinit();
  watchface_ui_deinit();
  unobstructed_area_service_unsubscribe();
  feature_refresh_deinit();
  comms_deinit();
  dial_animation_deinit();
  hands_controller_deinit();
  hourly_vibration_deinit();
  status_label_deinit();
  layout_controller_deinit();
  window_destroy(s_window);
}
