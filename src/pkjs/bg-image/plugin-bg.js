// Plugin background (background style PLUGIN): follows one plugin image source
// and keeps the latest picture ready for the watch.
//
// Settings (localStorage, written by the settings page):
//   CONFIG_USE_PLUGIN_BG     'true' | 'false'
//   CONFIG_PLUGIN_BG_SOURCE  source key "<plugin uuid>|<category>|<item>|<property>[#<instance>]"
//   CONFIG_PLUGIN_BG_DITHER  none | fs | atkinson | bayer4 | bayer8
//   CONFIG_PLUGIN_BG_COLOR   neutral | vivid | bw | sepia
//   CONFIG_PLUGIN_BG_FIT     fill | full | 75 | 50 | center
//
// While the style is PLUGIN this module holds one subscription to the chosen
// source (asking for bitmaps with iconPixelSize). Each picture is turned into the
// watch's 64-colour format right here (plugin-image.js), so the watch needs to
// know nothing about the style options. The result lives only in memory: it is
// NOT saved anywhere on the phone either -- after a restart of this script the
// subscription simply delivers the picture again. bg-image-sync.js sends it to
// the watch's volatile slot (and re-sends it whenever the watch reports that it
// no longer holds it, e.g. after the watchface restarted).
//
// When the source reports no picture (the instance or its image property is
// missing/empty), the picture is dropped here and bg-image-sync.js empties the
// watch's slot. Errors do not drop it: the next update may succeed.

var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var pluginImage = require('./plugin-image');

// Largest bitmap Pebble allows a subscriber to ask for. The plugin may hand back
// something smaller; the real size is in the payload.
var REQUEST_SIZE = { w: 260, h: 260 };

var s_sub = null;       // { key, handle }
var s_raw = null;       // last decoded picture { w, h, rgba, signature }
var s_out = null;       // rendered { w, h, bytes, stamp, optionsKey }
var s_onChange = null;
var s_loggedShape = false;

function hasApi() {
  try {
    return typeof Pebble !== 'undefined' && typeof Pebble.subscribeToSource === 'function';
  } catch (e) { return false; }
}

function enabled() { return getSetting('CONFIG_USE_PLUGIN_BG', 'false') === 'true'; }

function options() {
  return {
    dither: getSetting('CONFIG_PLUGIN_BG_DITHER', pluginImage.DEFAULT_OPTIONS.dither),
    color: getSetting('CONFIG_PLUGIN_BG_COLOR', pluginImage.DEFAULT_OPTIONS.color),
    fit: getSetting('CONFIG_PLUGIN_BG_FIT', pluginImage.DEFAULT_OPTIONS.fit)
  };
}

function optionsKey(o) { return o.dither + '|' + o.color + '|' + o.fit; }

function sourceKey() { return String(getSetting('CONFIG_PLUGIN_BG_SOURCE', '') || ''); }

// Same key format as plugin-manager.js (kept local: the text slots' module is not needed here).
function parseKey(key) {
  var p = String(key).split('|');
  if (p.length < 4) return null;
  var property = p.slice(3).join('|');
  var index = 0;
  var m = /^(.*)#(\d+)$/.exec(property);
  if (m) { property = m[1]; index = parseInt(m[2], 10); }
  return { plugin: p[0], category: p[1], item: p[2], property: property, index: index };
}

function notify() {
  if (s_onChange) {
    try { s_onChange(); } catch (e) { console.log('modern: plugin background notify failed - ' + e.message); }
  }
}

// ---- rendering --------------------------------------------------------------------

function renderNow() {
  if (!s_raw) { s_out = null; return; }
  var o = options();
  try {
    var r = pluginImage.render(s_raw, o);
    s_out = { w: r.w, h: r.h, bytes: r.bytes, stamp: r.stamp, optionsKey: optionsKey(o) };
  } catch (e) {
    console.log('modern: plugin background render failed - ' + (e && e.message));
    s_out = null;
  }
}

// What bg-image-sync.js should deliver: { w, h, bytes, stamp } or null (= no picture).
function getOutput() {
  return (enabled() && s_out) ? s_out : null;
}

// ---- subscription -----------------------------------------------------------------

function shapeInfo(img) {
  try {
    return 'keys=' + Object.keys(img).join(',') + ' size=' + img.width + 'x' + img.height +
      ' pixels=' + (typeof img.pixels) + '/' + String(img.pixels).length +
      ' palette=' + (typeof img.palette) + '/' + (img.palette && img.palette.length);
  } catch (e) { return 'unreadable'; }
}

function onData(parsed, envelope) {
  var inst = envelope && envelope.instances && envelope.instances[parsed.index];
  var prop = inst && inst.properties ? inst.properties[parsed.property] : null;
  var payload = prop && prop.image ? prop.image : null;

  var img = null;
  if (payload) {
    if (!s_loggedShape) { s_loggedShape = true; console.log('modern: plugin background image payload: ' + shapeInfo(payload)); }
    img = pluginImage.decodeImagePayload(payload);
    if (!img) console.log('modern: plugin background image could not be decoded: ' + shapeInfo(payload));
  }

  if (!img) {
    // The source has no picture (any more): the watch's copy goes too.
    if (s_raw || s_out) { s_raw = null; s_out = null; notify(); }
    return;
  }
  if (s_raw && s_raw.signature === img.signature && s_out && s_out.optionsKey === optionsKey(options())) return; // same picture again
  s_raw = img;
  renderNow();
  notify();
}

function unsubscribe() {
  var sub = s_sub;
  s_sub = null;
  if (sub && sub.handle && typeof sub.handle.unsubscribe === 'function') {
    try { sub.handle.unsubscribe(); } catch (e) { /* already gone */ }
  }
}

function subscribe(key) {
  var parsed = parseKey(key);
  if (!parsed || !hasApi()) return;
  var handle = null;
  try {
    handle = Pebble.subscribeToSource({
      category: parsed.category,
      item: parsed.item,
      plugin: parsed.plugin || undefined,
      properties: [parsed.property],
      iconPixelSize: { w: REQUEST_SIZE.w, h: REQUEST_SIZE.h },
      onData: function (envelope) {
        try { onData(parsed, envelope); } catch (e) { console.log('modern: plugin background update failed - ' + (e && e.message)); }
      },
      onError: function (err) {
        console.log('modern: plugin background ' + key + ' error ' + (err && err.code));
      }
    });
  } catch (e) {
    console.log('modern: plugin background subscribe failed - ' + (e && e.message));
    return;
  }
  s_sub = { key: key, handle: handle };
}

// Brings the subscription and the rendered picture in line with the settings.
// Call after any settings change and once at start-up. Safe without plugins.
function apply() {
  var key = sourceKey();
  var want = enabled() && key !== '';
  var hadPicture = !!(s_raw || s_out);

  if (!want) {
    unsubscribe();
    s_raw = null; s_out = null;
    if (hadPicture) notify();
    return;
  }
  if (s_sub && s_sub.key !== key) {
    unsubscribe();
    s_raw = null; s_out = null;
    notify(); // the old source's picture must not stay on the watch
  }
  if (!s_sub) subscribe(key);
  // Dither / colour / fit changed: render the picture we hold again.
  if (s_raw && (!s_out || s_out.optionsKey !== optionsKey(options()))) {
    renderNow();
    notify();
  }
}

function setOnChange(fn) { s_onChange = fn; }

module.exports = {
  apply: apply,
  getOutput: getOutput,
  setOnChange: setOnChange,
  enabled: enabled
};
