// Runs once during PKJS startup to migrate saved settings and cached data.
// User configuration remains in localStorage; only obsolete cached message
// payloads and values affected by schema changes are rewritten.

// ---- Settings schema version ---------------------------------------------
// The watch protocol now uses packed settings arrays. Version 3 remaps the
// marker-style IDs; version 4 invalidates cached data from the older layout
// and removes settings for features no longer supported by Modern.
// 3 = marker style ids renumbered: Minimal moved 0 -> 10 and 0 became "None"
//     (it was 9; 9 is Classy now). Stored value and saved snapshots remapped.
// 4 = Modern: digital layouts, sky rendering, flights and sky styles removed;
//     the cached full dict (old key set / blob layout) is discarded.
var SETTINGS_KEY_SCHEMA_VERSION = 4; // 1 = pre-consolidation (86 individual keys), 2 = HANDS/MARKER_RINGS/EDGE_LINE_COLOR_MODE/MARKER_TEXT/COLORS, 3 = marker style renumbering, 4 = Modern
(function migrateSettingsKeySchema() {
  try {
    var stored = parseInt(localStorage.getItem('SETTINGS_KEY_SCHEMA_VERSION'), 10);
    if (stored === SETTINGS_KEY_SCHEMA_VERSION) return; // already current -- nothing to do
    localStorage.removeItem('LAST_FULL_COMPUTED_DICT'); // may be in the old key format; see comment above

    // v3: "Minimal" used to be bigAnalogMarkerStyle 0 and is now 10 (0 is
    // "None" now), so a stored 0 -- including one inside a saved
    // Style-preset snapshot (CONFIG_PRESET_n_JSON, a JSON dump of the
    // Style section incl. its "bigAnalogMarkerStyle") -- has to follow
    // it or it would silently turn into None. A missing key is left
    // alone (the new default is already Minimal).
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
        } catch (e2) { /* one unreadable snapshot mustn't block the rest */ }
      }
    }

    localStorage.setItem('SETTINGS_KEY_SCHEMA_VERSION', String(SETTINGS_KEY_SCHEMA_VERSION));
    console.log('modern: settings-key schema migrated to v' + SETTINGS_KEY_SCHEMA_VERSION + ' (cleared stale LAST_FULL_COMPUTED_DICT, if any; remapped marker style ids)');
  } catch (e) {
    // Storage unavailable/corrupt -- not critical: worst case a stale
    // cached dict's old-format keys ride along in one SETTINGS chunk
    // (enqueueFlatDict() logs and bundles them, doesn't crash), and the
    // very next real refresh recomputes and re-caches in the new format
    // regardless.
  }
})();
