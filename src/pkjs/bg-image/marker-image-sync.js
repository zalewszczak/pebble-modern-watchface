// The "Downloaded" index image: a 1-bit mask (GBitmap 1BitPalette bytes, base64url) that the settings page converts
// from a PNG of the watchface's GitHub extras folder. It is kept per platform in localStorage and sent to the watch
// (slot 11 of the BG_IMG messages, see marker_download.c), which keeps it in persistent storage.
var platform = require('../platform');
var codec = require('./bg-image-codec');
var messageQueue = require('../comms/message-queue');

var STORE_KEY = 'DL_INDEX' + platform.suffix;
var WATCH_KEY = 'DL_INDEX_WATCH' + platform.suffix;
var WATCH_SLOT = 11;
var CHUNK_BYTES = 255;

function le32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
function le16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
function stride(w) { return ((w + 31) >> 5) << 2; }

function stampOf(bytes) {
  var h = 2166136261;
  for (var i = 0; i < bytes.length; i++) { h = ((h ^ bytes[i]) >>> 0); h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0; } // FNV-1a, 32-bit wrap (no Math.imul: not in every phone JS runtime)
  return h || 1;
}

function text(v, max) { return typeof v === 'string' ? v.slice(0, max) : ''; }
// The metadata of an index image (from indices.json in the GitHub folder), reduced to what the app uses.
function cleanMeta(m) {
  if (!m || typeof m !== 'object') return null;
  var out = { name: text(m.name, 60), description: text(m.description, 300), author: text(m.author, 60),
    link: text(m.link, 200), license: text(m.license, 40), added: text(m.added, 20), tags: [], margins: null };
  if (Array.isArray(m.tags)) out.tags = m.tags.slice(0, 8).map(function (t) { return text(t, 24); }).filter(Boolean);
  var g = m.margins;
  if (g && typeof g === 'object') {
    var a = Array.isArray(g) ? g : [g.top, g.bottom, g.left, g.right];
    var n = a.map(function (v) { v = parseInt(v, 10); return isNaN(v) ? -1 : v; });
    if (n.length === 4 && n.every(function (v) { return v >= 0 && v <= 255; })) out.margins = n;
  }
  return out;
}

function valid(e) {
  if (!e || typeof e !== 'object') return null;
  var w = parseInt(e.w, 10), h = parseInt(e.h, 10);
  if (!(w > 0 && w <= 400 && h > 0 && h <= 400) || typeof e.name !== 'string') return null;
  var bytes = codec.b64urlDecode(e.data);
  if (!bytes || bytes.length !== stride(w) * h) return null;
  return { name: e.name.slice(0, 80), w: w, h: h, data: e.data, bytes: bytes, meta: cleanMeta(e.meta) };
}

function current() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    var e = raw ? valid(JSON.parse(raw)) : null;
    return e ? { name: e.name, w: e.w, h: e.h, data: e.data, meta: e.meta } : null;
  } catch (e) { return null; }
}

// update: { name, w, h, data } stores a new image, { clear: true } removes it, anything else is ignored.
function applyUpdate(update) {
  if (!update || typeof update !== 'object') return;
  try {
    if (update.clear) { localStorage.removeItem(STORE_KEY); return; }
    var e = valid(update);
    if (e) localStorage.setItem(STORE_KEY, JSON.stringify({ name: e.name, w: e.w, h: e.h, data: e.data, meta: e.meta }));
    else console.log('modern: ignoring invalid downloaded index');
  } catch (err) { }
}

function watchStamp() { try { return parseInt(localStorage.getItem(WATCH_KEY), 10) >>> 0 || 0; } catch (e) { return 0; } }
function setWatchStamp(v) { try { localStorage.setItem(WATCH_KEY, String(v >>> 0)); } catch (e) { } }

// The user's own uploaded indices, kept on the phone only (the selected one is what gets sent to the watch).
var LIB_KEY = 'DL_LIBRARY' + platform.suffix;
var LIB_MAX = 12;
function safeName(n) { return typeof n === 'string' ? n.replace(/[^A-Za-z0-9_\-]/g, '_').slice(0, 40) : ''; }
function library() {
  try {
    var list = JSON.parse(localStorage.getItem(LIB_KEY) || '[]');
    return (Array.isArray(list) ? list : []).filter(function (e) { return e && safeName(e.name) && valid(e); })
      .map(function (e) { return { name: e.name, w: e.w, h: e.h, data: e.data }; });
  } catch (e) { return []; }
}
// ops: { add: [{ name, w, h, data }], remove: [name] }
function applyLibraryOps(ops) {
  if (!ops || typeof ops !== 'object') return;
  var list = library();
  (Array.isArray(ops.remove) ? ops.remove : []).forEach(function (n) { list = list.filter(function (e) { return e.name !== n; }); });
  (Array.isArray(ops.add) ? ops.add : []).forEach(function (a) {
    var n = safeName(a && a.name);
    if (!n || !valid(a)) return;
    list = list.filter(function (e) { return e.name !== n; });
    if (list.length < LIB_MAX) list.push({ name: n, w: parseInt(a.w, 10), h: parseInt(a.h, 10), data: a.data });
  });
  try { localStorage.setItem(LIB_KEY, JSON.stringify(list)); } catch (e) { console.log('modern: could not store uploaded indices'); }
}

var s_sending = false;
var s_again = false;

function syncIfNeeded() {
  if (s_sending) { s_again = true; return false; }
  var cur = current();
  var e = cur ? valid(cur) : null;
  var want = e ? stampOf(e.bytes) : 0;
  if (want === watchStamp()) return false;
  s_sending = true;
  console.log('modern: sending downloaded index to the watch (' + e.bytes.length + ' bytes)');
  var opts = {
    retries: 2,
    onFail: function () { s_sending = false; setWatchStamp(0xFFFFFFFF); }
  };
  var finish = function () {
    s_sending = false;
    if (s_again) { s_again = false; syncIfNeeded(); }
  };
  if (!e) {
    messageQueue.enqueueRaw({ BG_IMG_BEGIN: le32(0).concat(le16(0), le16(0), le16(0), [WATCH_SLOT], le16(0), le16(0), [0]) },
      { retries: 2, onFail: opts.onFail, onAck: function () { setWatchStamp(0); finish(); } });
    return true;
  }
  var chunks = Math.ceil(e.bytes.length / CHUNK_BYTES);
  messageQueue.enqueueRaw({ BG_IMG_BEGIN: le32(want).concat(le16(chunks), le16(e.w), le16(e.h), [WATCH_SLOT], le16(0), le16(0), [0]) }, opts);
  for (var i = 0; i < chunks; i++) {
    messageQueue.enqueueRaw({ BG_IMG_INDEX: i, BG_IMG_DATA: e.bytes.slice(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES) }, opts);
  }
  messageQueue.enqueueRaw({ BG_IMG_END: le32(want) },
    { retries: 2, onFail: opts.onFail, onAck: function () { setWatchStamp(want); console.log('modern: downloaded index delivered'); finish(); } });
  return true;
}

module.exports = {
  WATCH_SLOT: WATCH_SLOT,
  current: current,
  applyUpdate: applyUpdate,
  library: library,
  applyLibraryOps: applyLibraryOps,
  syncIfNeeded: syncIfNeeded,
  stampOf: stampOf,
  cleanMeta: cleanMeta,
  forgetWatchCopy: function () { setWatchStamp(0xFFFFFFFF); } // e.g. the watch app was reinstalled
};
