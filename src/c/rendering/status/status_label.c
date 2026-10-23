#include "./status_label.h"
#include "../../features/feature_render.h"

#define STATUS_LABEL_Y 25
#define STATUS_LABEL_H 20

static WatchData *s_data;
static Layer *s_layer;
static GColor s_text_color;
static char s_buf[40];

// Drawn on its own layer so the text can be outlined.
static void status_label_update_proc(Layer *layer, GContext *ctx) {
  GRect bounds = layer_get_bounds(layer);
  GFont font = fonts_get_system_font(FONT_KEY_GOTHIC_18_BOLD);

  // Add a contrasting pill only when outline mode is disabled.
  if (s_data->outline_style == 0 && s_buf[0] != '\0') {
    GSize text_size = graphics_text_layout_get_content_size(s_buf, font, bounds,
                                                            GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter);
    int16_t pad_x = 6;
    GRect bg_rect = GRect(bounds.origin.x + (bounds.size.w - text_size.w) / 2 - pad_x,
                          bounds.origin.y, text_size.w + pad_x * 2, bounds.size.h);
    graphics_context_set_fill_color(ctx, feature_render_contrasting_outline_color(s_text_color));
    graphics_fill_rect(ctx, bg_rect, 4, GCornersAll);
  }

  feature_render_draw_text_outlined(ctx, s_buf, font, bounds,
                                    GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter,
                                    s_text_color, s_data->outline_style);
}

void status_label_init(WatchData *data) {
  s_data = data;
}

void status_label_deinit(void) {
  status_label_destroy();
  s_data = NULL;
}

void status_label_create(Layer *parent, GRect frame) {
  status_label_destroy();
  frame.origin.y = STATUS_LABEL_Y;
  frame.size.h = STATUS_LABEL_H;
  s_layer = layer_create(frame);
  if (!s_layer) return;
  layer_set_update_proc(s_layer, status_label_update_proc);
  s_text_color = GColorBlack;
  s_buf[0] = '\0';
  layer_set_hidden(s_layer, true);
  layer_add_child(parent, s_layer);
}

void status_label_destroy(void) {
  if (s_layer) {
    layer_destroy(s_layer);
    s_layer = NULL;
  }
}

void status_label_bring_to_front(Layer *parent) {
  if (!s_layer) return;
  layer_remove_from_parent(s_layer);
  layer_add_child(parent, s_layer);
}

void status_label_set(const char *text, GColor color, bool hidden) {
  snprintf(s_buf, sizeof(s_buf), "%s", text ? text : "");
  s_text_color = color;
  if (s_layer) {
    layer_set_hidden(s_layer, hidden);
    layer_mark_dirty(s_layer);
  }
}

void status_label_mark_dirty(void) {
  if (s_layer) layer_mark_dirty(s_layer);
}
