#include "./feature_render.h"
#include "../input/input.h"
#include "./feature_icon_assets.h"
#include "./primitives/primitive_renderer.h"

#define CORNER_INSET_PX 2

GColor feature_render_contrasting_outline_color(GColor c) {
  uint8_t r = (c.argb >> 4) & 0x03;
  uint8_t g = (c.argb >> 2) & 0x03;
  uint8_t b = c.argb & 0x03;
  int luma = r * 3 + g * 6 + b;
  return (luma >= 9) ? GColorBlack : GColorWhite;
}

// Split into two halves so the primitive renderer (primitive_renderer.c) can
// run a genuine outline-pass-then-content-pass across every text primitive
// in a feature (Section 13), instead of interleaving outline+content per
// segment as the legacy per-slot path below still does. feature_render_draw_text_outlined()
// is kept calling both, unchanged, for the legacy (non-primitive) slots.

void feature_render_draw_text_outline_only(GContext *ctx, const char *text, GFont font, GRect box,
                                           GTextOverflowMode overflow, GTextAlignment alignment,
                                           GColor color, uint8_t outline_style) {
  if (outline_style == 0) return;
  const GPoint *offsets;
  int offset_count;
  feature_icon_assets_get_outline_offsets(outline_style, &offsets, &offset_count);
  graphics_context_set_text_color(ctx, feature_render_contrasting_outline_color(color));
  for (int i = 0; i < offset_count; i++) {
    GRect shifted = GRect(box.origin.x + offsets[i].x, box.origin.y + offsets[i].y,
                           box.size.w, box.size.h);
    graphics_draw_text(ctx, text, font, shifted, overflow, alignment, NULL);
  }
}

void feature_render_draw_text_content_only(GContext *ctx, const char *text, GFont font, GRect box,
                                           GTextOverflowMode overflow, GTextAlignment alignment,
                                           GColor color) {
  graphics_context_set_text_color(ctx, color);
  graphics_draw_text(ctx, text, font, box, overflow, alignment, NULL);
}

void feature_render_draw_text_outlined(GContext *ctx, const char *text, GFont font, GRect box,
                                       GTextOverflowMode overflow, GTextAlignment alignment,
                                       GColor color, uint8_t outline_style) {
  feature_render_draw_text_outline_only(ctx, text, font, box, overflow, alignment, color, outline_style);
  feature_render_draw_text_content_only(ctx, text, font, box, overflow, alignment, color);
}

void feature_render_draw_slot(GContext *ctx, GRect bounds, const FeatureSlot *slot,
                              GFont font, int16_t font_h, int16_t font_offset,
                              uint8_t outline_style, uint8_t icon_style,
                              bool draw_debug) {
  if (!slot->active) return;
  if (slot->shake_only && !input_shake_features_active()) return;
  if (slot->primitives.count == 0) return;

  int16_t box_w = CORNER_BOX_W;
  int16_t box_x = slot->center_horizontal
    ? bounds.origin.x + (bounds.size.w - CORNER_BOX_W) / 2
    : (slot->is_left ? bounds.origin.x + CORNER_INSET_PX
                     : bounds.origin.x + bounds.size.w - CORNER_INSET_PX - CORNER_BOX_W);
  int16_t box_y = slot->center_vertical
    ? bounds.origin.y + (bounds.size.h - CORNER_ROW_H) / 2 + slot->top_offset
    : (slot->is_top ? bounds.origin.y + slot->top_offset - 2
                    : bounds.origin.y + bounds.size.h - CORNER_ROW_H - CORNER_INSET_PX
                      - slot->bottom_shift + 2);

  if (slot->is_middle) {
    if (slot->is_left) box_x += slot->middle_inset;
    else box_x -= slot->middle_inset;
  }

  if (slot->draw_pill) {
    graphics_context_set_fill_color(ctx, slot->pill_bg);
    graphics_fill_rect(ctx, GRect(box_x, box_y, box_w, CORNER_ROW_H),
                       CORNER_ROW_H / 2, GCornersAll);
  }

  uint8_t effective_outline_style = slot->allow_outline ? outline_style : 0;

  primitive_renderer_draw_feature(ctx, box_x, box_y, CORNER_ROW_H, &slot->primitives, slot,
                                  font, font_h, font_offset, effective_outline_style, icon_style, draw_debug);
}
