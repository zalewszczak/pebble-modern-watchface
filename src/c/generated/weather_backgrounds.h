// GENERATED FILE -- do not hand-edit.
// Produced by scripts/generate-weather-backgrounds.js from resources/weatherbg/<style>/.
#pragma once

#include <pebble.h>

#define WEATHERBG_STYLE_COUNT 2

// Resource id of the weather background for style (1-based), detailed weather
// class wx (0-9) and time of day, or 0 when that exact image does not exist.
// On a round watch only images that exist in resources/round/weatherbg/ are available.
static inline uint32_t weatherbg_resource_id_exact(uint8_t style, uint8_t wx, bool night) {
#ifdef PBL_ROUND
  switch (style) {
    default: return 0;
  }
#else
  switch (style) {
    case 1:
      switch (wx * 2 + (night ? 1 : 0)) {
        case 0: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_CLEAR_SKY_DAY;
        case 1: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_CLEAR_SKY_NIGHT;
        case 2: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_PARTLY_CLOUDY_DAY;
        case 3: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_PARTLY_CLOUDY_NIGHT;
        case 4: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_OVERCAST_DAY;
        case 5: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_OVERCAST_NIGHT;
        case 6: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_FOG_DAY;
        case 7: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_FOG_NIGHT;
        case 8: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_DRIZZLE_DAY;
        case 9: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_DRIZZLE_NIGHT;
        case 10: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_RAIN_DAY;
        case 11: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_RAIN_NIGHT;
        case 12: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_HEAVY_RAIN_DAY;
        case 13: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_HEAVY_RAIN_NIGHT;
        case 14: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_SNOW_DAY;
        case 15: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_SNOW_NIGHT;
        case 16: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_THUNDERSTORM_DAY;
        case 17: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_THUNDERSTORM_NIGHT;
        case 18: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_SLEET_DAY;
        case 19: return RESOURCE_ID_WEATHERBG_BAROQUE_BEACH_SLEET_NIGHT;
        default: return 0;
      }
    case 2:
      switch (wx * 2 + (night ? 1 : 0)) {
        case 0: return RESOURCE_ID_WEATHERBG_MANHATTAN_CLEAR_SKY_DAY;
        case 1: return RESOURCE_ID_WEATHERBG_MANHATTAN_CLEAR_SKY_NIGHT;
        case 2: return RESOURCE_ID_WEATHERBG_MANHATTAN_PARTLY_CLOUDY_DAY;
        case 3: return RESOURCE_ID_WEATHERBG_MANHATTAN_PARTLY_CLOUDY_NIGHT;
        case 4: return RESOURCE_ID_WEATHERBG_MANHATTAN_OVERCAST_DAY;
        case 5: return RESOURCE_ID_WEATHERBG_MANHATTAN_OVERCAST_NIGHT;
        case 6: return RESOURCE_ID_WEATHERBG_MANHATTAN_FOG_DAY;
        case 7: return RESOURCE_ID_WEATHERBG_MANHATTAN_FOG_NIGHT;
        case 8: return RESOURCE_ID_WEATHERBG_MANHATTAN_DRIZZLE_DAY;
        case 9: return RESOURCE_ID_WEATHERBG_MANHATTAN_DRIZZLE_NIGHT;
        case 10: return RESOURCE_ID_WEATHERBG_MANHATTAN_RAIN_DAY;
        case 11: return RESOURCE_ID_WEATHERBG_MANHATTAN_RAIN_NIGHT;
        case 12: return RESOURCE_ID_WEATHERBG_MANHATTAN_HEAVY_RAIN_DAY;
        case 13: return RESOURCE_ID_WEATHERBG_MANHATTAN_HEAVY_RAIN_NIGHT;
        case 14: return RESOURCE_ID_WEATHERBG_MANHATTAN_SNOW_DAY;
        case 15: return RESOURCE_ID_WEATHERBG_MANHATTAN_SNOW_NIGHT;
        case 16: return RESOURCE_ID_WEATHERBG_MANHATTAN_THUNDERSTORM_DAY;
        case 17: return RESOURCE_ID_WEATHERBG_MANHATTAN_THUNDERSTORM_NIGHT;
        case 18: return RESOURCE_ID_WEATHERBG_MANHATTAN_SLEET_DAY;
        case 19: return RESOURCE_ID_WEATHERBG_MANHATTAN_SLEET_NIGHT;
        default: return 0;
      }
    default: return 0;
  }
#endif
}

// Same, falling back to the other time of day and then to clear sky.
static inline uint32_t weatherbg_resource_id(uint8_t style, uint8_t wx, bool night) {
  if (wx > 9) wx = 0;
  uint32_t id = weatherbg_resource_id_exact(style, wx, night);
  if (!id) id = weatherbg_resource_id_exact(style, wx, !night);
  if (!id) id = weatherbg_resource_id_exact(style, 0, night);
  if (!id) id = weatherbg_resource_id_exact(style, 0, !night);
  return id;
}
