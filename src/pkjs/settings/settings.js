// Local settings storage.
//
// The phone app is shared by every watch the user owns, but a Pebble Time 2, a Pebble Round 2 and the black and
// white watches have very different screens, so their look is stored separately: a "visual" setting is saved
// under its own name plus the platform suffix ('' for emery, '_R' for gabbro, '_BW' for diorite/flint; see
// platform.js). Preferences that belong to the user rather than to a screen (location, weather source, units,
// update schedule, step goal, vibration, plugins, debug) are shared by all watches.
var platform = require('../platform');

// Keys that stay the same on every platform (anything else starting with CONFIG_ or SCHEDULE_ is per platform).
var SHARED = /^CONFIG_(AUTO_LOC|LAT|LON|LOCATION_NAME|WEATHER_SOURCE|OWM_KEY|UPDATE_MINS|LOC_[A-Z_]+|TEMP_UNIT|WIND_SPEED_UNIT|AQI_UNIT|ALTITUDE_UNIT|STEP_GOAL|PLUGIN_SLOTS|HOURLY_VIBE_[A-Z_]+|BT_LOST_VIBE|BATTERY_SAVER_ENABLED|DEBUG_[A-Z_]+|TEST_[A-Z_]+|DRAW_DEBUG)$/;

function isScoped(key) {
  return platform.suffix !== '' && /^(CONFIG_|SCHEDULE_)/.test(key) && !SHARED.test(key);
}
function scopedKey(key) { return isScoped(key) ? key + platform.suffix : key; }

// First start of this platform: take over a copy of the settings stored before the platforms were separated (they
// all lived under the plain names), so an existing round or B&W setup is not lost; from then on the copies diverge.
// Where the runtime cannot list its keys, reads fall back to the plain name until the key is written once.
var lazyFallback = false;
(function adoptLegacySettings() {
  if (platform.suffix === '') return;
  try {
    var flag = 'SETTINGS_SCOPED' + platform.suffix;
    if (localStorage.getItem(flag)) return;
    var n = localStorage.length;
    if (typeof n !== 'number' || typeof localStorage.key !== 'function') { lazyFallback = true; return; }
    var keys = [], i;
    for (i = 0; i < n; i++) keys.push(localStorage.key(i));
    keys.forEach(function (k) {
      // Background pictures are sized for one screen (bg-image-sync keeps its own per-platform copies).
      if (!k || !isScoped(k) || /_(R|BW)$/.test(k) || /^CONFIG_BG_SLOT_/.test(k)) return;
      if (localStorage.getItem(k + platform.suffix) === null) localStorage.setItem(k + platform.suffix, localStorage.getItem(k));
    });
    localStorage.setItem(flag, '1');
  } catch (e) { lazyFallback = true; }
})();

function getRaw(key) {
  var v = localStorage.getItem(scopedKey(key));
  if ((v === null || v === undefined) && lazyFallback && isScoped(key)) v = localStorage.getItem(key);
  return v;
}

function getSetting(key, fallback) {
  var v = getRaw(key);
  return (v === null || v === undefined || v === '') ? fallback : v;
}

function setSetting(key, value) {
  if (value === null || value === undefined) return;
  localStorage.setItem(scopedKey(key), value);
}

function removeSetting(key) {
  localStorage.removeItem(scopedKey(key));
}

module.exports = {
  getSetting: getSetting,
  setSetting: setSetting,
  getRaw: getRaw,
  removeSetting: removeSetting,
  scopedKey: scopedKey,
  isScoped: isScoped
};
