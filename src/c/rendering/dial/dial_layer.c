#include "./dial_layer.h"
#include "./dial_animation.h"
#include "./marker_layer.h"
#include "./bg_image_cache.h"
#include "./dial_cache.h"
#include "../../data/watch_ui.h"

typedef struct {
  WatchData *data;
  bool anim_active;
  uint16_t anim_elapsed_ms;
  MarkerLayerState markers;
  DialCache cache;
} DialState;

// ---- static content --------------------------------------------------------
//
// Everything drawn by dial_draw_static() is "static": it only changes when the
// settings or the active colour scheme change, never from one tick to the next.
// It is drawn once into the dial cache (dial_cache.c) and blitted afterwards.
//
// To add another static element later: draw it in dial_draw_static() and fold
// every input it depends on into dial_static_signature(). Nothing else.

static uint32_t sig_mix(uint32_t h, uint32_t v) {
  // FNV-1a over the 4 bytes of v.
  for (int i = 0; i < 4; i++) {
    h ^= (v >> (8 * i)) & 0xFF;
    h *= 16777619u;
  }
  return h;
}

static uint32_t sig_bytes(uint32_t h, const void *p, size_t n) {
  const uint8_t *b = (const uint8_t *)p;
  for (size_t i = 0; i < n; i++) {
    h ^= b[i];
    h *= 16777619u;
  }
  return h;
}

static uint32_t dial_static_signature(const WatchData *d, GSize size,
                                      GColor bg, GColor main_color, GColor accent_color) {
  uint32_t h = 2166136261u;
  h = sig_mix(h, ((uint32_t)size.w << 16) | (uint16_t)size.h);
  h = sig_mix(h, ((uint32_t)bg.argb << 16) | ((uint32_t)main_color.argb << 8) | accent_color.argb);
  // Marker style and everything the rings / numerals / bitmap tint read.
  h = sig_mix(h, ((uint32_t)d->big_analog_marker_style << 8) | (d->bitmap_marker_transparent ? 1u : 0u) |
                 (d->draw_debug ? 2u : 0u));
  h = sig_bytes(h, &d->custom_hour_marker, sizeof(d->custom_hour_marker));
  h = sig_bytes(h, &d->custom_second_marker, sizeof(d->custom_second_marker));
  h = sig_mix(h, ((uint32_t)d->custom_hour_marker_inner_thickness << 8) | d->custom_second_marker_inner_thickness);
  h = sig_mix(h, ((uint32_t)d->marker_text.target << 24) | ((uint32_t)d->marker_text.font_choice << 16) |
                 ((uint32_t)(uint8_t)d->marker_text.offset_px << 8) | (d->marker_text.roman_numerals ? 1u : 0u));
  h = sig_mix(h, ((uint32_t)d->marker_text.hour_mask << 16) | d->marker_text.second_mask);
  // Custom background image (selection, or the uploaded image's stamp).
  h = sig_mix(h, bg_image_signature(d));
  return h ? h : 1u;
}

static void dial_draw_static(GContext *ctx, DialState *state, GRect bounds, GPoint origin,
                             const WatchData *d, GColor bg, GColor main_color, GColor accent_color,
                             bool animating, int32_t progress_1000) {
  graphics_context_set_fill_color(ctx, bg);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  bg_image_draw(ctx, d, bounds, origin);

  GPoint center = GPoint(bounds.size.w / 2, bounds.size.h / 2);
  marker_layer_draw(ctx, &state->markers, center, bounds, d, main_color, accent_color, bg,
                    animating, progress_1000, d->draw_debug);
}

static void dial_update_proc(Layer *layer, GContext *ctx) {
  DialState *state = (DialState *)layer_get_data(layer);
  WatchData *d = state->data;
  if (!d) return;

  GRect bounds = layer_get_bounds(layer);
  GPoint origin = layer_get_frame(layer).origin; // the dial sits directly under the root layer

  GColor bg, main_color, accent_color;
  watch_ui_get_active_color_scheme(d, time(NULL), &bg, &main_color, &accent_color);

  // The launch animation moves the indices every frame, so it cannot be cached.
  bool animating = state->anim_active && d->bg_anim_mode == 1;
  if (animating) {
    int32_t progress_1000 = ((int32_t)state->anim_elapsed_ms * 1000) / DIAL_ANIMATION_DURATION_MS;
    if (progress_1000 > 1000) progress_1000 = 1000;
    dial_draw_static(ctx, state, bounds, origin, d, bg, main_color, accent_color, true, progress_1000);
    return;
  }

  uint32_t sig = dial_static_signature(d, bounds.size, bg, main_color, accent_color);

  // Fast path: nothing static changed -> one blit.
  if (dial_cache_valid(&state->cache, sig, bounds.size) &&
      dial_cache_blit(ctx, &state->cache, origin)) {
    return;
  }

  // Rebuild: draw everything once, then snapshot it. The old cache is freed
  // first so two full-layer bitmaps never coexist.
  dial_cache_release(&state->cache);
  dial_draw_static(ctx, state, bounds, origin, d, bg, main_color, accent_color, false, 1000);

  if (dial_cache_failed(&state->cache, sig)) return; // out of memory earlier: stay uncached

  // The drawing resources are not needed again until the next rebuild; free
  // them BEFORE allocating the cache so the cache has the room.
  marker_layer_release_resources(&state->markers);
  dial_cache_capture(ctx, &state->cache, bounds.size, origin, sig);
}

Layer *dial_layer_create(GRect frame) {
  Layer *layer = layer_create_with_data(frame, sizeof(DialState));
  if (!layer) return NULL;
  DialState *state = (DialState *)layer_get_data(layer);
  state->data = NULL;
  state->anim_active = false;
  state->anim_elapsed_ms = 0;
  marker_layer_init(&state->markers);
  dial_cache_init(&state->cache);
  layer_set_update_proc(layer, dial_update_proc);
  return layer;
}

void dial_layer_destroy(Layer *layer) {
  if (!layer) return;
  DialState *state = (DialState *)layer_get_data(layer);
  marker_layer_deinit(&state->markers);
  dial_cache_release(&state->cache);
  layer_destroy(layer);
}

void dial_layer_set_data(Layer *layer, WatchData *data) {
  DialState *state = (DialState *)layer_get_data(layer);
  state->data = data;
  layer_mark_dirty(layer);
}

void dial_layer_set_animation(Layer *layer, bool active, uint16_t elapsed_ms) {
  DialState *state = (DialState *)layer_get_data(layer);
  state->anim_active = active;
  state->anim_elapsed_ms = elapsed_ms;
  layer_mark_dirty(layer);
}
