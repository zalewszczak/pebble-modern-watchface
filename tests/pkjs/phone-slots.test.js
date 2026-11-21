// Tests of the phone slot compiler (src/pkjs/comms/phone-slots.js). No emulator and no Pebble SDK needed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', '..', 'src');
const PRIM = require(path.join(SRC, 'pkjs/config/primitive-ids-generated.js'));
const slots = require(path.join(SRC, 'pkjs/comms/phone-slots.js'));
const wn = require(path.join(SRC, 'pkjs/weather/weather-normalize.js'));
const F = slots.FLAGS;
const GRAY = 0xEA, WHITE = 0xFF, RED = 0xF0;

// Reads the table back the way the watch does (phone_slot_find / resolve_phone_slot in primitive_resolver.c).
function decode(bytes) {
  const out = [];
  let p = 0;
  while (p + 3 <= bytes.length && bytes[p] !== F.END) {
    const flags = bytes[p];
    if (flags & F.ICON) {
      out.push({ icon: true, flags, color: bytes[p + 1], kind: bytes[p + 2], aux: bytes[p + 3] | (bytes[p + 4] << 8) });
      p += 5;
    } else {
      const len = bytes[p + 2];
      out.push({ icon: false, flags, color: bytes[p + 1], text: String.fromCharCode.apply(null, bytes.slice(p + 3, p + 3 + len)) });
      p += 3 + len;
    }
  }
  return out;
}

function ctx(over) {
  const base = {
    s: { errorCode: 0, loc: '', w: {}, x: {}, a: {}, fc: [] },
    u: { temp: 0, wind: 0, aqi: 0, alt: 0 },
    plugins: [], phone: { pct: 255, charging: 0 }, music: { state: 0, title: '', artist: '' }
  };
  const c = Object.assign(base, over || {});
  return c;
}
function weatherCtx(u) {
  return ctx({
    u: Object.assign({ temp: 0, wind: 0, aqi: 0, alt: 0 }, u || {}),
    s: {
      errorCode: 0, loc: 'Oslo',
      w: { cond: 0, cloud: 30, tempC: 21.6, tempHighC: 25, tempLowC: 12, uvIndexMax: 7.4, uvIndexCurrent: 3, rainChancePct: 40, humidityPct: 65, windSpeedKmh: 18 },
      x: { altM: 120, windDirDeg: 200, dewPointC: 9, pressureHpa: 1013, pressureTrend: 1, aqiUs: 42, aqiEu: 18, auroraKpX10: 35, auroraErr: 0 },
      a: { moonPct: 50, moonWaxing: true, saturnPct: 12, meteorName: 'Perseids', meteorIntensity: 80 },
      fc: [20, 21, 22, 23, 24, 25, 26, 27, 28, null, null, null, null, null, null]
    }
  });
}
// compile ONE id (with aux) and return its single decoded record
function one(id, c, aux) {
  const r = slots.compile([id], [aux || 0], c);
  assert.strictEqual(r.ids[0], PRIM.PRIM_PHONE_SLOT, 'compiled to a slot');
  return decode(r.bytes)[0];
}

test('wire constants match the C headers', () => {
  const wd = fs.readFileSync(path.join(SRC, 'c/data/watch_data.h'), 'utf8');
  const def = (n) => parseInt(new RegExp('#define\\s+' + n + '\\s+(0x[0-9A-Fa-f]+)').exec(wd)[1], 16);
  assert.strictEqual(def('PHONE_SLOT_ICON'), F.ICON);
  assert.strictEqual(def('PHONE_SLOT_MAIN'), F.MAIN);
  assert.strictEqual(def('PHONE_SLOT_FORCE'), F.FORCE);
  assert.strictEqual(def('PHONE_SLOT_PUNCT'), F.PUNCT);
  assert.strictEqual(def('PHONE_SLOT_FLAG'), F.FLAG);
  assert.strictEqual(def('PHONE_SLOT_END'), F.END);
  const ids = fs.readFileSync(path.join(SRC, 'c/features/primitives/primitive_ids.h'), 'utf8');
  assert.ok(/PRIM_PHONE_SLOT\b/.test(ids));
  assert.strictEqual(PRIM.PRIM_PHONE_SLOT, 154);
});

