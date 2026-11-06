#include "./feature_layout.h"
#include "../rendering/dial/marker_layer.h"
#include "../rendering/dial/marker_bitmap.h"
#include "../fonts/font_lookup.h"
#include "./primitives/primitive_catalogue.h"

#define FEATURE_LAYOUT_CORNER_INSET_PX 2

static bool primitive_sequence_enabled(const uint8_t ids[10]) { return ids[0] != PRIM_ID_NONE; }
static bool primitive_sequence_needs_second_refresh(const uint8_t ids[10]) {
  for (int i = 0; i < 10 && ids[i] != PRIM_ID_NONE; i++)
    if (primitive_catalogue_refresh_class_for((PrimitiveId)ids[i]) == PRIMITIVE_REFRESH_SECOND) return true;
  return false;
}

void feature_layout_recompute(FeaturesState *state) {
  for (int i = 0; i < FEATURES_MAX_SLOTS; i++) state->slots[i].active = false;

  WatchData *d = state->data;
  if (!d) return;

  uint8_t marker_style = d->big_analog_marker_style;
  bool marker_is_bitmap = marker_style_is_bitmap(marker_style);

  // Inner-empty-area margins: fixed per bitmap style (3-7); every other
  // style (the custom hour/second rings, which is also what the phone
  // sends for the Minimal/Braun/Swiss/Classy/None presets) is computed
  // from those rings + marker text below.
  typedef struct { int8_t top, bottom, left, right; } EdgeMargins;
  // One record per bitmap style id. The 11-19 records are placeholders: copies of the
  // last record (Fancy) until their real values are measured.
  typedef struct { uint8_t style; EdgeMargins m; } BitmapMarginRecord;
  static const BitmapMarginRecord BITMAP_STYLE_MARGINS[] = {
    {  3, { 38, 37, 42, 39 } }, // Modern
    {  4, { 37, 33, 38, 33 } }, // Shadow
    {  5, { 44, 42, 27, 20 } }, // Tally
    {  6, { 46, 44, 45, 45 } }, // Bell
    {  7, { 44, 40, 30, 26 } }, // Fancy
    { 11, { 38, 38, 42, 39 } }, // Modern Bold
    { 12, { 37, 37, 37, 35 } }, // Modern F
    { 13, { 39, 39, 36, 35 } }, // Modern H
    { 14, { 39, 39, 39, 38 } }, // Modern P
    { 15, { 41, 41, 40, 39 } }, // Modern P Round
    { 16, { 37, 37, 38, 36 } }, // Modern S
    { 17, { 40, 40, 40, 38 } }, // Modern W
    { 18, { 40, 40, 39, 38 } }, // Modern W Round
    { 19, { 39, 39, 40, 40 } }, // Roman
  };
  int16_t dyn_upper_offset = PL_DEFAULT_UPPER_OFFSET, dyn_bottom_shift = PL_DEFAULT_BOTTOM_SHIFT;
  int16_t dyn_left_inset = 0, dyn_right_inset = 0;
  if (marker_is_bitmap) {
    const EdgeMargins *m = &BITMAP_STYLE_MARGINS[4].m; // fall back to Fancy
    for (size_t i = 0; i < sizeof(BITMAP_STYLE_MARGINS) / sizeof(BITMAP_STYLE_MARGINS[0]); i++) {
      if (BITMAP_STYLE_MARGINS[i].style == marker_style) { m = &BITMAP_STYLE_MARGINS[i].m; break; }
    }
    dyn_upper_offset = m->top; dyn_bottom_shift = m->bottom; dyn_left_inset = m->left; dyn_right_inset = m->right;
#ifdef PBL_BW
    // Same first guess for the 144x168 B&W art (x by 144/200, y by 168/228) until the legacy
    // indices' own margins are measured.
    dyn_upper_offset = PL_BITMAP_MARGIN_Y(dyn_upper_offset);
    dyn_bottom_shift = PL_BITMAP_MARGIN_Y(dyn_bottom_shift);
    dyn_left_inset = PL_BITMAP_MARGIN_X(dyn_left_inset);
    dyn_right_inset = PL_BITMAP_MARGIN_X(dyn_right_inset);
#endif
#ifdef PBL_ROUND
    // The tables above were measured on the 200x228 art. Until the round art's own
    // margins are measured, scale them to the 260x260 screen (x by 13/10, y by 8/7).
    dyn_upper_offset = dyn_upper_offset * 8 / 7;
    dyn_bottom_shift = dyn_bottom_shift * 8 / 7;
    dyn_left_inset = dyn_left_inset * 13 / 10;
    dyn_right_inset = dyn_right_inset * 13 / 10;
#endif
  } else {
    GRect screen = GRect(0, 0, PBL_DISPLAY_WIDTH, PBL_DISPLAY_HEIGHT);
    GPoint center = GPoint(screen.size.w / 2, screen.size.h / 2);
    uint8_t pct = d->custom_hour_marker.thickness != 0 ? d->custom_hour_marker.inner_border_pct : 100;
    uint8_t ecc = d->custom_hour_marker.thickness != 0 ? d->custom_hour_marker.inner_eccentricity : 100;
    uint8_t h_offset = 0;
    if (d->marker_text.target != 0) {
      if (d->marker_text.target == 1) { // hours
        int16_t marker_pct = d->custom_hour_marker.thickness == 0 ? 100 + d->marker_text.offset_px : d->custom_hour_marker.inner_border_pct + d->marker_text.offset_px;
        if(marker_pct>100) {
          marker_pct = 100;
        } else if (marker_pct < 0) {
          marker_pct = 0;
        }
        pct = marker_pct;
        ecc = d->custom_hour_marker.thickness == 0 ? 100 : d->custom_hour_marker.inner_eccentricity;
      } else { // seconds
        int16_t marker_pct = d->custom_second_marker.thickness == 0 ? 100 + d->marker_text.offset_px : d->custom_second_marker.inner_border_pct + d->marker_text.offset_px;
        if(marker_pct>100) {
          marker_pct = 100;
        } else if (marker_pct < 0) {
          marker_pct = 0;
        }
        pct = marker_pct;
        ecc = d->custom_second_marker.thickness == 0 ? 100 : d->custom_second_marker.inner_eccentricity;
      }
      h_offset = (font_lookup_height(d->marker_text.font_choice) + font_lookup_y_offset(d->marker_text.font_choice)) / 2;
    }
    GPoint top_pt = marker_layer_point_on_ring(center, screen, 0, pct, ecc);
    GPoint right_pt = marker_layer_point_on_ring(center, screen, TRIG_MAX_ANGLE / 4, pct, ecc);
    GPoint bottom_pt = marker_layer_point_on_ring(center, screen, TRIG_MAX_ANGLE / 2, pct, ecc);
    GPoint left_pt = marker_layer_point_on_ring(center, screen, (TRIG_MAX_ANGLE * 3) / 4, pct, ecc);
    top_pt.y += h_offset;
    right_pt.x -= h_offset; // close enough
    bottom_pt.y -= h_offset;
    left_pt.x += h_offset;
    int16_t margin = 2;
    if (top_pt.y + margin > dyn_upper_offset) dyn_upper_offset = top_pt.y + margin;
    if (screen.size.h - bottom_pt.y + margin > dyn_bottom_shift) dyn_bottom_shift = screen.size.h - bottom_pt.y + margin;
    int16_t left_reach = left_pt.x + margin, right_reach = screen.size.w - right_pt.x + margin;
    if (left_reach > dyn_left_inset) dyn_left_inset = left_reach;
    if (right_reach > dyn_right_inset) dyn_right_inset = right_reach;
  }

  {
    bool has_line2 = primitive_sequence_enabled(d->edge_line_primitive_ids[1]);
    int16_t line1_offset = has_line2 ? dyn_upper_offset : dyn_upper_offset + CORNER_ROW_H / 2;
    state->slots[SLOT_UPPER_L1] = (FeatureSlot){
      .active = primitive_sequence_enabled(d->edge_line_primitive_ids[0]), .color_mode = d->edge_line_color_mode[0],
      .is_top = true, .is_left = true, .is_middle = false, .is_edge = false,
      .top_offset = line1_offset, .bottom_shift = 0, .middle_inset = 0,
      .center_horizontal = true, .center_vertical = false, .allow_outline = true,
      .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[0]),
    };
    if (has_line2) {
      state->slots[SLOT_UPPER_L2] = (FeatureSlot){
        .active = true, .color_mode = d->edge_line_color_mode[1],
        .is_top = true, .is_left = true, .is_middle = false, .is_edge = false,
          .top_offset = dyn_upper_offset + CORNER_ROW_H, .bottom_shift = 0, .middle_inset = 0,
        .center_horizontal = true, .center_vertical = false, .allow_outline = true,
        .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[1]),
      };
    }

    has_line2 = primitive_sequence_enabled(d->edge_line_primitive_ids[3]);
    int16_t line1_shift = has_line2 ? dyn_bottom_shift + CORNER_ROW_H : dyn_bottom_shift + CORNER_ROW_H / 2;
    state->slots[SLOT_BOTTOM_L1] = (FeatureSlot){
      .active = primitive_sequence_enabled(d->edge_line_primitive_ids[2]), .color_mode = d->edge_line_color_mode[2],
      .is_top = false, .is_left = true, .is_middle = false, .is_edge = false,
      .top_offset = 0, .bottom_shift = line1_shift, .middle_inset = 0,
      .center_horizontal = true, .center_vertical = false, .allow_outline = true,
      .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[2]),
    };
    if (has_line2) {
      state->slots[SLOT_BOTTOM_L2] = (FeatureSlot){
        .active = true, .color_mode = d->edge_line_color_mode[3],
        .is_top = false, .is_left = true, .is_middle = false, .is_edge = false,
          .top_offset = 0, .bottom_shift = dyn_bottom_shift, .middle_inset = 0,
        .center_horizontal = true, .center_vertical = false, .allow_outline = true,
        .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[3]),
      };
    }

