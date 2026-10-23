#pragma once

#include <pebble.h>
#include "../../data/watch_data.h"

// A short centered status line near the top of the face (battery-saver
// "Zzz" and similar notices).
void status_label_init(WatchData *data);
void status_label_deinit(void);

void status_label_create(Layer *parent, GRect frame);
void status_label_destroy(void);

// Moves the label to the top of `parent`'s children, above the dial,
// features and hands.
void status_label_bring_to_front(Layer *parent);

void status_label_set(const char *text, GColor color, bool hidden);
void status_label_mark_dirty(void);
