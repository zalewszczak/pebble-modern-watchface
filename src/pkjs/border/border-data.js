// Border ring data, built on the phone and sent to the watch in one universal format.
//
// The ring is 12 sectors (clock positions, 0 = 12 o'clock, clockwise) and up to 3 stripes (layers). The watch
// knows nothing about weather or calendars: it only draws the colours it is given.
//
// BORDER_DATA wire format (1 .. 79 bytes):
//   byte 0        layers: 0 = no data (ring stays empty), 1..3 stripes (outermost first)
//   per layer:    12 bytes  c0[sector]        GColor8 byte, 0 = transparent
//                  2 bytes  mask (LE)         bit s set -> sector s has its own second colour
//                  n bytes  c1[s] for each set bit, ascending s   (otherwise c1 = c0)
// c0 / c1 alternate per pixel (checkerboard), which is how "overcast" gets two greys and how a calendar sector
// can show two calendars or a half-density tint. On the B&W watches c0 holds a pattern level instead of a
// colour: 0 empty, 1 sparse dots, 2 checkerboard, 3 dense, 4 solid (c1 unused).
//
// Sources: 1 = weather forecast (next 12 hours), 2 = calendar (current hour + the next 11).
var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var platform = require('../platform');
var calendar = require('./calendar-source');

var MAX_BYTES = 80;
var WX_CACHE_KEY = 'BORDER_WX_CACHE';

// ---- colours --------------------------------------------------------------------------------------------
function q(v) { v = v >> 6; return v < 0 ? 0 : (v > 3 ? 3 : v); }
function rgbByte(r, g, b) { return 0xC0 | (q(r) << 4) | (q(g) << 2) | q(b); }
function rgbArr(c) { return rgbByte(c[0], c[1], c[2]); }
var WHITE = rgbByte(255, 255, 255), LIGHT_GRAY = rgbByte(170, 170, 170), DARK_GRAY = rgbByte(85, 85, 85);

function lerpStops(stops, value, minV, maxV) {
  var n = stops.length, segs = n - 1;
  if (value <= minV) return stops[0];
  if (value >= maxV) return stops[n - 1];
  var pos = Math.trunc(((value - minV) * 1000 * segs) / (maxV - minV));
  var seg = Math.min(segs - 1, Math.trunc(pos / 1000)), fr = pos - seg * 1000;
  var a = stops[seg], b = stops[seg + 1];
  return [a[0] + Math.trunc(((b[0] - a[0]) * fr) / 1000), a[1] + Math.trunc(((b[1] - a[1]) * fr) / 1000), a[2] + Math.trunc(((b[2] - a[2]) * fr) / 1000)];
}
function turquoise(p) {
  var f = Math.trunc((Math.max(0, Math.min(100, p)) * 1000) / 100);
  return [255 - Math.trunc((191 * f) / 1000), 255 - Math.trunc((31 * f) / 1000), 255 - Math.trunc((47 * f) / 1000)];
}

// Weather classes: 0 clear, 1 partly, 2 overcast, 3 fog, 4 drizzle, 5 rain, 6 heavy rain, 7 snow, 8 thunder, 9 sleet.
// Keep in step with the preview in config/config-border.js.
var WX_DETAILED = [null, [170, 170, 170], null, [85, 85, 85], [170, 255, 255], [0, 85, 255], [0, 0, 170], [255, 255, 255], [255, 255, 0], [85, 170, 255]];
var WX_HAZARD = [null, [170, 255, 170], [0, 255, 0], [255, 255, 85], [255, 255, 0], [255, 170, 0], [255, 0, 0], [170, 0, 255], [255, 0, 255], [255, 0, 170]];
var TEMP_COLD_HOT = [[0, 0, 255], [85, 170, 255], [255, 255, 255], [255, 170, 0], [255, 0, 0]];
var TEMP_HEAT_MAP = [[0, 0, 170], [170, 0, 170], [255, 0, 0], [255, 170, 0], [255, 255, 255]];
var RAIN_BLUE = [[170, 255, 255], [0, 170, 255], [0, 0, 170]];
var WX_LEVEL = [0, 1, 2, 1, 3, 3, 4, 2, 4, 3]; // B&W pattern density per weather class

