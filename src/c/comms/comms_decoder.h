#pragma once

#include <pebble.h>
#include "./comms.h"
#include "../data/watch_data.h"

// Decodes one AppMessage dictionary into WatchData and reports changed domains.
CommsChangeFlags comms_decoder_apply(DictionaryIterator *iter, WatchData *data);
