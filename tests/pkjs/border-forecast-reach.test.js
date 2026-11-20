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

test('border ring stays full for a day after the last refresh when the forecast carries absolute hours', { skip: !border }, () => {
  const N = 37, temps = [], wx = [], rain = [];
  for (let i = 0; i < N; i++) { temps.push(i); wx.push(1); rain.push(0); }
  // Fetched at 08:40 -> the data starts at the hour that contains it, 08:00.
  const fetched = new Date(2026, 10, 20, 8, 40).getTime();
  const start = new Date(2026, 10, 20, 8, 0).getTime();
  const real = Date.now;
  Date.now = () => fetched;
  border.setWeather({ forecastTempC: temps.slice(0, 15), forecastWx: wx.slice(0, 15), forecastRainPct: rain.slice(0, 15),
    borderHourly: { start, tempC: temps, wx, rain, tempColor: temps.map(() => 0xC3) } }, temps.slice(0, 15).map(() => 0xC3));
  Date.now = real;
  const RealDate = Date;
  try {
    for (const hoursLater of [0, 1, 5, 12, 20, 24]) {
      const at = new RealDate(2026, 10, 20, 8, 50).getTime() + hoursLater * 3600000;
      global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [at])); } static now() { return at; } };
      const bytes = border.bytes();
      const layer = bytes.slice(1, 13);
      assert.ok(layer.every((b) => b !== 0), hoursLater + 'h later: ' + layer.join(','));
    }
    // 30 hours after the fetch the oldest sectors have run out of data again (not wrong, just transparent).
    const at = new RealDate(2026, 10, 20, 8, 50).getTime() + 30 * 3600000;
    global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [at])); } static now() { return at; } };
    assert.ok(border.bytes().slice(1, 13).some((b) => b === 0), 'far-future sectors are transparent');
  } finally { global.Date = RealDate; }
});

test('border ring sectors line up with their own clock hour (forecast fetched after :30)', { skip: !border }, () => {
  const temps = [], wx = [], rain = [];
  for (let i = 0; i < 36; i++) { temps.push(i * 3 - 10); wx.push(1); rain.push(0); }
  const start = new Date(2026, 10, 20, 10, 0).getTime(); // entry 0 = 10:00 (a source that starts later)
  const real = Date.now; Date.now = () => new Date(2026, 10, 20, 8, 40).getTime();
  border.setWeather({ forecastTempC: temps.slice(0, 15), forecastWx: wx.slice(0, 15), forecastRainPct: rain.slice(0, 15),
    borderHourly: { start, tempC: temps, wx, rain, tempColor: temps.map((t) => 0xC0 + (t & 63)) } }, temps.slice(0, 15).map(() => 0xC3));
  Date.now = real;
  const RealDate = Date;
  const at = new RealDate(2026, 10, 20, 8, 50).getTime();
  global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [at])); } static now() { return at; } };
  try {
    const layer = border.bytes().slice(1, 13);
    // 09:00 has no data yet (the first entry is 10:00), 10:00 is entry 0, 11:00 entry 1 ...
    assert.strictEqual(layer[9], 0, 'sector 9 (09:00) is before the forecast start');
    assert.notStrictEqual(layer[10], 0);
    assert.notStrictEqual(layer[11], layer[10]);
  } finally { global.Date = RealDate; }
});
