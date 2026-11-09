// Plugin background (background style PLUGIN): follows one plugin image source
var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var pluginImage = require('./plugin-image');
var platform = require('../platform');

// Ask the plugin for a picture the size of THIS watch's screen (emery 200x228, gabbro 260x260,
// flint/diorite 144x168), so the phone never has to resample a picture of the wrong size.
var REQUEST_SIZE = { w: platform.w, h: platform.h };

// Brightness (0-255 mean luma) above which a picture counts as bright. Once a verdict exists, the
// picture has to cross the threshold by HYSTERESIS to flip it, so a slowly changing picture
// (a map, a webcam) does not make the colors flap between day and night.
var LUMA_THRESHOLD = 110;
var LUMA_HYSTERESIS = 12;

var s_sub = null;
var s_raw = null;
var s_out = null;
var s_onChange = null;
var s_onScheme = null;
var s_heard = false; // the plugin has reported (a picture or none) since we subscribed
var s_lastNight = null; // last brightness verdict: true = dark picture
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

// Keep the picture in the watch's persistent storage (survives a watchface restart, so it is only
// sent again when it changed).
function cacheWanted() { return getSetting('CONFIG_PLUGIN_BG_CACHE', 'false') === 'true'; }

function autoScheme() { return getSetting('CONFIG_PLUGIN_BG_AUTO_SCHEME', 'false') === 'true'; }

function optionsKey(o) { return o.dither + '|' + o.color + '|' + o.fit; }

function sourceKey() { return String(getSetting('CONFIG_PLUGIN_BG_SOURCE', '') || ''); }

function parseKey(key) {
  var p = String(key).split('|');
  if (p.length < 4) return null;
  var property = p.slice(3).join('|');
  var index = 0;
  var m = /^(.*)#(\d+)$/.exec(property);
  if (m) { property = m[1]; index = parseInt(m[2], 10); }
  return { plugin: p[0], category: p[1], item: p[2], property: property, index: index };
}

var STATUS_KEY = 'PLUGIN_BG_STATUS';
function setStatus(text) {
  var d = new Date();
  var hh = (d.getHours() < 10 ? '0' : '') + d.getHours(), mm = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
  try { localStorage.setItem(STATUS_KEY, hh + ':' + mm + ' ' + text); } catch (e) { }
  console.log('modern: plugin background - ' + text);
}
function status() {
  try { return localStorage.getItem(STATUS_KEY) || ''; } catch (e) { return ''; }
}

function findImagePayload(prop) {
  if (!prop || typeof prop !== 'object') return null;
  var names = ['image', 'icon'];
  var k, i;
  for (i = 0; i < names.length; i++) if (prop[names[i]] && typeof prop[names[i]] === 'object') return prop[names[i]];
  for (k in prop) if (prop.hasOwnProperty(k) && prop[k] && typeof prop[k] === 'object' && prop[k].pixels !== undefined && prop[k].palette !== undefined) return prop[k];
  return null;
}

function notify() {
  if (s_onChange) {
    try { s_onChange(); } catch (e) { console.log('modern: plugin background notify failed - ' + e.message); }
  }
  notifyScheme();
}

function renderNow() {
  if (!s_raw) { s_out = null; return; }
  var o = options();
  try {
    var r = pluginImage.render(s_raw, o);
    s_out = { w: r.w, h: r.h, bytes: r.bytes, stamp: r.stamp, luma: r.luma, optionsKey: optionsKey(o) };
  } catch (e) {
    console.log('modern: plugin background render failed - ' + (e && e.message));
    s_out = null;
  }
}

function getOutput() {
  return (enabled() && s_out) ? s_out : null;
}

