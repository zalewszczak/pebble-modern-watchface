#pragma once
#include <pebble.h>
#include "../generated/icon_atlas.h"
#include "../platform/platform_bw.h"

// Icon atlases: every styled complication icon is one cell of a vertical strip (one strip per icon style, see
// scripts/generate-icon-atlas.py). A cell is PL_SUN_ICON_DRAW_W x PL_ICON_DRAW pixels. Drawing an icon is drawing a
// PL_ICON_DRAW-tall window of the strip, and so is the "slide in" animation: when the icon at a place changes, the
// window scrolls from the old icon (or from one a couple of cells away, through the icons in between) to the new
// one, like a slot machine reel. The window is the icon's own size, so nothing is drawn outside its area.

// Per icon position in a complication (one per item of a FeatureSlot).
typedef struct {
  uint8_t cell;    // 0 = nothing drawn here yet, ICON_ANIM_BLANK = a non-atlas icon (or nothing), else cell + 1
  uint8_t from;    // same encoding: where the running slide started
  uint16_t start;  // millisecond clock (mod 65536) when the slide started
} IconAnim;

#define ICON_ANIM_BLANK 0xFF

// Marks the position as showing something that is not an atlas icon (the next atlas icon slides in from nothing).
void icon_atlas_set_blank(IconAnim *anim);

// Per paint of the complications layer: begin before the first icon, end after the last. `end` frees the atlases
// (they are only kept for the duration of one paint) and, while an icon is sliding, schedules the next paint of `layer`.
void icon_atlas_begin_paint(void);
void icon_atlas_end_paint(Layer *layer);
// Stops the animation timer (layer going away).
void icon_atlas_deinit(void);

// Draws atlas icon `cell` at `pos`, w x h pixels (h = PL_ICON_DRAW), in icon style `style` (0 simple, 1 hollow, 2 full
// color; tinted with `color` except full color), with the outline pass when outline_style != 0. `anim` (may be NULL)
// tracks the position: a change of `cell` starts the slide.
void icon_atlas_draw(GContext *ctx, GPoint pos, uint8_t cell, IconAnim *anim, uint8_t style, uint8_t outline_style,
                     GColor outline_color, GColor color, int16_t w, int16_t h);