test('no phone-owned id is still resolved on the watch', () => {
  const resolver = fs.readFileSync(path.join(SRC, 'c/features/primitives/primitive_resolver.c'), 'utf8');
  Object.keys(PRIM).forEach((name) => {
    if (name === 'PRIM_PHONE_SLOT' || !slots.isPhoneOwned(PRIM[name])) return;
    assert.ok(!new RegExp('case\\s+' + name + '\\s*:').test(resolver), name + ' is phone-owned but the watch still has a case for it');
  });
});

test('temperatures follow the unit setting and keep the gradient colour', () => {
  const c = weatherCtx({ temp: 0 });
  assert.strictEqual(one(PRIM.PRIM_CURRENT_TEMP_TEXT, c).text, '22');
  assert.strictEqual(one(PRIM.PRIM_CURRENT_TEMP_TEXT, c).color, wn.tempGradientColorByte(21.6));
  assert.strictEqual(one(PRIM.PRIM_CURRENT_TEMP_TEXT, weatherCtx({ temp: 1 })).text, '71');
  assert.strictEqual(one(PRIM.PRIM_CURRENT_TEMP_TEXT, weatherCtx({ temp: 2 })).text, '295');
  assert.strictEqual(one(PRIM.PRIM_TEMP_HIGH_ONLY_TEXT, c).text, 'H 25');
  assert.strictEqual(one(PRIM.PRIM_TEMP_LOW_ONLY_TEXT, c).text, 'L 12');
  assert.strictEqual(one(PRIM.PRIM_FEELS_LIKE_TEXT, c).text.indexOf('FL '), 0);
  assert.strictEqual(one(PRIM.PRIM_FEELS_LIKE_VALUE, c).text.indexOf('FL'), -1);
  assert.strictEqual(one(PRIM.PRIM_DEW_POINT_TEXT, c).flags, F.MAIN);
});

test('the H / L labels take the colour of the value they describe', () => {
  const c = weatherCtx();
  assert.strictEqual(one(PRIM.PRIM_LABEL_HIGH_PREFIX, c).text, 'H');
  assert.strictEqual(one(PRIM.PRIM_LABEL_HIGH_PREFIX, c).color, one(PRIM.PRIM_TEMP_HIGH_TEXT, c).color);
  assert.strictEqual(one(PRIM.PRIM_LABEL_LOW_PREFIX, c).color, one(PRIM.PRIM_TEMP_LOW_TEXT, c).color);
});

test('a whole feature sequence compiles to numbered slots and keeps the watch-side ids', () => {
  const c = weatherCtx();
  // content 76: condition icon (watch), current temp, space, H, high, space, L, low
  const ids = [PRIM.PRIM_WEATHER_CONDITION_ICON, PRIM.PRIM_CURRENT_TEMP_TEXT, PRIM.PRIM_SPACE,
    PRIM.PRIM_LABEL_HIGH_PREFIX, PRIM.PRIM_TEMP_HIGH_TEXT, PRIM.PRIM_SPACE, PRIM.PRIM_LABEL_LOW_PREFIX, PRIM.PRIM_TEMP_LOW_TEXT, 0, 0];
  const r = slots.compile(ids, new Array(10).fill(0), c);
  const S = PRIM.PRIM_PHONE_SLOT;
  assert.deepStrictEqual(r.ids, [PRIM.PRIM_WEATHER_CONDITION_ICON, S, PRIM.PRIM_SPACE, S, S, PRIM.PRIM_SPACE, S, S, 0, 0]);
  assert.deepStrictEqual(r.aux, [0, 0, 0, 1, 2, 0, 3, 4, 0, 0]);
  assert.deepStrictEqual(decode(r.bytes).map((x) => x.text), ['22', 'H', '25', 'L', '12']);
  assert.strictEqual(r.bytes[r.bytes.length - 1], F.END);
});

