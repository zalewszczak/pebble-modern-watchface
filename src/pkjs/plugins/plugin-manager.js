var permissions = require('../settings/permissions');
// Pebble plugins (new in recent Pebble apps)
var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var setSetting = settings.setSetting;

var SLOT_COUNT = 12;
var TEXT_LEN = 16;           // characters one complication line shows (15 + the watch's terminator)
var LONG_TEXT_MAX = 96;      // longest plugin text kept on the phone; it is cut into TEXT_LEN - 1 character lines
var SLOTS_KEY = 'CONFIG_PLUGIN_SLOTS';
var TEXT_SHAPES = ['shortText', 'numericValue', 'timestamp', 'boolean', 'longText'];

var slotKeys = [];
var slotTexts = [];
var subscriptions = [];
var pushTimer = null;
var pushFn = null;

for (var i = 0; i < SLOT_COUNT; i++) { slotKeys.push(''); slotTexts.push(''); subscriptions.push(null); }

function hasApi() {
  try {
    return typeof Pebble !== 'undefined' && typeof Pebble.enumeratePlugins === 'function' &&
      typeof Pebble.subscribeToSource === 'function';
  } catch (e) { return false; }
}

function humanize(s) {
  return String(s || '').replace(/[_-]+/g, ' ').replace(/^\s*[a-z]/, function (c) { return c.toUpperCase(); });
}

function readCatalogue() {
  if (!hasApi()) {
    return { status: 'unsupported', sources: [], imageSources: [],
      message: 'Plugins are not enabled: this version of the Pebble app does not support plugins. Update the app to use them.' };
  }
  var plugins;
  try {
    plugins = Pebble.enumeratePlugins();
  } catch (e) {
    return { status: 'disabled', sources: [], imageSources: [],
      message: 'Plugins are not enabled in the Pebble app (' + ((e && e.message) || 'unavailable') + '). Turn on plugins in the app\'s settings.' };
  }
  var sources = [], weatherProviders = [], imageSources = [];
  (plugins || []).forEach(function (plugin) {
    (plugin.sources || []).forEach(function (source) {
      var props = source.properties || {};
      if (source.category === 'weather' && (source.items || []).indexOf('location') !== -1 && props.temperature &&
          !weatherProviders.some(function (w) { return w.uuid === plugin.uuid; })) {
        weatherProviders.push({ uuid: plugin.uuid, name: plugin.name || 'Weather plugin' });
      }
      (source.items || []).forEach(function (item) {
        Object.keys(props).forEach(function (prop) {
          var shapes = props[prop] || [];
          if (shapes.indexOf('image') !== -1) {
            imageSources.push({
              key: [plugin.uuid, source.category, item, prop].join('|'),
              plugin: plugin.uuid, pluginName: plugin.name || 'Plugin',
              category: source.category, item: item, property: prop,
              group: (plugin.name || 'Plugin') + ' - ' + humanize(source.category) + ' / ' + humanize(item),
              label: humanize(prop)
            });
          }
          var usable = shapes.filter(function (s) { return TEXT_SHAPES.indexOf(s) !== -1; });
          if (!usable.length) return;
          sources.push({
            key: [plugin.uuid, source.category, item, prop].join('|'),
            plugin: plugin.uuid, pluginName: plugin.name || 'Plugin',
            category: source.category, item: item, property: prop, shapes: usable,
            group: (plugin.name || 'Plugin') + ' - ' + humanize(source.category) + ' / ' + humanize(item),
            label: humanize(prop)
          });
        });
      });
    });
  });
  return { status: 'ok', sources: sources, imageSources: imageSources, weatherProviders: weatherProviders, message: sources.length ? '' : 'No plugin provides text data right now.' };
}

