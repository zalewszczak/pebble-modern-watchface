#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// Progress bar shown while the phone streams background images to the watch.
//
// The transfer may consist of several images (a "batch"); the bar tracks the
// whole batch, so it fills once instead of restarting for every image. It is
// drawn in its own small layer between the dial and the hands/features, using
// the active colour scheme, so it never forces the dial cache to rebuild.

#ifdef PBL_BW
static inline bool bg_progress_active(void) { return false; }
#else
void bg_progress_start(uint16_t batch_total_chunks, uint16_t batch_done_chunks);
// `current_chunks` = chunks received so far of the image being transferred.
void bg_progress_update(uint16_t current_chunks);
// Called when an image finished: the next one (if any) starts at `done_chunks`.
void bg_progress_set_done(uint16_t done_chunks);
void bg_progress_finish(void);
bool bg_progress_active(void);
// 0..1000, or -1 when no transfer is running.
int bg_progress_permille(void);

Layer *bg_progress_layer_create(GRect frame);
void bg_progress_layer_set_data(Layer *layer, WatchData *data);
void bg_progress_layer_destroy(Layer *layer);

#endif // PBL_BW
