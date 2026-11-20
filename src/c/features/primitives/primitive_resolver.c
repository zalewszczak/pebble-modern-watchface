#include "./primitive_resolver.h"
#include "../feature_colors.h"
#include "../feature_rules.h"
#include "../feature_color_helpers.h"
#include "../feature_health.h"
#include "../feature_icons.h"
#include "../feature_timezone.h"
#include "../feature_support.h"
#include "../../data/watch_ui.h"
#include "../../input/input.h"
#include <string.h>
#include <stdio.h>

static void resolve_text(PrimitiveResolved *out, const char *text, GColor color) {
  out->kind = PRIMITIVE_KIND_TEXT;
  snprintf(out->text, sizeof(out->text), "%s", text);
  out->dynamic_color = color;
}

static void resolve_icon(PrimitiveResolved *out, uint8_t icon_kind, int16_t aux, bool aux_flag, GColor color) {
  out->kind = PRIMITIVE_KIND_ICON;
  out->icon_kind = icon_kind;
  out->aux = aux;
  out->aux_flag = aux_flag;
  out->dynamic_color = color;
}

static void resolve_punct(PrimitiveResolved *out, const char *text, GColor color) {
  out->kind = PRIMITIVE_KIND_PUNCT;
  snprintf(out->text, sizeof(out->text), "%s", text);
  out->dynamic_color = color;
}

// Removes optional text around a resolved value while preserving fallback
// messages such as "N/A" and "ERR 2".
static void strip_text(PrimitiveResolved *out, const char *prefix, const char *suffix) {
  size_t len = strlen(out->text);
  size_t pl = prefix ? strlen(prefix) : 0;
  if (pl && len >= pl && strncmp(out->text, prefix, pl) == 0) {
    memmove(out->text, out->text + pl, len - pl + 1);
    len -= pl;
  }
  size_t sl = suffix ? strlen(suffix) : 0;
  if (sl && len >= sl && strcmp(out->text + len - sl, suffix) == 0) out->text[len - sl] = '\0';
}

// Phone slot table (see PHONE_SLOT_* in watch_data.h): finds record number `idx`, or NULL when the table
// has fewer records (nothing received yet, or the phone ran out of slot budget).
static const uint8_t *phone_slot_find(const WatchData *data, uint8_t idx) {
  const uint8_t *p = data->phone_slots;
  const uint8_t *end = p + PHONE_SLOTS_BYTES;
  while (p + 3 <= end && p[0] != PHONE_SLOT_END) {
    uint8_t size = (p[0] & PHONE_SLOT_ICON) ? 5 : (uint8_t)(3 + p[2]);
    if (p + size > end) return NULL;
    if (idx == 0) return p;
    idx--;
    p += size;
  }
  return NULL;
}

// One slot is drawn as it arrived: PKJS already chose text/glyph, colour and colour-mode behaviour.
static void resolve_phone_slot(PrimitiveResolved *out, const WatchData *data, uint8_t idx) {
  const uint8_t *s = phone_slot_find(data, idx);
  if (!s) { // not received yet: an unobtrusive placeholder rather than a blank complication
    resolve_text(out, "--", GColorLightGray);
    out->force_color = true;
    return;
  }
  GColor color;
  color.argb = s[1];
  if (s[0] & PHONE_SLOT_ICON) {
    resolve_icon(out, s[2], (int16_t)(s[3] | (s[4] << 8)), (s[0] & PHONE_SLOT_FLAG) != 0, color);
  } else {
    uint8_t len = s[2];
    if (len > sizeof(out->text) - 1) len = sizeof(out->text) - 1;
    out->kind = (s[0] & PHONE_SLOT_PUNCT) ? PRIMITIVE_KIND_PUNCT : PRIMITIVE_KIND_TEXT;
    memcpy(out->text, s + 3, len);
    out->text[len] = '\0';
    out->dynamic_color = color;
  }
  out->dynamic_is_main = (s[0] & PHONE_SLOT_MAIN) != 0;
  out->force_color = (s[0] & PHONE_SLOT_FORCE) != 0;
}

