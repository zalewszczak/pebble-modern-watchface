'use strict';
// Runs the REAL phone-side code (src/pkjs) for one scenario on one platform and prints the AppMessage
// dictionaries it would send, as JSON on stdout. Run as a child process so every run starts from a clean
// module state (src/pkjs/platform.js decides the platform when first loaded).
//
//   node capture.js <platform> <scenario.json> [defaults.json]
var fs = require('fs');
var path = require('path');

var PROJECT = path.resolve(__dirname, '..', '..', '..');
var PKJS = path.join(PROJECT, 'src', 'pkjs');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function merge(base, over) {
  var out = {}, k;
  for (k in base) out[k] = base[k];
  for (k in (over || {})) out[k] = over[k];
  return out;
}

function main() {
  var platform = process.argv[2];
  var scenarioPath = process.argv[3];
  var defaultsPath = process.argv[4] || path.join(__dirname, '..', 'scenarios', '_defaults.json');
  if (!platform || !scenarioPath) { console.error('usage: capture.js <platform> <scenario.json> [defaults.json]'); process.exit(2); }
  var scenario = loadJson(scenarioPath);
  var defaults = loadJson(defaultsPath);

  // ---- shims for the PebbleKit JS runtime ----
  var store = {};
  global.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    setItem: function (k, v) { store[k] = String(v); },
    removeItem: function (k) { delete store[k]; },
    clear: function () { store = {}; }
  };
  var sent = [];
  global.Pebble = {
    getActiveWatchInfo: function () { return { platform: platform, model: platform, firmware: { major: 4, minor: 4 } }; },
    sendAppMessage: function (dict, ok) { sent.push(JSON.parse(JSON.stringify(dict))); if (ok) ok(); },
    addEventListener: function () {}, removeEventListener: function () {},
    getAccountToken: function () { return 'test'; }, getWatchToken: function () { return 'test'; },
    getTimelineToken: function () {}, openURL: function () {}, showSimpleNotificationOnPebble: function () {}
  };
  // The send queue waits 5 s after start before sending; skip that wait.
  var realSetTimeout = global.setTimeout;
  global.setTimeout = function (fn, ms) { return realSetTimeout(fn, (ms >= 5000) ? 0 : ms); };
  // Keep the real code's console.log chatter off stdout (stdout carries the JSON result).
  var logs = [];
  console.log = function () { logs.push(Array.prototype.join.call(arguments, ' ')); };
  console.warn = console.log;

  // 1. determinism defaults
  Object.keys(defaults.settings || {}).forEach(function (k) { store[k] = String(defaults.settings[k]); });
  // 2. preset, applied by the app's own routine
  var presets = require(path.join(PKJS, 'example-style-presets'));
  var scheduled = require(path.join(PKJS, 'scheduled-style'));
  var preset = scenario.preset || null;
  if (scenario.exampleStyle) {
    var ex = presets[String(scenario.exampleStyle)];
    if (!ex || !ex.preset) throw new Error('scenario ' + scenario.name + ': example style ' + scenario.exampleStyle + ' has no preset');
    preset = merge(ex.preset, scenario.preset);
  }
  var written = preset ? scheduled.applyPreset(preset) : 0;
  // 3. raw overrides last, so a scenario can pin anything
  Object.keys(defaults.afterPreset || {}).forEach(function (k) { store[k] = String(defaults.afterPreset[k]); });
  Object.keys(scenario.settings || {}).forEach(function (k) { store[k] = String(scenario.settings[k]); });

  var encoder = require(path.join(PKJS, 'comms', 'message-encoder'));
  // settings first (the whole keyset), then the fake weather the scenario pins
  encoder.sendFlatDict(encoder.buildFullKeysetDict());
  var weather = merge(defaults.weather || {}, scenario.weather);
  if (scenario.weather !== null) encoder.sendFakeWeather(weather);

  // The queue pumps through timers; give it a few ticks, then report.
  realSetTimeout(function () {
    process.stdout.write(JSON.stringify({
      platform: platform, scenario: scenario.name, presetFieldsApplied: written, messages: sent, logs: logs
    }));
  }, 50);
}

module.exports = { merge: merge };
if (require.main === module) main();
