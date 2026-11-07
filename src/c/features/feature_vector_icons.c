#include "./feature_vector_icons.h"

void feature_vector_icons_battery(GContext *ctx, GPoint top_left, GColor color, int charge) {
  graphics_context_set_fill_color(ctx, color);
  graphics_fill_rect(ctx, GRect(top_left.x + 2, top_left.y, 4, 2), 0, GCornerNone); // nub
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_rect(ctx, GRect(top_left.x, top_left.y + 2, 8, 12));
  int16_t charge_pixels = (charge == 0) ? 0 : (8 * charge / 100);
  graphics_fill_rect(ctx, GRect(top_left.x + 2, top_left.y + 4 + (8 - charge_pixels), 4, charge_pixels), 0, GCornerNone); // fill
}



void feature_vector_icons_pressure_trend(GContext *ctx, GPoint top_left, uint8_t trend, GColor color) {
  GPoint center = GPoint(top_left.x + 5, top_left.y + 6);
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 2);
  if (trend == 1) { // rising
    graphics_draw_line(ctx, GPoint(center.x, center.y + 5), GPoint(center.x, center.y - 5));
    graphics_draw_line(ctx, GPoint(center.x, center.y - 5), GPoint(center.x - 3, center.y - 2));
    graphics_draw_line(ctx, GPoint(center.x, center.y - 5), GPoint(center.x + 3, center.y - 2));
  } else if (trend == 2) { // falling
    graphics_draw_line(ctx, GPoint(center.x, center.y - 5), GPoint(center.x, center.y + 5));
    graphics_draw_line(ctx, GPoint(center.x, center.y + 5), GPoint(center.x - 3, center.y + 2));
    graphics_draw_line(ctx, GPoint(center.x, center.y + 5), GPoint(center.x + 3, center.y + 2));
  } else { // flat
    graphics_draw_line(ctx, GPoint(center.x - 5, center.y), GPoint(center.x + 5, center.y));
  }
}



void feature_vector_icons_wind_direction(GContext *ctx, GPoint top_left, int16_t from_deg, GColor color) {
  GPoint center = GPoint(top_left.x + 6, top_left.y + 6);
  int32_t angle = (int32_t)(((from_deg + 180) % 360) * TRIG_MAX_ANGLE) / 360;
  int16_t len = 6;
  GPoint tip = GPoint(center.x + (len * sin_lookup(angle)) / TRIG_MAX_RATIO,
                       center.y - (len * cos_lookup(angle)) / TRIG_MAX_RATIO);
  GPoint tail = GPoint(center.x - (len * sin_lookup(angle)) / TRIG_MAX_RATIO,
                        center.y + (len * cos_lookup(angle)) / TRIG_MAX_RATIO);
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_line(ctx, tail, tip);
  int32_t back_angle1 = angle + (TRIG_MAX_ANGLE * 150) / 360;
  int32_t back_angle2 = angle - (TRIG_MAX_ANGLE * 150) / 360;
  GPoint h1 = GPoint(tip.x + (4 * sin_lookup(back_angle1)) / TRIG_MAX_RATIO, tip.y - (4 * cos_lookup(back_angle1)) / TRIG_MAX_RATIO);
  GPoint h2 = GPoint(tip.x + (4 * sin_lookup(back_angle2)) / TRIG_MAX_RATIO, tip.y - (4 * cos_lookup(back_angle2)) / TRIG_MAX_RATIO);
  graphics_draw_line(ctx, tip, h1);
  graphics_draw_line(ctx, tip, h2);
}



