// Custom background images: which image is selected, where the user's uploaded
// images are kept, and how they get onto the watch.
//
// Selection settings (localStorage, written by the settings page):
//   CONFIG_USE_CUSTOM_BG  'true' | 'false'
//   CONFIG_BG_SOURCE      'p:<n>' predefined image n (a bitmap resource in the
//                         watch app) | 'u:<k>' user slot k (1-9)
//   CONFIG_BG_SLOT_<k>    the user's image, base64url of the packed 64-colour
//                         bitmap (see bg-image-codec.js); absent when empty.
//
// A predefined image needs nothing but the two bytes in the settings blob
// (mode + number). The user's images (all nine slots) are streamed to the
// watch's persistent storage AHEAD of time: as soon as an image is added,
// replaced or removed on the phone, the changed slots are synced, so selecting
// a slot later (or a "My style" that uses one) is instant -- the settings blob
// then only names the slot (mode 2 + slot number) and the watch already holds
// the pixels. Every image is identified by a stamp (hash of its data); the
// watch reports the stamps of all nine slots with every REQUEST_UPDATE, and
// only slots whose stamp differs are (re)sent. Messages bypass the normal
// settings/feature pipeline (BG_IMG_* keys only) -- see comms.c on the watch.
//
// Wire format (all little endian), phone -> watch:
//   BG_IMG_BEGIN  stamp u32 | chunks u16 | w u16 | h u16 | slot u8 |
//                 batchTotal u16 | batchDone u16        (15 bytes)
//                 stamp 0 + chunks 0 = "empty this slot", nothing follows
//   BG_IMG_INDEX  u16 chunk index of the first chunk in BG_IMG_DATA
//   BG_IMG_DATA   up to 4 chunks of the packed image
//   BG_IMG_END    stamp u32
// batchTotal/batchDone are chunk counts of the whole sync and only drive the
// progress bar the watch shows. watch -> phone: BG_IMG_STAMP = 10 x u32.
//
// Slot 10 is the PLUGIN slot (background style PLUGIN, see plugin-bg.js): the same
// messages, but the watch keeps that picture in RAM only -- never in persistent
// storage -- so it is gone whenever the watchface restarts. The watch reports
// stamp 0 for it then, and it is simply sent again from here. The picture can be
// smaller than the screen (w/h in BEGIN); the watch centres it. It never counts
// towards the progress bar (batchTotal/batchDone cover the persistent slots only).

var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var codec = require('./bg-image-codec');
var pluginBg = require('./plugin-bg');
var messageQueue = require('../comms/message-queue');

var SLOT_COUNT = 9;                 // the user's persistent images
var PLUGIN_SLOT = SLOT_COUNT + 1;   // 10: volatile picture from a plugin
var WATCH_SLOTS = PLUGIN_SLOT;      // stamps the watch reports
var PERSIST_CHUNK_BYTES = 255;                  // watch: one persist value
var MESSAGE_PAYLOAD_BYTES = PERSIST_CHUNK_BYTES * 4; // 1020, fits the 1200-byte inbox
var WATCH_STAMPS_KEY = 'BG_WATCH_STAMPS'; // JSON array of 10 numbers, slot 1 first

var presetNumbers = [];
try { presetNumbers = require('../data/generated/background-images').numbers || []; } catch (e) { presetNumbers = []; }

var s_sending = false;
var s_resync = false; // a sync was requested while one was still running
var s_batchSlots = {}; // slots of the batch being sent: { "3": true }

function slotKey(k) { return 'CONFIG_BG_SLOT_' + k; }

// { "1": data, ... } -- valid, non-empty slots only.
function getSlots() {
  var out = {};
  for (var k = 1; k <= SLOT_COUNT; k++) {
    var v = localStorage.getItem(slotKey(k));
    if (codec.isValidSlot(v)) out[String(k)] = v;
  }
  return out;
}

// Applies the settings page's changed slots: {"3": data | ""}.
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

