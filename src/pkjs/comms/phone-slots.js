// Phone slots: every complication value that is a pure function of phone-side data (weather, air quality,
// altitude, moon, location, plugin text, phone battery, music title ...) is turned into finished text / an
// icon description HERE, and the watch only draws it. See docs/COMPLICATIONS_REPORT.md.
//
// How it fits together:
//   * The settings and the composer keep using the logical primitive ids (PRIM_TEMP_HIGH_TEXT, ...).
//   * At send time compile() walks the corner / edge id sequences. Every id that has a rule below becomes
//     PRIM_PHONE_SLOT on the wire, its aux byte is the slot number, and the slot's record (text or icon,
//     colour, colour-mode behaviour) is appended to the PHONE_SLOTS table. Ids without a rule (date, time,
//     health, battery, sun, planets, compass, music progress ...) travel unchanged: they depend on the
//     watch's own clock or sensors.
//   * The table is persisted by the watch with the rest of its data, so complications survive a restart.
//
// Record layout (mirrors PHONE_SLOT_* in src/c/data/watch_data.h):
//   text: [flags, colour, len, bytes...]        icon: [flags | ICON, colour, kind, aux_lo, aux_hi]
// The table ends with END (0xFF) unless it is exactly full.
var PRIM = require('../config/primitive-ids-generated');
var platform = require('../platform');
var wn = require('../weather/weather-normalize');
var fd = require('../astronomy/feature-display');
var gcolor = require('./gcolor');

var ICON = 0x01, MAIN = 0x02, FORCE = 0x04, PUNCT = 0x08, FLAG = 0x10, END = 0xFF;
var MAX_TEXT = 19;                 // PrimitiveResolved.text is 20 bytes, NUL included
var MISSING = 255;                 // slot number meaning "no record" (the watch draws a grey "--")
var SNAP_KEY = 'LAST_PHONE_DATA';

function budgetBytes() { return platform.bw ? 160 : 320; }

// Packed GColor8 constants (a2 r2 g2 b2). Black-and-white watches ignore colour, so these stay as they are.
var WHITE = 0xFF, GRAY = 0xEA, RED = 0xF0, GREEN = 0xCC, ORANGE = 0xF8;

function isNum(v) { return typeof v === 'number' && !isNaN(v); }

// ---- snapshot of the last phone-side data (raw values; units are applied when the slots are built) ----------

function emptySnap() {
  return { errorCode: 0, loc: '', w: {}, x: {}, a: {}, fc: [] };
}
var snap = emptySnap();
(function load() {
  try {
    var raw = localStorage.getItem(SNAP_KEY);
    if (raw) {
      var p = JSON.parse(raw);
      if (p && typeof p === 'object') {
        snap = emptySnap();
        ['w', 'x', 'a'].forEach(function (k) { if (p[k] && typeof p[k] === 'object') snap[k] = p[k]; });
        if (Array.isArray(p.fc)) snap.fc = p.fc;
        if (typeof p.loc === 'string') snap.loc = p.loc;
        if (isNum(p.errorCode)) snap.errorCode = p.errorCode;
      }
    }
  } catch (e) { }
})();
function save() { try { localStorage.setItem(SNAP_KEY, JSON.stringify(snap)); } catch (e) { } }

function snapshot() { return snap; }
function reset() { snap = emptySnap(); save(); }

// Keeps old values when a refresh did not deliver a field, like the watch did when fields were simply absent.
function setIfNum(obj, key, v) { if (isNum(v)) obj[key] = v; }

