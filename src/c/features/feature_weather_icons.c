#include "./feature_weather_icons.h"
#include "./feature_icon_atlas.h"

// One cell per weather category (category computed on the phone, see weather-normalize.js weatherIconCategory),
// in the icon atlases. This table -- not a switch/case per style -- is all a category or a style adds to the code.
static const uint8_t WEATHER_CELLS_DAY[7] = {
  ICON_CELL_WEATHER_SUN, ICON_CELL_WEATHER_PARTLY_CLOUDY, ICON_CELL_WEATHER_CLOUDY_OVERCAST, ICON_CELL_WEATHER_FOG,
  ICON_CELL_WEATHER_RAIN, ICON_CELL_WEATHER_SNOW, ICON_CELL_WEATHER_STORM,
};

// Night variants for the 2 categories that actually look different in the dark (clear sky -> moon, partly cloudy ->
// cloud + moon). Every other category reuses its own day cell at night too (see the `category <= 1` check below).
static const uint8_t WEATHER_CELLS_NIGHT[2] = { ICON_CELL_WEATHER_MOON, ICON_CELL_WEATHER_PARTLY_CLOUDY_NIGHT };

uint8_t feature_weather_icons_cell(uint8_t category, bool is_night) {
  if (category >= 7) return ICON_CELL_COUNT; // not drawn (icon_atlas_draw ignores it)
  return (is_night && category <= 1) ? WEATHER_CELLS_NIGHT[category] : WEATHER_CELLS_DAY[category];
}