test('ids that depend on the watch clock or sensors pass through untouched', () => {
  const keep = [PRIM.PRIM_TIME_HM, PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_STEPS_VALUE, PRIM.PRIM_SUN_EVENT_TIME,
    PRIM.PRIM_COMPASS_DIR_TEXT, PRIM.PRIM_ISS_NEXT_PASS, PRIM.PRIM_NEXT_PLANET_RISE, PRIM.PRIM_MEDIA_PROGRESS_BAR,
    PRIM.PRIM_WEATHER_CONDITION_ICON, PRIM.PRIM_TIMEZONE_TIME];
  const r = slots.compile(keep, keep.map((_, i) => i), weatherCtx());
  assert.deepStrictEqual(r.ids, keep);
  assert.deepStrictEqual(r.aux, keep.map((_, i) => i));
  assert.deepStrictEqual(r.bytes, [F.END]);
});

test('percent / wind / cloud / pressure / altitude / air quality texts', () => {
  const c = weatherCtx();
  assert.strictEqual(one(PRIM.PRIM_RAIN_CHANCE_TEXT, c).text, '40%');
  assert.strictEqual(one(PRIM.PRIM_HUMIDITY_TEXT, c).text, '65%');
  assert.strictEqual(one(PRIM.PRIM_WIND_SPEED_TEXT, c).text, '18');
  assert.strictEqual(one(PRIM.PRIM_WIND_SPEED_TEXT, weatherCtx({ wind: 1 })).text, '11');
  assert.strictEqual(one(PRIM.PRIM_CLOUD_COVER_TEXT, c).text, '30%');
  assert.strictEqual(one(PRIM.PRIM_VISIBILITY_TEXT, c).text, '70%');
  assert.strictEqual(one(PRIM.PRIM_PRESSURE_TEXT, c).text, '1013 hPa');
  assert.strictEqual(one(PRIM.PRIM_PRESSURE_VALUE, c).text, '1013');
  assert.strictEqual(one(PRIM.PRIM_ALTITUDE_TEXT, c).text, '120m');
  assert.strictEqual(one(PRIM.PRIM_ALTITUDE_TEXT, weatherCtx({ alt: 1 })).text, '393ft');
  assert.strictEqual(one(PRIM.PRIM_ALTITUDE_VALUE, weatherCtx({ alt: 1 })).text, '393');
  assert.strictEqual(one(PRIM.PRIM_AQI_TEXT, c).text, 'AQI 42');
  assert.strictEqual(one(PRIM.PRIM_AQI_TEXT, weatherCtx({ aqi: 1 })).text, 'AQI 18');
  assert.strictEqual(one(PRIM.PRIM_AQI_VALUE, c).text, '42');
  assert.strictEqual(one(PRIM.PRIM_UV_DAILY_TEXT, c).text, 'UV7');
  assert.strictEqual(one(PRIM.PRIM_UV_DAILY_VALUE, c).text, '7');
  assert.strictEqual(one(PRIM.PRIM_CURRENT_CONDITIONS_TEXT, c).text, 'P.Cloudy');
});

