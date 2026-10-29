// ---- first start of the watchface ---------------------------------------------------
//
// When the watch has no persisted settings it applies watch_defaults_apply()
// (src/c/data/watch_defaults.c). The phone's own fallbacks (the getSetting(key, default)
// calls in index.js / settings-codecs.js) differ from those for a few older fields, so a
// settings page opened on a fresh install showed something other than what the watch
// draws. On the very first start (no settings were ever saved on this phone) this module
//
//   1. stores the watch's defaults as the phone's settings (WATCH_DEFAULTS below -- keep in
//      sync with watch_defaults.c), so the page matches the watch, and
//   2. once the Pebble app's user preferences have been read, lays them over that:
//      preferred units (preferences/units) and the preferred complications
//      (preferences/complications) in up to four feature slots.
//
// State (FIRST_RUN_STATE): absent = not decided yet, 'seeded' = defaults stored and the
// preferences still to be applied, 'done'. Anyone who already has saved settings, or saves
// any before the preferences arrive, is marked 'done' and never touched.

var settings = require('./settings');
var setSetting = settings.setSetting;
var preferences = require('../plugins/preferences');

var STATE_KEY = 'FIRST_RUN_STATE';

// Keys every settings save writes: any of them present means settings exist already.
var SAVED_PROBE_KEYS = ['CONFIG_CUSTOM_BG', 'CONFIG_BIG_ANALOG_MARKER_STYLE', 'CONFIG_UPDATE_MINS', 'CONFIG_TEMP_UNIT'];

// Mirrors watch_defaults_apply(): only values that differ from the phone's own fallbacks
// are listed, plus the colours so the three colour pairs are explicit.
var WATCH_DEFAULTS = {
  // White main and accent colours on a black background (packed GColor8).
  CONFIG_CUSTOM_BG: '192', CONFIG_CUSTOM_TEXT: '255', CONFIG_CUSTOM_ACCENT: '255',
  CONFIG_NIGHT_CUSTOM_BG: '192', CONFIG_NIGHT_CUSTOM_TEXT: '255', CONFIG_NIGHT_CUSTOM_ACCENT: '255',
  // Font 27 = Digital Dream (see FONT_TABLE in src/c/fonts/font_lookup.c).
  CONFIG_CORNER_FONT: '27',
  // The "Modern" hand preset (HAND_PRESETS["3"]) and centre circle.
  CONFIG_HAND_HOUR_STYLE: '2', CONFIG_HAND_HOUR_WIDTH: '6', CONFIG_HAND_HOUR_LENGTH: '51', CONFIG_HAND_HOUR_BACK_OFFSET: '10', CONFIG_HAND_HOUR_COLOR: '0',
  CONFIG_HAND_MIN_STYLE: '2', CONFIG_HAND_MIN_WIDTH: '6', CONFIG_HAND_MIN_LENGTH: '78', CONFIG_HAND_MIN_BACK_OFFSET: '10', CONFIG_HAND_MIN_COLOR: '0',
  CONFIG_HAND_SEC_STYLE: '2', CONFIG_HAND_SEC_WIDTH: '2', CONFIG_HAND_SEC_LENGTH: '85', CONFIG_HAND_SEC_BACK_OFFSET: '10', CONFIG_HAND_SEC_COLOR: '1',
  CONFIG_CENTER_CIRCLE_RADIUS: '4', CONFIG_CENTER_CIRCLE_COLOR: '1',
  CONFIG_BIG_ANALOG_MARKER_STYLE: '3',
  // Features: battery logo (content 17) upper-middle line 1, weather icon + temperature (32)
  // bottom-middle line 1, short upper-case weekday (23) top-right, day of month (22) bottom-right.
  CONFIG_UPPER_MIDDLE_LINE1_CONTENT_ANALOG: '17',
  CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG: '32',
  CONFIG_CORNER_TR: '23',
  CONFIG_CORNER_BR: '22'
};

// The four slots the preferred complications go into, in order: upper-middle line 2,
// bottom-middle line 1, then the first line on the left and on the right.
var COMPLICATION_SLOTS = [
  { content: 'CONFIG_UPPER_MIDDLE_LINE2_CONTENT_ANALOG', prims: 'CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS_ANALOG' },
  { content: 'CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG', prims: 'CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG' },
  { content: 'CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG', prims: 'CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS_ANALOG' },
  { content: 'CONFIG_MIDDLE_RIGHT_LINE1_CONTENT_ANALOG', prims: 'CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS_ANALOG' }
];
var PLUGIN_CONTENT_FIRST = 200; // content ids 200-211 = plugin text slots 0-11

function getState() {
  try { return localStorage.getItem(STATE_KEY); } catch (e) { return 'done'; }
}
function setState(v) {
  try { localStorage.setItem(STATE_KEY, v); } catch (e) { /* storage unavailable */ }
}

function settingsAlreadySaved() {
  try {
    return SAVED_PROBE_KEYS.some(function (k) { var v = localStorage.getItem(k); return v !== null && v !== undefined; });
  } catch (e) { return true; } // cannot tell: leave everything alone
}

// Call once at startup, before anything reads settings. Returns true when this is a
// fresh install whose preferences are still to be applied.
function seedIfFresh() {
  var state = getState();
  if (state === 'done') return false;
  if (state === 'seeded') return true;
  if (settingsAlreadySaved()) { setState('done'); return false; }
  setState('seeded'); // first: the defaults below include probe keys
  Object.keys(WATCH_DEFAULTS).forEach(function (k) { setSetting(k, WATCH_DEFAULTS[k]); });
  console.log('modern: first start - watch defaults stored as the phone settings');
  return true;
}

// A settings save counts as "the person has taken over": never apply preferences after it.
function markDone() {
  if (getState() !== 'done') setState('done');
}

function pending() { return getState() === 'seeded'; }

// Applies a preferences snapshot (see preferences.capture) once. pluginManager stores the
// plugin slot list. Returns true when settings changed and should be sent to the watch.
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