// d is what sendWeatherData receives (see index.js): weather, weatherOk, extraWeather, astro, locationName ...
function applyWeather(d) {
  var w = d.weather || {};
  snap.errorCode = 0;
  snap.loc = d.locationName || '';
  var haveCloud = isNum(w.currentCloudPct) || d.headlineSources > 0;
  if (haveCloud) snap.w.cloud = isNum(w.currentCloudPct) ? w.currentCloudPct : (d.headlineCloud || 0);
  if (d.weatherOk) {
    snap.w.cond = w.condition || 0;
    ['tempC', 'tempHighC', 'tempLowC', 'uvIndexMax', 'uvIndexCurrent', 'rainChancePct', 'humidityPct', 'windSpeedKmh']
      .forEach(function (k) { if (isNum(w[k])) snap.w[k] = w[k]; else delete snap.w[k]; });
  }
  var e = d.extraWeather;
  if (e) {
    if (isNum(e.altitudeMeters)) snap.x.altM = e.altitudeMeters; else delete snap.x.altM;
    setIfNum(snap.x, 'windDirDeg', e.windDirDeg);
    setIfNum(snap.x, 'dewPointC', e.dewPointC);
    if (isNum(e.pressureHpa)) { snap.x.pressureHpa = e.pressureHpa; snap.x.pressureTrend = e.pressureTrend || 0; }
    setIfNum(snap.x, 'aqiUs', e.aqiUs);
    setIfNum(snap.x, 'aqiEu', e.aqiEu);
    setIfNum(snap.x, 'auroraKpX10', e.auroraKpX10);
    snap.x.auroraErr = e.auroraErrorCode || 0;
    if (Array.isArray(e.forecastTempC)) snap.fc = e.forecastTempC.map(function (c) { return isNum(c) ? Math.round(c) : null; });
  }
  var a = d.astro;
  if (a) {
    if (a.moonPhase) { snap.a.moonPct = a.moonPhase.illuminatedPct; snap.a.moonWaxing = !!a.moonPhase.waxing; }
    if (isNum(a.saturnRingOpenPct)) snap.a.saturnPct = a.saturnRingOpenPct;
    snap.a.meteorName = a.meteorShower ? a.meteorShower.name : '';
    snap.a.meteorIntensity = a.meteorShower ? a.meteorShower.intensity : 0;
  }
  save();
}

// The debug "fake weather" page feeds the same snapshot.
function applyFake(v) {
  applyWeather({
    weatherOk: true, locationName: '', headlineSources: 0, headlineCloud: 0,
    weather: {
      condition: v.WEATHER_CONDITION, tempC: v.WEATHER_TEMP_C, tempHighC: v.WEATHER_TEMP_HIGH_C, tempLowC: v.WEATHER_TEMP_LOW_C,
      uvIndexMax: v.UV_INDEX_X10 / 10, uvIndexCurrent: v.UV_INDEX_CURRENT_X10 / 10, rainChancePct: v.RAIN_CHANCE_PCT,
      humidityPct: v.HUMIDITY_PCT, windSpeedKmh: v.WIND_SPEED_KMH, currentCloudPct: v.CLOUD_COVER
    },
    extraWeather: {
      altitudeMeters: snap.x.altM, windDirDeg: v.WIND_DIR_DEG, dewPointC: v.DEW_POINT_C, pressureHpa: v.PRESSURE_HPA,
      pressureTrend: v.PRESSURE_TREND, aqiUs: v.AQI_US, aqiEu: v.AQI_EU,
      auroraKpX10: snap.x.auroraKpX10, auroraErrorCode: snap.x.auroraErr
    }
  });
}

// An invalid message (no location, fetch failure): the astronomy slots show "ERR n", like the watch did.
function applyInvalid(code) { snap.errorCode = code || 0; save(); }

// ---- record builders ------------------------------------------------------------------------------------------

function T(text, color, flags) { return { text: String(text), color: color, flags: flags || 0 }; }
function I(kind, aux, color, flags) { return { icon: true, kind: kind, aux: aux | 0, color: color, flags: flags || 0 }; }
// A value that is not known: grey "N/A" / grey glyph in every colour mode.
function na(isIcon, kind) { return isIcon ? I(kind, 0, GRAY, FORCE) : T('N/A', GRAY, FORCE); }
function err(isIcon, kind, code) { return isIcon ? I(kind, 0, RED, FORCE) : T('ERR ' + code, RED, FORCE); }

function redGreen(pct) {
  if (pct >= 100) return gcolor.packGColorByte(0, 200, 0);
  var f = Math.trunc((pct * 1000) / 100);
  return gcolor.packGColorByte(220 - Math.trunc((220 * f) / 1000), Math.trunc((200 * f) / 1000), 0);
}

