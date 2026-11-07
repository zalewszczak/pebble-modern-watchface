#pragma once

#include <pebble.h>

#include "../platform/platform_bw.h"

#define FEATURE_ICON_WIDTH PL_ICON_W
#define FEATURE_ICON_ROWS PL_ICON_ROWS

// Hides/shows the Bluetooth icon while it flashes (phone disconnected).
void feature_icons_set_bt_flash_hidden(bool hidden);
// Where the tiny album art (icon kind 33) is read from: WatchData.media_art, registered once at start-up.
void feature_icons_set_media_art(const uint8_t *pixels);

uint8_t feature_icons_weather_category(uint8_t weather_condition, uint8_t cloud_pct);
int16_t feature_icons_plus_gap_width(int icon_kind);

void feature_icons_draw_render_icon(GContext *ctx,
                                    uint8_t icon_kind,
                                    int16_t icon_extra,
                                    bool icon_flag,
                                    GColor color,
                                    GColor color2,
                                    int16_t icon_x,
                                    int16_t box_y,
                                    int16_t row_height,
                                    uint8_t outline_style,
                                    uint8_t icon_style,
                                    bool draw_debug);