test('icons carry kind, aux and tint', () => {
  const c = weatherCtx();
  let r = one(PRIM.PRIM_RAIN_CHANCE_ICON, c);
  assert.deepStrictEqual([r.icon, r.kind, r.aux], [true, 5, 0]);
  assert.strictEqual(r.color, one(PRIM.PRIM_RAIN_CHANCE_TEXT, c).color);
  r = one(PRIM.PRIM_PRESSURE_TREND_ICON, c);
  assert.deepStrictEqual([r.kind, r.aux], [15, 1]);
  r = one(PRIM.PRIM_WIND_DIRECTION_ICON, c);
  assert.deepStrictEqual([r.kind, r.aux, r.flags & F.MAIN], [16, 200, F.MAIN]);
  assert.strictEqual(one(PRIM.PRIM_WIND_DIRECTION_TEXT, c).text, 'S');
  r = one(PRIM.PRIM_MOON_PHASE_ICON, c);
  assert.deepStrictEqual([r.kind, r.aux, !!(r.flags & F.FLAG), r.color], [4, 50, true, WHITE]);
  assert.strictEqual(one(PRIM.PRIM_MOON_PHASE_NAME, c).text, '1stQ');
});

test('forecast slots use their aux as the index', () => {
  const c = weatherCtx();
  assert.strictEqual(one(PRIM.PRIM_FORECAST_TEMP_TEXT, c, 3).text, '23');
  assert.deepStrictEqual([one(PRIM.PRIM_FORECAST_OFFSET_ICON, c, 3).kind, one(PRIM.PRIM_FORECAST_OFFSET_ICON, c, 3).aux], [30, 3]);
  const na = one(PRIM.PRIM_FORECAST_TEMP_TEXT, c, 10);
  assert.deepStrictEqual([na.text, na.color, na.flags], ['N/A', GRAY, F.FORCE]);
  const bad = slots.compile([PRIM.PRIM_FORECAST_TEMP_TEXT], [15], c); // out of range: draws nothing, like before
  assert.deepStrictEqual([bad.ids[0], bad.bytes], [0, [F.END]]);
});

test('unknown data shows grey N/A in every colour mode', () => {
  const empty = ctx();
  [PRIM.PRIM_CURRENT_TEMP_TEXT, PRIM.PRIM_RAIN_CHANCE_TEXT, PRIM.PRIM_PRESSURE_TEXT, PRIM.PRIM_ALTITUDE_TEXT, PRIM.PRIM_AQI_TEXT,
    PRIM.PRIM_CURRENT_CONDITIONS_TEXT, PRIM.PRIM_MOON_PHASE_NAME, PRIM.PRIM_AURORA_KP].forEach((id) => {
    const r = one(id, empty);
    assert.deepStrictEqual([r.text, r.color, r.flags], ['N/A', GRAY, F.FORCE], 'id ' + id);
  });
  const icon = one(PRIM.PRIM_ALTITUDE_ICON, empty);
  assert.deepStrictEqual([icon.kind, icon.color, icon.flags & F.FORCE], [17, GRAY, F.FORCE]);
});

test('units, location, plugin text', () => {
  const c = weatherCtx({ temp: 1, wind: 3, alt: 1 });
  c.plugins = ['Hello', '', 'x'];
  [[PRIM.PRIM_TEMP_UNIT_TEXT, 'F'], [PRIM.PRIM_WIND_UNIT_TEXT, 'kn'], [PRIM.PRIM_PRESSURE_UNIT_TEXT, 'hPa'], [PRIM.PRIM_ALTITUDE_UNIT_TEXT, 'ft']]
    .forEach(([id, txt]) => {
      const r = one(id, c);
      assert.deepStrictEqual([r.text, r.flags], [txt, F.MAIN | F.PUNCT]);
    });
  assert.strictEqual(one(PRIM.PRIM_LOCATION_NAME, c).text, 'Oslo');
  assert.strictEqual(one(PRIM.PRIM_LOCATION_NAME, ctx()).text, 'Unknown');
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, c, 0).text, 'Hello');
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, c, 1).text, '--');
  assert.strictEqual(slots.compile([PRIM.PRIM_PLUGIN_TEXT], [16], c).ids[0], 0);
});