void feature_vector_icons_compass(GContext *ctx, GPoint top_left, int16_t heading_deg,
                               GColor north_color, GColor other_color) {
  GPoint center = GPoint(top_left.x + 6, top_left.y + 6);
  int32_t north_angle = (int32_t)((((360 - (heading_deg % 360)) % 360) * TRIG_MAX_ANGLE)) / 360;

  for (int k = 0; k < 4; k++) {
    int32_t angle = north_angle + (int32_t)((int64_t)k * TRIG_MAX_ANGLE / 4);
    bool is_north = (k == 0);
    int16_t len = is_north ? 6 : 4;
    GColor color = is_north ? north_color : other_color;
    GPoint tip = GPoint(center.x + (len * sin_lookup(angle)) / TRIG_MAX_RATIO,
                         center.y - (len * cos_lookup(angle)) / TRIG_MAX_RATIO);
    graphics_context_set_stroke_color(ctx, color);
    graphics_context_set_stroke_width(ctx, 1);
    graphics_draw_line(ctx, center, tip);
    int32_t head_len = is_north ? 3 : 2;
    int32_t back_angle1 = angle + (TRIG_MAX_ANGLE * 150) / 360;
    int32_t back_angle2 = angle - (TRIG_MAX_ANGLE * 150) / 360;
    GPoint h1 = GPoint(tip.x + (head_len * sin_lookup(back_angle1)) / TRIG_MAX_RATIO, tip.y - (head_len * cos_lookup(back_angle1)) / TRIG_MAX_RATIO);
    GPoint h2 = GPoint(tip.x + (head_len * sin_lookup(back_angle2)) / TRIG_MAX_RATIO, tip.y - (head_len * cos_lookup(back_angle2)) / TRIG_MAX_RATIO);
    graphics_draw_line(ctx, tip, h1);
    graphics_draw_line(ctx, tip, h2);
  }
}



void feature_vector_icons_compass_sleep(GContext *ctx, GPoint top_left, GColor color) {
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 1);
  // Big Z, roughly 7x7, upper-left of the icon box.
  GPoint bz[4] = { GPoint(top_left.x, top_left.y), GPoint(top_left.x + 6, top_left.y),
                    GPoint(top_left.x, top_left.y + 6), GPoint(top_left.x + 6, top_left.y + 6) };
  graphics_draw_line(ctx, bz[0], bz[1]);
  graphics_draw_line(ctx, bz[1], bz[2]);
  graphics_draw_line(ctx, bz[2], bz[3]);
  // Small z, roughly 4x4, lower-right, overlapping the big one's tail like a real "Zz" sleep glyph.
  GPoint sz_origin = GPoint(top_left.x + 5, top_left.y + 6);
  GPoint sz[4] = { sz_origin, GPoint(sz_origin.x + 4, sz_origin.y), GPoint(sz_origin.x, sz_origin.y + 4), GPoint(sz_origin.x + 4, sz_origin.y + 4) };
  graphics_draw_line(ctx, sz[0], sz[1]);
  graphics_draw_line(ctx, sz[1], sz[2]);
  graphics_draw_line(ctx, sz[2], sz[3]);
}



void feature_vector_icons_mountain(GContext *ctx, GPoint top_left, GColor color) {
  graphics_context_set_fill_color(ctx, color);
  GPoint peak1[3] = {
    GPoint(top_left.x + 4, top_left.y + 1),
    GPoint(top_left.x, top_left.y + 11),
    GPoint(top_left.x + 9, top_left.y + 11),
  };
  GPathInfo info1 = { .num_points = 3, .points = peak1 };
  GPath *path1 = gpath_create(&info1);
  gpath_draw_filled(ctx, path1);
  gpath_destroy(path1);

  GPoint peak2[3] = {
    GPoint(top_left.x + 11, top_left.y + 4),
    GPoint(top_left.x + 6, top_left.y + 11),
    GPoint(top_left.x + 15, top_left.y + 11),
  };
  GPathInfo info2 = { .num_points = 3, .points = peak2 };
  GPath *path2 = gpath_create(&info2);
  gpath_draw_filled(ctx, path2);
  gpath_destroy(path2);
}