// What the watch should show: { mode: 0|1|2, preset, data, stamp }.
function selection() {
  var none = { mode: 0, preset: 0, data: null, stamp: 0 };
  // Weather background: mode 3, preset = 1-based style index (the watch picks
  // the picture from the current weather and time of day).
  if (getSetting('CONFIG_USE_WEATHER_BG', 'false') === 'true' && getSetting('CONFIG_USE_CUSTOM_BG', 'false') !== 'true') {
    var styles = require('../data/generated/weather-backgrounds').styles || [];
    var wantId = getSetting('CONFIG_WEATHER_BG_STYLE', '');
    for (var si = 0; si < styles.length; si++) {
      if (styles[si].id === wantId) return { mode: 3, preset: styles[si].index, data: null, stamp: 0 };
    }
    if (styles.length) return { mode: 3, preset: styles[0].index, data: null, stamp: 0 };
  }
  // Plugin background: mode 4 (the picture itself travels separately, see plugin-bg.js).
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
// Mode 1: the predefined image number. Mode 2: the user slot number (1-9). Mode 4: unused.
function presetCode() { return selection().preset; }

function le32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
function le16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }

// ---- what the watch holds ------------------------------------------------------

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
  } catch (e) { /* start from "nothing known" */ }
  return out;
}

function saveWatchStamps(stamps) {
  try { localStorage.setItem(WATCH_STAMPS_KEY, JSON.stringify(stamps)); } catch (e) { /* not critical */ }
}

function setWatchStamp(slot, stamp) {
  var stamps = loadWatchStamps();
  stamps[slot - 1] = stamp >>> 0;
  saveWatchStamps(stamps);
}

// The watch told us which images it holds (BG_IMG_STAMP in REQUEST_UPDATE):
// 40 bytes, ten little-endian u32, slot 1 first, slot 10 = the plugin picture
// (36 bytes from an older watch app: slot 10 is then unknown = empty).
function noteWatchStamp(payload) {
  if (!Array.isArray(payload) || payload.length < SLOT_COUNT * 4) return;
  var known = loadWatchStamps();
  var stamps = [];
  for (var i = 0; i < WATCH_SLOTS; i++) {
    var o = i * 4;
    var v = (o + 3 < payload.length) ? ((payload[o] | (payload[o + 1] << 8) | (payload[o + 2] << 16) | (payload[o + 3] << 24)) >>> 0) : 0;
    // What we are in the middle of sending is the better source for those slots.
    stamps.push(s_sending && s_batchSlots[String(i + 1)] ? known[i] : v);
  }
  saveWatchStamps(stamps);
}

// ---- sending ---------------------------------------------------------------------

// Work still to do: [{ slot, data|bytes|null, stamp, chunks, w, h }] -- images to
// send, or (nothing to send) slots to empty -- the currently selected slot first so
// the image the user is looking at arrives before the others.
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
  // The plugin picture: only while the PLUGIN style is selected. Anything the
  // watch still holds otherwise (style switched, source changed, plugin reports
  // no image) is emptied so it does not sit in RAM.
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
  // The progress bar covers the persistent images only; the plugin picture is silent.
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
    // Something may have changed on the phone while we were sending.
    if (s_resync) { s_resync = false; syncIfNeeded(); }
  }
  function failBatch() {
    if (batch.aborted) return;
    batch.aborted = true;
    s_sending = false;
    s_batchSlots = {};
    s_resync = false;
    // The watch empties a slot as soon as a transfer into it begins, so after a
    // failure we cannot assume anything about the slots we were working on.
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
      // Slot was emptied on the phone: one message, nothing to stream.
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
    setWatchStamp(w.slot, 0); // the watch drops the old image when the transfer begins
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

// Brings the watch's nine image slots in line with the phone's. Returns true if
// a transfer was started.
function syncIfNeeded() {
  if (s_sending) { s_resync = true; return false; }
  var work = pendingWork();
  if (!work.length) return false;
  sendBatch(work);
  return true;
}

// The plugin picture changed on the phone (new picture, none any more, other style
// options, other source): bring the watch in line.
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
