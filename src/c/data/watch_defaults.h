#pragma once

#include "./watch_data.h"

// Fills `data` with the watch's built-in defaults: the Modern bitmap dial
// with the default hands and colors, mirroring the phone's own defaults.
// Used whenever persistent storage holds no (compatible) settings, so the
// face looks right before the phone has ever sent anything.
void watch_defaults_apply(WatchData *data);
