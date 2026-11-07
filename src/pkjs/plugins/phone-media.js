// Phone battery ("phone" plugin, item "phone_state") and music ("music" plugin, item "track") for the predefined
// features. Only subscribed while a feature on the watch actually uses them (setNeeds).
//
// The public guide names phone_state.battery_level but documents no music properties, and music is Android-only. So
// nothing here is hard-wired to one spelling: every field is found by a loose name match on what the plugin sends,
// and status() reports what was found so a mismatch is visible on the settings page.
var platform = require('../platform');
var pluginImage = require('../bg-image/plugin-image');

var ART = platform.bw ? 12 : 16;           // album art edge in pixels, same as the watch's PL_ICON_DRAW
var TEXT_LEN = 20;                          // bytes per text field on the watch, NUL included
var POS_DRIFT_PUSH_S = 4;                   // push a position update when the watch's own estimate is this far off
var DEBOUNCE_MS = 600;

var needs = { phone: false, music: false };
var phoneSub = null, musicSub = null;
var pushFn = null, artFn = null;
var timer = null;

var phone = { pct: 255, charging: 0 };
var phoneStatus = { state: 'off', message: '' };
var music = { state: 0, pos: 0, dur: 0, title: '', artist: '', art: null, artSig: '', sentAt: 0, sentPos: 0, sentState: -1, sentTitle: null };
var musicStatus = { state: 'off', message: '', props: [] };

function hasApi() {
  try { return typeof Pebble !== 'undefined' && typeof Pebble.subscribeToSource === 'function'; } catch (e) { return false; }
}
function pickKey(keys, re, notRe) {
  for (var i = 0; i < keys.length; i++) if (re.test(keys[i]) && !(notRe && notRe.test(keys[i]))) return keys[i];
  return null;
}
function num(p) { return (p && p.numericValue && typeof p.numericValue.value === 'number') ? p.numericValue.value : null; }
function text(p) {
  if (!p) return '';
  if (p.shortText && typeof p.shortText.text === 'string') return p.shortText.text;
  if (p.longText && typeof p.longText.text === 'string') return p.longText.text;
  return '';
}
function bool(p) { return (p && p.boolean && typeof p.boolean.value === 'boolean') ? p.boolean.value : null; }

