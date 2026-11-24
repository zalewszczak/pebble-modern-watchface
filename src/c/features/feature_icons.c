#include "./feature_icons.h"
#include "./feature_icon_assets.h"
#include "./feature_icon_atlas.h"
#include "./feature_weather_icons.h"
#include "./feature_forecast_offset_icons.h"
#include "./feature_vector_icons.h"
#include "./feature_render.h"
#include "../data/watch_ui.h"
#include "./feature_support.h"
#include "../platform/platform_bw.h"

// Every atlas icon is drawn the same way: its PL_ICON_DRAW-square cell (sunrise/sunset: PL_SUN_ICON_DRAW_W wide) at
// the left edge of the icon's layout box, vertically centred in the row. The art is centred inside the PNGs
// (scripts/center-icon-art.py), so nothing here is per icon.
#define ICON_WIDTH PL_ICON_W
#define ICON_TOP(box_y, row_height) ((box_y) + ((row_height) - PL_ICON_DRAW) / 2) // top of a centred icon cell

// Actual size every styled icon resource is now drawn at: a uniform 16x16
// for everything except sunrise/sunset, whose source art is naturally wider
// (20px) -- rather than squish it down to 16 and distort it, its own
// resource stays 20 wide and only grew to 16 tall, like every other icon.
#define ICON_DRAW_W PL_ICON_DRAW
#define ICON_DRAW_H PL_ICON_DRAW
#define SUN_TIME_ICON_DRAW_W PL_SUN_ICON_DRAW_W
#define SUN_TIME_ICON_DRAW_H PL_ICON_DRAW

// Debug crosshairs were removed; the call sites compile to nothing.
#define draw_debug_marker_point(ctx, draw_debug, pos, color) ((void)(ctx), (void)(draw_debug), (void)(pos), (void)(color))

static const uint8_t PEBBLE_ICON[62]     = { 0x00, 0x02, 0x04, 0x08, 0x00, 0x00, 0x02, 0x04, 0x08, 0x00, 0xFD, 0xFB,
  0xF7, 0xE9, 0xF8, 0x85, 0x0A, 0x14, 0x29, 0x08, 0x85, 0x0A, 0x14, 0x29,
  0x08, 0x85, 0xFA, 0x14, 0x29, 0xF8, 0x85, 0x02, 0x14, 0x29, 0x00, 0xFD,
  0xFB, 0xF7, 0xED, 0xF8, 0x80, 0x00, 0x00, 0x00, 0x00, 0x80, 0x00, 0x00,
  0x00, 0x00}; 

// Every fixed-shape feature icon: kind and its cell in the icon atlases (the same cell in the simple, hollow and full
// color atlas, see feature_icon_atlas.h).
// This table plus icon_atlas_draw() is the entire "generic icon loading": adding an icon is a data row (and a cell
// in scripts/generate-icon-atlas.py), never new drawing code.
static const struct { uint8_t kind; uint8_t cell; } STYLED_ICONS[] = {
  { 1, ICON_CELL_HEART },
  { 2, ICON_CELL_FOOT },
  { 5, ICON_CELL_UMBRELLA },
  { 6, ICON_CELL_DROPLET },
  { 7, ICON_CELL_WIND },
  { 8, ICON_CELL_GPS_PIN },
  { 9, ICON_CELL_EYE },
  { 10, ICON_CELL_CLOUD },
  { 18, ICON_CELL_BED_ARROW_IN },
  { 19, ICON_CELL_BED_ARROW_OUT },
  { 20, ICON_CELL_BED_CHECK },
  { 21, ICON_CELL_BED_CLOCK },
  { 22, ICON_CELL_BED_CHECK_CLOCK },
  { 23, ICON_CELL_PLANETS },
  { 24, ICON_CELL_SATURN_RING },
  { 25, ICON_CELL_ISS },
  { 26, ICON_CELL_AURORA },
  { 28, ICON_CELL_REFRESH },
};