#ifndef PBL_BW // no left/right edge slots on a 144 px screen (they stay inactive)
    has_line2 = primitive_sequence_enabled(d->edge_line_primitive_ids[5]);
    line1_offset = has_line2 ? -(CORNER_ROW_H / 2) : 0;
    state->slots[SLOT_LEFT_L1] = (FeatureSlot){
      .active = primitive_sequence_enabled(d->edge_line_primitive_ids[4]), .color_mode = d->edge_line_color_mode[4],
      .is_top = false, .is_left = true, .is_middle = true, .is_edge = false,
      .top_offset = line1_offset, .bottom_shift = 0, .middle_inset = dyn_left_inset,
      .center_horizontal = false, .center_vertical = true, .allow_outline = true,
      .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[4]),
    };
    if (has_line2) {
      state->slots[SLOT_LEFT_L2] = (FeatureSlot){
        .active = true, .color_mode = d->edge_line_color_mode[5],
        .is_top = false, .is_left = true, .is_middle = true, .is_edge = false,
          .top_offset = CORNER_ROW_H / 2, .bottom_shift = 0, .middle_inset = dyn_left_inset,
        .center_horizontal = false, .center_vertical = true, .allow_outline = true,
        .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[5]),
      };
    }

    has_line2 = primitive_sequence_enabled(d->edge_line_primitive_ids[7]);
    line1_offset = has_line2 ? -(CORNER_ROW_H / 2) : 0;
    state->slots[SLOT_RIGHT_L1] = (FeatureSlot){
      .active = primitive_sequence_enabled(d->edge_line_primitive_ids[6]), .color_mode = d->edge_line_color_mode[6],
      .is_top = false, .is_left = false, .is_middle = true, .is_edge = false,
      .top_offset = line1_offset, .bottom_shift = 0, .middle_inset = dyn_right_inset,
      .center_horizontal = false, .center_vertical = true, .allow_outline = true,
      .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[6]),
    };
    if (has_line2) {
      state->slots[SLOT_RIGHT_L2] = (FeatureSlot){
        .active = true, .color_mode = d->edge_line_color_mode[7],
        .is_top = false, .is_left = false, .is_middle = true, .is_edge = false,
          .top_offset = CORNER_ROW_H / 2, .bottom_shift = 0, .middle_inset = dyn_right_inset,
        .center_horizontal = false, .center_vertical = true, .allow_outline = true,
        .needs_second_refresh = primitive_sequence_needs_second_refresh(d->edge_line_primitive_ids[7]),
      };
    }