function utf8Fit(str, maxBytes) {
  var out = [];
  str = String(str || '').replace(/\s+/g, ' ').trim();
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
function textBlock(s) {
  var b = utf8Fit(s, TEXT_LEN - 1);
  while (b.length < TEXT_LEN) b.push(0);
  return b;
}

// ---- wire blocks ------------------------------------------------------------------------------------------------

function phoneBytes() { return [phone.pct & 255, phone.charging ? 1 : 0]; }

function infoBytes() {
  var pos = Math.max(0, Math.min(65535, Math.round(music.pos)));
  var dur = Math.max(0, Math.min(65535, Math.round(music.dur)));
  return [music.state & 255, pos & 255, pos >> 8, dur & 255, dur >> 8];
}
function textBytes() { return textBlock(music.title).concat(textBlock(music.artist)); }
function artBytes() {
  var out = music.art ? music.art.slice() : [];
  while (out.length < ART * ART) out.push(0);
  return out;
}

// ---- album art ------------------------------------------------------------------------------------------------

var BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
function q(v) { v = v >> 6; return v < 0 ? 0 : (v > 3 ? 3 : v); }

// Box-average a decoded picture down to ART x ART GColor8 bytes. B&W watches get an ordered 1-bit dither.
function tinyArt(img) {
  if (!img || !img.w || !img.h) return null;
  var out = [];
  for (var y = 0; y < ART; y++) {
    var y0 = Math.floor(y * img.h / ART), y1 = Math.max(y0 + 1, Math.floor((y + 1) * img.h / ART));
    for (var x = 0; x < ART; x++) {
      var x0 = Math.floor(x * img.w / ART), x1 = Math.max(x0 + 1, Math.floor((x + 1) * img.w / ART));
      var r = 0, g = 0, b = 0, n = 0;
      for (var yy = y0; yy < y1 && yy < img.h; yy++) for (var xx = x0; xx < x1 && xx < img.w; xx++) {
        var p = (yy * img.w + xx) * 4, a = img.rgba[p + 3] / 255;
        r += img.rgba[p] * a; g += img.rgba[p + 1] * a; b += img.rgba[p + 2] * a; n++;   // transparent counts as black
      }
      if (!n) n = 1;
      r /= n; g /= n; b /= n;
      if (platform.bw) {
        var lum = 0.299 * r + 0.587 * g + 0.114 * b;
        var on = lum > (BAYER[y & 3][x & 3] + 0.5) * 16;
        out.push(on ? 0xFF : 0xC0);
      } else {
        out.push(0xC0 | (q(r) << 4) | (q(g) << 2) | q(b));
      }
    }
  }
  return out;
}

function findImage(props) {
  var keys = Object.keys(props), best = null, i, k, v, n;
  for (i = 0; i < keys.length; i++) {
    k = keys[i]; v = props[k];
    if (!v || typeof v !== 'object') continue;
    var payload = (v.image && typeof v.image === 'object') ? v.image : ((v.icon && typeof v.icon === 'object') ? v.icon : null);
    if (!payload) {
      for (n in v) if (v.hasOwnProperty(n) && v[n] && typeof v[n] === 'object' && v[n].pixels !== undefined && v[n].palette !== undefined) { payload = v[n]; break; }
    }
    if (!payload) continue;
    if (/art|cover|album|thumb|image|artwork/i.test(k)) return payload;
    if (!best) best = payload;
  }
  return best;
}

// ---- pushing ---------------------------------------------------------------------------------------------------

function pushNow() {
  timer = null;
  if (!pushFn) return;
  var dict = {};
  if (needs.phone) dict.PHONE_BATTERY = phoneBytes();
  if (needs.music) {
    dict.MEDIA_INFO = infoBytes();
    dict.MEDIA_TEXT = textBytes();
    music.sentAt = Date.now(); music.sentPos = music.pos; music.sentState = music.state; music.sentTitle = music.title;
  }
  try { pushFn(dict); } catch (e) { console.log('modern: phone/media push failed - ' + e.message); }
}
function schedulePush() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(pushNow, DEBOUNCE_MS);
}
function pushArt() {
  if (artFn && needs.music) { try { artFn(artBytes()); } catch (e) { } }
}

// ---- phone battery ---------------------------------------------------------------------------------------------

function onPhone(env) {
  var inst = env && env.instances && env.instances[0];
  var props = (inst && inst.properties) || {};
  var keys = Object.keys(props);
  var kLevel = pickKey(keys, /batt.*(level|pct|percent|charge)|^battery$|level/i, /charging/i) || pickKey(keys, /batt/i, /charg(ing|e_?state)/i);
  var kChg = pickKey(keys, /charging|plugged|power.?connected|is.?charg/i);
  var v = kLevel ? num(props[kLevel]) : null;
  if (v === null && kLevel) { var t = parseFloat(text(props[kLevel])); if (!isNaN(t)) v = t; }
  var pct = 255;
  if (v !== null && !isNaN(v)) {
    if (v > 0 && v <= 1 && Math.floor(v) !== v) v = v * 100;
    pct = Math.max(0, Math.min(100, Math.round(v)));
  }
  var chg = 0;
  if (kChg) { var b = bool(props[kChg]); chg = (b !== null ? b : (num(props[kChg]) > 0)) ? 1 : 0; }
  phoneStatus = pct === 255
    ? { state: 'nodata', message: 'The phone plugin did not report a battery level (properties: ' + keys.join(', ') + ').' }
    : { state: 'ok', message: '' };
  if (pct !== phone.pct || chg !== phone.charging) { phone.pct = pct; phone.charging = chg; schedulePush(); }
}

