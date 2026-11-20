const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.Pebble = global.Pebble || { getActiveWatchInfo: () => ({ platform: 'emery' }) };
const settings = require(path.join(__dirname, '../../src/pkjs/settings/settings.js'));
settings.setSetting('CONFIG_BORDER_SOURCE', '1');
settings.setSetting('CONFIG_BORDER_WEATHER_MODE', '2');
let border;
try { border = require(path.join(__dirname, '../../src/pkjs/border/border-data.js')); } catch (e) { border = null; }

test('border ring keeps all 12 sectors filled with a forecast that is up to 4 hours old', { skip: !border }, () => {
  const temps = [], wx = [], rain = [];
  for (let i = 0; i < 16; i++) { temps.push(10 + i); wx.push(1); rain.push(0); }
  const real = Date.now;
  const t0 = new Date(2026, 10, 20, 8, 20).getTime();
  Date.now = () => t0;
  border.setWeather({ forecastTempC: temps.slice(0, 15), forecastWx: wx.slice(0, 15), forecastRainPct: rain.slice(0, 15),
    borderHourly: { tempC: temps, wx, rain, tempColor: temps.map(() => 0xC3) } }, temps.slice(0, 15).map(() => 0xC3));
  Date.now = real;
  const RealDate = Date;
  try {
    for (const age of [0, 1, 3, 4]) {
      const at = t0 + age * 3600000;
      global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [at])); } static now() { return at; } };
      const bytes = border.bytes();
      assert.ok(bytes.length > 12, 'ring has data');
      const layer = bytes.slice(1, 13);
      assert.ok(layer.every((b) => b !== 0), 'age ' + age + 'h: ' + layer.join(','));
    }
  } finally { global.Date = RealDate; }
});
