// weather data source: Pebble weather plugin (default) or Open-Meteo
var weather = require('./weather');
var pluginManager = require('../plugins/plugin-manager');
var getSetting = require('../settings/settings').getSetting;
var permissions = require('../settings/permissions');

var PLUGIN_TIMEOUT_MS = 6000;
var PROPS = ['temperature', 'high', 'low', 'condition_code', 'uv_index', 'precipitation'];

function numberOf(payloads) {
  if (!payloads) return null;
  var nv = payloads.numericValue;
  if (nv && typeof nv.value === 'number') {
    var v = nv.value;
    if (nv.unit && /F/i.test(nv.unit)) v = (v - 32) * 5 / 9;
    return v;
  }
  var txt = payloads.shortText && payloads.shortText.text;
  if (typeof txt === 'string') {
    var m = /-?[0-9]+(\.[0-9]+)?/.exec(txt);
    if (m) {
      var n = parseFloat(m[0]);
      return /F\s*$/i.test(txt) ? (n - 32) * 5 / 9 : n;
    }
  }
  return null;
}

function textOf(payloads) {
  if (!payloads) return '';
  var k = payloads.longText || payloads.shortText;
  return (k && typeof k.text === 'string') ? k.text : '';
}

var CODE_MAP = {
  sun: { wx: 0, cond: 0 },
  partly_cloudy: { wx: 1, cond: 0 },
  cloudy: { wx: 2, cond: 0 },
  light_rain: { wx: 4, cond: 2 },
  heavy_rain: { wx: 6, cond: 2 },
  light_snow: { wx: 7, cond: 3 },
  heavy_snow: { wx: 7, cond: 3 },
  rain_and_snow: { wx: 9, cond: 2 }
};

function fetchPluginWeather(providerUuid, cb) {
  if (!pluginManager.hasApi()) return cb(new Error('plugins not available'));
  var done = false, handle = null, timer = null;
  function finish(err, value) {
    if (done) return;
    done = true;
    if (timer) clearTimeout(timer);
    if (handle && typeof handle.unsubscribe === 'function') { try { handle.unsubscribe(); } catch (e) { } }
    cb(err, value);
  }
  timer = setTimeout(function () { finish(new Error('weather plugin timed out')); }, PLUGIN_TIMEOUT_MS);
  try {
    handle = Pebble.subscribeToSource({
      category: 'weather',
      item: 'location',
      plugin: providerUuid || undefined,
      properties: PROPS,
      onData: function (env) {
        permissions.mark('weather', false);
        var inst = env && env.instances && env.instances[0];
        if (!inst || !inst.properties) return finish(new Error('no weather location in the Pebble app'));
        var p = inst.properties;
        var temp = numberOf(p.temperature);
        if (temp === null) return finish(new Error('weather plugin has no temperature'));
        finish(null, {
          tempC: temp, tempHighC: numberOf(p.high), tempLowC: numberOf(p.low),
          uv: numberOf(p.uv_index), rainPct: numberOf(p.precipitation),
          code: textOf(p.condition_code).trim().toLowerCase()
        });
      },
      onError: function (err) { permissions.mark('weather', !!err && err.code === 'PERMISSION_DENIED'); finish(new Error('weather plugin: ' + ((err && err.code) || 'error'))); }
    });
    if (done && handle && typeof handle.unsubscribe === 'function') { try { handle.unsubscribe(); } catch (e) { } }
  } catch (e) {
    finish(e);
  }
}

function overlay(snap, p) {
  var out = {};
  Object.keys(snap).forEach(function (k) { out[k] = snap[k]; });
  out.tempC = p.tempC;
  if (p.tempHighC !== null) out.tempHighC = p.tempHighC;
  if (p.tempLowC !== null) out.tempLowC = p.tempLowC;
  if (p.uv !== null) { out.uvIndexMax = p.uv; out.uvIndexCurrent = p.uv; }
  if (p.rainPct !== null) out.rainChancePct = Math.max(0, Math.min(100, p.rainPct));
  var mapped = CODE_MAP[p.code];
  if (mapped) { out.wxNow = mapped.wx; out.condition = mapped.cond; }
  return out;
}

function sourceSetting() { return String(getSetting('CONFIG_WEATHER_SOURCE', 'plugin')); }
function useWeatherPlugin() {
  return sourceSetting().indexOf('plugin') === 0 && pluginManager.hasApi();
}
function providerUuid() {
  var s = sourceSetting();
  return s.indexOf('plugin:') === 0 ? s.slice(7) : '';
}

function getSnapshot(lat, lon, now, cb) {
  if (!useWeatherPlugin()) return weather.getWeatherSnapshot(lat, lon, now, cb);
  fetchPluginWeather(providerUuid(), function (perr, p) {
    weather.getWeatherSnapshot(lat, lon, now, function (err, snap) {
      if (perr) {
        console.log('modern: weather plugin not used (' + perr.message + '), using Open-Meteo');
        return cb(err, snap);
      }
      console.log('modern: weather from the Pebble weather plugin' + (err ? ' (Open-Meteo extras unavailable)' : ''));
      cb(null, overlay(snap, p));
    });
  });
}

module.exports = { getSnapshot: getSnapshot, fetchPluginWeather: fetchPluginWeather, useWeatherPlugin: useWeatherPlugin };
