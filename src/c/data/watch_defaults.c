#include <string.h>
#include "./watch_defaults.h"
#include "./watch_ui.h"

// Packed GColor8 values.
#define COLOR_WHITE 0xFF
#define COLOR_BLACK 0xC0

// Same ranges the phone's settings codecs produce; keep in sync with
// src/pkjs/settings/settings-codecs.js defaults.
static HandConfig default_hand(uint8_t style, uint8_t width, uint8_t length, uint8_t color) {
  HandConfig h;
  memset(&h, 0, sizeof(h));
  h.style = style;
  h.width = width;
  h.length = length;
  h.secondary_width = 6;
  h.color = color;
  h.hollow_thickness = 1;
  h.shadow_distance_px = 2;
  return h;
}

void watch_defaults_apply(WatchData *d) {
  memset(d, 0, sizeof(*d));

  d->bottom_middle_line1_content = 105; // long date + sunrise/sunset

  d->custom_bg = COLOR_WHITE;
  d->custom_text = COLOR_BLACK;
  d->custom_accent = COLOR_BLACK;
  d->night_custom_bg = COLOR_BLACK;
  d->night_custom_text = COLOR_WHITE;
  d->night_custom_accent = COLOR_WHITE;

  d->shake_seconds = 3;
  d->startup_clock_anim_mode = 1;
  d->outline_style = 1;
  d->corner_font = 1;
  d->icon_style = 1;
  d->daily_step_goal = 10000;

  d->shadow_translucent = true;
  d->shadow_angle_deg = 120;

  d->hand_hour = default_hand(1, 12, 51, 0);
  d->hand_minute = default_hand(1, 18, 78, 0);
  d->hand_second = default_hand(0, 2, 85, 1);
  d->center_circle_radius = 3;

  // The Modern bitmap dial.
  d->big_analog_marker_style = 3;

  d->custom_hour_marker = (MarkerRingConfig){
    .style = 0, .thickness = 3, .inner_border_pct = 20, .outer_border_pct = 100, .color = 0 };
  d->custom_second_marker = (MarkerRingConfig){
    .style = 0, .thickness = 1, .inner_border_pct = 70, .outer_border_pct = 100, .color = 0 };
  d->marker_text.hour_mask = 4095;
  d->marker_text.second_mask = 4095;
  d->custom_hour_marker_inner_thickness = 3;
  d->custom_second_marker_inner_thickness = 1;

  d->altitude_m = -32000; // unavailable until the phone reports one
  for (int i = 0; i < 9; i++) d->forecast_temp_c[i] = -128; // unavailable

  d->hourly_vibe_interval_min = 30;
  d->hourly_vibe_days_mask = 127;
  d->hourly_vibe_override_quiet = true;
}
