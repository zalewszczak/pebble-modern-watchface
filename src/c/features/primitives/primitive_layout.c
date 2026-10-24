#include "./primitive_layout.h"
#include "../feature_slot.h"
#include "../feature_icons.h"

// Mirrors feature_render_resolve_segment_offsets() (feature_render.c)
// exactly, generalized to PrimitiveInstance and to the three universal
// spacer kinds it never had to handle before (Section 4).

static const char *spacer_glyph(PrimitiveKind kind) {
  switch (kind) {
    case PRIMITIVE_KIND_SPACE: return " ";
    case PRIMITIVE_KIND_SLASH: return "/";
    case PRIMITIVE_KIND_DASH: return "-";
    default: return "";
  }
}

void primitive_layout_compute(PrimitiveFeature *feature, const FeatureSlot *slot, GFont font, int16_t font_h) {
  if (!feature || !slot) return;

  int16_t box_w = CORNER_BOX_W;
  int16_t advance[PRIMITIVE_FEATURE_MAX];
  int16_t total_w = 0;

  for (int i = 0; i < feature->count; i++) {
    PrimitiveInstance *p = &feature->items[i];
    if (p->kind == PRIMITIVE_KIND_ICON) {
      p->width = FEATURE_ICON_WIDTH;
      // User-built sequences add no automatic gap after an icon.
      advance[i] = feature->tight ? FEATURE_ICON_WIDTH : feature_icons_plus_gap_width(p->icon_kind);
    } else {
      const char *text = (p->kind == PRIMITIVE_KIND_TEXT || p->kind == PRIMITIVE_KIND_PUNCT) ? p->text : spacer_glyph(p->kind);
      GSize sz = graphics_text_layout_get_content_size(
          text, font, GRect(0, 0, 200, font_h + 10),
          GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft);
      p->width = sz.w + 2;
      advance[i] = p->width + 5;
      if (feature->tight) {
        // Exactly the glyph run: any spacing is a Space element the user added.
        advance[i] = sz.w;
        if (p->kind == PRIMITIVE_KIND_SPACE) {
          int16_t min_space = (font_h * 3) / 10;
          if (min_space < 3) min_space = 3;
          if (advance[i] < min_space) advance[i] = min_space;
        }
      }
    }
    if (feature->tight) continue; // the punctuation tightening below is for built-in features
    // Punctuation and units sit tight: nothing between an element and a
    // following closer/unit/dot/comma, nothing after an opening parenthesis.
    if (p->kind == PRIMITIVE_KIND_PUNCT && p->text[0] == '(') advance[i] -= 5;
    if (i > 0 && p->kind == PRIMITIVE_KIND_PUNCT && p->text[0] != '(') advance[i - 1] = (advance[i - 1] >= 5) ? advance[i - 1] - 5 : 0;
  }
  for (int i = 0; i < feature->count; i++) total_w += advance[i];

  if (total_w > box_w) {
    if (slot->is_middle) {
      if (slot->is_left) total_w = box_w;
    } else if (!slot->is_left && !slot->is_edge) {
      total_w -= total_w - box_w;
    }
  }
  feature->total_width = total_w;

  int16_t start_x = slot->center_horizontal ? (box_w - total_w) / 2
                    : (!slot->is_left ? box_w - total_w : 0);
  int16_t x = start_x;
  for (int i = 0; i < feature->count; i++) {
    feature->items[i].x_offset = x;
    x += advance[i];
  }
}