// ---- music -----------------------------------------------------------------------------------------------------

function stateOf(props, keys) {
  var kPlaying = pickKey(keys, /is.?playing|^playing$/i);
  if (kPlaying) { var b = bool(props[kPlaying]); if (b !== null) return b ? 1 : 2; }
  var kState = pickKey(keys, /play.*(state|status)|^(state|status)$|playback|transport/i);
  if (kState) {
    var s = text(props[kState]).toLowerCase();
    if (s) return /play/.test(s) ? 1 : 2;
    var n = num(props[kState]);
    if (n !== null) return n === 1 || n === 3 ? 1 : 2; // Android PlaybackState: 3 = playing; tolerate 1
    var bb = bool(props[kState]);
    if (bb !== null) return bb ? 1 : 2;
  }
  return 1;   // a track is reported but no recognisable state: assume it is playing
}

function onMusic(env) {
  var inst = env && env.instances && env.instances[0];
  if (!inst) {
    music.state = 0; music.pos = 0; music.dur = 0; music.title = ''; music.artist = '';
    var had = !!music.art; music.art = null; music.artSig = '';
    musicStatus = { state: 'ok', message: 'Nothing is playing right now.', props: [] };
    schedulePush(); if (had) pushArt();
    return;
  }
  var props = inst.properties || {};
  var keys = Object.keys(props);
  var kTitle = pickKey(keys, /title|track|song/i, /artist|album|number|count|id$/i) || pickKey(keys, /name/i, /artist|album|player|app/i);
  var kArtist = pickKey(keys, /artist|author/i);
  var kPos = pickKey(keys, /position|elapsed|progress|current/i, /duration|total|length/i);
  var kDur = pickKey(keys, /duration|length|total/i);
  var title = kTitle ? text(props[kTitle]) : '', artist = kArtist ? text(props[kArtist]) : '';
  var pos = kPos ? num(props[kPos]) : null, dur = kDur ? num(props[kDur]) : null;
  var ms = (dur !== null && dur > 36000) || (dur === null && pos !== null && pos > 36000);
  if (ms) { if (pos !== null) pos /= 1000; if (dur !== null) dur /= 1000; }
  music.state = stateOf(props, keys);
  music.title = title; music.artist = artist;
  music.pos = pos !== null && pos >= 0 ? pos : 0;
  music.dur = dur !== null && dur > 0 ? dur : 0;

  var payload = findImage(props), img = null;
  if (payload) { try { img = pluginImage.decodeImagePayload(payload); } catch (e) { img = null; } }
  var sig = img ? img.signature : '';
  var artChanged = sig !== music.artSig;
  if (artChanged) { music.artSig = sig; music.art = img ? tinyArt(img) : null; }

  musicStatus = { state: 'ok', props: keys, message: (title || artist) ? '' : 'The music plugin sent a track but no title was found (properties: ' + keys.join(', ') + ').' };

  // Only push when something visible changed; a moving position alone is extrapolated on the watch.
  var expected = music.sentPos + (music.sentState === 1 ? (Date.now() - music.sentAt) / 1000 : 0);
  var drift = Math.abs(music.pos - expected);
  if (music.state !== music.sentState || title !== music.sentTitle || drift >= POS_DRIFT_PUSH_S) schedulePush();
  if (artChanged) pushArt();
}

// ---- subscriptions ---------------------------------------------------------------------------------------------

