// AppMessage send queue
var messageSchema = require('./message-schema');
var MSG_TYPE = messageSchema.MSG_TYPE;
var MSG_TYPE_SEND_ORDER = messageSchema.MSG_TYPE_SEND_ORDER;
var KEY_TYPE_MAP = messageSchema.KEY_TYPE_MAP;

var s_sendQueue = [];
var s_sendInFlight = false;

var PHONE_STARTUP_SEND_DELAY_MS = 5000;
var s_phoneStartupSendDelayElapsed = false;
setTimeout(function () {
  s_phoneStartupSendDelayElapsed = true;
  pumpSendQueue();
}, PHONE_STARTUP_SEND_DELAY_MS);

var RAW_MESSAGE_LOG_MAX = 10;
function recordRawMessage(batchIndex, batchTotal, dict) {
  try {
    var entries = [];
    var raw = localStorage.getItem('RAW_MESSAGE_LOG');
    if (raw) entries = JSON.parse(raw);
    if (!Array.isArray(entries)) entries = [];
    entries.push({ t: Date.now(), batchIndex: batchIndex, batchTotal: batchTotal, dict: dict });
    if (entries.length > RAW_MESSAGE_LOG_MAX) entries = entries.slice(entries.length - RAW_MESSAGE_LOG_MAX);
    localStorage.setItem('RAW_MESSAGE_LOG', JSON.stringify(entries));
  } catch (e) {
  }
}

function enqueueFlatDict(flatDict) {
  var buckets = {};
  Object.keys(flatDict).forEach(function (k) {
    var type = KEY_TYPE_MAP[k];
    if (type === undefined) {
      console.log('modern: no MSG_TYPE mapping for key ' + k + ', defaulting to SETTINGS -- update KEY_TYPE_MAP');
      type = MSG_TYPE.SETTINGS;
    }
    if (!buckets[type]) buckets[type] = {};
    buckets[type][k] = flatDict[k];
  });
  var batch = [];
  MSG_TYPE_SEND_ORDER.forEach(function (type) {
    if (buckets[type]) {
      buckets[type]['MESSAGE_TYPE'] = type;
      batch.push(buckets[type]);
    }
  });
  batch.forEach(function (dict, i) {
    s_sendQueue.push({ dict: dict, batchIndex: i + 1, batchTotal: batch.length });
  });
  pumpSendQueue();
}

function enqueueRaw(dict, opts) {
  opts = opts || {};
  s_sendQueue.push({
    dict: dict, raw: true, retries: opts.retries || 0,
    skipIf: opts.skipIf || null, onAck: opts.onAck || null, onFail: opts.onFail || null
  });
  pumpSendQueue();
}

function pumpSendQueue() {
  if (s_sendInFlight || s_sendQueue.length === 0) return;
  if (!s_phoneStartupSendDelayElapsed) return;
  var entry = s_sendQueue.shift();
  while (entry && entry.raw && entry.skipIf && entry.skipIf()) {
    entry = s_sendQueue.shift();
  }
  if (!entry) return;
  s_sendInFlight = true;
  var chunk = entry.dict;
  var msgType = chunk['MESSAGE_TYPE'];
  Pebble.sendAppMessage(chunk, function () {
    if (!entry.raw) {
      console.log('modern: chunk sent (type ' + msgType + '), ' + s_sendQueue.length + ' queued');
      recordRawMessage(entry.batchIndex, entry.batchTotal, chunk);
    } else if (entry.onAck) {
      try { entry.onAck(); } catch (err) { console.log('modern: onAck failed: ' + err.message); }
    }
    s_sendInFlight = false;
    pumpSendQueue();
  }, function (e) {
    if (entry.raw) {
      if (entry.retries > 0) {
        entry.retries--;
        s_sendQueue.unshift(entry);
      } else {
        console.log('modern: raw message failed, giving up: ' + JSON.stringify(e));
        if (entry.onFail) {
          try { entry.onFail(); } catch (err) { console.log('modern: onFail failed: ' + err.message); }
        }
      }
      s_sendInFlight = false;
      pumpSendQueue();
      return;
    }
    console.log('modern: chunk send failed (type ' + msgType + '), dropping: ' + JSON.stringify(e));
    s_sendInFlight = false;
    pumpSendQueue();
  });
}

module.exports = {
  enqueueFlatDict: enqueueFlatDict,
  enqueueRaw: enqueueRaw
};
