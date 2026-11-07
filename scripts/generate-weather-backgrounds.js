#!/usr/bin/env node
// "Weather background" styles.
//
// Every sub-folder of resources/square/weatherbg/ is one style (e.g. "manhattan").
// A style holds one PNG per weather condition and time of day, named
//
//     <condition>_<day|night>.png      (ideally 200x228, palette PNG)
//
// with <condition> one of the watch's detailed weather classes (index in
// brackets): clear_sky [0], partly_cloudy [1], overcast [2], fog [3],
// drizzle [4], rain [5], heavy_rain [6], snow [7], thunderstorm [8], sleet [9].
//
// To add a style: create resources/square/weatherbg/<name>/ (and the same in resources/round/weatherbg/
// and resources/legacy/weatherbg/, 144x168 1-bit) with those PNGs and run
// this script (scripts/generate-all.js does). Missing images are allowed --
// the watch falls back to the other time of day, then to clear_sky.
//
// Generates:
//   1. src/pkjs/data/generated/weather-backgrounds.js
//        { styles: [{ id, label, thumb }] }  -- the settings page's style
//        dropdown + preview (one small thumbnail per style, not all images).
//   2. src/c/generated/weather_backgrounds.h
//        WEATHERBG_STYLE_COUNT and weatherbg_resource_id(style, wx, night)
//        (style is 1-based, in the order of the dropdown).
//   3. package.json pebble.resources.media entries WEATHERBG_<STYLE>_<COND>_<DAY|NIGHT>.
//
// Usage: node scripts/generate-weather-backgrounds.js

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var R = require('./lib/resources');
var SOURCE_DIR = R.dir('square', 'weatherbg');
var JS_OUT = path.join(ROOT, 'src', 'pkjs', 'data', 'generated', 'weather-backgrounds.js');
var H_OUT = path.join(ROOT, 'src', 'c', 'generated', 'weather_backgrounds.h');
var PKG = path.join(ROOT, 'package.json');
var MEDIA_PREFIX = 'WEATHERBG_';
var CONDITIONS = ['clear_sky', 'partly_cloudy', 'overcast', 'fog', 'drizzle',
  'rain', 'heavy_rain', 'snow', 'thunderstorm', 'sleet'];

