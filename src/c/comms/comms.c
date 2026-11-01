#include <pebble.h>
#include "./comms.h"
#include "./comms_decoder.h"
#include "../generated/message_key_index.h"
#include "../rendering/dial/bg_image_store.h"
#include "../rendering/dial/bg_progress.h"

#define STARTUP_REQUEST_DELAY_MS 3000

static WatchData *s_data;
static CommsDataAppliedHandler s_data_applied;
static void *s_data_context;
static AppTimer *s_retry_timer = NULL;
static AppTimer *s_startup_timer = NULL;
static uint16_t s_retry_delay_s = 8;

// MK_* indexes are added to MESSAGE_KEY_MESSAGE_TYPE to recover wire keys.

bool comms_send_battery_saver_phase(uint8_t phase) {
  DictionaryIterator *iter;
  if (app_message_outbox_begin(&iter) != APP_MSG_OK) return false;
  dict_write_uint8(iter, MESSAGE_KEY_MESSAGE_TYPE + MK_BATTERY_SAVER_PHASE, phase);
  return app_message_outbox_send() == APP_MSG_OK;
}

// Minimum gap between REQUEST_SCHEDULED_STYLE sends. The tick handler can run
// every second, and an unanswered request (phone busy, PKJS not started yet)
// should be retried, but not hammered.
#define STYLE_REQUEST_RETRY_S 60

void comms_maybe_request_scheduled_style(const WatchData *data) {
  static time_t s_last_request = 0;
  if (!data || data->next_style_check == 0) return;
  time_t now = time(NULL);
  if (now < data->next_style_check) return;
  if (s_last_request != 0 && now >= s_last_request &&
      (now - s_last_request) < STYLE_REQUEST_RETRY_S) return;
  if (!connection_service_peek_pebble_app_connection()) return;

  DictionaryIterator *iter;
  if (app_message_outbox_begin(&iter) != APP_MSG_OK) return;
  dict_write_uint8(iter, MESSAGE_KEY_MESSAGE_TYPE + MK_REQUEST_SCHEDULED_STYLE, 1);
  if (app_message_outbox_send() == APP_MSG_OK) s_last_request = now;
}

static void request_update(void) {
  DictionaryIterator *iter;
  if (app_message_outbox_begin(&iter) != APP_MSG_OK) return;
  dict_write_uint8(iter, MESSAGE_KEY_MESSAGE_TYPE + MK_REQUEST_UPDATE, 1);
  // Tell the phone which uploaded background images (if any) are stored here:
  // ten little-endian uint32 stamps, user slot 1 first, 0 = empty slot; the tenth
  // is the plugin picture, which is only in RAM and so reads 0 after every
  // restart. The phone sends whatever is missing or out of date.
  uint8_t stamps[BG_IMG_REPORTED_SLOTS * 4];
  for (uint8_t slot = 1; slot <= BG_IMG_REPORTED_SLOTS; slot++) {
    uint32_t v = bg_image_store_stamp(slot);
    uint8_t *p = &stamps[(slot - 1) * 4];
    p[0] = (uint8_t)v; p[1] = (uint8_t)(v >> 8); p[2] = (uint8_t)(v >> 16); p[3] = (uint8_t)(v >> 24);
  }
  dict_write_data(iter, MESSAGE_KEY_MESSAGE_TYPE + MK_BG_IMG_STAMP, stamps, sizeof(stamps));
  app_message_outbox_send();
}

static void request_retry_callback(void *context) {
  (void)context;
  s_retry_timer = NULL;
  if (!s_data || s_data->valid) return;
  request_update();
  s_retry_delay_s = (s_retry_delay_s < 60) ? s_retry_delay_s * 2 : 60;
  s_retry_timer = app_timer_register((uint32_t)s_retry_delay_s * 1000, request_retry_callback, NULL);
}

static void startup_request_delay_callback(void *context) {
  (void)context;
  s_startup_timer = NULL;
  request_update();
  s_retry_timer = app_timer_register((uint32_t)s_retry_delay_s * 1000, request_retry_callback, NULL);
}

// Background-image transfer messages carry only BG_IMG_* keys. They go
// straight to persistent storage and skip the settings/feature pipeline (and
// the WatchData save) entirely, so streaming an image costs almost nothing.
//
// BEGIN payload (15 bytes, little endian):
//   stamp u32 | chunks u16 | w u16 | h u16 | slot u8 | batch_total u16 | batch_done u16
// chunks == 0 && stamp == 0 means "empty this slot" (no DATA/END follow).
// batch_total / batch_done are chunk counts of the whole sync (several images
// may follow one another) and only drive the progress bar.
// Slot BG_IMG_PLUGIN_SLOT (the plugin picture, RAM only) is transferred the same
// way but silently: it never starts, advances or finishes the progress bar.
// END payload: stamp u32.
//
// If the phone goes away mid-transfer the bar must not stay forever: any
// BG_IMG message re-arms this timer, and when it fires the transfer is dropped.
#define BG_TRANSFER_TIMEOUT_MS 20000
static AppTimer *s_bg_timeout_timer = NULL;

static void notify_progress(void) {
  if (s_data_applied) s_data_applied(COMMS_CHANGE_BG_PROGRESS, s_data_context);
}

