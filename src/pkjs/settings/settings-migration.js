// Runs once during PKJS startup to migrate saved settings and cached data.
var SETTINGS_KEY_SCHEMA_VERSION = 4;
(function migrateSettingsKeySchema() {
  try {
    var stored = parseInt(localStorage.getItem('SETTINGS_KEY_SCHEMA_VERSION'), 10);
    if (stored === SETTINGS_KEY_SCHEMA_VERSION) return;
    localStorage.removeItem('LAST_FULL_COMPUTED_DICT');

    if (isNaN(stored) || stored < 3) {
      if (localStorage.getItem('CONFIG_BIG_ANALOG_MARKER_STYLE') === '0') {
        localStorage.setItem('CONFIG_BIG_ANALOG_MARKER_STYLE', '10');
      }
      for (var n = 1; n <= 6; n++) {
        var key = 'CONFIG_PRESET_' + n + '_JSON';
        try {
          var raw = localStorage.getItem(key);
          if (!raw) continue;
          var snapshot = JSON.parse(raw);
          if (snapshot && snapshot.bigAnalogMarkerStyle === '0') {
            snapshot.bigAnalogMarkerStyle = '10';
            localStorage.setItem(key, JSON.stringify(snapshot));
          }
        } catch (e2) { }
      }
    }

    localStorage.setItem('SETTINGS_KEY_SCHEMA_VERSION', String(SETTINGS_KEY_SCHEMA_VERSION));
    console.log('modern: settings-key schema migrated to v' + SETTINGS_KEY_SCHEMA_VERSION + ' (cleared stale LAST_FULL_COMPUTED_DICT, if any; remapped marker style ids)');
  } catch (e) {
  }
})();
