#pragma once

#include <pebble.h>

// Bitmap marker resource management is kept separate from procedural marker
// geometry. The caller owns the state fields and this module owns the bitmap
// resource/tint operations.
// Bitmap marker styles: 3-7 (Modern, Shadow, Tally, Bell, Fancy) and 11-19 (the
// Modern/Roman variants). 0-2, 8-10 are ring-based (see marker_layer.c).
static inline bool marker_style_is_bitmap(uint8_t style) {
  return (style >= 3 && style <= 7) || (style >= 11 && style <= 19);
}
void marker_bitmap_release(GBitmap **bitmap, uint8_t *bitmap_style, bool *bitmap_tinted);
void marker_bitmap_ensure(GBitmap **bitmap, uint8_t *bitmap_style, bool *bitmap_tinted,
                          GColor *tint_color, bool *tint_transparent, uint8_t style);
void marker_bitmap_tint(GBitmap *bitmap, bool *bitmap_tinted, GColor *tint_color,
                        bool *tint_transparent, GColor tint, bool transparent);
void marker_bitmap_draw(GContext *ctx, GBitmap *bitmap, GRect bounds,
                        bool anim_active, int32_t anim_progress_1000);
void marker_bitmap_draw_inverted(GContext *ctx, GBitmap *bitmap, GRect bounds, GPoint origin, bool semi);
