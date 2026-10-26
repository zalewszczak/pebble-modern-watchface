#include <pebble.h>
#include <stddef.h>
#include <string.h>
#include "./comms_decoder.h"
#include "../generated/message_key_index.h"
#include "../data/hand_types.h"
#include "../data/marker_types.h"

// Decoder tables keep common fields compact; special transforms remain explicit.
// Wire keys are stored as MK_* offsets from MESSAGE_KEY_MESSAGE_TYPE.

#define NELEM(a) ((uint8_t)(sizeof(a) / sizeof((a)[0])))

// Plain-copy fields: low nibble is the value type, high nibble the change flag.

typedef enum {
  F_U8 = 0,     // d->FIELD = t->value->uint8;
  F_BOOL,       // d->FIELD = t->value->uint8 != 0;
  F_I16,        // d->FIELD = t->value->int16;
  F_U16,        // d->FIELD = t->value->uint16;
  F_U32,        // d->FIELD = t->value->uint32;
  F_TIME,       // d->FIELD = (time_t)t->value->int32;
  // Invalid values fall back to 0 for bounded byte settings.
  F_U8_MAX1,    // d->FIELD = (v <= 1) ? v : 0;
} SimpleFieldType;

// Change flags are stored as (bit index + 1) in the high nibble.
#define FL_NONE   (0u << 4)
#define FL_LAYOUT (1u << 4)

#define FLAG_BITS(tf) ((uint32_t)(1u << ((tf) >> 4)) >> 1)

_Static_assert(FLAG_BITS(FL_NONE)   == 0,                   "FL_NONE must raise nothing");
_Static_assert(FLAG_BITS(FL_LAYOUT) == COMMS_CHANGE_LAYOUT, "FL_LAYOUT out of sync with comms.h");

typedef struct {
  uint8_t  key_index; // MESSAGE_KEY_MESSAGE_TYPE + key_index.
  uint8_t  type_flag; // SimpleFieldType | FL_*.
  uint16_t offset;    // offsetof(WatchData, field).
} SimpleFieldMapping; // 4 bytes.

