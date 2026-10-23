#pragma once

#include <stdbool.h>
#include <stdint.h>
#include "../data/watch_data.h"

typedef enum {
  COMMS_CHANGE_NONE     = 0,
  // The overall arrangement of layers must be rebuilt.
  COMMS_CHANGE_LAYOUT   = 1u << 0,
  // Feature values and layout are recomputed for every decoded message.
  COMMS_CHANGE_FEATURES = 1u << 1,
  // Only the background-image transfer progress changed: redraw the progress
  // bar, nothing else (and in particular do not persist settings).
  COMMS_CHANGE_BG_PROGRESS = 1u << 2,
} CommsChangeFlags;

typedef void (*CommsDataAppliedHandler)(CommsChangeFlags changes, void *context);

void comms_init(WatchData *data, CommsDataAppliedHandler handler, void *context);
void comms_deinit(void);

// Sends the small watch-to-phone battery-saver state update.
// Returns false if the AppMessage outbox is currently unavailable.
bool comms_send_battery_saver_phase(uint8_t phase);

// Scheduled "My styles". If data->next_style_check has passed, sends
// REQUEST_SCHEDULED_STYLE so the phone (re)starts PKJS and serves the style.
// Cheap enough to call from every tick: it returns immediately when nothing
// is due, when the phone is not connected, or when a request went out less
// than a minute ago. The phone's reply carries a new next_style_check, which
// is what stops the retries.
void comms_maybe_request_scheduled_style(const WatchData *data);