function pair(c0, c1) { return [c0, c1 === undefined ? c0 : c1]; }
var NONE = [0, 0];

function fillConditions(wx, scheme) {
  if (wx < 0 || wx > 9) wx = 0;
  if (wx === 0) return NONE;
  if (scheme === 0) {
    if (wx === 1) return pair(LIGHT_GRAY);
    if (wx === 2) return pair(DARK_GRAY, LIGHT_GRAY);
    if (wx === 3) return pair(DARK_GRAY);
    if (wx === 7) return pair(WHITE);
    return pair(rgbArr(turquoise(100)));
  }
  if (scheme === 1 && wx === 2) return pair(DARK_GRAY, LIGHT_GRAY);
  return pair(rgbArr((scheme === 1 ? WX_DETAILED : WX_HAZARD)[wx]));
}
function fillTemperature(t, scheme, colorByte) {
  if (scheme === 1) return pair(rgbArr(lerpStops(TEMP_COLD_HOT, t, -10, 40)));
  if (scheme === 2) return pair(rgbArr(lerpStops(TEMP_HEAT_MAP, t, -10, 40)));
  return pair(colorByte);
}
function fillRain(p, scheme) {
  p = Math.max(0, Math.min(100, p));
  if (scheme === 0) return p < 5 ? NONE : pair(rgbArr(turquoise(p)));
  if (scheme === 1) return p < 5 ? NONE : pair(rgbArr(lerpStops(RAIN_BLUE, p, 0, 100)));
  if (p < 20) return NONE;
  return pair(rgbByte.apply(null, p < 50 ? [255, 255, 0] : (p < 80 ? [255, 170, 0] : [255, 0, 0])));
}
function rainLevel(p) { return p < 5 ? 0 : (p < 30 ? 1 : (p < 60 ? 2 : (p < 85 ? 3 : 4))); }

// ---- wire format ----------------------------------------------------------------------------------------
function emptyLayer() { var l = []; for (var s = 0; s < 12; s++) l.push([0, 0]); return l; }

function encode(layers) {
  if (!layers || !layers.length) return [0];
  var out = [layers.length], mask, extra, s, l;
  for (l = 0; l < layers.length; l++) {
    mask = 0; extra = [];
    for (s = 0; s < 12; s++) out.push(layers[l][s][0] & 255);
    for (s = 0; s < 12; s++) {
      if (!platform.bw && layers[l][s][1] !== layers[l][s][0]) { mask |= (1 << s); extra.push(layers[l][s][1] & 255); }
    }
    out.push(mask & 255, (mask >> 8) & 255);
    out = out.concat(extra);
  }
  return out.length <= MAX_BYTES ? out : [0];
}

// ---- weather --------------------------------------------------------------------------------------------
var wxCache = null; // { temp: [15 deg C or null], wx: [15], rain: [15], tempColor: [15 GColor8 bytes] }

function loadWxCache() {
  if (wxCache) return wxCache;
  try { wxCache = JSON.parse(localStorage.getItem(WX_CACHE_KEY) || 'null'); } catch (e) { wxCache = null; }
  return wxCache;
}

// Called with the forecast arrays every time weather data is built (message-encoder.js).
function setWeather(extra, tempColors) {
  if (!extra || !extra.forecastWx) return;
  // A failed fetch hands over an "empty" forecast (every temperature null). It must not replace the last
  // good forecast: that overwrite is what left the ring blank until the next successful fetch.
  var hasData = (extra.forecastTempC || []).some(function (c) { return typeof c === 'number'; });
  if (!hasData) return;
  wxCache = {
    ts: Date.now(),
    temp: (extra.forecastTempC || []).map(function (c) { return typeof c === 'number' ? Math.round(c) : null; }),
    wx: extra.forecastWx.slice(0, 15),
    rain: (extra.forecastRainPct || []).slice(0, 15),
    tempColor: (tempColors || []).slice(0, 15)
  };
  try { localStorage.setItem(WX_CACHE_KEY, JSON.stringify(wxCache)); } catch (e) { }
}