function subscribePhone() {
  if (phoneSub) return;
  if (!hasApi()) { phoneStatus = { state: 'unsupported', message: 'This Pebble app version has no plugin support.' }; return; }
  phoneStatus = { state: 'waiting', message: 'Waiting for the phone plugin...' };
  try {
    phoneSub = Pebble.subscribeToSource({
      category: 'phone', item: 'phone_state',
      onData: function (env) { try { onPhone(env); } catch (e) { console.log('modern: phone battery parse failed - ' + e.message); } },
      onError: function (err) {
        phoneStatus = { state: 'error', message: 'Phone plugin error' + (err && err.code ? ' (' + err.code + ')' : '') + '.' };
        if (phone.pct !== 255) { phone.pct = 255; schedulePush(); }
      }
    });
  } catch (e) { phoneSub = null; phoneStatus = { state: 'error', message: 'Could not subscribe to the phone plugin: ' + e.message }; }
}
function subscribeMusic() {
  if (musicSub) return;
  if (!hasApi()) { musicStatus = { state: 'unsupported', message: 'This Pebble app version has no plugin support.', props: [] }; return; }
  musicStatus = { state: 'waiting', message: 'Waiting for the music plugin (Android only)...', props: [] };
  try {
    musicSub = Pebble.subscribeToSource({
      category: 'music', item: 'track',
      iconPixelSize: { w: ART, h: ART },
      onData: function (env) { try { onMusic(env); } catch (e) { console.log('modern: music parse failed - ' + e.message); } },
      onError: function (err) {
        var code = err && err.code;
        musicStatus = { state: 'error', props: [], message: code === 'PERMISSION_DENIED'
          ? 'Music access was denied. Allow it for the plugin in the Pebble app (music works on Android only).'
          : 'Music plugin error' + (code ? ' (' + code + ')' : '') + '. Music works on Android only.' };
        music.state = 0; schedulePush();
      }
    });
  } catch (e) { musicSub = null; musicStatus = { state: 'error', props: [], message: 'Could not subscribe to the music plugin: ' + e.message }; }
}
function drop(sub) { if (sub && typeof sub.unsubscribe === 'function') { try { sub.unsubscribe(); } catch (e) { } } }

// Called whenever the set of features changes: which of the two sources the watch's features use.
function setNeeds(n) {
  var wantPhone = !!(n && n.phone), wantMusic = !!(n && n.music);
  if (wantPhone && !phoneSub) subscribePhone();
  if (!wantPhone && phoneSub) { drop(phoneSub); phoneSub = null; phone = { pct: 255, charging: 0 }; phoneStatus = { state: 'off', message: '' }; }
  if (wantMusic && !musicSub) subscribeMusic();
  if (!wantMusic && musicSub) { drop(musicSub); musicSub = null; musicStatus = { state: 'off', message: '', props: [] }; }
  needs = { phone: wantPhone, music: wantMusic };
}

// The primitive ids (corner + edge bytes as sent to the watch) decide what is needed.
function needsFromPrimitiveIds(ids, PRIM) {
  var phoneIds = [PRIM.PRIM_PHONE_ICON, PRIM.PRIM_PHONE_BATTERY_TEXT];
  var musicIds = [PRIM.PRIM_MEDIA_STATE_ICON, PRIM.PRIM_MEDIA_ART_ICON, PRIM.PRIM_MEDIA_PROGRESS_BAR,
    PRIM.PRIM_MEDIA_TITLE_TEXT, PRIM.PRIM_MEDIA_ELAPSED_TEXT];
  var n = { phone: false, music: false };
  for (var i = 0; i < ids.length; i++) {
    if (phoneIds.indexOf(ids[i]) >= 0) n.phone = true;
    if (musicIds.indexOf(ids[i]) >= 0) n.music = true;
  }
  return n;
}

function init(pushCb, artCb) { pushFn = pushCb; artFn = artCb; }

function fill(dict) {
  if (needs.phone) dict['PHONE_BATTERY'] = phoneBytes();
  if (needs.music) {
    dict['MEDIA_INFO'] = infoBytes();
    dict['MEDIA_TEXT'] = textBytes();
    dict['MEDIA_ART'] = artBytes();
  }
}

module.exports = {
  ART: ART,
  init: init, setNeeds: setNeeds, needsFromPrimitiveIds: needsFromPrimitiveIds, fill: fill,
  status: function () { return { phone: phoneStatus, music: musicStatus }; },
  // exposed for tests
  _tinyArt: tinyArt, _onMusic: onMusic, _onPhone: onPhone
};