// Custom-feature builder additions that stay on the watch: punctuation (coloured like the date), and the two
// values that depend on the watch clock (planets visible now, next planet to rise) plus the music
// elements that move between phone updates. Returns true when `id` is one of them (*ok says whether it
// resolved).
static bool resolve_builder_extra(PrimitiveId id, uint8_t aux_in, const WatchData *data, time_t now,
                                  struct tm *t, PrimitiveResolved *out, bool *ok) {
  *ok = true;
  switch (id) {
    case PRIM_PHONE_SLOT: resolve_phone_slot(out, data, aux_in); return true;

    case PRIM_PAREN_OPEN: resolve_punct(out, "(", feature_colors_date_year_progress_gradient(t)); return true;
    case PRIM_PAREN_CLOSE: resolve_punct(out, ")", feature_colors_date_year_progress_gradient(t)); return true;
    case PRIM_DOT: resolve_punct(out, ".", feature_colors_date_year_progress_gradient(t)); return true;
    case PRIM_COMMA: resolve_punct(out, ",", feature_colors_date_year_progress_gradient(t)); return true;

    case PRIM_PLANETS_VISIBLE_VALUE:
      *ok = primitive_resolver_resolve(PRIM_PLANETS_VISIBLE_COUNT, 0, data, now, t, out);
      if (*ok) { strip_text(out, NULL, " planets"); strip_text(out, NULL, " planet"); }
      return true;
    case PRIM_NEXT_PLANET_NAME:
    case PRIM_NEXT_PLANET_TIME: {
      *ok = primitive_resolver_resolve(PRIM_NEXT_PLANET_RISE, 0, data, now, t, out);
      if (!*ok) return true;
      char *space = strchr(out->text, ' '); // "VEN 18:32" -> name / time; "N/A", "ERR n" keep as they are
      if (space && strncmp(out->text, "ERR", 3) != 0) {
        if (id == PRIM_NEXT_PLANET_NAME) *space = '\0';
        else memmove(out->text, space + 1, strlen(space + 1) + 1);
      }
      return true;
    }

    case PRIM_MEDIA_STATE_ICON: {
      uint8_t st = data->media_info[0];
      // aux = 0 note (nothing playing), 1 play, 2 pause.
      resolve_icon(out, 32, st > 2 ? 0 : st, false, st == 1 ? GColorGreen : (st == 2 ? GColorOrange : GColorLightGray));
      return true;
    }
    case PRIM_MEDIA_ART_ICON:
      resolve_icon(out, 33, 0, false, GColorWhite);
      return true;
    case PRIM_MEDIA_PROGRESS_BAR:
    case PRIM_MEDIA_ELAPSED_TEXT: {
      int32_t pos = (int32_t)data->media_info[1] | ((int32_t)data->media_info[2] << 8);
      int32_t dur = (int32_t)data->media_info[3] | ((int32_t)data->media_info[4] << 8);
      bool playing = data->media_info[0] == 1;
      if (playing && data->media_stamp > 0 && now > data->media_stamp) pos += (int32_t)(now - data->media_stamp);
      if (dur > 0 && pos > dur) pos = dur;
      if (id == PRIM_MEDIA_PROGRESS_BAR) {
        resolve_icon(out, 34, dur > 0 ? (int16_t)((pos * 100) / dur) : 0, dur <= 0, playing ? GColorGreen : GColorLightGray);
        return true;
      }
      char tbuf[12];
      if (data->media_info[0] == 0) snprintf(tbuf, sizeof(tbuf), "-:--");
      else snprintf(tbuf, sizeof(tbuf), "%d:%02d", (int)(pos / 60), (int)(pos % 60));
      resolve_text(out, tbuf, playing ? GColorGreen : GColorLightGray);
      return true;
    }
    default:
      (void)aux_in;
      return false;
  }
}


