#pragma once

// Primitive IDs identify atomic display elements. Parameterized elements
// share an ID and carry their parameters in the instance's aux fields.
// IDs are grouped by function and must remain stable for the phone/watch protocol.

typedef enum {
  PRIM_ID_NONE = 0,

  // ---- Spacers ----
  PRIM_SPACE,
  PRIM_SLASH,
  PRIM_DASH,

  // ---- Date and time ----
  PRIM_GROUP_DATETIME_FIRST,
  PRIM_DATE_WEEKDAY_DAY = PRIM_GROUP_DATETIME_FIRST,     // Reserved composite date ID.
  PRIM_TIME_HM,                 // "13:45" / "1:45 PM"               (content 18)
  PRIM_WEEK_NUMBER,             // "34" (just the number -- see PRIM_LABEL_WK_PREFIX; atomic content 19)
  PRIM_DATE_MONTH_DAY,          // Reserved composite date ID.
  PRIM_DAY_OF_MONTH,            // "12"                              (content 22, and atomic content 27/28/29/98/99/106)
  PRIM_MONTH_NUMBER,            // "9" (numeric, not the letter abbreviations below) (atomic content 27/28/29/30/98/99)
  PRIM_WEEKDAY_SHORT_UPPER,     // "TUE"                             (content 23, and atomic content 98/99)
  PRIM_WEEKDAY_LONG,            // "Tuesday"                         (content 24)
  PRIM_MONTH_SHORT_UPPER,       // "SEP"                             (content 25, and atomic content 21)
  PRIM_MONTH_LONG,              // "September"                      (content 26)
  PRIM_WEEKDAY_SHORT_MIXED,     // "Mon" (mixed case, distinct from the UPPER variant above) (atomic content 12/106)
  PRIM_MONTH_SHORT_MIXED,       // "Sep" (mixed case, distinct from MONTH_SHORT_UPPER)       (atomic content 106)
  PRIM_YEAR_FULL,                // "2026"                                                    (atomic content 29)
  PRIM_YEAR_SHORT,               // "26" (2-digit)                                             (atomic content 30)
  PRIM_LABEL_WK_PREFIX,          // "WK" -- generic short static label, not a value (atomic content 19/106)
  PRIM_DATE_SLASH_DM,           // Reserved composite date ID.
  PRIM_DATE_SLASH_MD,           // Reserved composite date ID.
  PRIM_DATE_SLASH_DMY,          // Reserved composite date ID.
  PRIM_DATE_SLASH_MDY_SHORTYEAR,// Reserved composite date ID.
  PRIM_TIME_HMS,                // "13:45:07"                        (content 63)
  PRIM_HOUR_24_PAD,             // "07"                              (content 64)
  PRIM_HOUR_24,                 // "7"                               (content 65)
  PRIM_HOUR_12,                 // "7"                               (content 66)
  PRIM_MINUTE,                  // "5"                               (content 67)
  PRIM_MINUTE_PAD,              // "05"                              (content 68)
  PRIM_SECOND,                  // "9"                               (content 69)
  PRIM_SECOND_PAD,              // "09"                              (content 70)
  PRIM_SECOND_TENS,             // "0"                               (content 71)
  PRIM_SECOND_ONES,             // "9"                               (content 72)
  PRIM_AMPM,                    // "AM"/"PM"                         (content 86)
  PRIM_DATE_WEEKDAY_DM_SLASH,   // Reserved composite date ID.
  PRIM_DATE_WEEKDAY_MD_SLASH,   // Reserved composite date ID.
  PRIM_DATE_LONG_WITH_WEEK,     // Reserved composite date ID.
  PRIM_DATE_LONG,               // Reserved composite date ID.
  PRIM_TIMEZONE_CLOCK,          // Reserved composite time-zone ID.
  PRIM_TIMEZONE_ABBR,           // "PST" (aux = zone index)          (atomic content 44-62)
  PRIM_TIMEZONE_TIME,           // "07:45"/"7:45" (aux = zone index) (atomic content 44-62)
  PRIM_TIMEZONE_AMPM,           // "AM"/"PM" for a zone's *local* hour, not the watch's own
                                 // (aux = zone index), distinct from PRIM_AMPM (content 86) because the
                                 // displayed time depends on the selected zone.
  PRIM_GROUP_DATETIME_LAST = PRIM_TIMEZONE_AMPM,

  // ---- Health and status ----
  PRIM_GROUP_HEALTH_FIRST,
  PRIM_HEART_RATE_ICON = PRIM_GROUP_HEALTH_FIRST,
  PRIM_HEART_RATE_VALUE,
  PRIM_STEPS_ICON,
  PRIM_STEPS_VALUE,
  PRIM_STEP_GOAL_PCT,
  PRIM_BATTERY_ICON,
  PRIM_BATTERY_PCT_TEXT,
  PRIM_BATTERY_LOGO_ICON,       // Pebble-logo battery glyph (content 17)
  PRIM_BLUETOOTH_ICON,
  PRIM_BLUETOOTH_STATUS_TEXT,
  PRIM_QUIET_TIME_ICON,
  PRIM_QUIET_TIME_STATUS_TEXT,
  PRIM_SLEEP_TOTAL_ICON,
  PRIM_SLEEP_TOTAL_TEXT,
  PRIM_SLEEP_RESTFUL_ICON,
  PRIM_SLEEP_RESTFUL_TEXT,
  PRIM_SLEEP_RESTFUL_PAREN_TEXT, // "(1h 20m)" -- composite 104's parenthesized form
  PRIM_SLEEP_QUALITY_ICON,
  PRIM_SLEEP_QUALITY_PCT,
  PRIM_BED_TIME_ICON,
  PRIM_BED_TIME_TEXT,
  PRIM_WAKE_TIME_ICON,
  PRIM_WAKE_TIME_TEXT,
  PRIM_WAKE_TIME_SLASH_TEXT,    // Reserved composite sleep ID.
  PRIM_GROUP_HEALTH_LAST = PRIM_WAKE_TIME_SLASH_TEXT,

  // ---- Astronomy ----
  PRIM_GROUP_ASTRO_FIRST,
  PRIM_MOON_PHASE_ICON = PRIM_GROUP_ASTRO_FIRST,
  PRIM_MOON_PHASE_NAME,
  PRIM_LOCATION_ICON,
  PRIM_LOCATION_NAME,
  PRIM_SUN_EVENT_ICON,
  PRIM_SUN_EVENT_TIME,
  PRIM_PLANETS_VISIBLE_ICON,
  PRIM_PLANETS_VISIBLE_COUNT,
  PRIM_METEOR_SHOWER_NAME,
  PRIM_SATURN_RINGS_ICON,
  PRIM_SATURN_RINGS_PCT,
  PRIM_NEXT_PLANET_RISE,
  PRIM_ISS_ICON,
  PRIM_ISS_NEXT_PASS,
  PRIM_AURORA_ICON,
  PRIM_AURORA_KP,
  PRIM_COMPASS_ICON,            // Heading comes from the watch compass sensor.
  PRIM_COMPASS_DIR_TEXT,
  PRIM_GROUP_ASTRO_LAST = PRIM_COMPASS_DIR_TEXT,

  // ---- Weather ----
  PRIM_GROUP_WEATHER_FIRST,
  PRIM_TEMP_HIGH_TEXT = PRIM_GROUP_WEATHER_FIRST,
  PRIM_TEMP_LOW_TEXT,
  PRIM_TEMP_HIGH_LOW_TEXT,      // Used by the combined high/low temperature display.
  PRIM_LABEL_HIGH_PREFIX,       // "H" -- generic short static label, not a value (atomic content 4)
  PRIM_LABEL_LOW_PREFIX,        // "L" -- ditto (atomic content 4)
  PRIM_CURRENT_CONDITIONS_TEXT,
  PRIM_UV_DAILY_TEXT,
  PRIM_UV_CURRENT_TEXT,
  PRIM_RAIN_CHANCE_ICON,
  PRIM_RAIN_CHANCE_TEXT,
  PRIM_HUMIDITY_ICON,
  PRIM_HUMIDITY_TEXT,
  PRIM_WIND_SPEED_ICON,
  PRIM_WIND_SPEED_TEXT,
  PRIM_VISIBILITY_ICON,
  PRIM_VISIBILITY_TEXT,
  PRIM_CLOUD_COVER_ICON,
  PRIM_CLOUD_COVER_TEXT,
  PRIM_WEATHER_CONDITION_ICON,
  PRIM_CURRENT_TEMP_TEXT,
  PRIM_PRESSURE_TREND_ICON,
  PRIM_PRESSURE_TEXT,
  PRIM_WIND_DIRECTION_ICON,
  PRIM_WIND_DIRECTION_TEXT,
  PRIM_AQI_TEXT,
  PRIM_DEW_POINT_TEXT,
  PRIM_ALTITUDE_ICON,
  PRIM_ALTITUDE_TEXT,
  PRIM_CURRENT_TEMP_ONLY_TEXT,
  PRIM_TEMP_HIGH_ONLY_TEXT,
  PRIM_TEMP_LOW_ONLY_TEXT,
  PRIM_FEELS_LIKE_TEXT,
  PRIM_TEMP_CUR_HI_LO_TEXT,     // Reserved combined temperature ID.
  PRIM_FORECAST_OFFSET_ICON,    // "+Xh"/"+X day" half-icon (aux = offset index)
  PRIM_FORECAST_TEMP_TEXT,
  PRIM_WEATHER_REFRESH_ICON,
  PRIM_WEATHER_LAST_UPDATE_LONG_TEXT,
  PRIM_WEATHER_LAST_UPDATE_SHORT_TEXT,
  PRIM_GROUP_WEATHER_LAST = PRIM_WEATHER_LAST_UPDATE_SHORT_TEXT,

  // ---- Additional primitives (append new IDs; do not reorder existing IDs) ----
  // Quiet Time icon variant that leaves state to the accompanying text.
  PRIM_QUIET_TIME_PLAIN_ICON,
  PRIM_BLUETOOTH_ONOFF_TEXT,    // "ON"/"OFF" (content 113); PRIM_BLUETOOTH_STATUS_TEXT stays "Connected"/"No phone"

  // ---- Custom-feature builder additions (single-value elements) ----------
  // Punctuation spacers (PRIMITIVE_KIND_PUNCT: laid out tightly).
  PRIM_PAREN_OPEN,              // "("
  PRIM_PAREN_CLOSE,             // ")"
  PRIM_DOT,                     // "."
  PRIM_COMMA,                   // ","
  // Bare-value variants omit the legend or unit included by the *_TEXT forms.
  PRIM_FEELS_LIKE_VALUE,
  PRIM_UV_DAILY_VALUE,
  PRIM_UV_CURRENT_VALUE,
  PRIM_PRESSURE_VALUE,
  PRIM_AQI_VALUE,
  PRIM_ALTITUDE_VALUE,
  PRIM_PLANETS_VISIBLE_VALUE,
  PRIM_SATURN_RINGS_VALUE,
  PRIM_AURORA_KP_VALUE,
  PRIM_NEXT_PLANET_NAME,
  PRIM_NEXT_PLANET_TIME,
  // Unit symbols following the user's unit settings (PRIMITIVE_KIND_PUNCT).
  PRIM_TEMP_UNIT_TEXT,          // "C" / "F" / "K"
  PRIM_WIND_UNIT_TEXT,          // "km/h" / "mph" / "m/s" / "kn"
  PRIM_PRESSURE_UNIT_TEXT,      // "hPa"
  PRIM_ALTITUDE_UNIT_TEXT,      // "m" / "ft"

  // Pebble plugin data (PKJS-supplied text, aux = plugin slot 0..PLUGIN_SLOT_COUNT-1).
  PRIM_PLUGIN_TEXT,

  // Phone battery (Pebble "phone" plugin) and music (Android-only "music" plugin).
  PRIM_PHONE_ICON,              // phone glyph, tinted by the phone's charge
  PRIM_PHONE_BATTERY_TEXT,      // "82%" ("82%+" while charging); "--" when unknown
  PRIM_MEDIA_STATE_ICON,        // play triangle / pause bars (music note while no track)
  PRIM_MEDIA_ART_ICON,          // tiny album art (a note placeholder until art arrives)
  PRIM_MEDIA_PROGRESS_BAR,      // track progress, advanced on the watch between phone updates
  PRIM_MEDIA_TITLE_TEXT,        // track title
  PRIM_MEDIA_ELAPSED_TEXT,      // "1:23"

  PRIM_ID_COUNT,
} PrimitiveId;
