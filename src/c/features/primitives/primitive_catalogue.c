#include "./primitive_catalogue.h"

// --- primitive ID -> source / refresh class -----------------------------

PrimitiveSource primitive_catalogue_source_for(PrimitiveId id) {
  // Compass values come from the watch's live sensor.
  if (id == PRIM_COMPASS_ICON || id == PRIM_COMPASS_DIR_TEXT) return PRIMITIVE_SOURCE_WATCH_RUNTIME;
  // Phone slots (and the music state/art icons) change only when PKJS pushes. The planet-based builder
  // values depend on the watch's own clock.
  switch (id) {
    case PRIM_PHONE_SLOT:
    case PRIM_MEDIA_STATE_ICON: case PRIM_MEDIA_ART_ICON:
      return PRIMITIVE_SOURCE_PKJS_VALUE;
    case PRIM_PLANETS_VISIBLE_VALUE: case PRIM_NEXT_PLANET_NAME: case PRIM_NEXT_PLANET_TIME:
      return PRIMITIVE_SOURCE_WATCH_RUNTIME;
    default: break;
  }
  // The next event or planet depends on the watch's current time.
  if (id == PRIM_SUN_EVENT_ICON || id == PRIM_SUN_EVENT_TIME ||
      id == PRIM_PLANETS_VISIBLE_ICON || id == PRIM_PLANETS_VISIBLE_COUNT ||
      id == PRIM_NEXT_PLANET_RISE) return PRIMITIVE_SOURCE_WATCH_RUNTIME;

  if (id >= PRIM_GROUP_ASTRO_FIRST && id <= PRIM_GROUP_ASTRO_LAST) return PRIMITIVE_SOURCE_PKJS_VALUE;
  if (id >= PRIM_GROUP_WEATHER_FIRST && id <= PRIM_GROUP_WEATHER_LAST) return PRIMITIVE_SOURCE_PKJS_VALUE;

  // Spacers, date/time, and health/status values are resolved on-watch.
  return PRIMITIVE_SOURCE_WATCH_RUNTIME;
}

PrimitiveRefreshClass primitive_catalogue_refresh_class_for(PrimitiveId id) {
  if (primitive_catalogue_source_for(id) == PRIMITIVE_SOURCE_PKJS_VALUE) return PRIMITIVE_REFRESH_PKJS_VALUE;

  switch (id) {
    case PRIM_LABEL_WK_PREFIX:
      return PRIMITIVE_REFRESH_STATIC; // never changes, no refresh needed at all
    case PRIM_SECOND: case PRIM_SECOND_PAD: case PRIM_SECOND_TENS: case PRIM_SECOND_ONES:
    case PRIM_TIME_HMS:
      return PRIMITIVE_REFRESH_SECOND;
    case PRIM_COMPASS_ICON: case PRIM_COMPASS_DIR_TEXT:
      return PRIMITIVE_REFRESH_FAST_DYNAMIC;
    case PRIM_BLUETOOTH_ICON: case PRIM_BLUETOOTH_STATUS_TEXT:
    case PRIM_QUIET_TIME_ICON: case PRIM_QUIET_TIME_PLAIN_ICON: case PRIM_QUIET_TIME_STATUS_TEXT:
    case PRIM_BLUETOOTH_ONOFF_TEXT:
    case PRIM_BATTERY_ICON: case PRIM_BATTERY_PCT_TEXT: case PRIM_BATTERY_LOGO_ICON:
    case PRIM_BATTERY_ODD_ICON: case PRIM_BLUETOOTH_ODD_ICON: case PRIM_QUIET_TIME_ODD_ICON:
      return PRIMITIVE_REFRESH_EVENT;
    default:
      // Everything else in the watch-runtime date/time/health range ticks
      // on the shared minute refresh.
      return PRIMITIVE_REFRESH_MINUTE;
  }
}