// Applied to every message, including invalid payloads.
static const SimpleFieldMapping SIMPLE_FIELD_MAP[] = {
  { MK_DATA_VALID, F_BOOL, offsetof(WatchData, valid) },
  { MK_ERROR_CODE, F_U8, offsetof(WatchData, error_code) },
  { MK_DAILY_STEP_GOAL, F_U16, offsetof(WatchData, daily_step_goal) },
  { MK_WEATHER_ICON_CATEGORY, F_U8, offsetof(WatchData, weather_icon_category) },
  { MK_WEATHER_ICON_COLOR, F_U8, offsetof(WatchData, weather_icon_color) },
  { MK_WIND_DIR_DEG, F_I16, offsetof(WatchData, wind_dir_deg) },
  { MK_DEW_POINT_C, F_I16, offsetof(WatchData, dew_point_c) },
  { MK_PRESSURE_HPA, F_I16, offsetof(WatchData, pressure_hpa) },
  { MK_PRESSURE_TREND, F_U8, offsetof(WatchData, pressure_trend) },
  { MK_AQI_US, F_U16, offsetof(WatchData, aqi_us) },
  { MK_AQI_EU, F_U16, offsetof(WatchData, aqi_eu) },
  { MK_ALTITUDE_M, F_I16, offsetof(WatchData, altitude_m) },
  { MK_AURORA_KP_X10, F_U8, offsetof(WatchData, aurora_kp_x10) },
  { MK_AURORA_ERROR_CODE, F_U8, offsetof(WatchData, aurora_error_code) },
  { MK_WEATHER_TEMP_C, F_I16, offsetof(WatchData, weather_temp_c) },
  { MK_WEATHER_TEMP_HIGH_C, F_I16, offsetof(WatchData, temp_high_c) },
  { MK_WEATHER_TEMP_LOW_C, F_I16, offsetof(WatchData, temp_low_c) },
  { MK_ALTITUDE_COLOR, F_U8, offsetof(WatchData, altitude_color) },
  { MK_PRESSURE_COLOR, F_U8, offsetof(WatchData, pressure_color) },
  { MK_AQI_COLOR, F_U8, offsetof(WatchData, aqi_color) },
  { MK_AURORA_KP_COLOR, F_U8, offsetof(WatchData, aurora_kp_color) },
  { MK_WIND_SPEED_KMH, F_I16, offsetof(WatchData, wind_speed_kmh) },
  { MK_SUN_RISE, F_TIME, offsetof(WatchData, sun_rise) },
  { MK_SUN_SET, F_TIME, offsetof(WatchData, sun_set) },
  { MK_SUN_RISE_TOMORROW, F_TIME, offsetof(WatchData, sun_rise_tomorrow) },
  { MK_ISS_NEXT_PASS, F_TIME, offsetof(WatchData, iss_next_pass) },
  { MK_ISS_ERROR_CODE, F_U8, offsetof(WatchData, iss_error_code) },
  { MK_WEATHER_LAST_UPDATE, F_TIME, offsetof(WatchData, weather_last_update) },
  // Kept separate from MARKER_RINGS because they are independent fields.
  { MK_HOURLY_VIBE_START_MIN, F_U16, offsetof(WatchData, hourly_vibe_start_min) },
  { MK_HOURLY_VIBE_END_MIN, F_U16, offsetof(WatchData, hourly_vibe_end_min) },
  { MK_NEXT_STYLE_CHECK, F_TIME, offsetof(WatchData, next_style_check) },
  { MK_SHOW_SECONDS, F_BOOL, offsetof(WatchData, show_seconds) },
  { MK_SHAKE_ONLY_MASK, F_U16, offsetof(WatchData, shake_only_mask) },
  { MK_BG_ANIM_MODE, F_U8_MAX1, offsetof(WatchData, bg_anim_mode) },
  { MK_SHAKE_ANIM_MODE, F_U8_MAX1, offsetof(WatchData, shake_anim_mode) },
  { MK_SHADOW_TRANSLUCENT, F_BOOL, offsetof(WatchData, shadow_translucent) },
  { MK_SHADOW_ANGLE, F_U16, offsetof(WatchData, shadow_angle_deg) },
  { MK_BIG_ANALOG_MARKER_STYLE, F_U8, offsetof(WatchData, big_analog_marker_style) },
  { MK_NIGHT_SCHEME_ENABLED, F_BOOL, offsetof(WatchData, night_scheme_enabled) },
  // Settings that also raise a presentation change flag.
  { MK_DRAW_FEATURES_BENEATH_HANDS, F_BOOL | FL_LAYOUT, offsetof(WatchData, draw_features_beneath_hands) },
};

static uint32_t apply_simple_fields(DictionaryIterator *iter, WatchData *d,
                                    const SimpleFieldMapping *map, uint8_t count) {
  const uint32_t base = MESSAGE_KEY_MESSAGE_TYPE; // Shared wire-key base.
  uint32_t changes = 0;
  for (uint8_t i = 0; i < count; i++) {
    const SimpleFieldMapping *m = &map[i];
    Tuple *st = dict_find(iter, base + m->key_index);
    if (!st) continue;
    uint8_t *dst = (uint8_t *)d + m->offset;
    uint8_t tf = m->type_flag;
    uint8_t type = tf & 0x0F;
    switch (type) {
      case F_U8:   *dst = st->value->uint8; break;
      case F_BOOL: *(bool *)dst = st->value->uint8 != 0; break;
      case F_I16:  *(int16_t *)dst = st->value->int16; break;
      case F_U16:  *(uint16_t *)dst = st->value->uint16; break;
      case F_U32:  *(uint32_t *)dst = st->value->uint32; break;
      case F_TIME: *(time_t *)dst = (time_t)st->value->int32; break;
      default: { // F_U8_MAX1
        uint8_t v = st->value->uint8;
        *dst = (v <= 1) ? v : 0;
        break;
      }
    }
    changes |= FLAG_BITS(tf); // 0 when the high nibble is FL_NONE
  }
  return changes;
}

// Byte-array fields use packed wire data; excess bytes and partial elements are ignored.

typedef struct {
  uint8_t  key_index;
  uint8_t  elem_size; // Element size in bytes: 1, 2, or 4.
  uint16_t offset;    // offsetof(WatchData, array).
  uint16_t max_bytes; // Destination capacity in bytes.
} BlobFieldMapping;   // 6 bytes.

_Static_assert(sizeof(time_t) == 4, "PLANET_RISE/SET wire format assumes a 4-byte time_t");

