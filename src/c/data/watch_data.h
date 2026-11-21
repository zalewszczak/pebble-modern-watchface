#pragma once

#include <pebble.h>
#include "./hand_types.h"
#include "./marker_types.h"

// AppMessage chunk types. Values must match PKJS MSG_TYPE.
typedef enum {
  MSG_TYPE_STATUS = 0,      // status/error/location
  MSG_TYPE_WEATHER = 1,     // current weather
  MSG_TYPE_ASTRONOMY = 2,   // Sun/Moon/planet data
  MSG_TYPE_SKY_EFFECTS = 3, // aurora/meteors/ISS
  MSG_TYPE_FEATURES = 4,    // feature layout/content
  MSG_TYPE_SETTINGS = 5,    // display settings
} MsgType;

// Planet array order; must match PKJS.
typedef enum {
  PLANET_MERCURY = 0,
  PLANET_VENUS,
  PLANET_MARS,
  PLANET_JUPITER,
  PLANET_SATURN,
  PLANET_COUNT
} PlanetId;

// Largest BORDER_DATA block: 1 + 3 layers * (12 colours + 2 mask bytes + 12 second colours).
#define BORDER_DATA_MAX 80

// Sized for the largest inbound AppMessage chunk.
#define APPMSG_INBOX_SIZE 1200
#define APPMSG_OUTBOX_SIZE 64

// Forecast slots: 0-5 = 1-6 hours ahead, 6-8 = 1-3 days ahead (the original
// layout, kept so saved settings keep their meaning), 9-14 = 7-12 hours ahead.
#define FORECAST_SLOT_COUNT 15

// Phone slot table (PHONE_SLOTS): PKJS compiles every complication value that is a pure function of
// phone-side data into one slot; the watch draws a slot without interpreting it. Each record is
//   text slot: [flags][colour][len][len bytes of text, no NUL]
//   icon slot: [flags][colour][icon kind][aux lo][aux hi]
// and the table ends with PHONE_SLOT_END (or at the end of the buffer). `colour` is a packed GColor8.
// Must match pkjs/comms/phone-slots.js.
#define PHONE_SLOT_ICON   0x01  // icon record (otherwise text)
#define PHONE_SLOT_MAIN   0x02  // use the slot's main colour in COLOR mode (colour byte ignored)
#define PHONE_SLOT_FORCE  0x04  // always draw in `colour`, whatever the colour mode (errors, N/A grey)
#define PHONE_SLOT_PUNCT  0x08  // text record laid out tightly (units, punctuation)
#define PHONE_SLOT_FLAG   0x10  // icon record: aux_flag (night, charging, unknown, crossed out ...)
#define PHONE_SLOT_END    0xFF
#ifdef PBL_BW
#define PHONE_SLOTS_BYTES 160   // B&W: four corners + four edge lines at most
#else
#define PHONE_SLOTS_BYTES 320
#endif

#define MEDIA_ART_MAX_BYTES 256           // 16x16 GColor8 pixels (12x12 on the B&W watches)

