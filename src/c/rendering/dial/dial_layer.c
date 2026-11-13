#include "./dial_layer.h"
#include "./dial_animation.h"
#include "./marker_layer.h"
#include "./bg_image_cache.h"
#include "./weather_border.h"
#include "./dial_cache.h"
#include "../../data/watch_ui.h"
#include "../../input/input.h"
#include "../status/status_label.h"
#include "../../power/battery_saver.h"

typedef struct {
  WatchData *data;
  bool anim_active;
  uint16_t anim_elapsed_ms;
  MarkerLayerState markers;
  DialCache cache;
  bool bg_ok;             // the last static draw managed to draw the background image
  uint8_t bg_fail_streak; // consecutive rebuilds where it did not
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
                                      GColor bg, GColor main_color, GColor accent_color,
                                      const WeatherBorderLook *border, bool border_on) {
  uint32_t h = 2166136261u;
  h = sig_mix(h, ((uint32_t)size.w << 16) | (uint16_t)size.h);
  h = sig_mix(h, ((uint32_t)bg.argb << 16) | ((uint32_t)main_color.argb << 8) | accent_color.argb);
  // Marker style and everything the rings / numerals / bitmap tint read.
  h = sig_mix(h, ((uint32_t)d->big_analog_marker_style << 8) | (d->bitmap_marker_transparent ? 1u : 0u) | (d->bitmap_marker_invert ? 4u : 0u) |
                 (d->draw_debug ? 2u : 0u));
  h = sig_bytes(h, &d->custom_hour_marker, sizeof(d->custom_hour_marker));
  h = sig_bytes(h, &d->custom_second_marker, sizeof(d->custom_second_marker));
  h = sig_mix(h, ((uint32_t)d->custom_hour_marker_inner_thickness << 8) | d->custom_second_marker_inner_thickness);
  h = sig_mix(h, ((uint32_t)d->marker_text.target << 24) | ((uint32_t)d->marker_text.font_choice << 16) |
                 ((uint32_t)(uint8_t)d->marker_text.offset_px << 8) | (d->marker_text.roman_numerals ? 1u : 0u));
  h = sig_mix(h, ((uint32_t)d->marker_text.hour_mask << 16) | d->marker_text.second_mask);
  // Custom background image (selection, or the uploaded image's stamp).
  h = sig_mix(h, bg_image_signature(d));
  h = sig_mix(h, d->bg_translucent ? 1u : 0u);
  // Weather border (colours already fold in the current hour and the forecast). The "no data yet" /
  // "fetching" placeholders are not part of the cache: they are drawn over it (see dial_update_proc).
  h = sig_mix(h, (border_on && border->state == WEATHER_BORDER_DATA) ? weather_border_signature(border) : 0);
  return h ? h : 1u;
}

static void dial_draw_static(GContext *ctx, DialState *state, GRect bounds, GPoint origin,
                             const WatchData *d, GColor bg, GColor main_color, GColor accent_color,
                             const WeatherBorderLook *border, bool border_on,
                             bool animating, int32_t progress_1000) {
  (void)progress_1000;
  graphics_context_set_fill_color(ctx, bg);
  graphics_fill_rect(ctx, bounds, 0, GCornerNone);

  state->bg_ok = bg_image_draw(ctx, d, bounds, origin, bg);
  // Below the indices, above the background image.
  if (border_on && border->state == WEATHER_BORDER_DATA) weather_border_draw(ctx, border, bounds, origin);

  GPoint center = GPoint(bounds.size.w / 2, bounds.size.h / 2);
  state->markers.draw_origin = origin;
  marker_layer_draw(ctx, &state->markers, center, bounds, d, main_color, accent_color, bg,
                    animating ? MARKER_DRAW_BASE : MARKER_DRAW_ALL, false, 0, d->draw_debug);

}

// Launch animation frame. Only the hour ring moves, so everything else (background, image, border,
// second ring) is drawn once into the cache and blitted; each frame then draws just the hour ring and
// numerals on top. The cache carries a different signature than the normal one, so the full static
// picture is rebuilt once when the animation ends.
static void dial_draw_animation_frame(Layer *layer, GContext *ctx, DialState *state, GRect bounds, GPoint origin,
                                      const WatchData *d, GColor bg, GColor main_color, GColor accent_color,
                                      const WeatherBorderLook *border, bool border_on) {
  int32_t progress_1000 = ((int32_t)state->anim_elapsed_ms * 1000) / DIAL_ANIMATION_DURATION_MS;
  if (progress_1000 > 1000) progress_1000 = 1000;

  uint32_t sig = dial_static_signature(d, bounds.size, bg, main_color, accent_color, border, border_on) ^ 0x5bd1e995u;
  if (!sig) sig = 1u;

  if (!(dial_cache_valid(&state->cache, sig, bounds.size) && dial_cache_blit(ctx, &state->cache, origin))) {
    dial_cache_release(&state->cache);
    dial_draw_static(ctx, state, bounds, origin, d, bg, main_color, accent_color, border, border_on, true, 0);
    // Snapshot the base only if the background came out right and the cache is not known to fail.
    if (state->bg_ok && !dial_cache_failed(&state->cache, sig)) {
      marker_layer_release_resources(&state->markers);
      dial_cache_capture(ctx, &state->cache, bounds.size, origin, sig);
    }
  }
  (void)layer;
  GPoint center = GPoint(bounds.size.w / 2, bounds.size.h / 2);
  marker_layer_draw(ctx, &state->markers, center, bounds, d, main_color, accent_color, bg,
                    MARKER_DRAW_HOUR, true, progress_1000, d->draw_debug);
}