// Applied to every message, including invalid payloads.
static const BlobFieldMapping BLOB_FIELD_MAP[] = {
  { MK_CORNER_COLOR_MODE, 1, offsetof(WatchData, corner_color_mode), 4 },
  { MK_CORNER_PRIMITIVE_IDS, 1, offsetof(WatchData, corner_primitive_ids), 40 }, // 4 * 10, see watch_data.h
  { MK_CORNER_PRIMITIVE_AUX, 1, offsetof(WatchData, corner_primitive_aux), 40 },
  { MK_EDGE_LINE_PRIMITIVE_IDS, 1, offsetof(WatchData, edge_line_primitive_ids), 80 }, // 8 * 10, see watch_data.h
  { MK_EDGE_LINE_PRIMITIVE_AUX, 1, offsetof(WatchData, edge_line_primitive_aux), 80 },
};

// Applied only for valid payloads.
static const BlobFieldMapping BLOB_FIELD_MAP_VALID[] = {
  { MK_FORECAST_CONDITION, 1, offsetof(WatchData, forecast_condition), FORECAST_SLOT_COUNT },
  { MK_FORECAST_WX, 1, offsetof(WatchData, forecast_wx), FORECAST_SLOT_COUNT },
  { MK_FORECAST_RAIN, 1, offsetof(WatchData, forecast_rain_pct), FORECAST_SLOT_COUNT },
  { MK_FORECAST_ICON_CATEGORIES, 1, offsetof(WatchData, forecast_icon_category), FORECAST_SLOT_COUNT },
  { MK_FORECAST_TEMP_COLORS, 1, offsetof(WatchData, forecast_temp_color), FORECAST_SLOT_COUNT },
  { MK_PLANET_RISE, 4, offsetof(WatchData, planet_rise), PLANET_COUNT * 4 },
  { MK_PLANET_SET, 4, offsetof(WatchData, planet_set), PLANET_COUNT * 4 },
};

static void apply_blob_fields(DictionaryIterator *iter, WatchData *d,
                              const BlobFieldMapping *map, uint8_t count) {
  const uint32_t base = MESSAGE_KEY_MESSAGE_TYPE;
  for (uint8_t i = 0; i < count; i++) {
    const BlobFieldMapping *m = &map[i];
    Tuple *t = dict_find(iter, base + m->key_index);
    if (!t) continue;
    uint16_t len = t->length;
    if (len > m->max_bytes) len = m->max_bytes;
    len &= (uint16_t)~(uint16_t)(m->elem_size - 1); // Whole elements only.
    memcpy((uint8_t *)d + m->offset, t->value->data, len);
  }
}

// Scattered single-byte fields that always travel together as one group are packed
// into one wire blob instead of one AppMessage key per field. Every field here is u8 or
// bool (bool's wire/storage representation is identical: a single 0/1 byte), so one shared
// apply function covers all groups -- just a list of destination offsets, applied
// positionally against the incoming blob's bytes. The order of each table must match the
// order the phone builds the blob in (comms/message-encoder.js).
static void apply_scattered_u8_blob(DictionaryIterator *iter, WatchData *d, uint8_t key_index,
                                     const uint16_t *offsets, uint8_t count) {
  Tuple *t = dict_find(iter, MESSAGE_KEY_MESSAGE_TYPE + key_index);
  if (!t) return;
  uint16_t len = t->length;
  if (len > count) len = count; // defensive: never read past either side's declared field count
  const uint8_t *src = t->value->data;
  for (uint16_t i = 0; i < len; i++) {
    *((uint8_t *)d + offsets[i]) = src[i];
  }
}