// Icon kinds drawn from the atlases besides the STYLED_ICONS table: sunrise/sunset 11, Bluetooth 13, weather 14,
// Quiet Time 29, hourly bell 40.
static bool is_atlas_kind(uint8_t kind) {
  if (kind == 11 || kind == 13 || kind == 14 || kind == 29 || kind == 40) return true;
  for (size_t i = 0; i < sizeof(STYLED_ICONS) / sizeof(STYLED_ICONS[0]); i++) {
    if (STYLED_ICONS[i].kind == kind) return true;
  }
  return false;
}

// "Phone disconnected" flashing of the Bluetooth icon: app_controller.c toggles
// this once a second while the connection is down; the icon is skipped (its
// space stays reserved) during the hidden phase.
static bool s_bt_flash_hidden = false;
void feature_icons_set_bt_flash_hidden(bool hidden) { s_bt_flash_hidden = hidden; }

static const uint8_t *s_media_art = NULL;
void feature_icons_set_media_art(const uint8_t *pixels) { s_media_art = pixels; }





static void draw_icon(GContext *ctx, uint8_t icon_kind, int16_t icon_extra,
                      bool icon_flag, GColor color, GColor color2,
                      int16_t icon_x, int16_t box_y, int16_t row_height,
                      uint8_t outline_style, uint8_t icon_style, IconAnim *anim, bool draw_debug) {
  GColor outline_color = feature_render_contrasting_outline_color(color);
  bool do_outline = outline_style != 0;
  const GPoint *offs = NULL; int offs_n = 0;
  if (do_outline) feature_icon_assets_get_outline_offsets(outline_style, &offs, &offs_n);
  draw_debug_marker_point(ctx, draw_debug, GPoint(icon_x, box_y), GColorRed);
  for (size_t i = 0; i < sizeof(STYLED_ICONS) / sizeof(STYLED_ICONS[0]); i++) {
    if (STYLED_ICONS[i].kind != icon_kind) continue;
    GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
    draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
    icon_atlas_draw(ctx, pos, STYLED_ICONS[i].cell, anim, icon_style,
                    outline_style, outline_color, color, ICON_DRAW_W, ICON_DRAW_H);
    return;
  }

  switch (icon_kind) {
    case 3: { // battery
      GPoint pos = GPoint(icon_x, box_y + (row_height - 14) / 2);
      GColor c = icon_flag ? PBL_IF_COLOR_ELSE(GColorGreen, color) : color; // charging state uses green (B&W: text colour)
      GColor oc = icon_flag ? PBL_IF_COLOR_ELSE(GColorBlack, outline_color) : outline_color;
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_battery(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), oc, 0);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_battery(ctx, pos, c, icon_extra);
      return;
    }
    case 4: { // moon phase
      int16_t moon_r = 9;
      GPoint center = GPoint(icon_x + moon_r, box_y + row_height / 2);
      GRect clip = GRect(icon_x, box_y, moon_r * 2 + 2, row_height);
      if (do_outline) {
        graphics_context_set_fill_color(ctx, outline_color);
        for (int i = 0; i < offs_n; i++) {
          graphics_fill_circle(ctx, GPoint(center.x + offs[i].x, center.y + offs[i].y), moon_r);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, center, GColorMagenta);
      feature_draw_moon_phase(ctx, clip, center, moon_r, (uint8_t)icon_extra, icon_flag, color);
      return;
    }
    case 11: { // sunrise/sunset glyph -- a plain styled image (see resources/images/<style>/
               // sun_time_rise.png / sun_time_set.png), drawn the exact
      GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      icon_atlas_draw(ctx, pos, icon_flag ? ICON_CELL_SUN_TIME_RISE : ICON_CELL_SUN_TIME_SET, anim, icon_style,
                      outline_style, outline_color, color, SUN_TIME_ICON_DRAW_W, SUN_TIME_ICON_DRAW_H);
      return;
    }
    case 12: { // Pebble battery logo
      GPoint pos = GPoint(icon_x, box_y + (row_height - 10) / 2); // art spans PL_LOGO_W px from here, see primitive_layout.c
      GColor c = icon_flag ? PBL_IF_COLOR_ELSE(GColorGreen, color) : color;
      GColor oc = icon_flag ? PBL_IF_COLOR_ELSE(GColorBlack, outline_color) : outline_color;
      GPoint p1 = GPoint(pos.x + 3, pos.y + 9);
      GPoint p2 = GPoint(pos.x + 3 + (35 * icon_extra / 100), pos.y + 9);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_icon_assets_draw_tiny(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), PEBBLE_ICON, 10, 40, oc);
        }
        graphics_context_set_stroke_color(ctx, oc);
        graphics_draw_line(ctx, GPoint(p1.x, p1.y + 1), GPoint(p2.x, p2.y + 1));
        graphics_draw_line(ctx, GPoint(p1.x - 1, p1.y), GPoint(p2.x + 1, p2.y));
        graphics_draw_line(ctx, GPoint(p1.x, p1.y - 1), GPoint(p2.x, p2.y - 1));
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_icon_assets_draw_tiny(ctx, pos, PEBBLE_ICON, 10, 40, c);
      graphics_context_set_stroke_color(ctx, c);
      graphics_draw_line(ctx, p1, p2);
      return;
    }
    case 14: { // weather condition icon -- style picked in settings (simple/hollow/full color),
               // plus day/night art for the 2 categories that have both
               // (icon_flag carries "is it night right now", set by
               // weather resolver when it resolves the category).
      GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
      uint8_t category = (uint8_t)icon_extra;
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      icon_atlas_draw(ctx, pos, feature_weather_icons_cell(category, icon_flag), anim, icon_style,
                      outline_style, outline_color, color, ICON_DRAW_W, ICON_DRAW_H);
      return;
    }
    case 15: { // pressure trend chevron
      GPoint pos = GPoint(icon_x, box_y + (row_height - 12) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_pressure_trend(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), (uint8_t)icon_extra, outline_color);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_pressure_trend(ctx, pos, (uint8_t)icon_extra, color);
      return;
    }
    case 16: { // wind direction arrow
      GPoint pos = GPoint(icon_x, box_y + (row_height - 12) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_wind_direction(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), icon_extra, outline_color);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_wind_direction(ctx, pos, icon_extra, color);
      return;
    }
    case 17: { // altitude mountain glyph
      GPoint pos = GPoint(icon_x, box_y + (row_height - 12) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_mountain(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), outline_color);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_mountain(ctx, pos, color);
      return;
    }
    case 40: { // hourly beep bell -- bell / crossed-out bell (icon_flag: true = off or muted).
               // Styled images (resources/images/<style>/bell.png and bell_off.png).
      GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      icon_atlas_draw(ctx, pos, icon_flag ? ICON_CELL_BELL_OFF : ICON_CELL_BELL, anim, icon_style,
                      outline_style, outline_color, color, ICON_DRAW_W, ICON_DRAW_H);
      return;
    }
    case 39: { // calendar page
      GPoint pos = GPoint(icon_x, box_y + (row_height - 13) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_calendar(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), outline_color);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_calendar(ctx, pos, color);
      return;
    }
    case 38: { // calories flame glyph
      GPoint pos = GPoint(icon_x, box_y + (row_height - 14) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_flame(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), outline_color);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_flame(ctx, pos, color);
      return;
    }
    case 13: { // bluetooth -- own case rather than the generic STYLED_ICONS
               // bucket above: that bucket draws each bitmap right-anchored.
               // icon_flag = phone disconnected. Simple/Hollow already turn red
               // through `color`; Full color art keeps its own colors, so it gets a
               // red X across it instead.
      if (icon_flag && s_bt_flash_hidden) return; // flashing while disconnected
      GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
      icon_atlas_draw(ctx, pos, ICON_CELL_BLUETOOTH, anim, icon_style,
                      outline_style, outline_color, color, ICON_DRAW_W, ICON_DRAW_H);
      if (icon_flag && icon_style == 2) {
        GPoint a = GPoint(pos.x + 3, pos.y + 1), b = GPoint(pos.x + 12, pos.y + 10);
        GPoint c = GPoint(pos.x + 12, pos.y + 1), d = GPoint(pos.x + 3, pos.y + 10);
        if (do_outline) {
          graphics_context_set_stroke_color(ctx, outline_color);
          graphics_context_set_stroke_width(ctx, 4);
          graphics_draw_line(ctx, a, b);
          graphics_draw_line(ctx, c, d);
        }
        graphics_context_set_stroke_color(ctx, GColorRed);
        graphics_context_set_stroke_width(ctx, 2);
        graphics_draw_line(ctx, a, b);
        graphics_draw_line(ctx, c, d);
        graphics_context_set_stroke_width(ctx, 1);
      }
      return;
    }
    case 27: { // compass -- asleep (Zz glyph) or a live heading rose with a distinct north arrow
      GPoint pos = GPoint(icon_x, box_y + (row_height - 12) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          GPoint shifted = GPoint(pos.x + offs[i].x, pos.y + offs[i].y);
          if (icon_flag) feature_vector_icons_compass_sleep(ctx, shifted, outline_color);
          else feature_vector_icons_compass(ctx, shifted, icon_extra, outline_color, outline_color);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      if (icon_flag) feature_vector_icons_compass_sleep(ctx, pos, color);
      else feature_vector_icons_compass(ctx, pos, icon_extra, color, color2);
      return;
    }
    case 29: { // Quiet Time -- speaker / crossed-out speaker (icon_flag: true = active/muted).
               // Styled image (see resources/images/<style>/quiet_time.png /
               // quiet_time_muted.png).
      GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      icon_atlas_draw(ctx, pos, icon_flag ? ICON_CELL_QUIET_TIME_MUTED : ICON_CELL_QUIET_TIME, anim, icon_style,
                      outline_style, outline_color, color, ICON_DRAW_W, ICON_DRAW_H);
      return;
    }
    case 30: { // "+Xh"/"+X day" forecast-offset half-icon (see
               // feature_forecast_offset_icons.c) -- icon_extra carries the
               // 0-8 offset index (content-87, computed by
               // weather resolver), drawn just like any other
               // fixed-shape icon; feature_icons_plus_gap_width()'s own
               // table is what makes this one only take up half the width.
      GPoint pos = GPoint(icon_x, ICON_TOP(box_y, row_height));
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_forecast_offset_icons_draw_with_outline(ctx, pos, (uint8_t)icon_extra, icon_style,
                                                       outline_style, outline_color, color);
      return;
    }
    case 31: { // phone (icon_extra = charge 0-100, icon_flag = charge unknown)
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_DRAW_H) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_phone(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), ICON_DRAW_H, outline_color, 0, true);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_phone(ctx, pos, ICON_DRAW_H, color, icon_extra, icon_flag);
      return;
    }
    case 32: { // media state (icon_extra: 0 note, 1 play, 2 pause)
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_DRAW_H) / 2);
      if (do_outline) {
        for (int i = 0; i < offs_n; i++) {
          feature_vector_icons_media_state(ctx, GPoint(pos.x + offs[i].x, pos.y + offs[i].y), ICON_DRAW_H, outline_color, (uint8_t)icon_extra);
        }
      }
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_media_state(ctx, pos, ICON_DRAW_H, color, (uint8_t)icon_extra);
      return;
    }
    case 33: { // album art
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_DRAW_H) / 2);
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_media_art(ctx, pos, ICON_DRAW_H, s_media_art, color);
      return;
    }
    case 34: { // progress bar (icon_extra = percent, icon_flag = length unknown)
      GPoint pos = GPoint(icon_x, box_y + (row_height - 5) / 2);
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_vector_icons_progress_bar(ctx, pos, PL_PROGRESS_BAR_W, icon_extra, icon_flag, color);
      return;
    }
    default:
      return;
  }
}

