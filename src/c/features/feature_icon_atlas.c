#include "./feature_icon_atlas.h"
#include "./feature_icon_assets.h"
#include "./primitives/startup_flip.h"
#include "../rendering/render_math.h"
#include <stdlib.h>

#define CELL_H PL_ICON_DRAW
#define SLIDE_MS 1400       // length of the slide (ease-out, so the last part is slow)
#define SLIDE_FRAME_MS 40   // paint interval while sliding
#define SLIDE_PASS 3        // the slide starts at most this many cells from the new icon: it passes up to 2 icons

// Loaded lazily, per icon style, for the duration of one paint of the complications layer.
static GBitmap *s_atlas[3];
static AppTimer *s_timer;
static bool s_sliding;      // an icon slid during the current paint, so another paint is needed
#define STAGGER_MS 200      // start-up: every further icon starts this much later than the one before
static uint8_t s_stagger;   // how many icons were scheduled in this start-up so far
static uint16_t s_now;      // millisecond clock (mod 65536) of the current paint

// 0 simple, 1 hollow, 2 full color. Full color art only exists on the colour watches (simple there).
static uint8_t norm_style(uint8_t style) {
  if (style == 0) return 0;
  if (style == 2) return PBL_IF_COLOR_ELSE(2, 0);
  return 1;
}

// The atlas of a style with only the rows `r` visible (the bounds of a bitmap are what graphics_draw_bitmap_in_rect
// draws, so scrolling the window is just moving the bounds). NULL when the atlas cannot be loaded (out of memory).
static GBitmap *atlas_view(uint8_t style, GRect r) {
  if (!s_atlas[style]) {
    uint32_t id = style == 0 ? RESOURCE_ID_ICON_ATLAS_SIMPLE
                : style == 1 ? RESOURCE_ID_ICON_ATLAS_HOLLOW
                : ICON_FULLCOLOR_ID(RESOURCE_ID_ICON_ATLAS_FULLCOLOR);
    s_atlas[style] = gbitmap_create_with_resource(id);
    if (!s_atlas[style]) return NULL;
  }
  gbitmap_set_bounds(s_atlas[style], r);
  return s_atlas[style];
}

static uint16_t clock_ms16(void) {
  time_t sec; uint16_t ms;
  time_ms(&sec, &ms);
  return (uint16_t)((uint32_t)sec * 1000u + ms);
}

void icon_atlas_set_blank(IconAnim *anim) {
  if (!anim) return;
  anim->cell = ICON_ANIM_BLANK;
  anim->from = 0;
}

// Cell the slide starts at: the old icon when it is close, else a few cells before/after the new one in the
// direction the old one lies, so the reel passes a couple of icons however far apart the two are.
static uint8_t slide_origin(int16_t old_cell, int16_t cell) {
  int16_t d = cell - old_cell;
  if (d > SLIDE_PASS) return (uint8_t)(cell - SLIDE_PASS);
  if (d < -SLIDE_PASS) return (uint8_t)(cell + SLIDE_PASS);
  return (uint8_t)old_cell;
}

typedef struct {
  int16_t y;      // first atlas row of the window
  int16_t shift;  // rows at the top of the icon area that stay empty (an icon sliding in from nothing)
} IconWindow;

// Detects a change of the icon at this position, starts the slide, and returns where the window is now.
static IconWindow track(IconAnim *a, uint8_t cell) {
  IconWindow win = { (int16_t)(cell * CELL_H), 0 };
  if (!a) return win;
  uint8_t cur = (uint8_t)(cell + 1), prev = a->cell;
  a->cell = cur;
  if (prev != cur) {
    // The very first paint just shows the icon, except while the start-up "animate complications" runs.
    if (prev == 0 && !startup_flip_active()) { a->from = 0; return win; }
    a->from = (prev == 0 || prev == ICON_ANIM_BLANK) ? ICON_ANIM_BLANK : (uint8_t)(slide_origin(prev - 1, cell) + 1);
    a->start = s_now;
    if (prev == 0) a->start = (uint16_t)(s_now + (uint16_t)(s_stagger++) * STAGGER_MS); // start-up: staggered
  }
  if (!a->from) return win;
  int16_t waited = (int16_t)(s_now - a->start); // negative while the staggered start has not come yet
  if (waited >= SLIDE_MS) { a->from = 0; return win; }
  s_sliding = true;
  int32_t left = waited <= 0 ? 1000 : 1000 - render_math_ease_out_1000((int32_t)waited * 1000 / SLIDE_MS); // 1000 .. 0
  if (a->from == ICON_ANIM_BLANK) {
    win.shift = (int16_t)(CELL_H * left / 1000);
  } else {
    win.y = (int16_t)(win.y + ((a->from - 1) * CELL_H - win.y) * left / 1000);
  }
  return win;
}

