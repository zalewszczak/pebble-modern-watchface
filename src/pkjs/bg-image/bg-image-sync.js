// Custom background images: which image is selected, where the user's uploaded
var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var codec = require('./bg-image-codec');
var pluginBg = require('./plugin-bg');
var messageQueue = require('../comms/message-queue');

var SLOT_COUNT = 9;
var PLUGIN_SLOT = SLOT_COUNT + 1;
var WATCH_SLOTS = PLUGIN_SLOT;
var PERSIST_CHUNK_BYTES = 255;
var MESSAGE_PAYLOAD_BYTES = PERSIST_CHUNK_BYTES * 4;
var WATCH_STAMPS_KEY = 'BG_WATCH_STAMPS';

var presetNumbers = [];
try { presetNumbers = require('../data/generated/background-images').numbers || []; } catch (e) { presetNumbers = []; }

var s_sending = false;
var s_resync = false;
var s_batchSlots = {};

function slotKey(k) { return 'CONFIG_BG_SLOT_' + k; }

function getSlots() {
  var out = {};
  for (var k = 1; k <= SLOT_COUNT; k++) {
    var v = localStorage.getItem(slotKey(k));
    if (codec.isValidSlot(v)) out[String(k)] = v;
  }
  return out;
}

function applySlotUpdates(updates) {
  if (!updates || typeof updates !== 'object') return;
  Object.keys(updates).forEach(function (key) {
    var k = parseInt(key, 10);
    if (!(k >= 1 && k <= SLOT_COUNT)) return;
    var v = updates[key];
    if (v === '' || v === null) {
      localStorage.removeItem(slotKey(k));
    } else if (codec.isValidSlot(v)) {
      localStorage.setItem(slotKey(k), v);
    } else {
      console.log('modern: ignoring invalid background slot ' + k);
    }
  });
}

function selection() {
  var none = { mode: 0, preset: 0, data: null, stamp: 0 };
  if (getSetting('CONFIG_USE_WEATHER_BG', 'false') === 'true' && getSetting('CONFIG_USE_CUSTOM_BG', 'false') !== 'true') {
    var styles = require('../data/generated/weather-backgrounds').styles || [];
    var wantId = getSetting('CONFIG_WEATHER_BG_STYLE', '');
    for (var si = 0; si < styles.length; si++) {
      if (styles[si].id === wantId) return { mode: 3, preset: styles[si].index, data: null, stamp: 0 };
    }
    if (styles.length) return { mode: 3, preset: styles[0].index, data: null, stamp: 0 };
  }
  if (getSetting('CONFIG_USE_PLUGIN_BG', 'false') === 'true' && getSetting('CONFIG_USE_CUSTOM_BG', 'false') !== 'true' &&
      getSetting('CONFIG_USE_WEATHER_BG', 'false') !== 'true') {
    return { mode: 4, preset: 0, data: null, stamp: 0, slot: PLUGIN_SLOT };
  }
  if (getSetting('CONFIG_USE_CUSTOM_BG', 'false') !== 'true') return none;
  var m = /^([pu]):([0-9]{1,3})$/.exec(getSetting('CONFIG_BG_SOURCE', 'p:1'));
  if (!m) return none;
  var n = parseInt(m[2], 10);
  if (m[1] === 'p') {
    if (presetNumbers.indexOf(n) === -1) return none;
    return { mode: 1, preset: n, data: null, stamp: 0 };
  }
  if (!(n >= 1 && n <= SLOT_COUNT)) return none;
  var data = localStorage.getItem(slotKey(n));
  if (!codec.isValidSlot(data)) return none;
  return { mode: 2, preset: n, slot: n, data: data, stamp: codec.stampFor(data) };
}

function modeCode() { return selection().mode; }
function presetCode() { return selection().preset; }

function le32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
function le16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }

function loadWatchStamps() {
  var out = [];
  for (var i = 0; i < WATCH_SLOTS; i++) out.push(0);
  try {
    var arr = JSON.parse(localStorage.getItem(WATCH_STAMPS_KEY) || '[]');
    if (Array.isArray(arr)) {
      for (var j = 0; j < WATCH_SLOTS && j < arr.length; j++) {
        var v = parseInt(arr[j], 10);
        out[j] = isNaN(v) ? 0 : (v >>> 0);
      }
    }
  } catch (e) { }
  return out;
}

function saveWatchStamps(stamps) {
  try { localStorage.setItem(WATCH_STAMPS_KEY, JSON.stringify(stamps)); } catch (e) { }
}

function setWatchStamp(slot, stamp) {
  var stamps = loadWatchStamps();
  stamps[slot - 1] = stamp >>> 0;
  saveWatchStamps(stamps);
}

function noteWatchStamp(payload) {
  if (!Array.isArray(payload) || payload.length < SLOT_COUNT * 4) return;
  var known = loadWatchStamps();
  var stamps = [];
  for (var i = 0; i < WATCH_SLOTS; i++) {
    var o = i * 4;
    var v = (o + 3 < payload.length) ? ((payload[o] | (payload[o + 1] << 8) | (payload[o + 2] << 16) | (payload[o + 3] << 24)) >>> 0) : 0;
    stamps.push(s_sending && s_batchSlots[String(i + 1)] ? known[i] : v);
  }
  saveWatchStamps(stamps);
}