// ---- rules: logical primitive id -> record (or null when the id is not phone-owned) ---------------------------
// Each rule gets (ctx, aux). ctx = { s: snapshot, u: { temp, wind, aqi, alt }, phone, music, plugins }.

var RULES = {};
function rule(id, fn) { RULES[id] = fn; }

function stripPrefix(rec, p) { if (!rec.icon && rec.text.indexOf(p) === 0) rec.text = rec.text.slice(p.length); return rec; }
function stripSuffix(rec, sfx) {
  if (!rec.icon && rec.text.length >= sfx.length && rec.text.slice(-sfx.length) === sfx) rec.text = rec.text.slice(0, -sfx.length);
  return rec;
}

// Temperatures ----------------------------------------------------------------------------------------------
function tempRec(raw, u, prefix) {
  var t = wn.formatTempDisplay(raw, u.temp);
  if (t === '') return na(false);
  return T((prefix || '') + t, wn.tempGradientColorByte(raw));
}
function feelsC(s) { return isNum(s.w.tempC) ? wn.apparentTempC(s.w.tempC, s.w.windSpeedKmh, s.w.humidityPct) : null; }
function tempLabel(letter, raw) { return T(letter, isNum(raw) ? wn.tempGradientColorByte(raw) : GRAY); }

rule(PRIM.PRIM_TEMP_HIGH_TEXT, function (c) { return tempRec(c.s.w.tempHighC, c.u); });
rule(PRIM.PRIM_TEMP_LOW_TEXT, function (c) { return tempRec(c.s.w.tempLowC, c.u); });
rule(PRIM.PRIM_CURRENT_TEMP_TEXT, function (c) { return tempRec(c.s.w.tempC, c.u); });
rule(PRIM.PRIM_LABEL_HIGH_PREFIX, function (c) { return tempLabel('H', c.s.w.tempHighC); });
rule(PRIM.PRIM_LABEL_LOW_PREFIX, function (c) { return tempLabel('L', c.s.w.tempLowC); });
rule(PRIM.PRIM_CURRENT_TEMP_ONLY_TEXT, function (c) { return tempRec(c.s.w.tempC, c.u); });
rule(PRIM.PRIM_TEMP_HIGH_ONLY_TEXT, function (c) { return tempRec(c.s.w.tempHighC, c.u, 'H '); });
rule(PRIM.PRIM_TEMP_LOW_ONLY_TEXT, function (c) { return tempRec(c.s.w.tempLowC, c.u, 'L '); });
rule(PRIM.PRIM_FEELS_LIKE_TEXT, function (c) { return tempRec(feelsC(c.s), c.u, 'FL '); });
rule(PRIM.PRIM_FEELS_LIKE_VALUE, function (c) { return tempRec(feelsC(c.s), c.u); });
rule(PRIM.PRIM_DEW_POINT_TEXT, function (c) {
  var t = wn.formatTempDisplay(c.s.x.dewPointC, c.u.temp);
  return t === '' ? na(false) : T(t, WHITE, MAIN);
});

// Conditions ------------------------------------------------------------------------------------------------
function shortCondition(cond, cloud) {
  switch (cond) {
    case 1: return 'Fog';
    case 2: return 'Rain';
    case 3: return 'Snow';
    case 4: return 'Storm';
    default:
      if (cloud < 20) return 'Sunny';
      if (cloud < 60) return 'P.Cloudy';
      if (cloud < 90) return 'Cloudy';
      return 'Overcast';
  }
}
rule(PRIM.PRIM_CURRENT_CONDITIONS_TEXT, function (c) {
  var w = c.s.w;
  if (!isNum(w.cond)) return na(false);
  var cloud = isNum(w.cloud) ? w.cloud : 0;
  return T(shortCondition(w.cond, cloud), wn.weatherConditionColorByte(w.cond, cloud, w.rainChancePct));
});

