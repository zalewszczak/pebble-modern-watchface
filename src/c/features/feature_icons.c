#include "./feature_icons.h"
#include "./feature_icon_assets.h"
#include "./feature_weather_icons.h"
#include "./feature_forecast_offset_icons.h"
#include "./feature_vector_icons.h"
#include "./feature_render.h"
#include "../data/watch_ui.h"
#include "./feature_support.h"
#include "../platform/platform_bw.h"

// Anchor/centering math below is intentionally left at the OLD icon size
// (16x12, and 20x10 for the sunrise/sunset glyph) even though every icon now
// actually draws taller (and, for sunrise/sunset, at its real width -- see
// SUN_TIME_ICON_DRAW_W below) -- the icons got taller without moving the
// top-left point they're drawn from, per how this was asked for.
#define ICON_WIDTH PL_ICON_W
#define ICON_ROWS PL_ICON_ROWS
#define SUN_TIME_ICON_ROWS PL_SUN_ICON_ROWS

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

// Every fixed-shape, right-anchored feature icon: kind, its 3-style resource
// set, and its x_nudge (how far its right edge sits from icon_x -- unrelated
// to icon style/size, purely per-glyph visual balance, unchanged from before).
// This table plus feature_icon_assets_draw_styled_with_outline() is the
// entire "generic icon loading" this style overhaul was about: adding an
// icon or a style is a data row, never new drawing code.
#define ICON_SET(NAME) { RESOURCE_ID_ICON_SIMPLE_##NAME, RESOURCE_ID_ICON_HOLLOW_##NAME, ICON_FULLCOLOR_ID(RESOURCE_ID_ICON_FULLCOLOR_##NAME) }
static const struct { uint8_t kind; IconResourceSet set; int16_t x_nudge; } STYLED_ICONS[] = {
  { 1,  ICON_SET(HEART),           PL_ICON_PX(12) },
  { 2,  ICON_SET(FOOT),             PL_ICON_PX(6) },
  { 5,  ICON_SET(UMBRELLA),        PL_ICON_PX(10) },
  { 6,  ICON_SET(DROPLET),         PL_ICON_PX(10) },
  { 7,  ICON_SET(WIND),            PL_ICON_PX(10) },
  { 8,  ICON_SET(GPS_PIN),          PL_ICON_PX(6) },
  { 9,  ICON_SET(EYE),              PL_ICON_PX(6) },
  { 10, ICON_SET(CLOUD),            PL_ICON_PX(6) },
  { 18, ICON_SET(BED_ARROW_IN),     PL_ICON_PX(6) },
  { 19, ICON_SET(BED_ARROW_OUT),    PL_ICON_PX(6) },
  { 20, ICON_SET(BED_CHECK),        PL_ICON_PX(6) },
  { 21, ICON_SET(BED_CLOCK),        PL_ICON_PX(6) },
  { 22, ICON_SET(BED_CHECK_CLOCK),  PL_ICON_PX(6) },
  { 23, ICON_SET(PLANETS),          PL_ICON_PX(6) },
  { 24, ICON_SET(SATURN_RING),      PL_ICON_PX(6) },
  { 25, ICON_SET(ISS),              PL_ICON_PX(6) },
  { 26, ICON_SET(AURORA),           PL_ICON_PX(6) },
  { 28, ICON_SET(REFRESH),          PL_ICON_PX(6) },
};

// Left-anchored (not right-anchored like STYLED_ICONS above) single-state
// styled icons.
static const IconResourceSet BLUETOOTH_ICON_SET = ICON_SET(BLUETOOTH);

// 2-state styled icons -- [0] is the "off"/inactive look, [1] the
// "on"/active one; icon_flag picks which.
static const IconResourceSet QUIET_TIME_ICON_SET[2] = { ICON_SET(QUIET_TIME), ICON_SET(QUIET_TIME_MUTED) };
static const IconResourceSet SUN_TIME_ICON_SET[2] = { ICON_SET(SUN_TIME_SET), ICON_SET(SUN_TIME_RISE) };
#undef ICON_SET

// "Phone disconnected" flashing of the Bluetooth icon: app_controller.c toggles
// this once a second while the connection is down; the icon is skipped (its
// space stays reserved) during the hidden phase.
static bool s_bt_flash_hidden = false;
void feature_icons_set_bt_flash_hidden(bool hidden) { s_bt_flash_hidden = hidden; }

static const uint8_t *s_media_art = NULL;
void feature_icons_set_media_art(const uint8_t *pixels) { s_media_art = pixels; }