void feature_vector_icons_phone(GContext *ctx, GPoint top_left, int size, GColor color, int level, bool unknown) {
  int w = (size * 5) / 8;            // 10 on 16, 7 on 12
  int h = size - 1;
  int x = top_left.x + (size - w) / 2 - 1;
  int y = top_left.y;
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_fill_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 1);
  graphics_draw_round_rect(ctx, GRect(x, y, w, h), 2);
  // Speaker slot at the top.
  graphics_draw_line(ctx, GPoint(x + w / 2 - 1, y + 2), GPoint(x + w / 2 + 1, y + 2));
  if (unknown) return;
  // Charge as a bar filling the body from the bottom (screen area between slot and edge).
  int inner_h = h - 6;
  int fill = (inner_h * level) / 100;
  if (level > 0 && fill < 1) fill = 1;
  graphics_fill_rect(ctx, GRect(x + 2, y + h - 2 - fill, w - 3, fill), 0, GCornerNone);
}

void feature_vector_icons_media_state(GContext *ctx, GPoint top_left, int size, GColor color, uint8_t state) {
  int s = (size * 10) / 16;          // glyph box: 10 on 16, 7 on 12
  int x = top_left.x + 1;
  int y = top_left.y + (size - s) / 2;
  graphics_context_set_fill_color(ctx, color);
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 1);
  if (state == 1) {
    GPoint pts[3] = { GPoint(x, y), GPoint(x, y + s), GPoint(x + s - 1, y + s / 2) };
    GPathInfo info = { .num_points = 3, .points = pts };
    GPath *path = gpath_create(&info);
    gpath_draw_filled(ctx, path);
    gpath_destroy(path);
  } else if (state == 2) {
    int bw = s / 3 > 2 ? s / 3 : 2;
    graphics_fill_rect(ctx, GRect(x, y, bw, s), 0, GCornerNone);
    graphics_fill_rect(ctx, GRect(x + s - bw, y, bw, s), 0, GCornerNone);
  } else { // music note
    int head = s / 3 > 2 ? s / 3 : 2;
    graphics_fill_circle(ctx, GPoint(x + head, y + s - head), head);
    graphics_draw_line(ctx, GPoint(x + head * 2 - 1, y + s - head), GPoint(x + head * 2 - 1, y));
    graphics_draw_line(ctx, GPoint(x + head * 2 - 1, y), GPoint(x + s - 1, y + head));
  }
}

void feature_vector_icons_media_art(GContext *ctx, GPoint top_left, int size, const uint8_t *pixels, GColor frame) {
  bool any = false;
  if (pixels) {
    for (int i = 0; i < size * size; i++) {
      if (pixels[i] & 0xC0) { any = true; break; }
    }
  }
  if (!any) {
    graphics_context_set_stroke_color(ctx, frame);
    graphics_context_set_stroke_width(ctx, 1);
    graphics_draw_rect(ctx, GRect(top_left.x, top_left.y, size, size));
    feature_vector_icons_media_state(ctx, GPoint(top_left.x + (size - (size * 10) / 16) / 2 - 1, top_left.y), size, frame, 0);
    return;
  }
  for (int yy = 0; yy < size; yy++) {
    for (int xx = 0; xx < size; xx++) {
      uint8_t b = pixels[yy * size + xx];
      if (!(b & 0xC0)) continue;
      GColor c; c.argb = b;
      graphics_context_set_stroke_color(ctx, c);
      graphics_draw_pixel(ctx, GPoint(top_left.x + xx, top_left.y + yy));
    }
  }
}

void feature_vector_icons_progress_bar(GContext *ctx, GPoint top_left, int width, int pct, bool unknown, GColor color) {
  graphics_context_set_stroke_color(ctx, color);
  graphics_context_set_fill_color(ctx, color);
  graphics_context_set_stroke_width(ctx, 1);
  if (unknown) { // length unknown: dotted track only
    for (int x = 0; x < width; x += 3) graphics_draw_pixel(ctx, GPoint(top_left.x + x, top_left.y + 2));
    return;
  }
  graphics_draw_rect(ctx, GRect(top_left.x, top_left.y, width, 5));
  int fill = ((width - 2) * (pct < 0 ? 0 : (pct > 100 ? 100 : pct))) / 100;
  if (fill > 0) graphics_fill_rect(ctx, GRect(top_left.x + 1, top_left.y + 1, fill, 3), 0, GCornerNone);
}