// What the watch should do with its color scheme: 0 = follow sunrise/sunset as usual, 1 = use the
// day colors (bright picture), 2 = use the night colors (dark picture).
function schemeOverride() {
  if (!enabled() || !autoScheme() || !s_out || typeof s_out.luma !== 'number') { s_lastNight = null; return 0; }
  var l = s_out.luma;
  if (s_lastNight === null) s_lastNight = l < LUMA_THRESHOLD;
  else if (s_lastNight && l > LUMA_THRESHOLD + LUMA_HYSTERESIS) s_lastNight = false;
  else if (!s_lastNight && l < LUMA_THRESHOLD - LUMA_HYSTERESIS) s_lastNight = true;
  return s_lastNight ? 2 : 1;
}

function notifyScheme() {
  if (s_onScheme) {
    try { s_onScheme(); } catch (e) { console.log('modern: plugin background scheme notify failed - ' + e.message); }
  }
}

function shapeInfo(img) {
  try {
    return 'keys=' + Object.keys(img).join(',') + ' size=' + img.width + 'x' + img.height +
      ' pixels=' + (typeof img.pixels) + '/' + String(img.pixels).length +
      ' palette=' + (typeof img.palette) + '/' + (img.palette && img.palette.length);
  } catch (e) { return 'unreadable'; }
}

function onData(parsed, envelope) {
  s_heard = true;
  var count = envelope && envelope.instances ? envelope.instances.length : 0;
  var inst = envelope && envelope.instances && envelope.instances[parsed.index];
  var prop = inst && inst.properties ? inst.properties[parsed.property] : null;
  var payload = findImagePayload(prop);
  if (!payload) {
    if (!inst) setStatus('update has ' + count + ' instance(s), none at #' + (parsed.index + 1) + ' - no picture');
    else if (!prop) setStatus('update has no "' + parsed.property + '" property (it has: ' + Object.keys(inst.properties || {}).join(', ') + ') - no picture');
    else setStatus('"' + parsed.property + '" arrived without a bitmap (shapes: ' + Object.keys(prop).join(', ') + ') - no picture');
  }

  var img = null;
  if (payload) {
    if (!s_loggedShape) { s_loggedShape = true; console.log('modern: plugin background image payload: ' + shapeInfo(payload)); }
    img = pluginImage.decodeImagePayload(payload);
    if (!img) setStatus('picture could not be decoded: ' + shapeInfo(payload));
    else setStatus('picture ' + img.w + 'x' + img.h + ' received (requested ' + REQUEST_SIZE.w + 'x' + REQUEST_SIZE.h + ')');
  }

  if (!img) {
    if (s_raw || s_out) { s_raw = null; s_out = null; notify(); }
    return;
  }
  if (s_raw && s_raw.signature === img.signature && s_out && s_out.optionsKey === optionsKey(options())) return;
  s_raw = img;
  renderNow();
  notify();
}

function unsubscribe() {
  var sub = s_sub;
  s_sub = null;
  s_heard = false;
  if (sub && sub.handle && typeof sub.handle.unsubscribe === 'function') {
    try { sub.handle.unsubscribe(); } catch (e) { }
  }
}

function subscribe(key) {
  var parsed = parseKey(key);
  if (!parsed) { setStatus('invalid source key'); return; }
  if (!hasApi()) { setStatus('this Pebble app has no plugin API (or plugins are switched off)'); return; }
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
        setStatus('plugin error ' + (err && err.code) + (err && err.message ? ': ' + err.message : ''));
      }
    });
  } catch (e) {
    setStatus('subscribe failed: ' + (e && e.message));
    return;
  }
  s_sub = { key: key, handle: handle };
  setStatus('subscribed, waiting for the plugin to send data');
}

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
    notify();
  }
  if (!s_sub) subscribe(key);
  if (s_raw && (!s_out || s_out.optionsKey !== optionsKey(options()))) {
    renderNow();
    notify();
  }
}

function setOnChange(fn) { s_onChange = fn; }
function setOnScheme(fn) { s_onScheme = fn; }

module.exports = {
  apply: apply,
  getOutput: getOutput,
  status: status,
  setOnChange: setOnChange,
  setOnScheme: setOnScheme,
  cacheWanted: cacheWanted,
  heard: function () { return s_heard; },
  schemeOverride: schemeOverride,
  enabled: enabled
};
