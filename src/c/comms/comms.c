#include <pebble.h>
#include "./comms.h"
#include "./comms_decoder.h"
#include "../generated/message_key_index.h"
#include "../rendering/dial/bg_image_store.h"

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
  // Tell the phone which uploaded background image (if any) is stored here, so
  // it can send it again when it is missing or out of date.
  dict_write_uint32(iter, MESSAGE_KEY_MESSAGE_TYPE + MK_BG_IMG_STAMP, bg_image_store_stamp());
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
// Returns true if the message was one of them.
static bool handle_bg_image_message(DictionaryIterator *iter) {
  const uint32_t base = MESSAGE_KEY_MESSAGE_TYPE;
  Tuple *begin = dict_find(iter, base + MK_BG_IMG_BEGIN);
  Tuple *data = dict_find(iter, base + MK_BG_IMG_DATA);
  Tuple *end = dict_find(iter, base + MK_BG_IMG_END);
  if (!begin && !data && !end) return false;

  if (begin && begin->length >= 10) {
    const uint8_t *b = begin->value->data;
    uint32_t stamp = (uint32_t)b[0] | ((uint32_t)b[1] << 8) | ((uint32_t)b[2] << 16) | ((uint32_t)b[3] << 24);
    uint16_t chunks = (uint16_t)(b[4] | (b[5] << 8));
    uint16_t w = (uint16_t)(b[6] | (b[7] << 8));
    uint16_t h = (uint16_t)(b[8] | (b[9] << 8));
    bg_image_store_begin(stamp, chunks, w, h);
  }
  if (data) {
    Tuple *index = dict_find(iter, base + MK_BG_IMG_INDEX);
    if (index) bg_image_store_write(index->value->uint16, data->value->data, data->length);
  }
  if (end && end->length >= 4) {
    const uint8_t *b = end->value->data;
    uint32_t stamp = (uint32_t)b[0] | ((uint32_t)b[1] << 8) | ((uint32_t)b[2] << 16) | ((uint32_t)b[3] << 24);
    if (bg_image_store_commit(stamp) && s_data_applied) {
      // Redraw so the dial rebuilds its background cache from the new image.
      s_data_applied(COMMS_CHANGE_NONE, s_data_context);
    }
  }
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