function uv(raw) { return wn.formatUvDisplay(raw).replace(/^UV/, ''); }
rule(PRIM.PRIM_UV_DAILY_TEXT, function (c) {
  var t = wn.formatUvDisplay(c.s.w.uvIndexMax);
  return t === '' ? na(false) : T(t, wn.uvGradientColorByte(c.s.w.uvIndexMax));
});
rule(PRIM.PRIM_UV_CURRENT_TEXT, function (c) {
  var t = wn.formatUvDisplay(c.s.w.uvIndexCurrent);
  return t === '' ? na(false) : T(t, wn.uvGradientColorByte(c.s.w.uvIndexCurrent));
});
rule(PRIM.PRIM_UV_DAILY_VALUE, function (c) {
  var t = uv(c.s.w.uvIndexMax);
  return t === '' ? na(false) : T(t, wn.uvGradientColorByte(c.s.w.uvIndexMax));
});
rule(PRIM.PRIM_UV_CURRENT_VALUE, function (c) {
  var t = uv(c.s.w.uvIndexCurrent);
  return t === '' ? na(false) : T(t, wn.uvGradientColorByte(c.s.w.uvIndexCurrent));
});

// An icon + text pair sharing one value and colour (rain, humidity, wind, visibility, cloud, pressure ...).
function pair(iconId, textId, iconKind, fn) {
  // fn(ctx) -> { text, color, aux? } or null when unknown
  rule(iconId, function (c) { var r = fn(c); return r ? I(iconKind, r.aux || 0, r.color) : na(true, iconKind); });
  rule(textId, function (c) { var r = fn(c); return r ? T(r.text, r.color) : na(false); });
}
function pctRec(raw, colorFn) {
  var t = wn.formatPercentDisplay(raw);
  return t === '' ? null : { text: t, color: colorFn(raw) };
}
pair(PRIM.PRIM_RAIN_CHANCE_ICON, PRIM.PRIM_RAIN_CHANCE_TEXT, 5, function (c) { return pctRec(c.s.w.rainChancePct, wn.percentGradientColorByte); });
pair(PRIM.PRIM_HUMIDITY_ICON, PRIM.PRIM_HUMIDITY_TEXT, 6, function (c) { return pctRec(c.s.w.humidityPct, wn.percentGradientColorByte); });
pair(PRIM.PRIM_WIND_SPEED_ICON, PRIM.PRIM_WIND_SPEED_TEXT, 7, function (c) {
  var t = wn.formatWindSpeedDisplay(c.s.w.windSpeedKmh, c.u.wind);
  return t === '' ? null : { text: t, color: wn.windSpeedGradientColorByte(c.s.w.windSpeedKmh) };
});
pair(PRIM.PRIM_VISIBILITY_ICON, PRIM.PRIM_VISIBILITY_TEXT, 9, function (c) {
  var cl = c.s.w.cloud;
  if (!isNum(cl)) return null;
  return { text: wn.formatPercentDisplay(100 - cl), color: wn.overcastGrayColorByte(cl) };
});
pair(PRIM.PRIM_CLOUD_COVER_ICON, PRIM.PRIM_CLOUD_COVER_TEXT, 10, function (c) {
  var cl = c.s.w.cloud;
  if (!isNum(cl)) return null;
  return { text: wn.formatPercentDisplay(cl), color: wn.overcastGrayColorByte(cl) };
});
pair(PRIM.PRIM_PRESSURE_TREND_ICON, PRIM.PRIM_PRESSURE_TEXT, 15, function (c) {
  var p = c.s.x.pressureHpa;
  if (!isNum(p)) return null;
  return { text: wn.formatPressureDisplay(p), color: wn.pressureGradientColorByte(p), aux: c.s.x.pressureTrend || 0 };
});
rule(PRIM.PRIM_PRESSURE_VALUE, function (c) {
  var p = c.s.x.pressureHpa;
  return isNum(p) ? T(wn.formatPressureDisplay(p).replace(/ hPa$/, ''), wn.pressureGradientColorByte(p)) : na(false);
});