typedef struct {
  // Payload/status state.
  bool valid;              // true after a valid payload has been received.
  uint8_t error_code;      // 0=none, 1=no location, 2=calculation, 3=send failure.

  bool show_seconds;       // show seconds in the main clock.

  // Primitive-only feature configuration. Content/feature IDs are resolved
  // on the phone and never stored or interpreted by the watch.
#ifndef PBL_ROUND // a round screen has no corners: 84 bytes less per WatchData
  uint8_t corner_color_mode[4];
  uint8_t corner_primitive_ids[4][10];
  uint8_t corner_primitive_aux[4][10];
#endif
  uint16_t daily_step_goal;
  uint8_t edge_line_color_mode[8];
  uint8_t edge_line_primitive_ids[8][10];
  uint8_t edge_line_primitive_aux[8][10];

  // Day color scheme, stored as packed Pebble color values.
  uint8_t custom_bg;
  uint8_t custom_text;
  uint8_t custom_accent;

  // Optional night color scheme.
  bool night_scheme_enabled;
  // Set by the phone while a plugin background picture picks the scheme by its brightness:
  // 0 = follow sunrise/sunset, 1 = day colors, 2 = night colors (even if the night scheme is off).
  uint8_t bg_scheme_override;
  uint8_t night_custom_bg;
  uint8_t night_custom_text;
  uint8_t night_custom_accent;

  uint8_t shake_seconds;   // duration of the shake animation, in seconds.
  // Bit i set = feature slot i (feature_slot.h's slot enum order) is only
  // shown while the watch has been shaken, for shake_seconds.
  uint16_t shake_only_mask;
  uint8_t startup_clock_anim_mode; // Bit mask: 1=hands sweep in on launch, 2=complications flip in on launch, 0=off.
  uint8_t bg_anim_mode;    // 0=off, 1=hour markers animate in on launch, 2=also the second marks appear one by one.
  uint8_t shake_anim_mode; // 0=off, 1=smooth second hand on shake.

  uint8_t outline_style;   // 0=none, 1=thin, 2=thick.

  bool battery_saver_enabled; // reduce updates to save power.

  uint8_t corner_font;     // feature text font ID.

  bool shadow_translucent; // draw hand shadows dithered.

  bool draw_features_beneath_hands; // analog mode layering.

  uint16_t shadow_angle_deg; // shadow direction in degrees.

  // Hand and marker configuration.
  HandConfig hand_hour;
  HandConfig hand_minute;
  HandConfig hand_second;
  uint8_t center_circle_radius; // 0 disables the center circle.
  uint8_t center_circle_color; // 0=main, 1=accent, 2=background.
  uint8_t center_circle_outline; // 0 = no outline, else outline color + 1 (1=main, 2=accent, 3=background).

  // 3-7 = bitmap marker styles (3 = Modern, the default); anything else
  // draws custom_hour_marker/custom_second_marker + marker_text below. (The
  // phone only ever sends 8 for those: the settings page's Minimal/Braun/
  // Swiss/Classy/None presets are resolved into ring + text values first.)
  uint8_t big_analog_marker_style;

  bool bitmap_marker_transparent; // draw the bitmap marker with a translucent tint.
  bool bitmap_marker_invert;      // blend the bitmap marker into the background as a black/white contrast colour.

  // Custom background image drawn behind the markers. 0 = off (plain
  // background colour), 1 = predefined image number custom_bg_preset (a
  // bitmap resource, see generated/background_presets.h), 2 = one of the
  // user's uploaded images, user slot custom_bg_preset (1-9), which the phone
  // transferred into persistent storage ahead of time (see
  // rendering/dial/bg_image_store.h), 3 = weather background (style
  // custom_bg_preset), 4 = picture from a plugin: the phone has already scaled,
  // colour-processed and dithered it, and keeps it in RAM only (the plugin slot
  // of bg_image_store.h), so it is empty after every restart until re-sent.
  uint8_t custom_bg_mode;
  // Border ring drawn into the cached background, below the indices. The phone builds the ring
  // (weather forecast or calendar) and sends it as border_data (format: see weather_border.h);
  // the watch only draws it. border_weather_mode is the ring's source, 0 = off, 1 = weather,
  // 2 = calendar (the watch only tests for != 0); thickness 2-40 px; border_weather_scheme is
  // unused (kept so the settings blob layout stays put); shake = only while the "show on shake"
  // window is open; semi = every other pixel (checkerboard).
  uint8_t border_weather_mode;
  uint8_t border_weather_px;
  uint8_t border_weather_scheme;
  uint8_t border_weather_shake;
  uint8_t border_weather_semi;
  uint8_t border_data[BORDER_DATA_MAX];
  // Translucent background image: only every other pixel (checkerboard) of the
  // image is drawn, the rest stays the background colour. 0 = off.
  uint8_t bg_translucent;
  // Hands turn semi-transparent for the duration of the shake animation. 0 = off.
  uint8_t shake_hands_translucent;
  // Bit mask of slots using explicit tight primitive spacing (corner bits 0-3,
  // edge/middle bits 4-11).
  uint8_t primitive_tight_mask_lo;
  uint8_t primitive_tight_mask_hi;
  uint8_t custom_bg_preset; // 1-based predefined image number (mode 1) or user slot 1-9 (mode 2).

  MarkerRingConfig custom_hour_marker;
  MarkerRingConfig custom_second_marker;
  MarkerTextConfig marker_text;

  uint8_t custom_hour_marker_inner_thickness;
  uint8_t custom_second_marker_inner_thickness;

  // Phone slot table, see PHONE_SLOT_* above. Persisted with the rest, so the complications are
  // filled straight after a restart, before the phone has sent anything.
  uint8_t phone_slots[PHONE_SLOTS_BYTES];
  // Music: [0] = 0 none / 1 playing / 2 paused, [1..2] = position in seconds and [3..4] = track length in
  // seconds (little endian, 0 = unknown). media_stamp is the watch time the position was received at.
  // (The progress bar and elapsed time are advanced on the watch, so they stay watch-side.)
  uint8_t media_info[5];
  uint8_t media_art[MEDIA_ART_MAX_BYTES]; // row-major GColor8, PL_ICON_DRAW x PL_ICON_DRAW; all zero = none
  time_t media_stamp;
  uint8_t weather_wx_now; // detailed class of the current weather (see forecast_wx); drives the weather background.

  // Phone-computed weather icon category (0-6) and its packed colour. The icon itself stays on the
  // watch because day/night art depends on the watch clock; both fields are sent together with
  // weather_last_update (> 0 once weather has been received).
  uint8_t weather_icon_category;
  uint8_t weather_icon_color;

  uint8_t icon_style; // 0=simple, 1=hollow, 2=full color. Applies to weather AND plain feature icons alike (was weather-only; wire key is still MK_WEATHER_ICON_STYLE, see comms_decoder.c).

  // Weather fetch status and freshness.
  uint8_t weather_error_code;
  uint8_t weather_error_streak;
  bool weather_ever_valid;
  time_t weather_last_update;

  // Next rise/set per planet, indexed by PlanetId; 0 if unavailable.
  time_t planet_rise[PLANET_COUNT];
  time_t planet_set[PLANET_COUNT];

  time_t sun_rise;         // today’s sunrise; 0 if unavailable.
  time_t sun_set;          // today’s sunset; 0 if unavailable.
  time_t sun_rise_tomorrow; // fallback next sunrise.

  // ISS visibility and current-pass data (time-dependent, so it is formatted on the watch).
  time_t iss_next_pass;     // next visible pass start; 0 if none.
  uint8_t iss_error_code;   // current refresh error code, 0=ok.

  // Hourly vibration schedule.
  uint8_t hourly_vibe_mode; // 0=off, 1=hourly, 2=interval.
  uint8_t hourly_vibe_interval_min; // interval for mode 2.
  uint8_t hourly_vibe_pattern; // 0=short, 1=double, 2=long, 3=off.
  uint8_t hourly_vibe_sound;   // beep with the hourly indication: a BeepKind id from timing/beep.h, 0 = off (needs a speaker).
  uint8_t bt_lost_beep;        // beep when the phone connection is lost: a BeepKind id from timing/beep.h, 0 = off (needs a speaker).
  uint8_t beep_volume;         // speaker volume of all beeps, 10-100 percent in steps of 10 (default 50).
  uint8_t bt_lost_vibe;        // vibrate when the phone connection is lost: 0=off, 1=short, 2=double, 3=long.
  uint16_t hourly_vibe_start_min; // start minute of day.
  uint16_t hourly_vibe_end_min; // end minute; equal means all day.

  uint8_t hourly_vibe_days_mask; // bit 0=Sun through bit 6=Sat.

  bool hourly_vibe_override_quiet; // vibrate during Quiet Time when true.

  // Scheduled "My styles": epoch second at which the phone wants to be asked
  // to apply a scheduled style (0 = nothing scheduled). The phone computes
  // it and sends it with every settings push; the watch only has to notice
  // when the time has come and nudge PKJS, which may not be running.
  time_t next_style_check;

  bool draw_debug;
} WatchData;