static void dial_draw_cached(Layer *layer, GContext *ctx, DialState *state, GRect bounds, GPoint origin,
                             const WatchData *d, GColor bg, GColor main_color, GColor accent_color,
                             const WeatherBorderLook *border_in, bool border_on) {
  const WeatherBorderLook border = *border_in;
  // The launch animation moves the indices every frame, so it cannot use the normal cache.
  bool animating = state->anim_active && d->bg_anim_mode == 1;
  if (animating) {
    dial_draw_animation_frame(layer, ctx, state, bounds, origin, d, bg, main_color, accent_color, &border, border_on);
    return;
  }

  uint32_t sig = dial_static_signature(d, bounds.size, bg, main_color, accent_color, &border, border_on);

  // Fast path: nothing static changed -> one blit.
  if (dial_cache_valid(&state->cache, sig, bounds.size) &&
      dial_cache_blit(ctx, &state->cache, origin)) {
    return;
  }

  // Rebuild: draw everything once, then snapshot it. The old cache is freed
  // first so two full-layer bitmaps never coexist.
  dial_cache_release(&state->cache);
  dial_draw_static(ctx, state, bounds, origin, d, bg, main_color, accent_color, &border, border_on, false, 1000);

  if (dial_cache_failed(&state->cache, sig)) return; // out of memory earlier: stay uncached

  // The background image could not be drawn (a transient out-of-memory or
  // storage hiccup): do not freeze that into the cache, and do not flash an
  // error either -- just draw again next frame. Only a failure that keeps
  // repeating is reported.
  if (!state->bg_ok) {
    marker_layer_release_resources(&state->markers);
    if (state->bg_fail_streak < 255) state->bg_fail_streak++;
    if (state->bg_fail_streak < 4) {
      layer_mark_dirty(layer);
    } else if (state->bg_fail_streak == 4) {
      status_label_set("BG: image failed", STATUS_WARNING_COLOR, false);
    }
    return;
  }
  state->bg_fail_streak = 0;

  // The drawing resources are not needed again until the next rebuild; free
  // them BEFORE allocating the cache so the cache has the room.
  marker_layer_release_resources(&state->markers);
  dial_cache_capture(ctx, &state->cache, bounds.size, origin, sig);
}

// "No data yet" ring: a third of it chases around once a second while the phone is expected to deliver,
// then it turns into a static red checker. It is drawn over the cached picture, so animating it never
// rebuilds the cache (which would reload the background image every second).
static AppTimer *s_border_timer;
static Layer *s_border_layer;

static void border_chase_tick(void *context) {
  (void)context;
  s_border_timer = NULL;
  if (s_border_layer) layer_mark_dirty(s_border_layer);
}

static void dial_update_proc(Layer *layer, GContext *ctx) {
  DialState *state = (DialState *)layer_get_data(layer);
  WatchData *d = state->data;
  if (!d) return;

  GRect bounds = layer_get_bounds(layer);
  GPoint origin = layer_get_frame(layer).origin; // the dial sits directly under the root layer

  time_t now = time(NULL);
  GColor bg, main_color, accent_color;
  watch_ui_get_active_color_scheme(d, now, &bg, &main_color, &accent_color);

  WeatherBorderLook border;
  bool border_on = weather_border_compute(d, now, &border);
  border.ink = main_color.argb; // used by the B&W pattern border only
  // "Only on shake": visible just while the show-on-shake window is open.
  if (border_on && d->border_weather_shake && !input_shake_features_active()) border_on = false;

  dial_draw_cached(layer, ctx, state, bounds, origin, d, bg, main_color, accent_color, &border, border_on);

  if (border_on && border.state != WEATHER_BORDER_DATA) {
    weather_border_draw(ctx, &border, bounds, origin);
    if (border.state == WEATHER_BORDER_PENDING && !s_border_timer &&
        battery_saver_phase() == BATTERY_SAVER_AWAKE) {
      s_border_layer = layer;
      s_border_timer = app_timer_register(1000, border_chase_tick, NULL);
    }
  }
}

Layer *dial_layer_create(GRect frame) {
  Layer *layer = layer_create_with_data(frame, sizeof(DialState));
  if (!layer) return NULL;
  DialState *state = (DialState *)layer_get_data(layer);
  state->data = NULL;
  state->anim_active = false;
  state->anim_elapsed_ms = 0;
  state->bg_ok = true;
  state->bg_fail_streak = 0;
  marker_layer_init(&state->markers);
  dial_cache_init(&state->cache);
  layer_set_update_proc(layer, dial_update_proc);
  return layer;
}

void dial_layer_destroy(Layer *layer) {
  if (!layer) return;
  DialState *state = (DialState *)layer_get_data(layer);
  if (s_border_timer) { app_timer_cancel(s_border_timer); s_border_timer = NULL; }
  s_border_layer = NULL;
  marker_layer_deinit(&state->markers);
  dial_cache_release(&state->cache);
  layer_destroy(layer);
}

void dial_layer_set_data(Layer *layer, WatchData *data) {
  DialState *state = (DialState *)layer_get_data(layer);
  state->data = data;
  layer_mark_dirty(layer);
}

void dial_layer_release_cache(Layer *layer) {
  if (!layer) return;
  DialState *state = (DialState *)layer_get_data(layer);
  marker_layer_release_resources(&state->markers);
  dial_cache_release(&state->cache);
  state->cache.failed = false;
}

void dial_layer_set_animation(Layer *layer, bool active, uint16_t elapsed_ms) {
  DialState *state = (DialState *)layer_get_data(layer);
  state->anim_active = active;
  state->anim_elapsed_ms = elapsed_ms;
  layer_mark_dirty(layer);
}
