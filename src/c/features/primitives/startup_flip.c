#include "./startup_flip.h"

#define FLIP_FRAME_MS 50
#define FLIP_ICON_ONLY_MS 450   // icons alone
#define FLIP_CHAR_STEP_MS 45    // each further character settles this much later
#define FLIP_JITTER_MS 220      // plus a little per-character randomness
#define FLIP_TOTAL_MS 1900

static AppTimer *s_timer;
static Layer *s_layer;
static bool s_active;
static bool s_played;
static uint32_t s_start_ms;
static uint16_t s_elapsed_ms;

static uint32_t now_ms(void) {
  time_t sec; uint16_t ms;
  time_ms(&sec, &ms);
  return (uint32_t)sec * 1000u + ms;
}

static uint32_t hash32(uint32_t x) {
  x ^= x >> 16; x *= 0x7feb352du; x ^= x >> 15; x *= 0x846ca68bu; x ^= x >> 16;
  return x;
}

static void frame(void *context) {
  (void)context;
  uint32_t e = now_ms() - s_start_ms;
  s_elapsed_ms = e > FLIP_TOTAL_MS ? FLIP_TOTAL_MS : (uint16_t)e;
  if (s_elapsed_ms >= FLIP_TOTAL_MS) {
    s_active = false;
    s_timer = NULL;
  } else {
    s_timer = app_timer_register(FLIP_FRAME_MS, frame, NULL);
  }
  if (s_layer) layer_mark_dirty(s_layer);
}

void startup_flip_start(const WatchData *data, Layer *features_layer) {
  if (s_played || !data || !(data->startup_clock_anim_mode & 2) || !features_layer) return;
  s_played = true;
  s_active = true;
  s_layer = features_layer;
  s_elapsed_ms = 0;
  s_start_ms = now_ms();
  s_timer = app_timer_register(FLIP_FRAME_MS, frame, NULL);
  layer_mark_dirty(s_layer);
}

void startup_flip_deinit(void) {
  if (s_timer) { app_timer_cancel(s_timer); s_timer = NULL; }
  s_active = false;
  s_layer = NULL;
}

bool startup_flip_active(void) { return s_active; }

const char *startup_flip_text(const char *src, char *buf, size_t buf_size, uint8_t salt) {
  if (!s_active || !src || !buf || buf_size < 2) return src;
  if (s_elapsed_ms < FLIP_ICON_ONLY_MS) return NULL;
  uint32_t frame_no = s_elapsed_ms / FLIP_FRAME_MS;
  size_t n = 0;
  for (; src[n] && n + 1 < buf_size; n++) {
    char c = src[n];
    uint32_t settle = FLIP_ICON_ONLY_MS + (uint32_t)n * FLIP_CHAR_STEP_MS
                    + hash32((uint32_t)n * 977u + salt) % FLIP_JITTER_MS;
    if (s_elapsed_ms >= settle) { buf[n] = c; continue; }
    uint32_t r = hash32(frame_no * 131u + (uint32_t)n * 7919u + salt);
    if (c >= '0' && c <= '9') buf[n] = (char)('0' + r % 10);
    else if (c >= 'A' && c <= 'Z') buf[n] = (char)('A' + r % 26);
    else if (c >= 'a' && c <= 'z') buf[n] = (char)('a' + r % 26);
    else buf[n] = c;
  }
  buf[n] = '\0';
  return buf;
}