void feature_icons_draw_render_icon(GContext *ctx, uint8_t icon_kind, int16_t icon_extra,
                                    bool icon_flag, GColor color, GColor color2,
                                    int16_t icon_x, int16_t box_y, int16_t row_height,
                                    uint8_t outline_style, uint8_t icon_style, IconAnim *anim, bool draw_debug) {
#ifdef PBL_COLOR
  uint8_t *bg = NULL;
  int16_t left = 0;
  GRect r = GRectZero;
  if (anim && !is_atlas_kind(icon_kind)) {
    // A code-drawn icon (or nothing) is "nothing" to the slide animation; at start-up it slides in itself, by
    // moving the pixels it drew (see icon_slide_capture) -- which needs no per-icon code.
    left = icon_atlas_blank_left(anim);
    int16_t w = feature_icons_plus_gap_width(icon_kind);
    if (left > 0 && w > 0) {
      r = GRect(icon_x - 2, box_y, w + 2, row_height);
      bg = icon_slide_capture(ctx, r);
    }
  }
  draw_icon(ctx, icon_kind, icon_extra, icon_flag, color, color2, icon_x, box_y, row_height,
            outline_style, icon_style, anim, draw_debug);
  if (bg) icon_slide_apply(ctx, r, bg, left);
#else
  // Something that is not an atlas icon (or nothing: the blank "odd state" stand-ins) is "nothing" to the slide
  // animation, so an atlas icon replacing it slides in.
  if (anim && !is_atlas_kind(icon_kind)) icon_atlas_set_blank(anim);
  draw_icon(ctx, icon_kind, icon_extra, icon_flag, color, color2, icon_x, box_y, row_height,
            outline_style, icon_style, anim, draw_debug);
#endif
}

