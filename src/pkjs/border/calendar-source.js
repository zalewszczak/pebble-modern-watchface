// Calendar events from the Pebble calendar plugin (category "calendar", item "event").
//
// The public plugin guide lists that source but does not document its properties, so nothing here is
// hard-wired to one spelling: every instance is one event and each field is looked up by a loose name match
// (start / end / title / all day / colour / calendar name) on whatever properties the plugin declares. What was
// actually found is reported by status() and shown on the settings page, so a mismatch is visible there.
var HOUR_MS = 3600000;

var sub = null;
var list = [];
var state = { state: 'off', message: '', events: 0, props: [] };
var onChange = null;
var pushTimer = null;

function hasApi() {
  try { return typeof Pebble !== 'undefined' && typeof Pebble.subscribeToSource === 'function'; } catch (e) { return false; }
}

function pickKey(keys, re, notRe) {
  for (var i = 0; i < keys.length; i++) if (re.test(keys[i]) && !(notRe && notRe.test(keys[i]))) return keys[i];
  return null;
}

// A timestamp payload to milliseconds. The guide says epoch seconds; tolerate milliseconds too.
function tsMs(p) {
  if (!p) return null;
  var t = p.timestamp || p;
  var v = (t && typeof t.value === 'number') ? t.value : (t && typeof t.seconds === 'number' ? t.seconds : (typeof t === 'number' ? t : null));
  if (v === null || isNaN(v)) return null;
  return v < 1e11 ? v * 1000 : v;
}
function textOf(p) {
  if (!p) return '';
  if (p.shortText && typeof p.shortText.text === 'string') return p.shortText.text;
  if (p.longText && typeof p.longText.text === 'string') return p.longText.text;
  return '';
}
function numOf(p) { return (p && p.numericValue && typeof p.numericValue.value === 'number') ? p.numericValue.value : null; }
function boolOf(p) { return (p && p.boolean && typeof p.boolean.value === 'boolean') ? p.boolean.value : null; }

function q(v) { v = v >> 6; return v < 0 ? 0 : (v > 3 ? 3 : v); }
// A colour payload (0xRRGGBB number, Android ARGB int, or "#RRGGBB" text) to a GColor8 byte, or null.
function colorByte(p) {
  if (!p) return null;
  var rgb = null, n = numOf(p), s = textOf(p), m;
  if (n !== null) rgb = (n >>> 0) & 0xFFFFFF;
  else if (s && (m = /^#?([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(s.trim()))) rgb = parseInt(m[1], 16);
  if (rgb === null) return null;
  return 0xC0 | (q((rgb >> 16) & 255) << 4) | (q((rgb >> 8) & 255) << 2) | q(rgb & 255);
}

var FALLBACK = [0xC0 | (0 << 4) | (1 << 2) | 3, 0xC0 | (0 << 4) | (3 << 2) | 1, 0xC0 | (3 << 4) | (2 << 2) | 0, 0xC0 | (3 << 4) | (0 << 2) | 0, 0xC0 | (2 << 4) | (0 << 2) | 3];
function hashColor(str) {
  var h = 0;
  for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

function parse(instances) {
  var out = [], seen = {};
  (instances || []).forEach(function (inst, idx) {
    var props = (inst && inst.properties) || {};
    var keys = Object.keys(props);
    keys.forEach(function (k) { seen[k] = true; });
    var kStart = pickKey(keys, /start|begin/i), kEnd = pickKey(keys, /(^|_)end|finish|stop/i, /start/i);
    var kDur = pickKey(keys, /duration|length/i), kAll = pickKey(keys, /all.?day/i);
    var kColor = pickKey(keys, /colou?r/i), kCal = pickKey(keys, /calendar|account/i, /colou?r/i);
    var kTitle = pickKey(keys, /title|name|summary|subject/i, /calendar|account|colou?r/i);
    var start = kStart ? tsMs(props[kStart]) : null;
    if (start === null) return;
    var end = kEnd ? tsMs(props[kEnd]) : null;
    if (end === null) {
      var dur = kDur ? numOf(props[kDur]) : null;
      end = start + ((dur !== null && dur > 0) ? (dur < 100000 ? dur * 1000 : dur) : HOUR_MS);
    }
    if (end <= start) end = start + 1;
    var allDay = kAll ? boolOf(props[kAll]) : null;
    if (allDay === null) {
      var d = new Date(start);
      allDay = (end - start) >= 23 * HOUR_MS && d.getHours() === 0 && d.getMinutes() === 0;
    }
    var color = kColor ? colorByte(props[kColor]) : null;
    var calName = kCal ? textOf(props[kCal]) : '';
    if (color === null && calName) color = hashColor(calName);
    out.push({ id: String(inst.instanceId !== undefined ? inst.instanceId : idx), start: start, end: end, allDay: !!allDay,
      color: color, title: kTitle ? textOf(props[kTitle]) : '' });
  });
  return { events: out, props: Object.keys(seen) };
}

function notify() {
  if (!onChange) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(function () { pushTimer = null; try { onChange(); } catch (e) { } }, 800);
}

function start() {
  if (sub) return;
  if (!hasApi()) { state = { state: 'unsupported', message: 'This Pebble app version has no plugin support. Update the app.', events: 0, props: [] }; return; }
  state = { state: 'waiting', message: 'Waiting for the calendar plugin...', events: 0, props: [] };
  try {
    sub = Pebble.subscribeToSource({
      category: 'calendar', item: 'event',
      onData: function (env) {
        var r = parse(env && env.instances);
        list = r.events;
        state = { state: 'ok', events: list.length, props: r.props,
          message: list.length ? '' : 'The calendar plugin reports no upcoming events.' };
        notify();
      },
      onError: function (err) {
        var code = err && err.code;
        list = [];
        state = { state: 'error', events: 0, props: [], message: code === 'PERMISSION_DENIED'
          ? 'Calendar access was denied. Allow the Calendar permission for the plugin in the Pebble app.'
          : 'Calendar plugin error' + (code ? ' (' + code + ')' : '') + '.' };
        notify();
      }
    });
  } catch (e) {
    sub = null;
    state = { state: 'error', events: 0, props: [], message: 'Could not subscribe to the calendar plugin: ' + e.message };
  }
}

function stop() {
  if (sub && typeof sub.unsubscribe === 'function') { try { sub.unsubscribe(); } catch (e) { } }
  sub = null;
  list = [];
  state = { state: 'off', message: '', events: 0, props: [] };
}

module.exports = {
  start: start, stop: stop, events: function () { return list; }, status: function () { return state; },
  setOnChange: function (fn) { onChange = fn; }
};