var COMPASS8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
rule(PRIM.PRIM_WIND_DIRECTION_ICON, function (c) {
  var d = c.s.x.windDirDeg;
  return isNum(d) ? I(16, Math.round(d), WHITE, MAIN) : na(true, 16);
});
rule(PRIM.PRIM_WIND_DIRECTION_TEXT, function (c) {
  var d = c.s.x.windDirDeg;
  if (!isNum(d)) return na(false);
  var idx = Math.trunc((Math.round(d) + 22) / 45) % 8;
  if (idx < 0) idx += 8;
  return T(COMPASS8[idx], WHITE, MAIN);
});

function aqiValue(c) { return c.u.aqi === 1 ? c.s.x.aqiEu : c.s.x.aqiUs; }
rule(PRIM.PRIM_AQI_TEXT, function (c) {
  var v = aqiValue(c);
  return isNum(v) ? T(wn.formatAqiDisplay(v), wn.aqiGradientColorByte(v, c.u.aqi)) : na(false);
});
rule(PRIM.PRIM_AQI_VALUE, function (c) {
  var v = aqiValue(c);
  return isNum(v) ? T(String(Math.round(v)), wn.aqiGradientColorByte(v, c.u.aqi)) : na(false);
});

pair(PRIM.PRIM_ALTITUDE_ICON, PRIM.PRIM_ALTITUDE_TEXT, 17, function (c) {
  var m = c.s.x.altM;
  if (!isNum(m)) return null;
  return { text: wn.formatAltitudeDisplay(m, c.u.alt), color: wn.altitudeGradientColorByte(m) };
});
rule(PRIM.PRIM_ALTITUDE_VALUE, function (c) {
  var m = c.s.x.altM;
  return isNum(m) ? T(wn.formatAltitudeDisplay(m, c.u.alt).replace(/(ft|m)$/, ''), wn.altitudeGradientColorByte(m)) : na(false);
});

// Forecast: aux selects 0-14 (six hours ahead, three days ahead, ...), same index space as before.
function forecastRule(isIcon) {
  return function (c, aux) {
    if (aux >= 15) return null;
    var v = c.s.fc[aux];
    if (!isNum(v)) return isIcon ? I(30, aux, GRAY, FORCE) : na(false);
    var color = wn.tempGradientColorByte(v);
    return isIcon ? I(30, aux, color) : T(wn.formatTempDisplay(v, c.u.temp), color);
  };
}
rule(PRIM.PRIM_FORECAST_OFFSET_ICON, forecastRule(true));
rule(PRIM.PRIM_FORECAST_TEMP_TEXT, forecastRule(false));

// Units ---------------------------------------------------------------------------------------------------------
var TEMP_UNITS = ['C', 'F', 'K'], WIND_UNITS = ['km/h', 'mph', 'm/s', 'kn'];
rule(PRIM.PRIM_TEMP_UNIT_TEXT, function (c) { return T(TEMP_UNITS[c.u.temp] || 'C', WHITE, MAIN | PUNCT); });
rule(PRIM.PRIM_WIND_UNIT_TEXT, function (c) { return T(WIND_UNITS[c.u.wind] || 'km/h', WHITE, MAIN | PUNCT); });
rule(PRIM.PRIM_PRESSURE_UNIT_TEXT, function () { return T('hPa', WHITE, MAIN | PUNCT); });
rule(PRIM.PRIM_ALTITUDE_UNIT_TEXT, function (c) { return T(c.u.alt === 1 ? 'ft' : 'm', WHITE, MAIN | PUNCT); });

