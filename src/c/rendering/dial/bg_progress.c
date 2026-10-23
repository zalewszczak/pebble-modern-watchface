#include "./bg_progress.h"
#include "../../data/watch_ui.h"

static bool s_active;
static uint16_t s_total;
static uint16_t s_done;
static uint16_t s_current;

void bg_progress_start(uint16_t batch_total_chunks, uint16_t batch_done_chunks) {
  s_total = batch_total_chunks;
  s_done = batch_done_chunks;
  s_current = 0;
  s_active = batch_total_chunks > 0;
}

void bg_progress_update(uint16_t current_chunks) {
  if (!s_active) return;
  s_current = current_chunks;
}

void bg_progress_set_done(uint16_t done_chunks) {
  if (!s_active) return;
  s_done = done_chunks;
  s_current = 0;
}

void bg_progress_finish(void) {
  s_active = false;
  s_total = s_done = s_current = 0;
}

bool bg_progress_active(void) { return s_active; }

int bg_progress_permille(void) {
  if (!s_active || s_total == 0) return -1;
  uint32_t done = (uint32_t)s_done + s_current;
  if (done > s_total) done = s_total;
  return (int)((done * 1000u) / s_total);
}

// ---- layer ------------------------------------------------------------------

typedef struct {
  WatchData *data;
} ProgressState;

#define BAR_W 100
#define BAR_H 8

static void progress_update_proc(Layer *layer, GContext *ctx) {
  int permille = bg_progress_permille();
  if (permille < 0) return;
  ProgressState *state = (ProgressState *)layer_get_data(layer);
  if (!state->data) return;

  GColor bg, main_color, accent_color;
  watch_ui_get_active_color_scheme(state->data, time(NULL), &bg, &main_color, &accent_color);

  GRect bounds = layer_get_bounds(layer);
  // Lower middle of the dial, clear of the centre and (mostly) of the features.
  GRect bar = GRect((bounds.size.w - BAR_W) / 2, bounds.size.h * 2 / 3, BAR_W, BAR_H);

  // Backing plate so the bar stays legible over a busy background image.
  graphics_context_set_fill_color(ctx, bg);
  graphics_fill_rect(ctx, GRect(bar.origin.x - 2, bar.origin.y - 2, bar.size.w + 4, bar.size.h + 4), 0, GCornerNone);
  graphics_context_set_stroke_color(ctx, main_color);
  graphics_draw_rect(ctx, bar);

  int fill_w = ((BAR_W - 4) * permille) / 1000;
  if (fill_w > 0) {
    graphics_context_set_fill_color(ctx, accent_color);
    graphics_fill_rect(ctx, GRect(bar.origin.x + 2, bar.origin.y + 2, fill_w, BAR_H - 4), 0, GCornerNone);
  }
}

Layer *bg_progress_layer_create(GRect frame) {
  Layer *layer = layer_create_with_data(frame, sizeof(ProgressState));
  if (!layer) return NULL;
  ((ProgressState *)layer_get_data(layer))->data = NULL;
  layer_set_update_proc(layer, progress_update_proc);
  return layer;
}

void bg_progress_layer_set_data(Layer *layer, WatchData *data) {
  if (!layer) return;
  ((ProgressState *)layer_get_data(layer))->data = data;
  layer_mark_dirty(layer);
}

void bg_progress_layer_destroy(Layer *layer) {
  if (layer) layer_destroy(layer);
}