void icon_atlas_draw(GContext *ctx, GPoint pos, uint8_t cell, IconAnim *anim, uint8_t style, uint8_t outline_style,
                     GColor outline_color, GColor color, int16_t w, int16_t h) {
  if (cell >= ICON_CELL_COUNT) return;
  IconWindow win = track(anim, cell);
  int16_t rows = h - win.shift;
  if (rows <= 0) return;
  pos.y += win.shift;
  GRect view = GRect(0, win.y, w, rows);
  uint8_t st = norm_style(style);

  if (outline_style != 0) {
    // Full color art has no tintable ink: its outline uses the hollow art's silhouette.
    GBitmap *sil = atlas_view(st == 2 ? 1 : st, view);
    if (sil) {
      const GPoint *offs; int offs_n;
      feature_icon_assets_get_outline_offsets(outline_style, &offs, &offs_n);
      for (int i = 0; i < offs_n; i++) {
        feature_icon_assets_draw_bitmap_tinted_sized(ctx, sil, GPoint(pos.x + offs[i].x, pos.y + offs[i].y),
                                                     outline_color, w, rows, false);
      }
    }
  }
  GBitmap *bmp = atlas_view(st, view);
  if (!bmp) return;
  if (st == 2) {
    graphics_context_set_compositing_mode(ctx, GCompOpSet);
    graphics_draw_bitmap_in_rect(ctx, bmp, GRect(pos.x, pos.y, w, rows));
  } else {
    feature_icon_assets_draw_bitmap_tinted_sized(ctx, bmp, pos, color, w, rows, false);
  }
}

#ifdef PBL_COLOR
static GPoint s_origin; // screen position of the layer being painted

// Slide state of a position that shows a code-drawn icon: it slides in only at start-up ("animate complications"),
// when its position is seen for the first time. Returns the part of the way still to go, 1000 .. 0.
int16_t icon_atlas_blank_left(IconAnim *a) {
  if (a->cell != ICON_ANIM_BLANK) {
    bool startup = a->cell == 0 && startup_flip_active();
    a->cell = ICON_ANIM_BLANK;
    a->from = startup ? ICON_ANIM_BLANK : 0;
    a->start = startup ? (uint16_t)(s_now + (uint16_t)(s_stagger++) * STAGGER_MS) : s_now;
  }
  if (a->from != ICON_ANIM_BLANK) return 0;
  int16_t waited = (int16_t)(s_now - a->start);
  if (waited >= SLIDE_MS) { a->from = 0; return 0; }
  s_sliding = true;
  if (waited <= 0) return 1000;
  return (int16_t)(1000 - render_math_ease_out_1000((int32_t)waited * 1000 / SLIDE_MS));
}

// The framebuffer pixel at screen (x, y), NULL when outside the screen (round screens have shorter rows).
static uint8_t *fb_px(GBitmap *fb, int16_t x, int16_t y) {
  if (y < 0 || y >= gbitmap_get_bounds(fb).size.h) return NULL;
  GBitmapDataRowInfo ri = gbitmap_get_data_row_info(fb, y);
  return (x < ri.min_x || x > ri.max_x) ? NULL : &ri.data[x];
}

uint8_t *icon_slide_capture(GContext *ctx, GRect r) {
  uint8_t *bg = malloc((size_t)r.size.w * r.size.h);
  if (!bg) return NULL;
  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (!fb) { free(bg); return NULL; }
  for (int16_t y = 0; y < r.size.h; y++) {
    for (int16_t x = 0; x < r.size.w; x++) {
      uint8_t *p = fb_px(fb, s_origin.x + r.origin.x + x, s_origin.y + r.origin.y + y);
      bg[y * r.size.w + x] = p ? *p : 0;
    }
  }
  graphics_release_frame_buffer(ctx, fb);
  return bg;
}

void icon_slide_apply(GContext *ctx, GRect r, uint8_t *bg, int16_t left) {
  GBitmap *fb = graphics_capture_frame_buffer(ctx);
  if (fb) {
    int16_t shift = (int16_t)(r.size.h * left / 1000);
    int16_t ox = s_origin.x + r.origin.x, oy = s_origin.y + r.origin.y;
    // Bottom row first: every row takes its pixels from a row above it, which is still untouched. A pixel the icon
    // drew (it differs from the background behind it) moves down by `shift`; everything else is the background.
    for (int16_t y = r.size.h - 1; y >= 0; y--) {
      int16_t sy = y - shift;
      for (int16_t x = 0; x < r.size.w; x++) {
        uint8_t *d = fb_px(fb, ox + x, oy + y);
        if (!d) continue;
        uint8_t out = bg[y * r.size.w + x];
        if (sy >= 0) {
          uint8_t *s = fb_px(fb, ox + x, oy + sy);
          if (s && *s != bg[sy * r.size.w + x]) out = *s;
        }
        *d = out;
      }
    }
    graphics_release_frame_buffer(ctx, fb);
  }
  free(bg);
}
#endif

static void slide_frame(void *context) {
  s_timer = NULL;
  layer_mark_dirty((Layer *)context);
}

void icon_atlas_begin_paint(Layer *layer) {
  s_now = clock_ms16();
  s_sliding = false;
  if (!startup_flip_active()) s_stagger = 0;
#ifdef PBL_COLOR
  s_origin = layer_convert_point_to_screen(layer, GPointZero);
#else
  (void)layer;
#endif
}

void icon_atlas_end_paint(Layer *layer) {
  for (int i = 0; i < 3; i++) {
    if (s_atlas[i]) { gbitmap_destroy(s_atlas[i]); s_atlas[i] = NULL; }
  }
  if (s_sliding && !s_timer && layer) s_timer = app_timer_register(SLIDE_FRAME_MS, slide_frame, layer);
}

void icon_atlas_deinit(void) {
  if (s_timer) { app_timer_cancel(s_timer); s_timer = NULL; }
  s_sliding = false;
}