// Group 1 (23 fields): plain settings, set on every settings push.
static const uint16_t SETTINGS_BLOB_OFFSETS[] = {
  offsetof(WatchData, temp_unit),
  offsetof(WatchData, wind_speed_unit),
  offsetof(WatchData, shake_seconds),
  offsetof(WatchData, startup_clock_anim_mode),
  offsetof(WatchData, outline_style),
  offsetof(WatchData, corner_font),
  offsetof(WatchData, center_circle_radius),
  offsetof(WatchData, center_circle_color),
  offsetof(WatchData, custom_hour_marker_inner_thickness),
  offsetof(WatchData, custom_second_marker_inner_thickness),
  offsetof(WatchData, hourly_vibe_mode),
  offsetof(WatchData, hourly_vibe_interval_min),
  offsetof(WatchData, hourly_vibe_pattern),
  offsetof(WatchData, hourly_vibe_days_mask),
  offsetof(WatchData, icon_style),
  offsetof(WatchData, aqi_unit),
  offsetof(WatchData, altitude_unit),
  offsetof(WatchData, battery_saver_enabled),
  offsetof(WatchData, bitmap_marker_transparent),
  offsetof(WatchData, draw_debug),
  offsetof(WatchData, hourly_vibe_override_quiet),
  offsetof(WatchData, custom_bg_mode),
  offsetof(WatchData, custom_bg_preset),
  offsetof(WatchData, border_weather_mode),
  offsetof(WatchData, border_weather_px),
  offsetof(WatchData, border_weather_scheme),
  offsetof(WatchData, border_weather_shake),
  offsetof(WatchData, border_weather_semi),
  offsetof(WatchData, primitive_tight_mask_lo),
  offsetof(WatchData, primitive_tight_mask_hi),
};

// Group 2 (4 fields): cloud/visibility readout + its gradient colors.
static const uint16_t WEATHER_CLOUD_BLOB_OFFSETS[] = {
  offsetof(WatchData, cloud_cover_pct),
  offsetof(WatchData, vis_score_pct),
  offsetof(WatchData, cloud_cover_color),
  offsetof(WatchData, vis_score_color),
};

// Group 3 (14 fields): the main weather readout (condition + temps + UV/rain/humidity/wind,
// each with its gradient color).
static const uint16_t WEATHER_MAIN_BLOB_OFFSETS[] = {
  offsetof(WatchData, weather_condition),
  offsetof(WatchData, current_temp_color),
  offsetof(WatchData, temp_high_color),
  offsetof(WatchData, temp_low_color),
  offsetof(WatchData, feels_like_color),
  offsetof(WatchData, uv_index_x10),
  offsetof(WatchData, uv_index_current_x10),
  offsetof(WatchData, rain_chance_pct),
  offsetof(WatchData, humidity_pct),
  offsetof(WatchData, uv_daily_color),
  offsetof(WatchData, uv_current_color),
  offsetof(WatchData, rain_chance_color),
  offsetof(WatchData, humidity_color),
  offsetof(WatchData, wind_speed_color),
};

// Group 4 (5 fields): Saturn/Moon/meteor status.
static const uint16_t ASTRO_BLOB_OFFSETS[] = {
  offsetof(WatchData, saturn_ring_open_pct),
  offsetof(WatchData, moon_phase_pct),
  offsetof(WatchData, moon_waxing),
  offsetof(WatchData, meteor_intensity),
  offsetof(WatchData, meteor_color),
};

// Copy a bounded C-string field.
static void apply_cstring(DictionaryIterator *iter, uint8_t key_index, char *dst, uint16_t cap) {
  Tuple *t = dict_find(iter, MESSAGE_KEY_MESSAGE_TYPE + key_index);
  if (!t) return;
  strncpy(dst, t->value->cstring, cap - 1);
  dst[cap - 1] = '\0';
}

// One MK_* per forecast-temp index (see watch_data.h's forecast_temp_display
// comment for why 9 discrete keys rather than one delimited string).
static const uint8_t FORECAST_TEMP_DISPLAY_KEYS[FORECAST_SLOT_COUNT] = {
  MK_FORECAST_TEMP_DISPLAY_0, MK_FORECAST_TEMP_DISPLAY_1, MK_FORECAST_TEMP_DISPLAY_2,
  MK_FORECAST_TEMP_DISPLAY_3, MK_FORECAST_TEMP_DISPLAY_4, MK_FORECAST_TEMP_DISPLAY_5,
  MK_FORECAST_TEMP_DISPLAY_6, MK_FORECAST_TEMP_DISPLAY_7, MK_FORECAST_TEMP_DISPLAY_8,
  MK_FORECAST_TEMP_DISPLAY_9, MK_FORECAST_TEMP_DISPLAY_10, MK_FORECAST_TEMP_DISPLAY_11,
  MK_FORECAST_TEMP_DISPLAY_12, MK_FORECAST_TEMP_DISPLAY_13, MK_FORECAST_TEMP_DISPLAY_14,
};