// Astronomy values that come from the phone ---------------------------------------------------------------------
rule(PRIM.PRIM_MOON_PHASE_ICON, function (c) {
  var a = c.s.a;
  return isNum(a.moonPct) ? I(4, Math.round(a.moonPct), WHITE, a.moonWaxing ? FLAG : 0) : na(true, 4);
});
rule(PRIM.PRIM_MOON_PHASE_NAME, function (c) {
  var a = c.s.a;
  return isNum(a.moonPct) ? T(fd.formatMoonPhaseDisplay(a.moonPct, a.moonWaxing), WHITE) : na(false);
});
rule(PRIM.PRIM_LOCATION_ICON, function () { return I(8, 0, WHITE, MAIN); });
rule(PRIM.PRIM_LOCATION_NAME, function (c) { return T(c.s.loc || 'Unknown', WHITE, MAIN); });
rule(PRIM.PRIM_METEOR_SHOWER_NAME, function (c) {
  if (c.s.errorCode) return err(false, 0, c.s.errorCode);
  var a = c.s.a;
  if (isNum(a.meteorIntensity) && a.meteorIntensity > 0 && a.meteorName) {
    return T(a.meteorName, fd.meteorGradientColorByte(a.meteorIntensity), FORCE);
  }
  return na(false);
});
function saturnRule(isIcon) {
  return function (c) {
    if (c.s.errorCode) return err(isIcon, 24, c.s.errorCode);
    var p = c.s.a.saturnPct;
    if (isIcon) return I(24, 0, WHITE, MAIN);
    return isNum(p) ? T(fd.formatSaturnRingsDisplay(p), WHITE, MAIN) : na(false);
  };
}
rule(PRIM.PRIM_SATURN_RINGS_ICON, saturnRule(true));
rule(PRIM.PRIM_SATURN_RINGS_PCT, saturnRule(false));
rule(PRIM.PRIM_SATURN_RINGS_VALUE, function (c) {
  if (c.s.errorCode) return err(false, 0, c.s.errorCode);
  var p = c.s.a.saturnPct;
  return isNum(p) ? T(Math.round(p) + '%', WHITE, MAIN) : na(false);
});
function auroraRule(isIcon, bare) {
  return function (c) {
    var e = c.s.x.auroraErr, kp = c.s.x.auroraKpX10;
    if (e) return err(isIcon, 26, e);
    if (!isNum(kp)) return na(isIcon, 26);
    var color = fd.auroraGradientColorByte(kp);
    if (isIcon) return I(26, 0, color);
    var t = fd.formatAuroraKpDisplay(kp);
    return T(bare ? t.replace(/^Kp /, '') : t, color);
  };
}
rule(PRIM.PRIM_AURORA_ICON, auroraRule(true, false));
rule(PRIM.PRIM_AURORA_KP, auroraRule(false, false));
rule(PRIM.PRIM_AURORA_KP_VALUE, auroraRule(false, true));

// Plugin text, phone battery, music title -----------------------------------------------------------------------
rule(PRIM.PRIM_PLUGIN_TEXT, function (c, aux) {
  if (aux >= CAL_START && aux <= CAL_END) return calendarText(c, aux);
  if (aux >= 12) return null;
  var t = c.plugins && c.plugins[aux];
  return T(t ? t : '--', WHITE, MAIN); // a blank (' ') is a later line of a long text that has run out: draws nothing
});
function phoneRule(isIcon) {
  return function (c) {
    var p = c.phone || { pct: 255, charging: 0 };
    var known = p.pct <= 100;
    var color = !known ? GRAY : (p.charging ? GREEN : redGreen(p.pct));
    if (isIcon) return I(31, known ? p.pct : 100, color, known ? 0 : FLAG);
    return T(known ? p.pct + (p.charging ? '%+' : '%') : '--', color);
  };
}
rule(PRIM.PRIM_PHONE_ICON, phoneRule(true));
rule(PRIM.PRIM_PHONE_BATTERY_TEXT, phoneRule(false));
rule(PRIM.PRIM_MEDIA_TITLE_TEXT, function (c, aux) { // aux 0 = title, 1 = artist
  var m = c.music || { state: 0, title: '', artist: '' };
  var t = aux ? m.artist : m.title;
  return T(t ? t : (m.state ? '--' : 'No music'), WHITE, MAIN);
});

