#pragma once
#include <pebble.h>

// Cell (ICON_CELL_*, see feature_icon_atlas.h) of the weather condition icon of a category: day/night art for the
// 2 categories that have both (clear sky and partly cloudy). ICON_CELL_COUNT for an unknown category.
uint8_t feature_weather_icons_cell(uint8_t category, bool is_night);