// Widths include the fixed 5px gap after the icon. Keeping this as a compact
// On B&W watches the bitmap icons are 3/4 the size, so their widths scale (PL_ICON_PX); the
// vector-drawn ones (battery 3, moon 4, pressure 15, wind 16, altitude 17, compass 27) keep their
// pixel size and so keep their width.
static const uint8_t s_icon_plus_gap_width[42] = {
  [1] = PL_ICON_PX(20), [2] = PL_ICON_PX(20), [3] = 13, [4] = 21,
  [5] = PL_ICON_PX(20), [6] = PL_ICON_PX(20), [7] = PL_ICON_PX(20), [8] = PL_ICON_PX(20),
  [9] = PL_ICON_PX(20), [10] = PL_ICON_PX(20),
  [11] = PL_ICON_PX(22), [13] = PL_ICON_PX(20), [14] = PL_ICON_PX(20), [15] = 12, [16] = 14, [17] = 20,
  [18] = PL_ICON_PX(20), [19] = PL_ICON_PX(20), [20] = PL_ICON_PX(20), [21] = PL_ICON_PX(20),
  [22] = PL_ICON_PX(20), [23] = PL_ICON_PX(20),
  [24] = PL_ICON_PX(20), [25] = PL_ICON_PX(20), [26] = PL_ICON_PX(20), [27] = 21,
  [28] = PL_ICON_PX(20), [29] = PL_ICON_PX(20),
  // Half-icon (see case 30 above): only its left 8px has content, so it
  // gets roughly half of kind 14's (the weather icon it always precedes)
  // own 20 here, not a full icon's worth -- that's the actual point of
  // drawing it "oversized" at 16x16: the layout only pays for the half
  // that's populated.
  [30] = PL_ICON_PX(10),
  // Phone, media state, album art (a square icon), progress bar (PL_PROGRESS_BAR_W + gap).
  [31] = PL_ICON_PX(15), [32] = PL_ICON_PX(14), [33] = PL_ICON_PX(21),
  [34] = PL_PROGRESS_BAR_W + 4,
  // Blank stand-ins for the "odd state" icons (35 = battery 3, 36 = Bluetooth 13, 37 = Quiet Time 29): they
  // draw nothing (draw switch default) but reserve the real icon's width, so nothing shifts when it appears.
  [35] = 13, [36] = PL_ICON_PX(20), [37] = PL_ICON_PX(20),
  // Calories flame (vector, 12 px wide + 5 px gap).
  [38] = 17,
  // Calendar page (vector, 12 px wide + 5 px gap).
  [39] = 17,
  // Bell (40) and its blank odd-state stand-in (41).
  [40] = PL_ICON_PX(20), [41] = PL_ICON_PX(20),
};

int16_t feature_icons_plus_gap_width(int icon_kind) {
  if ((unsigned)icon_kind >= 42u) return 0;
  return s_icon_plus_gap_width[icon_kind];
}