// Calendar (Pebble calendar plugin): the first event that has not ended yet, 24 h clock like the other times.
function hhmm(ms) {
  var d = new Date(ms);
  return (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
}
// Virtual plugin-text slots above the 12 real ones carry the calendar event, so no extra primitive is needed:
// aux 12 = start time, 13 = event name, 14 = end time (content 237-239 combine them, see primitive-decompose.js).
var CAL_START = 12, CAL_NAME = 13, CAL_END = 14;
function calendarText(c, aux) {
  var cal = c.calendar || { state: 'off', event: null };
  if (cal.state !== 'ok') return na(false);
  var e = cal.event;
  if (!e) return T(aux === CAL_NAME ? 'No events' : '--', WHITE, MAIN);
  if (aux === CAL_START) return T(hhmm(e.start), WHITE, MAIN);
  if (aux === CAL_END) return T(hhmm(e.end), WHITE, MAIN);
  return T(e.title || 'Event', WHITE, MAIN);
}

// ---- encoding ---------------------------------------------------------------------------------------------------

function utf8(str, maxBytes) {
  var out = [];
  str = String(str).replace(/\s+/g, ' ').trim();
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF) { i++; c = 63; }
    var enc;
    if (c < 0x80) enc = [c];
    else if (c < 0x800) enc = [0xC0 | (c >> 6), 0x80 | (c & 63)];
    else enc = [0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)];
    if (out.length + enc.length > maxBytes) break;
    out = out.concat(enc);
  }
  return out;
}

function recordBytes(r) {
  if (r.icon) return [r.flags | ICON, r.color & 255, r.kind & 255, r.aux & 255, (r.aux >> 8) & 255];
  var b = utf8(r.text, MAX_TEXT);
  return [r.flags & 0x7F, r.color & 255, b.length].concat(b);
}

// ---- context + compile ------------------------------------------------------------------------------------------

// The live inputs: current unit settings, plugin / phone / music state. Required lazily so the rules above can
// be tested without the whole PKJS environment.
function liveContext() {
  var codecs = require('../settings/settings-codecs');
  var pluginManager = require('../plugins/plugin-manager');
  var phoneMedia = require('../plugins/phone-media');
  return {
    s: snap,
    u: { temp: codecs.tempUnitCode(), wind: codecs.windSpeedUnitCode(), aqi: codecs.aqiUnitCode(), alt: codecs.altitudeUnitCode() },
    plugins: pluginManager.texts(),
    phone: phoneMedia.phoneState(),
    music: phoneMedia.musicText(),
    calendar: phoneMedia.calendarInfo()
  };
}

// ids / aux: the flat logical sequences (10 entries per corner / edge line). Returns the wire versions and the
// PHONE_SLOTS table. Ids without a rule pass through untouched.
function compile(ids, aux, ctx) {
  ctx = ctx || liveContext();
  var budget = budgetBytes() - 1; // keep a byte for END
  var used = 0, count = 0, table = [];
  var outIds = [], outAux = [];
  for (var i = 0; i < ids.length; i++) {
    var id = ids[i], a = aux[i] | 0;
    var fn = RULES[id];
    if (!fn) { outIds.push(id); outAux.push(a); continue; }
    var rec = fn(ctx, a);
    if (!rec) { outIds.push(0); outAux.push(0); continue; } // unsupported value (bad aux): draws nothing, as before
    var bytes = recordBytes(rec);
    outIds.push(PRIM.PRIM_PHONE_SLOT);
    if (used + bytes.length > budget || count >= MISSING) { outAux.push(MISSING); continue; }
    outAux.push(count);
    table = table.concat(bytes);
    used += bytes.length;
    count++;
  }
  if (table.length < budgetBytes()) table.push(END);
  return { ids: outIds, aux: outAux, bytes: table, count: count };
}

function isPhoneOwned(id) { return !!RULES[id]; }

module.exports = {
  FLAGS: { ICON: ICON, MAIN: MAIN, FORCE: FORCE, PUNCT: PUNCT, FLAG: FLAG, END: END },
  applyWeather: applyWeather,
  applyFake: applyFake,
  applyInvalid: applyInvalid,
  snapshot: snapshot,
  reset: reset,
  compile: compile,
  isPhoneOwned: isPhoneOwned,
  // for tests
  _rules: RULES,
  _recordBytes: recordBytes
};