function pendingWork() {
  var watch = loadWatchStamps();
  var selectedSlot = selection().slot || 0;
  var work = [];
  for (var k = 1; k <= SLOT_COUNT; k++) {
    var data = localStorage.getItem(slotKey(k));
    if (codec.isValidSlot(data)) {
      var stamp = codec.stampFor(data);
      if (watch[k - 1] !== stamp) {
        work.push({ slot: k, data: data, stamp: stamp, chunks: Math.ceil(codec.PACKED_BYTES / PERSIST_CHUNK_BYTES), w: codec.BG_W, h: codec.BG_H });
      }
    } else if (watch[k - 1] !== 0) {
      work.push({ slot: k, data: null, stamp: 0, chunks: 0 });
    }
  }
  var pic = selection().mode === 4 ? pluginBg.getOutput() : null;
  if (pic) {
    if (watch[PLUGIN_SLOT - 1] !== pic.stamp) {
      work.push({ slot: PLUGIN_SLOT, bytes: pic.bytes, stamp: pic.stamp, chunks: Math.ceil(pic.bytes.length / PERSIST_CHUNK_BYTES), w: pic.w, h: pic.h });
    }
  } else if (watch[PLUGIN_SLOT - 1] !== 0) {
    work.push({ slot: PLUGIN_SLOT, data: null, stamp: 0, chunks: 0 });
  }
  work.sort(function (a, b) {
    var pa = a.slot === selectedSlot ? 0 : 1, pb = b.slot === selectedSlot ? 0 : 1;
    return pa - pb || a.slot - b.slot;
  });
  return work;
}

function sendBatch(work) {
  var batch = { aborted: false };
  var batchTotal = 0;
  work.forEach(function (w) { if (w.slot !== PLUGIN_SLOT) batchTotal += w.chunks; });
  var done = 0;
  var remaining = work.length;
  s_batchSlots = {};
  work.forEach(function (w) { s_batchSlots[String(w.slot)] = true; });

  function finishOne() {
    remaining--;
    if (remaining === 0) finishBatch();
  }
  function finishBatch() {
    s_sending = false;
    s_batchSlots = {};
    console.log('modern: background images delivered');
    if (s_resync) { s_resync = false; syncIfNeeded(); }
  }
  function failBatch() {
    if (batch.aborted) return;
    batch.aborted = true;
    s_sending = false;
    s_batchSlots = {};
    s_resync = false;
    work.forEach(function (w) { setWatchStamp(w.slot, 0); });
    console.log('modern: background image transfer failed; will retry at the next watch request');
  }

  s_sending = true;
  console.log('modern: syncing ' + work.length + ' background image slot(s), ' + batchTotal + ' progress chunks');

  work.forEach(function (w) {
    var common = {
      retries: 2,
      skipIf: function () { return batch.aborted; },
      onFail: failBatch
    };
    var isPlugin = w.slot === PLUGIN_SLOT;
    var hasImage = !!(w.data || w.bytes);
    var begin = le32(w.stamp).concat(le16(w.chunks), le16(hasImage ? w.w : 0), le16(hasImage ? w.h : 0),
                                     [w.slot], le16(isPlugin ? 0 : batchTotal), le16(isPlugin ? 0 : done));
    if (!hasImage) {
      messageQueue.enqueueRaw({ BG_IMG_BEGIN: begin }, {
        retries: 2, skipIf: common.skipIf, onFail: failBatch,
        onAck: function () { setWatchStamp(w.slot, 0); finishOne(); }
      });
      return;
    }
    var bytes = isPlugin ? w.bytes : codec.b64urlDecode(w.data);
    var wantBytes = Math.ceil(w.w * w.h / 4) * 3;
    if (!bytes || bytes.length !== wantBytes) {
      console.log('modern: background slot ' + w.slot + ' has the wrong size, not sending');
      remaining--;
      return;
    }
    setWatchStamp(w.slot, 0);
    messageQueue.enqueueRaw({ BG_IMG_BEGIN: begin }, common);
    for (var off = 0; off < bytes.length; off += MESSAGE_PAYLOAD_BYTES) {
      messageQueue.enqueueRaw({
        BG_IMG_INDEX: off / PERSIST_CHUNK_BYTES,
        BG_IMG_DATA: bytes.slice(off, off + MESSAGE_PAYLOAD_BYTES)
      }, common);
    }
    messageQueue.enqueueRaw({ BG_IMG_END: le32(w.stamp) }, {
      retries: 2, skipIf: common.skipIf, onFail: failBatch,
      onAck: function () { setWatchStamp(w.slot, w.stamp); finishOne(); }
    });
    if (!isPlugin) done += w.chunks;
  });
  if (remaining === 0) finishBatch();
}

function syncIfNeeded() {
  if (s_sending) { s_resync = true; return false; }
  var work = pendingWork();
  if (!work.length) return false;
  sendBatch(work);
  return true;
}

pluginBg.setOnChange(function () { syncIfNeeded(); });

module.exports = {
  SLOT_COUNT: SLOT_COUNT,
  PLUGIN_SLOT: PLUGIN_SLOT,
  getSlots: getSlots,
  applySlotUpdates: applySlotUpdates,
  selection: selection,
  modeCode: modeCode,
  presetCode: presetCode,
  noteWatchStamp: noteWatchStamp,
  syncIfNeeded: syncIfNeeded
};
