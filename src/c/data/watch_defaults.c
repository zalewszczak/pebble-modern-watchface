#include <string.h>
#include "./watch_defaults.h"
#include "./watch_ui.h"
#include "../features/primitives/primitive_ids.h"

// Packed GColor8 values.
#define COLOR_WHITE 0xFF
#define COLOR_BLACK 0xC0

// Font id 27 in fonts/font_lookup.c: Digital Dream (id 14 is Bitcount Grid since
// the font table was renumbered). Keep in sync with FONT_TABLE and with
// DEFAULT_CORNER_FONT in the phone code (settings-codecs.js).
#define FONT_ID_DIGITAL_DREAM 27

// Same ranges the phone's settings codecs produce; keep in sync with
// src/pkjs/settings/settings-codecs.js defaults.
static HandConfig default_hand(uint8_t style, uint8_t width, uint8_t length,
                               int8_t back_offset, uint8_t color) {
  HandConfig h;
  memset(&h, 0, sizeof(h));
  h.style = style;
  h.width = width;
  h.length = length;
  h.back_offset = back_offset;
  h.secondary_width = 6;
  h.color = color;
  h.hollow_thickness = 1;
  h.shadow_distance_px = 2;
  return h;
}

void watch_defaults_apply(WatchData *d) {
  memset(d, 0, sizeof(*d));

  // Primitive-only default feature sequences. Slot identity and feature IDs
  // are phone-local; these are the exact instructions the renderer consumes.
  d->edge_line_primitive_ids[0][0] = PRIM_BATTERY_LOGO_ICON;
  d->edge_line_primitive_ids[2][0] = PRIM_WEATHER_CONDITION_ICON;
  d->edge_line_primitive_ids[2][1] = PRIM_CURRENT_TEMP_TEXT;
#ifdef PBL_ROUND
  // No corners on a round screen: the date goes on the left/right edge slots instead.
  d->edge_line_primitive_ids[4][0] = PRIM_WEEKDAY_SHORT_UPPER;
  d->edge_line_primitive_ids[6][0] = PRIM_DAY_OF_MONTH;
#else
  d->corner_primitive_ids[1][0] = PRIM_WEEKDAY_SHORT_UPPER;
  d->corner_primitive_ids[3][0] = PRIM_DAY_OF_MONTH;
#endif
  for (int i = 0; i < 8; i++) d->edge_line_color_mode[i] = 0;

  // White main and accent colors on a black background.
  d->border_weather_mode = 0;
  d->border_weather_px = 8;
  d->custom_bg = COLOR_BLACK;
  d->custom_text = COLOR_WHITE;
  d->custom_accent = COLOR_WHITE;
  d->night_custom_bg = COLOR_BLACK;
  d->night_custom_text = COLOR_WHITE;
  d->night_custom_accent = COLOR_WHITE;

  d->shake_seconds = 3;
  d->startup_clock_anim_mode = 1;
  d->outline_style = 1;
  d->corner_font = FONT_ID_DIGITAL_DREAM;
  d->icon_style = 1;
  d->daily_step_goal = 10000;

  d->shadow_translucent = true;
  d->shadow_angle_deg = 120;

  // The "Modern" hand preset (pkjs/presets-lookups.js HAND_PRESETS["3"]):
  // main-color hour/minute hands, accent-color second hand and center circle.
  d->hand_hour = default_hand(2, 6, 51, 10, 0);
  d->hand_minute = default_hand(2, 6, 78, 10, 0);
  d->hand_second = default_hand(2, 2, 85, 10, 1);
  d->center_circle_radius = 4;
  d->center_circle_color = 1; // accent
  d->center_circle_outline = 0;

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
  for (int i = 0; i < FORECAST_SLOT_COUNT; i++) d->forecast_temp_c[i] = -128; // unavailable

  d->hourly_vibe_interval_min = 30;
  d->hourly_vibe_days_mask = 127;
  d->hourly_vibe_override_quiet = true;
}