// Consolidated settings fields use fixed wire layouts.
// HANDS, MARKER_RINGS, and EDGE_LINE_COLOR_MODE use fixed byte layouts;
// MARKER_TEXT and COLORS are unpacked field-by-field.
_Static_assert(sizeof(HandConfig) == 14, "HANDS wire format assumes a 14-byte HandConfig");
_Static_assert(sizeof(MarkerRingConfig) == 8, "MARKER_RINGS wire format assumes an 8-byte MarkerRingConfig");

static void apply_consolidated_fields(DictionaryIterator *iter, WatchData *d) {
  const uint32_t base = MESSAGE_KEY_MESSAGE_TYPE;
  Tuple *t;

  // HANDS: hour, minute, second HandConfig values in declaration order.
  if ((t = dict_find(iter, base + MK_HANDS)) && t->length >= 3 * sizeof(HandConfig)) {
    memcpy(&d->hand_hour, t->value->data, 3 * sizeof(HandConfig));
  }

  // MARKER_RINGS: hour ring followed by second ring.
  if ((t = dict_find(iter, base + MK_MARKER_RINGS)) && t->length >= 2 * sizeof(MarkerRingConfig)) {
    memcpy(&d->custom_hour_marker, t->value->data, 2 * sizeof(MarkerRingConfig));
  }

  // EDGE_LINE_COLOR_MODE is a primitive-only payload: eight color-mode bytes, one per slot.
  if ((t = dict_find(iter, base + MK_EDGE_LINE_COLOR_MODE)) && t->length >= 8) {
    memcpy(d->edge_line_color_mode, t->value->data, 8);
  }

  // MARKER_TEXT: target, font, signed offset, two little-endian masks, Roman-numeral flag.
  if ((t = dict_find(iter, base + MK_MARKER_TEXT)) && t->length >= 8) {
    uint8_t *b = t->value->data;
    d->marker_text.target = b[0];
    d->marker_text.font_choice = b[1];
    d->marker_text.offset_px = (int8_t)b[2];
    d->marker_text.hour_mask = (uint16_t)(b[3] | (b[4] << 8));
    d->marker_text.second_mask = (uint16_t)(b[5] | (b[6] << 8));
    d->marker_text.roman_numerals = b[7] != 0;
  }

  // COLORS: six custom colors; night_scheme_enabled is sent separately.
  if ((t = dict_find(iter, base + MK_COLORS)) && t->length >= 6) {
    uint8_t *b = t->value->data;
    d->custom_bg = b[0];
    d->custom_text = b[1];
    d->custom_accent = b[2];
    d->night_custom_bg = b[3];
    d->night_custom_text = b[4];
    d->night_custom_accent = b[5];
  }
}