test('phone battery and music title', () => {
  const c = ctx({ phone: { pct: 80, charging: 1 }, music: { state: 1, title: 'Song', artist: 'Band' } });
  assert.strictEqual(one(PRIM.PRIM_PHONE_BATTERY_TEXT, c).text, '80%+');
  assert.strictEqual(one(PRIM.PRIM_PHONE_ICON, c).aux, 80);
  assert.strictEqual(one(PRIM.PRIM_PHONE_ICON, c).color, 0xCC);
  assert.strictEqual(one(PRIM.PRIM_MEDIA_TITLE_TEXT, c, 0).text, 'Song');
  assert.strictEqual(one(PRIM.PRIM_MEDIA_TITLE_TEXT, c, 1).text, 'Band');
  const unknown = ctx();
  assert.strictEqual(one(PRIM.PRIM_PHONE_BATTERY_TEXT, unknown).text, '--');
  const icon = one(PRIM.PRIM_PHONE_ICON, unknown);
  assert.deepStrictEqual([icon.aux, !!(icon.flags & F.FLAG), icon.color], [100, true, GRAY]);
  assert.strictEqual(one(PRIM.PRIM_MEDIA_TITLE_TEXT, unknown, 0).text, 'No music');
  assert.strictEqual(one(PRIM.PRIM_MEDIA_TITLE_TEXT, ctx({ music: { state: 2, title: '', artist: '' } }), 0).text, '--');
});

test('errors reach the astronomy slots in red, forced', () => {
  const c = weatherCtx();
  c.s.errorCode = 3;
  [PRIM.PRIM_METEOR_SHOWER_NAME, PRIM.PRIM_SATURN_RINGS_PCT, PRIM.PRIM_SATURN_RINGS_VALUE].forEach((id) => {
    const r = one(id, c);
    assert.deepStrictEqual([r.text, r.color, r.flags], ['ERR 3', RED, F.FORCE]);
  });
  const icon = one(PRIM.PRIM_SATURN_RINGS_ICON, c);
  assert.deepStrictEqual([icon.color, icon.flags & F.FORCE], [RED, F.FORCE]);
  c.s.errorCode = 0;
  c.s.x.auroraErr = 7;
  assert.strictEqual(one(PRIM.PRIM_AURORA_KP, c).text, 'ERR 7');
  c.s.x.auroraErr = 0;
  assert.strictEqual(one(PRIM.PRIM_AURORA_KP, c).text, 'Kp 3.5');
  assert.strictEqual(one(PRIM.PRIM_AURORA_KP_VALUE, c).text, '3.5');
  assert.strictEqual(one(PRIM.PRIM_METEOR_SHOWER_NAME, c).text, 'Perseids');
  assert.strictEqual(one(PRIM.PRIM_SATURN_RINGS_PCT, c).text, 'Rings 12%');
});

test('the table respects the byte budget: late slots become "missing" and the table still ends cleanly', () => {
  const c = weatherCtx();
  c.s.loc = 'A fairly long place';
  const n = 80;
  const ids = new Array(n).fill(PRIM.PRIM_LOCATION_NAME);
  const r = slots.compile(ids, new Array(n).fill(0), c);
  assert.ok(r.bytes.length <= 320);
  assert.ok(r.count < n);
  assert.strictEqual(r.aux[n - 1], 255);
  assert.strictEqual(decode(r.bytes).length, r.count);
  r.aux.slice(0, r.count).forEach((a, i) => assert.strictEqual(a, i));
});

