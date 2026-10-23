#include <pebble.h>
#include "./feature_value_composite.h"
#include "./feature_value_helpers.h"
#include "./feature_slot.h"
#include "../data/watch_data.h"
#include "./feature_colors.h"
#include "./feature_health.h"
#include <stdio.h>

// Phase 13 (IMPLEMENTATION_NOTES.md Update 31): this file used to hold nine
// composite content ids' legacy rendering. Seven of them (100, 102, 103,
// 105, 112, 113, 118) now have full primitive-transport coverage
// (primitive_resolver.c, since Update 24) and are removed here -- their
// dedicated CompositeBatteryStatus/composite_battery_status_get/
// composite_quiet_get helpers went with them, since nothing else used them.
// Content 101 and 104 keep their legacy case: their segment sequence length
// depends on whether sleep data exists, which a fixed transported primitive
// sequence can't express (see PRIMITIVE_TRANSPORT_SEQUENCES's own comment
// in primitive-decompose.js), so they're permanently legacy-rendered, not a
// temporary gap.
//
// primitive_transport_try_build() always tries the transported primitive
// sequence first for every content id, including the seven removed here;
// falling through to this function's `default` (a blank render) only
// happens if that sequence is ever empty or a primitive in it fails to
// resolve, which no longer renders the old composite for those seven --
// accepted trade for the code-size reduction (no phone/watch version-skew
// risk in this app's distribution model).
void __attribute__((noinline)) feature_value_composite_compute(FeatureSlot *slot, uint8_t content, const WatchData *data,
                                 uint8_t color_mode, GColor main_color, GColor accent_color, time_t now) {
  bool dynamic = (color_mode == 3);
  GColor flat = (color_mode == 1) ? accent_color : main_color;
  char buf1[16], buf2[16];

  switch (content) {
    case 101: { // bed time + wake time, day/night graded independently
      FeatureSleepSpan span = feature_health_get_sleep_span();
      GColor bed_c = flat, wake_c = flat;
      if (span.found) {
        struct tm *bt = localtime(&span.earliest_start);
        strftime(buf1, sizeof(buf1), clock_is_24h_style() ? "%H:%M" : "%I:%M", bt);
        struct tm *wt = localtime(&span.latest_end);
        strftime(buf2, sizeof(buf2), clock_is_24h_style() ? "%H:%M" : "%I:%M", wt);
        if (dynamic) {
          bed_c = feature_colors_daynight_gradient(span.earliest_start, data->sun_rise, data->sun_set);
          wake_c = feature_colors_daynight_gradient(span.latest_end, data->sun_rise, data->sun_set);
        }
      } else {
        snprintf(buf1, sizeof(buf1), "N/A");
        buf2[0] = '\0';
        if (dynamic) bed_c = wake_c = GColorLightGray;
      }
      // Atomic decomposition (Phase 8): the wake-time half is now SLASH +
      // WAKE_TIME_TEXT (reusing content 43's own wake-time primitive)
      // instead of one composed "/22:10" primitive. When there's no sleep
      // data, buf2 is empty and the slash+wake segments are simply omitted
      // -- same "N/A" bed-time-only display as before.
      if (buf2[0] != '\0') {
        slot->segment_count = 4;
        feature_value_set_icon_segment(slot, 0, 21, flat);
        feature_value_set_text_segment(slot, 1, buf1, bed_c);
        feature_value_set_text_segment(slot, 2, "/", wake_c);
        feature_value_set_text_segment(slot, 3, buf2, wake_c);
      } else {
        slot->segment_count = 2;
        feature_value_set_icon_segment(slot, 0, 21, flat);
        feature_value_set_text_segment(slot, 1, buf1, bed_c);
      }
      return;
    }
    case 104: { // sleep times: sleep icon, total duration, (restful duration), quality%
      if (feature_health_metric_available(HealthMetricSleepSeconds)) {
        HealthValue total = feature_health_sum_today(HealthMetricSleepSeconds);
        HealthValue restful = feature_health_sum_today(HealthMetricSleepRestfulSeconds);
        char total_buf[12], restful_buf[12], quality_buf[6];
        feature_health_format_duration_hm(total_buf, sizeof(total_buf), (int32_t)total);
        feature_health_format_duration_hm(restful_buf, sizeof(restful_buf), (int32_t)restful);
        int pct = (total > 0) ? (int)((restful * 100) / total) : 0;
        if (pct > 100) pct = 100;
        snprintf(quality_buf, sizeof(quality_buf), "%d%%", pct);
        char restful_paren[14];
        snprintf(restful_paren, sizeof(restful_paren), "(%s)", restful_buf);

        GColor total_c = dynamic ? feature_colors_seven_stop_gradient_reversed((int32_t)total, 0, 9 * 3600) : flat;
        GColor restful_c = dynamic ? feature_colors_seven_stop_gradient_reversed((int32_t)restful, 0, 3 * 3600) : flat;
        GColor quality_c = dynamic ? feature_colors_red_green_gradient((uint8_t)pct) : flat;

        slot->segment_count = 4;
        feature_value_set_icon_segment(slot, 0, 21, flat);
        feature_value_set_text_segment(slot, 1, total_buf, total_c);
        feature_value_set_text_segment(slot, 2, restful_paren, restful_c);
        feature_value_set_text_segment(slot, 3, quality_buf, quality_c);
      } else {
        slot->segment_count = 2;
        feature_value_set_icon_segment(slot, 0, 21, flat);
        feature_value_set_text_segment(slot, 1, "N/A", dynamic ? GColorLightGray : flat);
      }
      return;
    }
    default:
      slot->segment_count = 0;
      return;
  }
}