function cIdent(s) { return s.toUpperCase().replace(/[^A-Z0-9]+/g, '_'); }
function label(s) { return s.replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

var styles = [];
if (fs.existsSync(SOURCE_DIR)) {
  fs.readdirSync(SOURCE_DIR).sort().forEach(function (dir) {
    var full = path.join(SOURCE_DIR, dir);
    if (!fs.statSync(full).isDirectory()) return;
    var files = {};
    CONDITIONS.forEach(function (c, idx) {
      ['day', 'night'].forEach(function (tod) {
        var f = path.join(full, c + '_' + tod + '.png');
        if (fs.existsSync(f)) files[idx + '_' + tod] = path.relative(R.dir('square'), f).replace(/\\/g, '/');
      });
    });
    if (!Object.keys(files).length) { console.log('  skipped (no images): ' + dir); return; }
    styles.push({ id: dir, label: label(dir), files: files, ident: cIdent(dir) });
  });
}
if (styles.length > 250) throw new Error('too many weather background styles');

// 1. settings-page data
var js = ['// GENERATED FILE -- do not edit by hand.',
  '// Produced by scripts/generate-weather-backgrounds.js from resources/square/weatherbg/<style>/.',
  'module.exports = {', '  styles: ['];
styles.forEach(function (st, i) {
  var thumbKey = st.files['0_day'] ? '0_day' : Object.keys(st.files)[0];
  var buf = fs.readFileSync(path.join(R.dir('square'), st.files[thumbKey]));
  var rf = path.join(R.dir('round'), st.files[thumbKey]);
  var rbuf = fs.existsSync(rf) ? fs.readFileSync(rf) : null;
  js.push('    { id: ' + JSON.stringify(st.id) + ', label: ' + JSON.stringify(st.label) + ', index: ' + (i + 1) +
    ', thumb: ' + JSON.stringify('data:image/png;base64,' + buf.toString('base64')) + ', thumbRound: ' + JSON.stringify(rbuf ? 'data:image/png;base64,' + rbuf.toString('base64') : '') + ' }' + (i < styles.length - 1 ? ',' : ''));
});
js.push('  ]', '};');
fs.writeFileSync(JS_OUT, js.join('\n') + '\n');

// 2. C header
var h = ['// GENERATED FILE -- do not hand-edit.',
  '// Produced by scripts/generate-weather-backgrounds.js from resources/square/weatherbg/<style>/.',
  '#pragma once', '', '#include <pebble.h>', '',
  '#define WEATHERBG_STYLE_COUNT ' + styles.length, '',
  '// Resource id of the weather background for style (1-based), detailed weather',
  '// class wx (0-9) and time of day, or 0 when that exact image does not exist.',
  '// On a round watch only images that exist in resources/round/weatherbg/ are available, on a black',
  '// and white one (flint, diorite) only those in resources/legacy/weatherbg/.',
  'static inline uint32_t weatherbg_resource_id_exact(uint8_t style, uint8_t wx, bool night) {'];
['#ifdef PBL_ROUND', '#elif defined(PBL_BW)', '#else'].forEach(function (cond, pass) {
  if (pass === 1) { h.push(cond, '  // No weather backgrounds on the 1-bit watches.', '  (void)style; (void)wx; (void)night;', '  return 0;'); return; }
  h.push(cond, '  switch (style) {');
  styles.forEach(function (st, i) {
    var lines = [];
    CONDITIONS.forEach(function (c, idx) {
      ['day', 'night'].forEach(function (tod, t) {
        if (!st.files[idx + '_' + tod]) return;
        if (pass === 0 && !R.exists('round/' + st.files[idx + '_' + tod])) return;
        if (pass === 1 && !R.exists('legacy/' + st.files[idx + '_' + tod])) return;
        lines.push('        case ' + (idx * 2 + t) + ': return RESOURCE_ID_' + MEDIA_PREFIX + st.ident + '_' + cIdent(c) + '_' + tod.toUpperCase() + ';');
      });
    });
    if (!lines.length) return;
    h.push('    case ' + (i + 1) + ':', '      switch (wx * 2 + (night ? 1 : 0)) {');
    Array.prototype.push.apply(h, lines);
    h.push('        default: return 0;', '      }');
  });
  h.push('    default: return 0;', '  }');
});
h.push('#endif', '}', '',
  '// Same, falling back to the other time of day and then to clear sky.',
  'static inline uint32_t weatherbg_resource_id(uint8_t style, uint8_t wx, bool night) {',
  '  if (wx > 9) wx = 0;',
  '  uint32_t id = weatherbg_resource_id_exact(style, wx, night);',
  '  if (!id) id = weatherbg_resource_id_exact(style, wx, !night);',
  '  if (!id) id = weatherbg_resource_id_exact(style, 0, night);',
  '  if (!id) id = weatherbg_resource_id_exact(style, 0, !night);',
  '  return id;', '}');
fs.writeFileSync(H_OUT, h.join('\n') + '\n');

// 3. package.json
var pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
var kept = pkg.pebble.resources.media.filter(function (e) { return String(e.name).indexOf(MEDIA_PREFIX) !== 0; });
var count = 0;
styles.forEach(function (st) {
  CONDITIONS.forEach(function (c, idx) {
    ['day', 'night'].forEach(function (tod) {
      var f = st.files[idx + '_' + tod];
      if (!f) return;
      R.shapedMedia(MEDIA_PREFIX + st.ident + '_' + cIdent(c) + '_' + tod.toUpperCase(), f, false, true).forEach(function (e) { kept.push(e); });
      count++;
    });
  });
});
pkg.pebble.resources.media = kept;
fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');

console.log('weather backgrounds: ' + styles.length + ' style(s) [' + styles.map(function (s) { return s.id; }).join(', ') + '], ' + count + ' image(s)');