test('snapshot: a refresh without weather keeps the old numbers; an invalid message sets the error', () => {
  slots.reset();
  slots.applyWeather({
    weatherOk: true, locationName: 'Rome', headlineSources: 0, headlineCloud: 0,
    weather: { condition: 0, tempC: 20, tempHighC: 24, tempLowC: 11, uvIndexMax: 5, uvIndexCurrent: 2, rainChancePct: 10, humidityPct: 50, windSpeedKmh: 5, currentCloudPct: 10 },
    extraWeather: { altitudeMeters: 20, forecastTempC: [1, 2, 3] },
    astro: { moonPhase: { illuminatedPct: 10, waxing: false }, saturnRingOpenPct: 5, meteorShower: null }
  });
  slots.applyWeather({ weatherOk: false, locationName: 'Rome', weather: {}, headlineSources: 0, headlineCloud: 0 });
  assert.strictEqual(slots.snapshot().w.tempC, 20);
  assert.strictEqual(slots.snapshot().loc, 'Rome');
  slots.applyInvalid(4);
  assert.strictEqual(slots.snapshot().errorCode, 4);
  slots.applyWeather({ weatherOk: false, weather: {}, headlineSources: 0 });
  assert.strictEqual(slots.snapshot().errorCode, 0);
  slots.reset();
});

test('calendar complications are plugin-text slots 12-15', () => {
  const at = (h, m) => new Date(2026, 10, 20, h, m).getTime();
  const ev = { start: at(13, 30), end: at(14, 45), title: 'Meeting' };
  const c = ctx({ calendar: { state: 'ok', event: ev } });
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, c, 12).text, '13:30');
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, c, 13).text, 'Meeting');
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, c, 14).text, '14:45');
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, ctx({ calendar: { state: 'ok', event: null } }), 13).text, 'No events');
  assert.strictEqual(one(PRIM.PRIM_PLUGIN_TEXT, ctx({ calendar: { state: 'waiting', event: null } }), 13).text, 'N/A');
  const seq = require('../../src/pkjs/config/primitive-decompose');
  const icon = one(PRIM.PRIM_PLUGIN_TEXT, c, 15);
  assert.deepStrictEqual([icon.icon, icon.kind], [true, 39]);
  assert.deepStrictEqual(seq.primitiveIdSequenceForContent(237).slice(0, 4), [PRIM.PRIM_PLUGIN_TEXT, PRIM.PRIM_PLUGIN_TEXT, PRIM.PRIM_SPACE, PRIM.PRIM_PLUGIN_TEXT]);
  assert.deepStrictEqual(seq.primitiveAuxSequenceForContent(238).slice(0, 4), [15, 12, 0, 14]);
});

test('calendar source picks the next unfinished timed event within 24 h', () => {
  const cal = require('../../src/pkjs/border/calendar-source');
  const now = Date.now(), H = 3600000;
  cal._setList([
    { id: 'a', start: now - 3 * H, end: now - 2 * H, allDay: false, title: 'past' },
    { id: 'b', start: now - 1 * H, end: now + 1 * H, allDay: false, title: 'ongoing' },
    { id: 'c', start: now, end: now + 24 * H, allDay: true, title: 'all day' },
    { id: 'd', start: now + 2 * H, end: now + 3 * H, allDay: false, title: 'later' },
    { id: 'e', start: now + 30 * H, end: now + 31 * H, allDay: false, title: 'far' }
  ]);
  assert.strictEqual(cal.nextEvent(now).title, 'ongoing');
  assert.strictEqual(cal.nextEvent(now + 90 * 60000).title, 'later');
  assert.strictEqual(cal.nextEvent(now + 4 * H), null);
  cal._setList([]);
});

test('forecast complications carry a weather condition icon (offset icon, condition icon, temperature)', () => {
  const seq = require('../../src/pkjs/config/primitive-decompose');
  assert.deepStrictEqual(seq.primitiveIdSequenceForContent(88).slice(0, 3), [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT]);
  assert.deepStrictEqual(seq.primitiveAuxSequenceForContent(88).slice(0, 3), [1, 17, 1]);
  const c = ctx({});
  c.s.fc = [10, 11]; c.s.fcc = [0, 2]; c.s.fcl = [5, 90]; c.s.fcr = [0, 80];
  const r = one(PRIM.PRIM_FORECAST_OFFSET_ICON, c, 17);
  assert.deepStrictEqual([r.icon, r.kind, r.aux], [true, 14, 4]); // rain category
});