void feature_icons_draw_render_icon(GContext *ctx, uint8_t icon_kind, int16_t icon_extra,
                                    bool icon_flag, GColor color, GColor color2,
                                    int16_t icon_x, int16_t box_y, int16_t row_height,
                                    uint8_t outline_style, uint8_t icon_style, bool draw_debug) {
  GColor outline_color = feature_render_contrasting_outline_color(color);
  bool do_outline = outline_style != 0;
  const GPoint *offs = NULL; int offs_n = 0;
  if (do_outline) feature_icon_assets_get_outline_offsets(outline_style, &offs, &offs_n);
  draw_debug_marker_point(ctx, draw_debug, GPoint(icon_x, box_y), GColorRed);
  for (size_t i = 0; i < sizeof(STYLED_ICONS) / sizeof(STYLED_ICONS[0]); i++) {
    if (STYLED_ICONS[i].kind != icon_kind) continue;
    GPoint pos = GPoint(icon_x - ICON_WIDTH + STYLED_ICONS[i].x_nudge, box_y + (row_height - ICON_ROWS) / 2);
    draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
    feature_icon_assets_draw_styled_with_outline(ctx, pos, &STYLED_ICONS[i].set, icon_style,
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
      GPoint pos = GPoint(icon_x, box_y + (row_height - SUN_TIME_ICON_ROWS) / 2);
      const IconResourceSet *set = &SUN_TIME_ICON_SET[icon_flag ? 1 : 0];
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_icon_assets_draw_styled_with_outline(ctx, pos, set, icon_style,
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
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_ROWS) / 2 - 2);
      uint8_t category = (uint8_t)icon_extra;
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_weather_icons_draw_with_outline(ctx, pos, category, icon_flag, icon_style,
                                              outline_style, outline_color, color);
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
    case 13: { // bluetooth -- own case rather than the generic STYLED_ICONS
               // bucket above: that bucket draws each bitmap right-anchored.
               // icon_flag = phone disconnected. Simple/Hollow already turn red
               // through `color`; Full color art keeps its own colors, so it gets a
               // red X across it instead.
      if (icon_flag && s_bt_flash_hidden) return; // flashing while disconnected
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_ROWS) / 2);
      feature_icon_assets_draw_styled_with_outline(ctx, pos, &BLUETOOTH_ICON_SET, icon_style,
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
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_ROWS) / 2);
      const IconResourceSet *set = &QUIET_TIME_ICON_SET[icon_flag ? 1 : 0];
      draw_debug_marker_point(ctx, draw_debug, pos, GColorMagenta);
      feature_icon_assets_draw_styled_with_outline(ctx, pos, set, icon_style,
                                                   outline_style, outline_color, color, ICON_DRAW_W, ICON_DRAW_H);
      return;
    }
    case 30: { // "+Xh"/"+X day" forecast-offset half-icon (see
               // feature_forecast_offset_icons.c) -- icon_extra carries the
               // 0-8 offset index (content-87, computed by
               // weather resolver), drawn just like any other
               // fixed-shape icon; feature_icons_plus_gap_width()'s own
               // table is what makes this one only take up half the width.
      GPoint pos = GPoint(icon_x, box_y + (row_height - ICON_ROWS) / 2 - 2);
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



uint8_t feature_icons_weather_category(uint8_t weather_condition, uint8_t cloud_pct) {
  switch (weather_condition) {
    case 1: return 3; // fog
    case 2: return 4; // rain
    case 3: return 5; // snow
    case 4: return 6; // storm
    default:
      if (cloud_pct < 20) return 0; // sunny
      if (cloud_pct < 60) return 1; // partly cloudy
      return 2; // cloudy/overcast
  }
}



// Widths include the fixed 5px gap after the icon. Keeping this as a compact
// On B&W watches the bitmap icons are 3/4 the size, so their widths scale (PL_ICON_PX); the
// vector-drawn ones (battery 3, moon 4, pressure 15, wind 16, altitude 17, compass 27) keep their
// pixel size and so keep their width.
static const uint8_t s_icon_plus_gap_width[38] = {
  [1] = PL_ICON_PX(15), [2] = PL_ICON_PX(15), [3] = 13, [4] = 21,
  [5] = PL_ICON_PX(15), [6] = PL_ICON_PX(15), [7] = PL_ICON_PX(15), [8] = PL_ICON_PX(15),
  [9] = PL_ICON_PX(15), [10] = PL_ICON_PX(15),
  [11] = PL_ICON_PX(22), [13] = PL_ICON_PX(15), [14] = PL_ICON_PX(20), [15] = 12, [16] = 14, [17] = 20,
  [18] = PL_ICON_PX(15), [19] = PL_ICON_PX(15), [20] = PL_ICON_PX(15), [21] = PL_ICON_PX(15),
  [22] = PL_ICON_PX(15), [23] = PL_ICON_PX(15),
  [24] = PL_ICON_PX(15), [25] = PL_ICON_PX(15), [26] = PL_ICON_PX(15), [27] = 21,
  [28] = PL_ICON_PX(15), [29] = PL_ICON_PX(20),
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
  [35] = 13, [36] = PL_ICON_PX(15), [37] = PL_ICON_PX(20),
};

int16_t feature_icons_plus_gap_width(int icon_kind) {
  if ((unsigned)icon_kind >= 38u) return 0;
  return s_icon_plus_gap_width[icon_kind];
}