function status() { return readCatalogue().status; }

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function textFromPayloads(payloads) {
  if (!payloads) return '';
  if (payloads.shortText && typeof payloads.shortText.text === 'string') return payloads.shortText.text;
  var nv = payloads.numericValue;
  if (nv && typeof nv.value === 'number') {
    var v = Math.round(nv.value * 10) / 10;
    return String(v) + (nv.unit || '');
  }
  var ts = payloads.timestamp;
  if (ts && typeof ts.value === 'number') {
    var d = new Date(ts.value);
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  var b = payloads.boolean;
  if (b && typeof b.value === 'boolean') return b.value ? 'On' : 'Off';
  if (payloads.longText && typeof payloads.longText.text === 'string') return payloads.longText.text;
  return '';
}

// The 12 plugin texts as plain strings (whitespace collapsed); the phone slots carry them to the watch.
// Splits text into lines of at most `width` characters at word boundaries (a word longer than a line is cut).
function wrapLines(text, width) {
  var words = String(text || '').replace(/\s+/g, ' ').trim().split(' '), lines = [], cur = '';
  words.forEach(function (w) {
    while (w.length > width) {
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(w.slice(0, width));
      w = w.slice(width);
    }
    if (!w) return;
    if (!cur) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  });
  if (cur) lines.push(cur);
  return lines;
}

// Slots whose key ends in ~2 / ~3 show the 2nd / 3rd line of the same text instead of the first, so one long
// text (a plugin's longText, a headline ...) can be spread over several complications.
function partOfKey(key) {
  var m = /~(\d)$/.exec(String(key || ''));
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

function texts() {
  var out = [];
  for (var s = 0; s < SLOT_COUNT; s++) {
    var raw = String(slotTexts[s] || '');
    if (slotKeys[s] && slotKeys[s].indexOf('text|') === 0) { out.push(raw.replace(/\s+/g, ' ').trim().slice(0, TEXT_LEN - 1)); continue; }
    out.push(wrapLines(raw, TEXT_LEN - 1)[partOfKey(slotKeys[s]) - 1] || (partOfKey(slotKeys[s]) > 1 ? ' ' : '--'));
  }
  return out;
}

function schedulePush() {
  if (!pushFn) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(function () {
    pushTimer = null;
    try { pushFn(); } catch (e) { console.log('modern: plugin push failed - ' + e.message); }
  }, 600);
}

function setText(slot, text) {
  text = String(text || '').slice(0, LONG_TEXT_MAX);
  if (slotTexts[slot] === text) return;
  slotTexts[slot] = text;
  schedulePush();
}

function parseKey(key) {
  var p = String(key).split('|');
  if (p.length < 4) return null;
  var property = p.slice(3).join('|').replace(/~\d$/, '');
  var index = 0;
  var m = /^(.*)#(\d+)$/.exec(property);
  if (m) { property = m[1]; index = parseInt(m[2], 10); }
  return { plugin: p[0], category: p[1], item: p[2], property: property, index: index };
}

function unsubscribe(slot) {
  var sub = subscriptions[slot];
  subscriptions[slot] = null;
  if (sub && sub.handle && typeof sub.handle.unsubscribe === 'function') {
    try { sub.handle.unsubscribe(); } catch (e) { }
  }
}

function subscribe(slot) {
  var parsed = parseKey(slotKeys[slot]);
  if (!parsed || !hasApi()) return;
  var handle = null;
  try {
    handle = Pebble.subscribeToSource({
      category: parsed.category,
      item: parsed.item,
      plugin: parsed.plugin || undefined,
      properties: [parsed.property],
      onData: function (envelope) {
        permissions.mark('plugin:' + slotKeys[slot], false);
        var inst = envelope && envelope.instances && envelope.instances[parsed.index];
        var text = inst && inst.properties ? textFromPayloads(inst.properties[parsed.property]) : '';
        setText(slot, text || '--');
      },
      onError: function (err) {
        console.log('modern: plugin ' + slotKeys[slot] + ' error ' + (err && err.code));
        permissions.mark('plugin:' + slotKeys[slot], !!err && err.code === 'PERMISSION_DENIED');
        setText(slot, (err && err.code === 'PERMISSION_DENIED') ? 'No access' : 'N/A');
      }
    });
  } catch (e) {
    console.log('modern: plugin subscribe failed - ' + e.message);
    setText(slot, 'N/A');
    return;
  }
  subscriptions[slot] = { key: slotKeys[slot], handle: handle };
}

function syncSubscriptions() {
  for (var s = 0; s < SLOT_COUNT; s++) {
    if (slotKeys[s].indexOf('text|') === 0) {
      unsubscribe(s);
      var fixed = slotKeys[s].slice(5);
      if (slotTexts[s] !== fixed) { slotTexts[s] = fixed; schedulePush(); }
      continue;
    }
    var sub = subscriptions[s];
    if (sub && sub.key === slotKeys[s]) continue;
    unsubscribe(s);
    if (slotKeys[s]) { slotTexts[s] = ''; subscribe(s); }
    else if (slotTexts[s]) { slotTexts[s] = ''; schedulePush(); }
  }
}

function normalizeSlots(raw) {
  var arr = raw;
  if (typeof raw === 'string') { try { arr = JSON.parse(raw); } catch (e) { arr = []; } }
  if (!Array.isArray(arr)) arr = [];
  var out = [];
  for (var i = 0; i < SLOT_COUNT; i++) out.push(typeof arr[i] === 'string' ? arr[i] : '');
  return out;
}

function getSlots() { return normalizeSlots(getSetting(SLOTS_KEY, '[]')); }

function setSlots(raw) {
  slotKeys = normalizeSlots(raw);
  setSetting(SLOTS_KEY, JSON.stringify(slotKeys));
  syncSubscriptions();
}

function init(pushFnArg) {
  pushFn = pushFnArg;
  slotKeys = getSlots();
  syncSubscriptions();
}

module.exports = {
  SLOT_COUNT: SLOT_COUNT,
  TEXT_LEN: TEXT_LEN,
  wrapLines: wrapLines,
  partOfKey: partOfKey,
  hasApi: hasApi,
  status: status,
  readCatalogue: readCatalogue,
  getSlots: getSlots,
  setSlots: setSlots,
  texts: texts,
  init: init,
  textFromPayloads: textFromPayloads
};
