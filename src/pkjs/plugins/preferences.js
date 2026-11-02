// Pebble app user preferences (preferences/units, preferences/complications)
var CACHE_KEY = 'PREFERENCES_CACHE';
var UNIT_PROPS = ['temperature', 'distance', 'wind_speed', 'pressure', 'precipitation', 'clock', 'locale'];
var MAX_COMPLICATIONS = 5;

var cache = loadCache();

function hasApi() {
  try { return typeof Pebble !== 'undefined' && typeof Pebble.subscribeToSource === 'function'; } catch (e) { return false; }
}

function loadCache() {
  try {
    var raw = localStorage.getItem(CACHE_KEY);
    var p = raw ? JSON.parse(raw) : null;
    if (p && typeof p === 'object') {
      return { units: (p.units && typeof p.units === 'object') ? p.units : null, complications: Array.isArray(p.complications) ? p.complications : null };
    }
  } catch (e) { }
  return { units: null, complications: null };
}

function saveCache() {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { }
}

function shortTextOf(props, name) {
  var p = props && props[name];
  return (p && p.shortText && typeof p.shortText.text === 'string') ? p.shortText.text : '';
}

function parseUnits(envelope) {
  var inst = envelope && envelope.instances && envelope.instances[0];
  if (!inst || !inst.properties) return null;
  var out = {}, any = false;
  UNIT_PROPS.forEach(function (name) {
    var t = shortTextOf(inst.properties, name);
    if (t) { out[name] = t; any = true; }
  });
  return any ? out : null;
}

function parseComplications(envelope) {
  var list = (envelope && envelope.instances) || [];
  var entries = [];
  list.forEach(function (inst, pos) {
    var props = inst && inst.properties;
    if (!props) return;
    var category = shortTextOf(props, 'category'), item = shortTextOf(props, 'item'), property = shortTextOf(props, 'property');
    if (!category || !item || !property) return;
    var idx = props.index && props.index.numericValue && typeof props.index.numericValue.value === 'number' ? props.index.numericValue.value : 0;
    var order = parseInt(inst.instanceId, 10);
    entries.push({ category: category, item: item, property: property, index: Math.max(0, Math.floor(idx)), order: isNaN(order) ? pos : order });
  });
  entries.sort(function (a, b) { return a.order - b.order; });
  return entries.slice(0, MAX_COMPLICATIONS).map(function (e) {
    return { category: e.category, item: e.item, property: e.property, index: e.index };
  });
}

function readOnce(request, parse, done) {
  var handle = null, finished = false;
  function finish(value) {
    if (finished) return;
    finished = true;
    if (handle && typeof handle.unsubscribe === 'function') { try { handle.unsubscribe(); } catch (e) { } }
    done(value);
  }
  try {
    handle = Pebble.subscribeToSource({
      category: request.category,
      item: request.item,
      onData: function (envelope) { var v = null; try { v = parse(envelope); } catch (e) { } finish(v); },
      onError: function (err) { console.log('modern: preferences ' + request.item + ' error ' + (err && err.code)); finish(null); }
    });
  } catch (e) {
    console.log('modern: preferences ' + request.item + ' subscribe failed - ' + ((e && e.message) || e));
    finish(null);
    return;
  }
  if (finished && handle && typeof handle.unsubscribe === 'function') { try { handle.unsubscribe(); } catch (e2) { } }
}

function snapshot() {
  return { available: hasApi(), units: cache.units, complications: cache.complications };
}

function capture(timeoutMs, cb) {
  if (!hasApi()) { cb(snapshot()); return; }
  var pending = 2, called = false, timer = null;
  function complete() {
    if (called) return;
    called = true;
    if (timer) clearTimeout(timer);
    saveCache();
    cb(snapshot());
  }
  function oneDone() { if (--pending <= 0) complete(); }
  timer = setTimeout(complete, timeoutMs || 4000);
  readOnce({ category: 'preferences', item: 'units' }, parseUnits, function (u) { if (u) cache.units = u; oneDone(); });
  readOnce({ category: 'preferences', item: 'complications' }, parseComplications, function (c) { if (c) cache.complications = c; oneDone(); });
}

function unitSettings(units) {
  var out = {};
  if (!units) return out;
  if (units.temperature === '°C') out.CONFIG_TEMP_UNIT = 'C';
  else if (units.temperature === '°F') out.CONFIG_TEMP_UNIT = 'F';
  var wind = { 'km/h': 'kmh', 'mph': 'mph', 'm/s': 'ms', 'knots': 'kn' }[units.wind_speed];
  if (wind) out.CONFIG_WIND_SPEED_UNIT = wind;
  if (units.distance === 'km') out.CONFIG_ALTITUDE_UNIT = '0';
  else if (units.distance === 'mi') out.CONFIG_ALTITUDE_UNIT = '1';
  return out;
}

function complicationKey(c) {
  return '|' + c.category + '|' + c.item + '|' + c.property + '#' + (c.index || 0);
}

module.exports = {
  MAX_COMPLICATIONS: MAX_COMPLICATIONS,
  hasApi: hasApi,
  capture: capture,
  snapshot: snapshot,
  unitSettings: unitSettings,
  complicationKey: complicationKey,
  parseUnits: parseUnits,
  parseComplications: parseComplications
};