static void bg_transfer_timeout(void *context) {
  (void)context;
  s_bg_timeout_timer = NULL;
  bg_image_store_abort();
  bg_progress_finish();
  notify_progress();
}

static void bg_transfer_arm_timeout(void) {
  if (s_bg_timeout_timer) app_timer_cancel(s_bg_timeout_timer);
  s_bg_timeout_timer = app_timer_register(BG_TRANSFER_TIMEOUT_MS, bg_transfer_timeout, NULL);
}

static void bg_transfer_disarm_timeout(void) {
  if (s_bg_timeout_timer) {
    app_timer_cancel(s_bg_timeout_timer);
    s_bg_timeout_timer = NULL;
  }
}

static uint32_t read_le32(const uint8_t *b) {
  return (uint32_t)b[0] | ((uint32_t)b[1] << 8) | ((uint32_t)b[2] << 16) | ((uint32_t)b[3] << 24);
}
static uint16_t read_le16(const uint8_t *b) { return (uint16_t)(b[0] | (b[1] << 8)); }

// Returns true if the message was one of them.
static bool handle_bg_image_message(DictionaryIterator *iter) {
  const uint32_t base = MESSAGE_KEY_MESSAGE_TYPE;
  Tuple *begin = dict_find(iter, base + MK_BG_IMG_BEGIN);
  Tuple *data = dict_find(iter, base + MK_BG_IMG_DATA);
  Tuple *end = dict_find(iter, base + MK_BG_IMG_END);
  if (!begin && !data && !end) return false;

  bool redraw_dial = false;

  if (begin && begin->length >= 15) {
    const uint8_t *b = begin->value->data;
    uint32_t stamp = read_le32(b);
    uint16_t chunks = read_le16(b + 4), w = read_le16(b + 6), h = read_le16(b + 8);
    uint8_t slot = b[10];
    uint16_t batch_total = read_le16(b + 11), batch_done = read_le16(b + 13);
    const bool silent = (slot == BG_IMG_PLUGIN_SLOT);
    if (stamp == 0 && chunks == 0) {
      bg_image_store_clear(slot);
      redraw_dial = true; // the selected slot may just have been emptied
      if (!bg_progress_active()) bg_transfer_disarm_timeout();
    } else {
      if (!silent) {
        if (!bg_progress_active()) bg_progress_start(batch_total, batch_done);
        else bg_progress_set_done(batch_done);
      }
      bg_image_store_begin(slot, stamp, chunks, w, h);
      bg_transfer_arm_timeout();
    }
  }
  if (data) {
    Tuple *index = dict_find(iter, base + MK_BG_IMG_INDEX);
    if (index) {
      const bool silent = (bg_image_store_pending_slot() == BG_IMG_PLUGIN_SLOT);
      bg_image_store_write(index->value->uint16, data->value->data, data->length);
      if (!silent) bg_progress_update(bg_image_store_pending_progress());
      bg_transfer_arm_timeout();
    }
  }
  if (end && end->length >= 4) {
    uint16_t chunks = bg_image_store_pending_chunks();
    const bool silent = (bg_image_store_pending_slot() == BG_IMG_PLUGIN_SLOT);
    if (bg_image_store_commit(read_le32(end->value->data))) {
      if (!silent) bg_progress_update(chunks);
      redraw_dial = true; // the dial rebuilds its background cache if this slot is in use
    }
    // The next image of the batch (if any) sends its own BEGIN with the new
    // batch_done; if this was the last one, the bar is finished.
    if (bg_progress_permille() >= 1000) {
      bg_progress_finish();
      bg_transfer_disarm_timeout();
    } else if (silent && !bg_progress_active()) {
      bg_transfer_disarm_timeout(); // nothing else is in flight
    }
  }

  if (redraw_dial && s_data_applied) s_data_applied(COMMS_CHANGE_NONE, s_data_context);
  notify_progress();
  return true;
}

static void inbox_received_handler(DictionaryIterator *iter, void *context) {
  (void)context;
  if (handle_bg_image_message(iter)) return;
  WatchData *d = s_data;
  CommsChangeFlags changes = comms_decoder_apply(iter, d);

  // Stop retrying once valid data has arrived.
  if (d->valid && s_retry_timer) {
    app_timer_cancel(s_retry_timer);
    s_retry_timer = NULL;
  }

  if (s_data_applied) s_data_applied(changes, s_data_context);
}

void comms_init(WatchData *data, CommsDataAppliedHandler handler, void *context) {
  s_data = data;
  s_data_applied = handler;
  s_data_context = context;
  s_retry_delay_s = 8;
  app_message_register_inbox_received(inbox_received_handler);
  // No inbox_dropped handler; dropped messages require no recovery here.
  app_message_open(APPMSG_INBOX_SIZE, APPMSG_OUTBOX_SIZE);
  s_startup_timer = app_timer_register(STARTUP_REQUEST_DELAY_MS, startup_request_delay_callback, NULL);
}

void comms_deinit(void) {
  bg_transfer_disarm_timeout();
  if (s_startup_timer) {
    app_timer_cancel(s_startup_timer);
    s_startup_timer = NULL;
  }
  if (s_retry_timer) {
    app_timer_cancel(s_retry_timer);
    s_retry_timer = NULL;
  }
  s_data = NULL;
  s_data_applied = NULL;
  s_data_context = NULL;
}