// Forecast slot of "h hours from now" (h = 1..12): 1-6 h are slots 0-5, 7-12 h are slots 9-14.
function slotForHour(h) { return h <= 6 ? h - 1 : 9 + (h - 7); }

function weatherStyle() {
  var v = parseInt(getSetting('CONFIG_BORDER_WEATHER_MODE', '1'), 10);
  if (platform.bw) return v === 3 ? 3 : 1;
  return (v >= 1 && v <= 4) ? v : 1;
}
function weatherScheme() {
  var v = parseInt(getSetting('CONFIG_BORDER_WEATHER_SCHEME', '0'), 10);
  return (v === 1 || v === 2) ? v : 0;
}

function buildWeather(now) {
  var c = loadWxCache();
  if (!c) return [0];
  var style = weatherStyle(), scheme = weatherScheme();
  var nl = (style === 4 && !platform.bw) ? 3 : 1, layers = [], l;
  for (l = 0; l < nl; l++) layers.push(emptyLayer());
  var hour12 = now.getHours() % 12;
  // The forecast is "h hours from the moment it was fetched"; shift by the whole hours passed since, so a
  // forecast that is a few hours old still lands on the right sectors (the far end becomes transparent).
  var age = c.ts ? Math.max(0, Math.floor(now.getTime() / 3600000) - Math.floor(c.ts / 3600000)) : 0;
  if (age > 12) return [0];
  for (var h = 1; h <= 12; h++) {
    var slot = slotForHour(h + age), sec = (hour12 + h) % 12;
    if (h + age > 12) continue;
    var t = c.temp[slot];
    if (typeof t !== 'number') continue; // no data: stays transparent
    var wx = c.wx[slot] || 0, rain = c.rain[slot] || 0;
    if (platform.bw) {
      layers[0][sec] = [style === 1 ? WX_LEVEL[wx > 9 ? 0 : wx] : rainLevel(rain), 0];
    } else if (style === 4) {
      layers[0][sec] = fillTemperature(t, scheme, c.tempColor[slot]);
      layers[1][sec] = fillConditions(wx, scheme);
      layers[2][sec] = fillRain(rain, scheme);
    } else if (style === 1) layers[0][sec] = fillConditions(wx, scheme);
    else if (style === 2) layers[0][sec] = fillTemperature(t, scheme, c.tempColor[slot]);
    else layers[0][sec] = fillRain(rain, scheme);
  }
  return encode(layers);
}

// ---- calendar -------------------------------------------------------------------------------------------
// CONFIG_BORDER_CAL_MODE:   1 busy / free, 2 number of events, 3 now and next
// CONFIG_BORDER_CAL_SCHEME: 0 each calendar's own colours, 1 one colour, 2 grey (a pattern on B&W watches)
// CONFIG_BORDER_CAL_COLOR:  the colour for scheme 1 (0 blue, 1 green, 2 orange, 3 red, 4 purple)
// CONFIG_BORDER_CAL_ALLDAY: also count all-day events
var CAL_COLORS = [[0, 85, 255], [0, 255, 85], [255, 170, 0], [255, 0, 0], [170, 0, 255]];
var DEFAULT_EVENT_COLOR = rgbByte(0, 85, 255);

function calMode() { var v = parseInt(getSetting('CONFIG_BORDER_CAL_MODE', '1'), 10); return (v >= 1 && v <= 3) ? v : 1; }
function calScheme() { var v = parseInt(getSetting('CONFIG_BORDER_CAL_SCHEME', '0'), 10); return (v === 1 || v === 2) ? v : 0; }
function calColor() { var v = parseInt(getSetting('CONFIG_BORDER_CAL_COLOR', '0'), 10); return rgbArr(CAL_COLORS[(v >= 0 && v < CAL_COLORS.length) ? v : 0]); }
function calAllDay() { return getSetting('CONFIG_BORDER_CAL_ALLDAY', 'false') === 'true'; }