bool primitive_resolver_resolve(PrimitiveId id, uint8_t aux_in, const WatchData *data, time_t now, struct tm *t, PrimitiveResolved *out) {
  // `now` is used by PRIM_WEATHER_CONDITION_ICON's day/night check below;
  // every other case only needs `t` (already-broken-down local time).
  memset(out, 0, sizeof(*out));
  {
    bool extra_ok = false;
    if (resolve_builder_extra(id, aux_in, data, now, t, out, &extra_ok)) return extra_ok;
  }
  // Every currently-covered date/time primitive shares this one gradient
  // (the same one date resolver() uses for every content id
  // enabled for transport so far -- see primitive_transport.h) -- computed
  // once here rather than per-case, since date/time cases below all want
  // the same value.
  GColor date_c = feature_colors_date_year_progress_gradient(t);
  // Sized for the longest strftime/snprintf result written into it below --
  // "11:59:59 PM" (PRIM_TIME_HMS, 12h style) is the longest at 11 chars + NUL.
  char buf[16];

  switch (id) {
    case PRIM_SPACE:
      out->kind = PRIMITIVE_KIND_SPACE;
      out->dynamic_color = date_c;
      return true;
    case PRIM_SLASH:
      out->kind = PRIMITIVE_KIND_SLASH;
      out->dynamic_color = date_c;
      return true;
    case PRIM_DASH:
      // Resolve the dash spacer; layout and rendering handle its appearance.
      out->kind = PRIMITIVE_KIND_DASH;
      out->dynamic_color = date_c;
      return true;

    // ---- clock cluster (date resolver's plain time/second
    // cases, content 18/63-72/86) -- all watch-runtime, read straight off
    // `t`/`now`. Color rules copied 1:1 from the switch.
    case PRIM_TIME_HM:
      strftime(buf, sizeof(buf), clock_is_24h_style() ? "%H:%M" : "%I:%M %p", t);
      resolve_text(out, buf, feature_colors_daynight_gradient(now, data->sun_rise, data->sun_set));
      return true;
    case PRIM_TIME_HMS:
      strftime(buf, sizeof(buf), clock_is_24h_style() ? "%H:%M:%S" : "%I:%M:%S %p", t);
      resolve_text(out, buf, feature_colors_daynight_gradient(now, data->sun_rise, data->sun_set));
      return true;
    case PRIM_HOUR_24_PAD:
      snprintf(buf, sizeof(buf), "%02d", t->tm_hour);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_hour, 0, 23));
      return true;
    case PRIM_HOUR_24:
      snprintf(buf, sizeof(buf), "%d", t->tm_hour);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_hour, 0, 23));
      return true;
    case PRIM_HOUR_12: {
      int hour12 = t->tm_hour % 12; if (hour12 == 0) hour12 = 12;
      snprintf(buf, sizeof(buf), "%d", hour12);
      resolve_text(out, buf, feature_colors_linear_white_black(hour12, 1, 12));
      return true;
    }
    case PRIM_MINUTE:
      snprintf(buf, sizeof(buf), "%d", t->tm_min);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_min, 0, 59));
      return true;
    case PRIM_MINUTE_PAD:
      snprintf(buf, sizeof(buf), "%02d", t->tm_min);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_min, 0, 59));
      return true;
    case PRIM_SECOND:
      snprintf(buf, sizeof(buf), "%d", t->tm_sec);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_sec, 0, 59));
      return true;
    case PRIM_SECOND_PAD:
      snprintf(buf, sizeof(buf), "%02d", t->tm_sec);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_sec, 0, 59));
      return true;
    case PRIM_SECOND_TENS:
      snprintf(buf, sizeof(buf), "%d", t->tm_sec / 10);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_sec / 10, 0, 5));
      return true;
    case PRIM_SECOND_ONES:
      snprintf(buf, sizeof(buf), "%d", t->tm_sec % 10);
      resolve_text(out, buf, feature_colors_linear_white_black(t->tm_sec % 10, 0, 9));
      return true;
    case PRIM_AMPM:
      resolve_text(out, t->tm_hour < 12 ? "AM" : "PM", (t->tm_hour < 12) ? GColorBlack : GColorWhite);
      return true;

    case PRIM_WEEKDAY_SHORT_MIXED:
      strftime(buf, sizeof(buf), "%a", t);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_WEEKDAY_SHORT_UPPER:
      strftime(buf, sizeof(buf), "%a", t);
      feature_rules_to_upper_str(buf);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_MONTH_SHORT_UPPER:
      strftime(buf, sizeof(buf), "%b", t);
      feature_rules_to_upper_str(buf);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_DAY_OF_MONTH:
      snprintf(buf, sizeof(buf), "%d", t->tm_mday);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_MONTH_NUMBER:
      snprintf(buf, sizeof(buf), "%d", t->tm_mon + 1);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_YEAR_FULL: {
      char ybuf[12];
      snprintf(ybuf, sizeof(ybuf), "%d", t->tm_year + 1900);
      resolve_text(out, ybuf, date_c);
      return true;
    }
    case PRIM_YEAR_SHORT:
      snprintf(buf, sizeof(buf), "%02d", (t->tm_year + 1900) % 100);
      resolve_text(out, buf, date_c);
      return true;

    // Date components share one gradient so a component keeps the same
    // color wherever it appears.
    case PRIM_WEEK_NUMBER:
      strftime(buf, sizeof(buf), "%V", t);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_MONTH_SHORT_MIXED:
      strftime(buf, sizeof(buf), "%b", t);
      resolve_text(out, buf, date_c);
      return true;
    case PRIM_WEEKDAY_LONG: {
      char lbuf[12];
      strftime(lbuf, sizeof(lbuf), "%A", t);
      resolve_text(out, lbuf, date_c);
      return true;
    }
    case PRIM_MONTH_LONG: {
      char lbuf[12];
      strftime(lbuf, sizeof(lbuf), "%B", t);
      resolve_text(out, lbuf, date_c);
      return true;
    }
    // "WK" is a constant glyph that takes the week number's own colour (the shared date gradient).
    case PRIM_LABEL_WK_PREFIX:
      resolve_text(out, "WK", date_c);
      return true;

    // The weather icon stays on the watch: its day/night art depends on the watch clock and the sun times.
    // PKJS sends the category and its colour (weather_last_update > 0 once weather has been received).
    case PRIM_WEATHER_CONDITION_ICON: {
      bool have = data->weather_last_update > 0;
      bool night = !watch_ui_is_daylight(data, now); // day/night art for sun/partly-cloudy
      resolve_icon(out, 14, data->weather_icon_category, night,
                   have ? feature_color_from_packed(data->weather_icon_color) : GColorLightGray);
      return true;
    }
    case PRIM_WEATHER_REFRESH_ICON:
    case PRIM_WEATHER_LAST_UPDATE_LONG_TEXT:
    case PRIM_WEATHER_LAST_UPDATE_SHORT_TEXT: {
      char buf2[24];
      if (data->weather_last_update > 0) {
        struct tm *ut = localtime(&data->weather_last_update);
        char tb[8];
        strftime(tb, sizeof(tb), clock_is_24h_style() ? "%H:%M" : "%I:%M", ut);
        if (id == PRIM_WEATHER_LAST_UPDATE_LONG_TEXT) { snprintf(buf2, sizeof(buf2), "Last updated %s", tb); }
        else { snprintf(buf2, sizeof(buf2), "%s", tb); }
      } else {
        snprintf(buf2, sizeof(buf2), "N/A");
      }
      GColor c = feature_colors_weather_staleness_gradient(now, data->weather_last_update);
      if (id == PRIM_WEATHER_REFRESH_ICON) { resolve_icon(out, 28, 0, false, c); return true; }
      resolve_text(out, buf2, c);
      return true;
    }


    // Health and status values come directly from Pebble's watch services.
