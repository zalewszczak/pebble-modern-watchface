#include "./feature_icon_atlas.h"
#include "./feature_icon_assets.h"
#include "./primitives/startup_flip.h"
#include "../rendering/render_math.h"

#define CELL_H PL_ICON_DRAW
#define SLIDE_MS 1400       // length of the slide (ease-out, so the last part is slow)
#define SLIDE_FRAME_MS 40   // paint interval while sliding
#define SLIDE_PASS 3        // the slide starts at most this many cells from the new icon: it passes up to 2 icons

// Loaded lazily, per icon style, for the duration of one paint of the complications layer.
static GBitmap *s_atlas[3];
static AppTimer *s_timer;
static bool s_sliding;      // an icon slid during the current paint, so another paint is needed
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
  }
  if (!a->from) return win;
  uint16_t elapsed = (uint16_t)(s_now - a->start);
  if (elapsed >= SLIDE_MS) { a->from = 0; return win; }
  s_sliding = true;
  int32_t left = 1000 - render_math_ease_out_1000((int32_t)elapsed * 1000 / SLIDE_MS); // 1000 .. 0
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

static void slide_frame(void *context) {
  s_timer = NULL;
  layer_mark_dirty((Layer *)context);
}

void icon_atlas_begin_paint(void) {
  s_now = clock_ms16();
  s_sliding = false;
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
