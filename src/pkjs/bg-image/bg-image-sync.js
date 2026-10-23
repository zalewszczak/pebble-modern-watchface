// Custom background image: which image is selected, where the user's uploaded
// images are kept, and how an uploaded one gets onto the watch.
//
// Selection settings (localStorage, written by the settings page):
//   CONFIG_USE_CUSTOM_BG  'true' | 'false'
//   CONFIG_BG_SOURCE      'p:<n>' predefined image n (a bitmap resource in the
//                         watch app) | 'u:<k>' user slot k (1-9)
//   CONFIG_BG_SLOT_<k>    the user's image, base64url of the packed 64-colour
//                         bitmap (see bg-image-codec.js); absent when empty.
//
// A predefined image needs nothing but the two bytes in the settings blob
// (mode + number). A user image is streamed to the watch's persistent storage
// once and identified by a stamp (hash of its data); the watch reports the
// stamp it holds with every REQUEST_UPDATE, and the image is (re)sent
// whenever that differs from the one selected. Messages bypass the normal
// settings/feature pipeline (BG_IMG_* keys only) -- see comms.c on the watch.

var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var codec = require('./bg-image-codec');
var messageQueue = require('../comms/message-queue');

var SLOT_COUNT = 9;
var PERSIST_CHUNK_BYTES = 255;                  // watch: one persist value
var MESSAGE_PAYLOAD_BYTES = PERSIST_CHUNK_BYTES * 4; // 1020, fits the 1200-byte inbox
var WATCH_STAMP_KEY = 'BG_WATCH_STAMP';

var presetNumbers = [];
try { presetNumbers = require('../data/generated/background-images').numbers || []; } catch (e) { presetNumbers = []; }

var s_sending = false;

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
  return { mode: 2, preset: 0, data: data, stamp: codec.stampFor(data) };
}

function modeCode() { return selection().mode; }
function presetCode() { return selection().preset; }

function le32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
function le16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }

function rememberWatchStamp(stamp) {
  try { localStorage.setItem(WATCH_STAMP_KEY, String(stamp >>> 0)); } catch (e) { /* not critical */ }
}

function knownWatchStamp() {
  var v = parseInt(localStorage.getItem(WATCH_STAMP_KEY), 10);
  return isNaN(v) ? 0 : (v >>> 0);
}

// The watch told us which image it holds (BG_IMG_STAMP in REQUEST_UPDATE).
function noteWatchStamp(stamp) {
  if (typeof stamp !== 'number' || isNaN(stamp)) return;
  if (!s_sending) rememberWatchStamp(stamp);
}

function sendImage(sel) {
  var bytes = codec.b64urlDecode(sel.data);
  if (!bytes || bytes.length !== codec.PACKED_BYTES) {
    console.log('modern: background image has the wrong size, not sending');
    return;
  }
  var chunks = Math.ceil(bytes.length / PERSIST_CHUNK_BYTES);
  var transfer = { aborted: false };
  var opts = {
    retries: 2,
    skipIf: function () { return transfer.aborted; },
    onFail: function () {
      transfer.aborted = true;
      s_sending = false;
      rememberWatchStamp(0); // the watch dropped its old image when the transfer began
      console.log('modern: background image transfer failed; will retry at the next watch request');
    }
  };
  s_sending = true;
  console.log('modern: sending background image (' + bytes.length + ' bytes, ' + chunks + ' chunks)');
  messageQueue.enqueueRaw({ BG_IMG_BEGIN: le32(sel.stamp).concat(le16(chunks), le16(codec.BG_W), le16(codec.BG_H)) }, opts);
  for (var off = 0; off < bytes.length; off += MESSAGE_PAYLOAD_BYTES) {
    messageQueue.enqueueRaw({
      BG_IMG_INDEX: off / PERSIST_CHUNK_BYTES,
      BG_IMG_DATA: bytes.slice(off, off + MESSAGE_PAYLOAD_BYTES)
    }, opts);
  }
  messageQueue.enqueueRaw({ BG_IMG_END: le32(sel.stamp) }, {
    retries: 2,
    skipIf: opts.skipIf,
    onFail: opts.onFail,
    onAck: function () {
      s_sending = false;
      rememberWatchStamp(sel.stamp);
      console.log('modern: background image delivered');
    }
  });
}

// Sends the selected user image unless the watch already holds it.
// Returns true if a transfer was started.
function syncIfNeeded() {
  var sel = selection();
  if (sel.mode !== 2 || s_sending) return false;
  if (knownWatchStamp() === sel.stamp) return false;
  sendImage(sel);
  return true;
}

module.exports = {
  SLOT_COUNT: SLOT_COUNT,
  getSlots: getSlots,
  applySlotUpdates: applySlotUpdates,
  selection: selection,
  modeCode: modeCode,
  presetCode: presetCode,
  noteWatchStamp: noteWatchStamp,
  syncIfNeeded: syncIfNeeded
};