#ifndef PBL_PLATFORM_GABBRO
    case PRIM_HEART_RATE_ICON:
    case PRIM_HEART_RATE_VALUE: {
      int bpm = feature_health_peek_current_bpm();
      GColor c = (bpm > 0) ? feature_colors_heart_rate_gradient(bpm) : GColorLightGray;
      if (id == PRIM_HEART_RATE_ICON) { resolve_icon(out, 1, 0, false, c); return true; }
      char vbuf[6];
      snprintf(vbuf, sizeof(vbuf), bpm > 0 ? "%d" : "N/A", bpm);
      resolve_text(out, vbuf, c);
      return true;
    }
#endif
    case PRIM_CALORIES_ICON:
    case PRIM_CALORIES_VALUE:
    case PRIM_CALORIES_ACTIVE_VALUE: {
      // Total = resting + active kcal burned today; "N/A" when the health service has no data yet.
      const bool have = feature_health_metric_available(HealthMetricActiveKCalories) ||
                        feature_health_metric_available(HealthMetricRestingKCalories);
      GColor c = have ? GColorOrange : GColorLightGray;
      if (id == PRIM_CALORIES_ICON) { resolve_icon(out, 38, 0, false, c); return true; }
      char kbuf[8];
      if (!have) {
        snprintf(kbuf, sizeof(kbuf), "N/A");
      } else {
        int32_t kcal = (int32_t)feature_health_sum_today(HealthMetricActiveKCalories);
        if (id == PRIM_CALORIES_VALUE) kcal += (int32_t)feature_health_sum_today(HealthMetricRestingKCalories);
        snprintf(kbuf, sizeof(kbuf), "%d", (int)kcal);
      }
      resolve_text(out, kbuf, c);
      return true;
    }
    case PRIM_STEPS_ICON:
    case PRIM_STEPS_VALUE:
    case PRIM_STEP_GOAL_PCT: {
      HealthValue steps = feature_health_sum_today(HealthMetricStepCount);
      uint16_t goal = data->daily_step_goal > 0 ? data->daily_step_goal : 10000;
      int32_t pct = (steps * 100) / goal;
      GColor icon_c = feature_colors_red_green_gradient((uint8_t)(pct > 100 ? 100 : pct));
      if (id == PRIM_STEPS_ICON) { resolve_icon(out, 2, 0, false, icon_c); return true; }
      if (id == PRIM_STEPS_VALUE) {
        char vbuf[8];
        snprintf(vbuf, sizeof(vbuf), "%d", (int)steps);
        resolve_text(out, vbuf, icon_c);
        return true;
      }
      // PRIM_STEP_GOAL_PCT: content 3's own pct can exceed 100% (shown
      // uncapped up to 999), unlike the icon color above which clamps at
      // 100 -- same as primitive health-value resolution()'s case 3.
      if (pct > 999) pct = 999;
      char pbuf[16];
      snprintf(pbuf, sizeof(pbuf), "%d%%", (int)pct);
      resolve_text(out, pbuf, feature_colors_red_green_gradient((uint8_t)(pct > 100 ? 100 : pct)));
      return true;
    }
    case PRIM_BATTERY_ICON:
    case PRIM_BATTERY_PCT_TEXT:
    case PRIM_BATTERY_LOGO_ICON: {
      BatteryChargeState bs = battery_state_service_peek();
      GColor c = bs.is_charging ? GColorGreen : feature_colors_red_green_gradient((uint8_t)bs.charge_percent);
      if (id == PRIM_BATTERY_LOGO_ICON) { resolve_icon(out, 12, bs.charge_percent, bs.is_charging, c); return true; }
      if (id == PRIM_BATTERY_ICON) { resolve_icon(out, 3, bs.charge_percent, bs.is_charging, c); return true; }
      char pbuf[8];
      snprintf(pbuf, sizeof(pbuf), bs.is_charging ? "%d%%+" : "%d%%", bs.charge_percent);
      resolve_text(out, pbuf, c);
      return true;
    }
    case PRIM_BLUETOOTH_ICON:
    case PRIM_BLUETOOTH_STATUS_TEXT: {
      // Always its own dynamic color, ignoring color_mode entirely -- see
      // primitive health-value resolution()'s case 20/78 comment; hence
      // force_color rather than leaving this to the usual dispatch.
      bool connected = connection_service_peek_pebble_app_connection();
      GColor c = connected ? GColorFromRGB(64, 224, 208) : GColorFromRGB(255, 0, 0);
      // aux_flag = disconnected: the Full color art cannot be tinted red, so the
      // icon renderer crosses it out instead (feature_icons.c, case 13).
      if (id == PRIM_BLUETOOTH_ICON) { resolve_icon(out, 13, 0, !connected, c); }
      else { resolve_text(out, connected ? "Connected" : "No phone", c); }
      out->force_color = true;
      return true;
    }
    case PRIM_QUIET_TIME_ICON:
    case PRIM_QUIET_TIME_PLAIN_ICON:
    case PRIM_QUIET_TIME_STATUS_TEXT: {
      bool active = quiet_time_is_active();
      GColor c = active ? GColorRed : GColorWhite;
      // The stateful icon is crossed out while Quiet Time is active. The
      // plain variant leaves the icon unchanged and reports state as text.
      if (id == PRIM_QUIET_TIME_ICON) { resolve_icon(out, 29, 0, active, c); return true; }
      if (id == PRIM_QUIET_TIME_PLAIN_ICON) { resolve_icon(out, 29, 0, false, c); return true; }
      resolve_text(out, active ? "ON" : "OFF", c);
      return true;
    }
    case PRIM_BATTERY_ODD_ICON: {
      BatteryChargeState bs = battery_state_service_peek();
      if (bs.charge_percent >= 20) { resolve_icon(out, 35, 0, false, GColorWhite); return true; } // blank, keeps the width
      resolve_icon(out, 3, bs.charge_percent, bs.is_charging, bs.is_charging ? GColorGreen : feature_colors_red_green_gradient((uint8_t)bs.charge_percent));
      return true;
    }
    case PRIM_BLUETOOTH_ODD_ICON: {
      if (connection_service_peek_pebble_app_connection()) { resolve_icon(out, 36, 0, false, GColorWhite); return true; }
      resolve_icon(out, 13, 0, true, GColorFromRGB(255, 0, 0));
      out->force_color = true;
      return true;
    }
    case PRIM_QUIET_TIME_ODD_ICON: {
      if (!quiet_time_is_active()) { resolve_icon(out, 37, 0, false, GColorWhite); return true; }
      resolve_icon(out, 29, 0, true, GColorRed);
      return true;
    }
    case PRIM_BLUETOOTH_ONOFF_TEXT: {
      // Same always-its-own-color rule as the other Bluetooth primitives.
      bool connected = connection_service_peek_pebble_app_connection();
      resolve_text(out, connected ? "ON" : "OFF", connected ? GColorFromRGB(64, 224, 208) : GColorFromRGB(255, 0, 0));
      out->force_color = true;
      return true;
    }
    case PRIM_SLEEP_TOTAL_ICON:
    case PRIM_SLEEP_TOTAL_TEXT:
    case PRIM_SLEEP_RESTFUL_ICON:
    case PRIM_SLEEP_RESTFUL_TEXT: {
      bool restful = (id == PRIM_SLEEP_RESTFUL_ICON || id == PRIM_SLEEP_RESTFUL_TEXT);
      HealthMetric metric = restful ? HealthMetricSleepRestfulSeconds : HealthMetricSleepSeconds;
      int32_t range_secs = restful ? 3 * 3600 : 9 * 3600;
      uint8_t icon_kind = restful ? 22 : 21;
      bool is_icon = (id == PRIM_SLEEP_TOTAL_ICON || id == PRIM_SLEEP_RESTFUL_ICON);
      if (feature_health_metric_available(metric)) {
        HealthValue secs = feature_health_sum_today(metric);
        GColor c = feature_colors_seven_stop_gradient_reversed((int32_t)secs, 0, range_secs);
        if (is_icon) { resolve_icon(out, icon_kind, 0, false, c); return true; }
        char dbuf[8];
        feature_health_format_duration_hm(dbuf, sizeof(dbuf), (int32_t)secs);
        resolve_text(out, dbuf, c);
        return true;
      }
      // N/A: always gray, bypassing color_mode entirely -- see
      // primitive health-value resolution()'s case 39/40 comment.
      if (is_icon) { resolve_icon(out, icon_kind, 0, false, GColorLightGray); }
      else { resolve_text(out, "N/A", GColorLightGray); }
      out->force_color = true;
      return true;
    }
    case PRIM_SLEEP_QUALITY_ICON:
    case PRIM_SLEEP_QUALITY_PCT: {
      if (feature_health_metric_available(HealthMetricSleepSeconds)) {
        HealthValue total = feature_health_sum_today(HealthMetricSleepSeconds);
        HealthValue restful = feature_health_sum_today(HealthMetricSleepRestfulSeconds);
        int pct = (total > 0) ? (int)((restful * 100) / total) : 0;
        if (pct > 100) pct = 100;
        GColor c = feature_colors_red_green_gradient((uint8_t)pct);
        if (id == PRIM_SLEEP_QUALITY_ICON) { resolve_icon(out, 20, 0, false, c); return true; }
        char pbuf[16];
        snprintf(pbuf, sizeof(pbuf), "%d%%", pct);
        resolve_text(out, pbuf, c);
        return true;
      }
      if (id == PRIM_SLEEP_QUALITY_ICON) { resolve_icon(out, 20, 0, false, GColorLightGray); }
      else { resolve_text(out, "N/A", GColorLightGray); }
      out->force_color = true;
      return true;
    }
    case PRIM_BED_TIME_ICON:
    case PRIM_BED_TIME_TEXT:
    case PRIM_WAKE_TIME_ICON:
    case PRIM_WAKE_TIME_TEXT: {
      bool wake = (id == PRIM_WAKE_TIME_ICON || id == PRIM_WAKE_TIME_TEXT);
      bool is_icon = (id == PRIM_BED_TIME_ICON || id == PRIM_WAKE_TIME_ICON);
      FeatureSleepSpan span = feature_health_get_sleep_span();
      uint8_t icon_kind = wake ? 19 : 18;
      if (span.found) {
        time_t event = wake ? span.latest_end : span.earliest_start;
        GColor c = feature_colors_daynight_gradient(event, data->sun_rise, data->sun_set);
        if (is_icon) { resolve_icon(out, icon_kind, 0, false, c); return true; }
        struct tm *et = localtime(&event);
        char tbuf[8];
        strftime(tbuf, sizeof(tbuf), clock_is_24h_style() ? "%H:%M" : "%I:%M %p", et);
        resolve_text(out, tbuf, c);
        return true;
      }
      if (is_icon) { resolve_icon(out, icon_kind, 0, false, GColorLightGray); }
      else { resolve_text(out, "N/A", GColorLightGray); }
      out->force_color = true;
      return true;
    }

    // ---- timezone cluster (timezone resolver) --------------
    // aux_in is the zone index (feature_timezone_get()'s own index space,
    // 0-18) rather than a raw UTC offset -- see primitive_resolver.h's own
    // comment on why: reusing feature_timezone_get()/
    // feature_timezone_current_offset_min() gets DST handling for free,
    // which a bare minutes-offset parameter sent once at content-selection
    // time could never track correctly across a DST transition. The watch
    // computes the zone's local time from that index and its own clock, so
    // the watch decides the color too (feature_timezone_daylight_color()),
    // based on the *computed* local hour -- same color-ownership principle
    // as the rest of the date/time cluster, just parametrized.
    case PRIM_TIMEZONE_ABBR:
    case PRIM_TIMEZONE_TIME:
    case PRIM_TIMEZONE_AMPM: {
      const TimezoneInfo *tz = feature_timezone_get(aux_in);
      if (!tz) return false; // out-of-range zone index -- never trust a bad wire value
      int16_t offset_min = feature_timezone_current_offset_min(tz, now);
      time_t local_time = now + (int32_t)offset_min * 60;
      int32_t local_secs_of_day = ((local_time % 86400) + 86400) % 86400;
      int local_hour24 = (int)(local_secs_of_day / 3600);
      int local_min = (int)((local_secs_of_day % 3600) / 60);
      GColor c = feature_timezone_daylight_color(local_hour24);
      if (id == PRIM_TIMEZONE_ABBR) { resolve_text(out, tz->abbr, c); return true; }
      if (id == PRIM_TIMEZONE_AMPM) {
        // The transmitted sequence is fixed at content-selection time and
        // can't vary with clock_is_24h_style() (a runtime, watch-only
        // setting. The value also depends on the current time, so a cached
        // setting that changes later" constraint content 4's color_mode
        // already has). So this always resolves, but resolves to an empty,
        // zero-width primitive in 24h style rather than showing "AM"/"PM"
        // when nothing should be there -- letting one fixed sequence
        // ([ABBR, SPACE, TIME, SPACE, AMPM]) work correctly either way.
        resolve_text(out, clock_is_24h_style() ? "" : (local_hour24 < 12 ? "AM" : "PM"), c);
        return true;
      }
      char tbuf[8];
      if (clock_is_24h_style()) {
        snprintf(tbuf, sizeof(tbuf), "%02d:%02d", local_hour24, local_min);
      } else {
        int hour12 = local_hour24 % 12; if (hour12 == 0) hour12 = 12;
        snprintf(tbuf, sizeof(tbuf), "%d:%02d", hour12, local_min);
      }
      resolve_text(out, tbuf, c);
      return true;
    }

    // ---- Astronomy: only what depends on the watch clock stays here (next sun event, planets above
    // the horizon now, next planet to rise, ISS pass, compass). Moon, meteor, Saturn, aurora and the
    // location name are phone slots. An error is always red and an unavailable value always gray, both
    // bypassing color_mode (force_color); otherwise the slot's main color is the COLOR-mode candidate
    // (dynamic_is_main).
    case PRIM_SUN_EVENT_ICON:
    case PRIM_SUN_EVENT_TIME: {
      bool is_sunrise = false;
      time_t ev = 0;
      bool have = watch_ui_get_next_sun_event(now, data->sun_rise, data->sun_set, data->sun_rise_tomorrow, &ev, &is_sunrise);
      if (id == PRIM_SUN_EVENT_ICON) { resolve_icon(out, 11, 0, is_sunrise, GColorWhite); }
      else {
        char tbuf[8];
        if (have) { struct tm *et = localtime(&ev); strftime(tbuf, sizeof(tbuf), clock_is_24h_style() ? "%H:%M" : "%I:%M", et); }
        else { snprintf(tbuf, sizeof(tbuf), "N/A"); }
        resolve_text(out, tbuf, GColorWhite);
      }
      out->dynamic_is_main = true;
      return true;
    }
    case PRIM_PLANETS_VISIBLE_ICON:
    case PRIM_PLANETS_VISIBLE_COUNT: {
      char pbuf[16];
      if (data->error_code != 0) {
        snprintf(pbuf, sizeof(pbuf), "ERR %d", data->error_code);
        if (id == PRIM_PLANETS_VISIBLE_ICON) { resolve_icon(out, 23, 0, false, GColorRed); }
        else { resolve_text(out, pbuf, GColorRed); }
        out->force_color = true;
        return true;
      }
      uint8_t count = feature_count_visible_planets(data, now);
      snprintf(pbuf, sizeof(pbuf), "%d planet%s", count, count == 1 ? "" : "s");
      if (id == PRIM_PLANETS_VISIBLE_ICON) { resolve_icon(out, 23, 0, false, GColorWhite); }
      else { resolve_text(out, pbuf, GColorWhite); }
      out->dynamic_is_main = true;
      return true;
    }

    case PRIM_NEXT_PLANET_RISE: {
      char rbuf[20];
      if (data->error_code != 0) {
        snprintf(rbuf, sizeof(rbuf), "ERR %d", data->error_code);
        resolve_text(out, rbuf, GColorRed);
        out->force_color = true;
        return true;
      }
      static const char *const PLANET_ABBR[PLANET_COUNT] = { "MER", "VEN", "MAR", "JUP", "SAT" };
      int best = -1;
      time_t best_t = 0;
      for (int p = 0; p < PLANET_COUNT; p++) {
        time_t r = data->planet_rise[p];
        if (r > now && (best == -1 || r < best_t)) { best = p; best_t = r; }
      }
      if (best < 0) { resolve_text(out, "N/A", GColorLightGray); out->force_color = true; return true; }
      char tb[8];
      struct tm *bt = localtime(&best_t);
      strftime(tb, sizeof(tb), clock_is_24h_style() ? "%H:%M" : "%I:%M", bt);
      snprintf(rbuf, sizeof(rbuf), "%s %s", PLANET_ABBR[best], tb);
      resolve_text(out, rbuf, GColorWhite);
      out->dynamic_is_main = true;
      return true;
    }
    case PRIM_ISS_ICON:
    case PRIM_ISS_NEXT_PASS: {
      char ibuf[20];
      GColor c;
      bool forced = true;
      if (data->iss_error_code != 0) {
        snprintf(ibuf, sizeof(ibuf), "ERR %d", data->iss_error_code);
        c = GColorRed;
      } else if (data->iss_next_pass > 0) {
        struct tm *it = localtime(&data->iss_next_pass);
        strftime(ibuf, sizeof(ibuf), clock_is_24h_style() ? "%H:%M" : "%I:%M %p", it);
        c = GColorWhite;
        forced = false;
      } else {
        snprintf(ibuf, sizeof(ibuf), "N/A");
        c = GColorLightGray;
      }
      if (id == PRIM_ISS_ICON) { resolve_icon(out, 25, 0, false, c); } else { resolve_text(out, ibuf, c); }
      out->force_color = forced;
      out->dynamic_is_main = !forced;
      return true;
    }

    case PRIM_COMPASS_ICON:
    case PRIM_COMPASS_DIR_TEXT: {
      // Active (real heading) for 15s after a shake, then asleep (input.c).
      bool asleep = input_compass_feature_is_asleep();
      if (id == PRIM_COMPASS_ICON) {
        resolve_icon(out, 27, (int16_t)(input_compass_feature_heading_deg() % 360), asleep, GColorWhite);
        out->dynamic_is_main = true;
        out->two_tone_accent_main = true;
        return true;
      }
      static const char *const COMPASS_DIRS[16] = {
        "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"
      };
      if (asleep) { resolve_text(out, "---", GColorWhite); }
      else {
        int idx = (int)(((input_compass_feature_heading_deg() * 2 + 22) / 45) % 16);
        if (idx < 0) idx += 16;
        resolve_text(out, COMPASS_DIRS[idx], GColorWhite);
      }
      out->dynamic_is_main = true;
      return true;
    }

    default:
      return false; // The primitive ID is unsupported.
  }
}