// Calendar sector entry from the events overlapping that hour. `ev` is sorted by start time.
// `nextId` is the event that starts next (mode 3).
function calSector(mode, scheme, ev, isNow, nextId) {
  if (!ev.length) return NONE;
  var single = calColor();
  var c1st = ev[0].color || DEFAULT_EVENT_COLOR;
  var c2nd = ev.length > 1 ? (ev[1].color || DEFAULT_EVENT_COLOR) : c1st;
  var n = ev.length;
  if (platform.bw) {
    if (mode === 1) return [4, 0];
    if (mode === 2) return [Math.min(n, 4), 0];
    var isNext = ev.some(function (e) { return e.id === nextId; });
    return [(isNow || isNext) ? 4 : 2, 0];
  }
  if (mode === 1) return pair(scheme === 0 ? c1st : (scheme === 1 ? single : LIGHT_GRAY));
  if (mode === 2) {
    if (scheme === 0) return n === 1 ? pair(c1st) : pair(c1st, c2nd); // two calendars alternate
    if (scheme === 1) return n === 1 ? pair(single, 0) : pair(single); // 1 event = half density
    return pair(n === 1 ? DARK_GRAY : (n === 2 ? LIGHT_GRAY : WHITE));
  }
  var bright = isNow || ev.some(function (e) { return e.id === nextId; });
  var col = scheme === 0 ? c1st : (scheme === 1 ? single : WHITE);
  if (bright) return pair(col);
  return scheme === 2 ? pair(DARK_GRAY) : pair(col, 0); // later events: dimmed (half density)
}

function buildCalendar(now) {
  var events = calendar.events(), allDay = calAllDay();
  var mode = calMode(), scheme = calScheme();
  var layer = emptyLayer();
  var h0 = new Date(now.getTime()); h0.setMinutes(0, 0, 0);
  var start0 = h0.getTime(), hour12 = now.getHours() % 12, HOUR = 3600000;
  var list = events.filter(function (e) { return allDay || !e.allDay; });
  var nextId = null, nextStart = Infinity;
  list.forEach(function (e) { if (e.start > now.getTime() && e.start < nextStart) { nextStart = e.start; nextId = e.id; } });
  for (var k = 0; k < 12; k++) {
    var ws = start0 + k * HOUR, we = ws + HOUR;
    var ev = list.filter(function (e) { return e.start < we && e.end > ws; }).sort(function (a, b) { return a.start - b.start; });
    var running = k === 0 && ev.some(function (e) { return e.start <= now.getTime() && e.end > now.getTime(); });
    layer[(hour12 + k) % 12] = calSector(mode, scheme, ev, running || (k > 0 && ev.some(function (e) { return e.start <= ws; })), nextId);
  }
  return encode([layer]);
}

// ---- public ---------------------------------------------------------------------------------------------
function source() {
  var raw = getSetting('CONFIG_BORDER_SOURCE', '');
  if (raw === '0' || raw === '1' || raw === '2') return parseInt(raw, 10);
  // Profiles saved before the source selector: any weather style meant "weather", 0 meant off.
  return parseInt(getSetting('CONFIG_BORDER_WEATHER_MODE', '0'), 10) > 0 ? 1 : 0;
}

function bytes() {
  var src = source();
  try {
    if (src === 1) return buildWeather(new Date());
    if (src === 2) return buildCalendar(new Date());
  } catch (e) { console.log('modern: border data failed - ' + e.message); }
  return [0];
}

var pushFn = null;
function init(push) {
  pushFn = push;
  // The ring is laid out by clock position, so it has to be rebuilt when the hour changes.
  var lastHour = new Date().getHours();
  setInterval(function () {
    var hr = new Date().getHours();
    if (hr === lastHour) return;
    lastHour = hr;
    if (source() > 0 && pushFn) pushFn(bytes());
  }, 60000);
  calendar.setOnChange(function () { if (source() === 2 && pushFn) pushFn(bytes()); });
  sync();
}
// Subscribes to the calendar plugin only while the ring shows the calendar.
function sync() { if (source() === 2) calendar.start(); else calendar.stop(); }

module.exports = {
  bytes: bytes, setWeather: setWeather, init: init, sync: sync, source: source,
  calendarStatus: calendar.status
};
