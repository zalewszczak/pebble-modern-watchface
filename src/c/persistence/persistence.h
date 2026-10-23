#pragma once

#include "../data/watch_data.h"

// Loads the complete persisted WatchData snapshot. If any chunk is
// missing or has the wrong size, the destination is left zeroed and false is returned (the caller
// then applies the built-in defaults).
bool persistence_load(WatchData *data);

// Saves WatchData in Pebble-sized chunks.
bool persistence_save(const WatchData *data);