#else
    (void)dyn_left_inset; (void)dyn_right_inset;
#endif // PBL_BW
  }

#ifndef PBL_ROUND
  // Corner slots are enabled by their primitive sequence.
  state->slots[SLOT_CORNER_TL] = (FeatureSlot){
    .active = primitive_sequence_enabled(d->corner_primitive_ids[0]), .color_mode = d->corner_color_mode[0],
    .is_top = true, .is_left = true, .is_middle = false, .is_edge = true,
    .top_offset = FEATURE_LAYOUT_CORNER_INSET_PX, .bottom_shift = 0,
    .center_horizontal = false, .center_vertical = false, .allow_outline = true,
    .needs_second_refresh = primitive_sequence_needs_second_refresh(d->corner_primitive_ids[0]),
  };
  state->slots[SLOT_CORNER_TR] = (FeatureSlot){
    .active = primitive_sequence_enabled(d->corner_primitive_ids[1]), .color_mode = d->corner_color_mode[1],
    .is_top = true, .is_left = false, .is_middle = false, .is_edge = true,
    .top_offset = FEATURE_LAYOUT_CORNER_INSET_PX, .bottom_shift = 0,
    .center_horizontal = false, .center_vertical = false, .allow_outline = true,
    .needs_second_refresh = primitive_sequence_needs_second_refresh(d->corner_primitive_ids[1]),
  };
  // Bottom corners (BL/BR): stay anchored to the SKY's own bottom
  state->slots[SLOT_CORNER_BL] = (FeatureSlot){
    .active = primitive_sequence_enabled(d->corner_primitive_ids[2]), .color_mode = d->corner_color_mode[2],
    .is_top = false, .is_left = true, .is_middle = false, .is_edge = true,
    .top_offset = 0, .bottom_shift = 0,
    .center_horizontal = false, .center_vertical = false, .allow_outline = true,
    .needs_second_refresh = primitive_sequence_needs_second_refresh(d->corner_primitive_ids[2]),
  };
  state->slots[SLOT_CORNER_BR] = (FeatureSlot){
    .active = primitive_sequence_enabled(d->corner_primitive_ids[3]), .color_mode = d->corner_color_mode[3],
    .is_top = false, .is_left = false, .is_middle = false, .is_edge = true,
    .top_offset = 0, .bottom_shift = 0,
    .center_horizontal = false, .center_vertical = false, .allow_outline = true,
    .needs_second_refresh = primitive_sequence_needs_second_refresh(d->corner_primitive_ids[3]),
  };
#endif // no corner slots on a round screen
}
