#pragma once

// "Animate complications" startup mode: the complications first show only their icons, then each text flips
// through random characters left to right and settles on its real value.

#include <pebble.h>
#include "../../data/watch_data.h"

void startup_flip_start(const WatchData *data, Layer *features_layer);
void startup_flip_deinit(void);
bool startup_flip_active(void);

// Text to draw for a complication text of `src` while the animation runs: `buf` (scrambled/partial) or NULL when
// the text must not be drawn yet. Returns `src` itself when the animation is not running. `salt` tells apart texts
// at different places so they do not flip in lockstep.
const char *startup_flip_text(const char *src, char *buf, size_t buf_size, uint8_t salt);