CommsChangeFlags comms_decoder_apply(DictionaryIterator *iter, WatchData *data) {
  WatchData *d = data;
  const uint32_t base = MESSAGE_KEY_MESSAGE_TYPE;
  Tuple *t;

  // Apply common settings and grouped fields before valid-payload fields.
  uint32_t changes = apply_simple_fields(iter, d, SIMPLE_FIELD_MAP, NELEM(SIMPLE_FIELD_MAP));
  apply_consolidated_fields(iter, d);
  apply_blob_fields(iter, d, BLOB_FIELD_MAP, NELEM(BLOB_FIELD_MAP));
  apply_scattered_u8_blob(iter, d, MK_SETTINGS_U8_BLOB, SETTINGS_BLOB_OFFSETS, NELEM(SETTINGS_BLOB_OFFSETS));

  // Feature layout and values are recomputed for every decoded message.
  changes |= COMMS_CHANGE_FEATURES;

  if (!d->valid) return changes;
  d->error_code = 0;

  apply_scattered_u8_blob(iter, d, MK_WEATHER_CLOUD_U8_BLOB, WEATHER_CLOUD_BLOB_OFFSETS, NELEM(WEATHER_CLOUD_BLOB_OFFSETS));
  apply_scattered_u8_blob(iter, d, MK_WEATHER_MAIN_U8_BLOB, WEATHER_MAIN_BLOB_OFFSETS, NELEM(WEATHER_MAIN_BLOB_OFFSETS));
  apply_scattered_u8_blob(iter, d, MK_ASTRO_U8_BLOB, ASTRO_BLOB_OFFSETS, NELEM(ASTRO_BLOB_OFFSETS));

  if ((t = dict_find(iter, base + MK_WEATHER_ERROR_CODE))) {
    d->weather_error_code = t->value->uint8;
    if (d->weather_error_code == 0) {
      d->weather_error_streak = 0;
      d->weather_ever_valid = true;
    } else if (d->weather_error_streak < 250) { // Saturate the streak.
      d->weather_error_streak++;
    }
  }

  // Forecast temperatures use a +50 byte offset; 255 means unavailable.
  // 15 entries: 0-5 are the next 1-6 hours, 6-8 the next 1-3 days, 9-14 the
  // hours 7-12 ahead (see FORECAST_SLOT_COUNT in watch_data.h).
  if ((t = dict_find(iter, base + MK_FORECAST_TEMP_C))) {
    uint8_t *raw = t->value->data;
    int n = t->length;
    if (n > FORECAST_SLOT_COUNT) n = FORECAST_SLOT_COUNT;
    for (int i = 0; i < n; i++) {
      d->forecast_temp_c[i] = (raw[i] == 255) ? -128 : ((int16_t)raw[i] - 50);
    }
  }

  apply_blob_fields(iter, d, BLOB_FIELD_MAP_VALID, NELEM(BLOB_FIELD_MAP_VALID));
  apply_cstring(iter, MK_LOCATION_NAME, d->location_name, sizeof(d->location_name));
  apply_cstring(iter, MK_METEOR_SHOWER_NAME, d->meteor_shower_name, sizeof(d->meteor_shower_name));
  apply_cstring(iter, MK_METEOR_DISPLAY, d->meteor_display, sizeof(d->meteor_display));
  apply_cstring(iter, MK_MOON_PHASE_DISPLAY, d->moon_phase_display, sizeof(d->moon_phase_display));
  apply_cstring(iter, MK_SATURN_RINGS_DISPLAY, d->saturn_rings_display, sizeof(d->saturn_rings_display));
  apply_cstring(iter, MK_AURORA_KP_DISPLAY, d->aurora_kp_display, sizeof(d->aurora_kp_display));
  apply_cstring(iter, MK_CURRENT_TEMP_DISPLAY, d->current_temp_display, sizeof(d->current_temp_display));
  apply_cstring(iter, MK_TEMP_HIGH_DISPLAY, d->temp_high_display, sizeof(d->temp_high_display));
  apply_cstring(iter, MK_TEMP_LOW_DISPLAY, d->temp_low_display, sizeof(d->temp_low_display));
  apply_cstring(iter, MK_FEELS_LIKE_DISPLAY, d->feels_like_display, sizeof(d->feels_like_display));
  apply_cstring(iter, MK_UV_DAILY_DISPLAY, d->uv_daily_display, sizeof(d->uv_daily_display));
  apply_cstring(iter, MK_UV_CURRENT_DISPLAY, d->uv_current_display, sizeof(d->uv_current_display));
  apply_cstring(iter, MK_RAIN_CHANCE_DISPLAY, d->rain_chance_display, sizeof(d->rain_chance_display));
  apply_cstring(iter, MK_HUMIDITY_DISPLAY, d->humidity_display, sizeof(d->humidity_display));
  apply_cstring(iter, MK_WIND_SPEED_DISPLAY, d->wind_speed_display, sizeof(d->wind_speed_display));
  apply_cstring(iter, MK_CLOUD_COVER_DISPLAY, d->cloud_cover_display, sizeof(d->cloud_cover_display));
  apply_cstring(iter, MK_VIS_SCORE_DISPLAY, d->vis_score_display, sizeof(d->vis_score_display));
  apply_cstring(iter, MK_ALTITUDE_DISPLAY, d->altitude_display, sizeof(d->altitude_display));
  apply_cstring(iter, MK_DEW_POINT_DISPLAY, d->dew_point_display, sizeof(d->dew_point_display));
  apply_cstring(iter, MK_PRESSURE_DISPLAY, d->pressure_display, sizeof(d->pressure_display));
  apply_cstring(iter, MK_AQI_DISPLAY, d->aqi_display, sizeof(d->aqi_display));
  for (int i = 0; i < FORECAST_SLOT_COUNT; i++) {
    apply_cstring(iter, FORECAST_TEMP_DISPLAY_KEYS[i], d->forecast_temp_display[i], sizeof(d->forecast_temp_display[i]));
  }

  return changes;
}
