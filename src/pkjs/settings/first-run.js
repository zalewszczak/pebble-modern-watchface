// first start of the watchface
var settings = require('./settings');
var setSetting = settings.setSetting;
var preferences = require('../plugins/preferences');

var STATE_KEY = 'FIRST_RUN_STATE';

var SAVED_PROBE_KEYS = ['CONFIG_CUSTOM_BG', 'CONFIG_BIG_ANALOG_MARKER_STYLE', 'CONFIG_UPDATE_MINS', 'CONFIG_TEMP_UNIT'];

var WATCH_DEFAULTS = {
  CONFIG_CUSTOM_BG: '192', CONFIG_CUSTOM_TEXT: '255', CONFIG_CUSTOM_ACCENT: '255',
  CONFIG_NIGHT_CUSTOM_BG: '192', CONFIG_NIGHT_CUSTOM_TEXT: '255', CONFIG_NIGHT_CUSTOM_ACCENT: '255',
  CONFIG_CORNER_FONT: '27',
  CONFIG_HAND_HOUR_STYLE: '2', CONFIG_HAND_HOUR_WIDTH: '6', CONFIG_HAND_HOUR_LENGTH: '51', CONFIG_HAND_HOUR_BACK_OFFSET: '10', CONFIG_HAND_HOUR_COLOR: '0',
  CONFIG_HAND_MIN_STYLE: '2', CONFIG_HAND_MIN_WIDTH: '6', CONFIG_HAND_MIN_LENGTH: '78', CONFIG_HAND_MIN_BACK_OFFSET: '10', CONFIG_HAND_MIN_COLOR: '0',
  CONFIG_HAND_SEC_STYLE: '2', CONFIG_HAND_SEC_WIDTH: '2', CONFIG_HAND_SEC_LENGTH: '85', CONFIG_HAND_SEC_BACK_OFFSET: '10', CONFIG_HAND_SEC_COLOR: '1',
  CONFIG_CENTER_CIRCLE_RADIUS: '4', CONFIG_CENTER_CIRCLE_COLOR: '1',
  CONFIG_BIG_ANALOG_MARKER_STYLE: '3',
  CONFIG_UPPER_MIDDLE_LINE1_CONTENT_ANALOG: '17',
  CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG: '32',
  CONFIG_CORNER_TR: '23',
  CONFIG_CORNER_BR: '22'
};

var COMPLICATION_SLOTS = [
  { content: 'CONFIG_UPPER_MIDDLE_LINE2_CONTENT_ANALOG', prims: 'CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS_ANALOG' },
  { content: 'CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG', prims: 'CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG' },
  { content: 'CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG', prims: 'CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS_ANALOG' },
  { content: 'CONFIG_MIDDLE_RIGHT_LINE1_CONTENT_ANALOG', prims: 'CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS_ANALOG' }
];
var PLUGIN_CONTENT_FIRST = 200;

function getState() {
  try { return localStorage.getItem(STATE_KEY); } catch (e) { return 'done'; }
}
function setState(v) {
  try { localStorage.setItem(STATE_KEY, v); } catch (e) { }
}

function settingsAlreadySaved() {
  try {
    return SAVED_PROBE_KEYS.some(function (k) { var v = localStorage.getItem(k); return v !== null && v !== undefined; });
  } catch (e) { return true; }
}

function seedIfFresh() {
  var state = getState();
  if (state === 'done') return false;
  if (state === 'seeded') return true;
  if (settingsAlreadySaved()) { setState('done'); return false; }
  setState('seeded');
  Object.keys(WATCH_DEFAULTS).forEach(function (k) { setSetting(k, WATCH_DEFAULTS[k]); });
  console.log('modern: first start - watch defaults stored as the phone settings');
  return true;
}

function markDone() {
  if (getState() !== 'done') setState('done');
}

function pending() { return getState() === 'seeded'; }

function applyPreferences(prefs, pluginManager) {
  if (!pending()) return false;
  setState('done');
  var changed = false;

  var units = preferences.unitSettings(prefs && prefs.units);
  Object.keys(units).forEach(function (k) { setSetting(k, units[k]); changed = true; });

  var comps = (prefs && prefs.complications) || [];
  if (comps.length) {
    var slots = pluginManager.getSlots();
    var used = 0;
    comps.slice(0, COMPLICATION_SLOTS.length).forEach(function (c, i) {
      var key = preferences.complicationKey(c);
      var s = slots.indexOf(key);
      if (s < 0) { s = slots.indexOf(''); if (s < 0) return; slots[s] = key; }
      var target = COMPLICATION_SLOTS[i];
      setSetting(target.content, String(PLUGIN_CONTENT_FIRST + s));
      setSetting(target.prims, '');
      used++;
    });
    if (used) { pluginManager.setSlots(slots); changed = true; }
  }
  console.log('modern: first start - user preferences applied (' + Object.keys(units).length + ' units, ' + comps.length + ' complications)');
  return changed;
}

module.exports = {
  WATCH_DEFAULTS: WATCH_DEFAULTS,
  COMPLICATION_SLOTS: COMPLICATION_SLOTS,
  seedIfFresh: seedIfFresh,
  markDone: markDone,
  pending: pending,
  applyPreferences: applyPreferences
};
