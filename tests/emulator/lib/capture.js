'use strict';
// Runs the REAL phone-side code (src/pkjs) for one scenario on one platform and prints the AppMessage
// dictionaries it would send, as JSON on stdout. Run as a child process so every run starts from a clean
// module state (src/pkjs/platform.js decides the platform when first loaded).
//
//   node capture.js <effective-scenario.json>      (written by run.js, see lib/scenario.js)
var fs = require('fs');
var path = require('path');
var datasets = require('./datasets');
var projectInfo = require('./projectinfo');

var PROJECT = path.resolve(__dirname, '..', '..', '..');
var PKJS = path.join(PROJECT, 'src', 'pkjs');

function merge(base, over) {
  var out = {}, k;
  for (k in base) out[k] = base[k];
  for (k in (over || {})) out[k] = over[k];
  return out;
}

// A preset background that does not exist on this platform (e.g. only some exist on round, none on B&W)
// is replaced by one that does, or switched off.
function fixBackground(preset, platform, bgImages) {
  if (!preset || !preset.useCustomBg || !/^p:/.test(String(preset.bgSource || ''))) return preset;
  var avail;
  if (platform === 'gabbro' || platform === 'chalk') avail = Object.keys(bgImages.imagesRound || {});
  else if (platform === 'flint' || platform === 'diorite' || platform === 'aplite') avail = Object.keys(bgImages.imagesBw || {});
  else avail = (bgImages.numbers || []).map(String);
  var out = merge(preset);
  var want = String(out.bgSource).slice(2);
  if (avail.indexOf(want) >= 0) return out;
  if (avail.length) out.bgSource = 'p:' + avail[0];
  else out.useCustomBg = false;
  return out;
}

// A bitmap indices style that has no bitmaps on this platform (resources differ per platform) draws nothing:
// use the first bitmap style the platform does have, so the scenario still shows indices.
function fixMarkerStyle(preset, platform) {
  if (!preset || preset.bigAnalogMarkerStyle === undefined) return preset;
  var id = String(preset.bigAnalogMarkerStyle), info = projectInfo.info(platform);
  var isBitmap = !(info.drawnIndices.indexOf(id) >= 0 || id === '8');
  if (!isBitmap || info.bitmapIndices.indexOf(id) >= 0 || !info.bitmapIndices.length) return preset;
  var out = merge(preset);
  out.bigAnalogMarkerStyle = info.bitmapIndices[0];
  return out;
}

function main() {
  var eff = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  var platform = eff.platform;

  // ---- fixed "now": the phone-side date maths (sunrise, moon, date complications) must match the watch ----
  var RealDate = Date;
  var fixed = new RealDate(eff.nowIso).getTime();
  function FakeDate(a, b, c, d, e, f, g) {
    if (!(this instanceof FakeDate)) return new RealDate(fixed).toString();
    var args = [a, b, c, d, e, f, g].slice(0, arguments.length);
    var inst = arguments.length === 0 ? new RealDate(fixed) : new (Function.prototype.bind.apply(RealDate, [null].concat(args)))();
    return inst;
  }
  FakeDate.prototype = RealDate.prototype;
  FakeDate.now = function () { return fixed; };
  FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse;
  global.Date = FakeDate;

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
  var logs = [];
  console.log = function () { logs.push(Array.prototype.join.call(arguments, ' ')); };
  console.warn = console.log;

  // 1. determinism defaults + platform defaults
  Object.keys(eff.settingsBase || {}).forEach(function (k) { store[k] = String(eff.settingsBase[k]); });
  // 2. preset, applied by the app's own routine
  var presets = require(path.join(PKJS, 'example-style-presets'));
  var scheduled = require(path.join(PKJS, 'scheduled-style'));
  var bgImages = require(path.join(PKJS, 'data', 'generated', 'background-images'));
  var preset = null;
  if (eff.exampleStyle) {
    var ex = presets[String(eff.exampleStyle)];
    if (!ex || !ex.preset) throw new Error('scenario ' + eff.name + ': example style ' + eff.exampleStyle + ' has no preset');
    preset = ex.preset;
  }
  if (eff.preset && Object.keys(eff.preset).length) preset = merge(preset || {}, eff.preset);
  preset = fixMarkerStyle(fixBackground(preset, platform, bgImages), platform);
  var written = preset ? scheduled.applyPreset(preset) : 0;
  // 3. raw overrides last, so a scenario can pin anything
  Object.keys(eff.settingsAfter || {}).forEach(function (k) { store[k] = String(eff.settingsAfter[k]); });

  var encoder = require(path.join(PKJS, 'comms', 'message-encoder'));
  var astro = require(path.join(PKJS, 'astro'));
  encoder.sendFlatDict(encoder.buildFullKeysetDict());

  // 4. data: exactly what refresh-manager builds, from fixed inputs
  if (eff.data !== null) {
    var ds = datasets.resolve(eff.dataset, eff.data);
    var lat = eff.location.lat, lon = eff.location.lon, now = new Date();
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    var nextDayStart = new Date(dayStart.getTime() + 86400000);
    var rs = function (start, getter) { return astro.findRiseSet(start, lat, lon, getter); };
    var astroData = {
      moonPhase: astro.computeMoonPhase(now),
      riseSet: {
        sun: rs(dayStart, function (g) { return g.sunAlt; }), mercury: rs(dayStart, function (g) { return g.mercuryAlt; }),
        venus: rs(dayStart, function (g) { return g.venusAlt; }), mars: rs(dayStart, function (g) { return g.marsAlt; }),
        jupiter: rs(dayStart, function (g) { return g.jupiterAlt; }), saturn: rs(dayStart, function (g) { return g.saturnAlt; })
      },
      sunRiseTomorrow: rs(nextDayStart, function (g) { return g.sunAlt; }).rise,
      saturnRingOpenPct: astro.saturnRingOpenPct(now, lat, lon),
      meteorShower: astro.activeMeteorShower(now)
    };
    var extra = JSON.parse(JSON.stringify(ds.extra));
    extra.altitudeMeters = ds.extra.altitudeMeters;
    encoder.sendWeatherData({
      weather: ds.weather, weatherOk: true, weatherErrorCode: 0, headlineSources: 0, headlineCloud: 0,
      locationName: ds.locationName, astro: astroData, extraWeather: extra,
      issPos: { nextPass: new Date(fixed + ds.issInHours * 3600000) }, issErrorCode: 0
    });
  }

  // The queue pumps through timers; give it a few ticks, then report.
  realSetTimeout(function () {
    process.stdout.write(JSON.stringify({
      platform: platform, scenario: eff.name, presetFieldsApplied: written, messages: sent, logs: logs
    }));
  }, 50);
}

module.exports = { merge: merge, fixBackground: fixBackground, fixMarkerStyle: fixMarkerStyle };
if (require.main === module) main();
