#pragma once

#include <pebble.h>
#include "../graphics/subpixel.h"
#include "../data/hand_types.h"


// `thick_outline` widens the hand outline (set when the features use the
// "thick" outline style, WatchData.outline_style == 2).
// Draw a configured hand with fixed-point geometry and optional effects.
void hand_layer_draw(GContext *ctx, GPoint center, int32_t angle, const HandConfig *cfg,
                      GColor main_color, GColor accent_color, GColor bg_color,
                      bool shadow_translucent_style, uint16_t shadow_angle_deg,
                      uint16_t length_scale_1000, bool thick_outline);


// Draw the center pivot using the selected color scheme.
// outline: 0 = none, else outline color + 1; outline_px is its width.
void hand_layer_draw_center_circle_outlined(GContext *ctx, GPoint center, uint8_t radius, uint8_t color_choice,
                                            uint8_t outline, uint8_t outline_px,
                                            GColor main_color, GColor accent_color, GColor bg_color);
void hand_layer_draw_center_circle(GContext *ctx, GPoint center, uint8_t radius, uint8_t color_choice,
                                    GColor main_color, GColor accent_color, GColor bg_color);
