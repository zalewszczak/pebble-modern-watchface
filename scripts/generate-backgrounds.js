#!/usr/bin/env node
// Predefined custom-background images.
//
// Reads resources/square/backgrounds/<n>.png (and the round/ twin of each, 260x260) (numbered, 1.png, 2.png, ...; ideally
// 200x228 -- the Pebble Time 2 screen -- and as small as possible: palette
// PNGs are best) and wires each one into BOTH halves of the project:
//
//   1. src/pkjs/data/generated/background-images.js
//        { count, numbers, images: { "<n>": "data:image/png;base64,..." } }
//      -- embedded into the settings page for the gallery thumbnails and
//      the live preview. (The page is one self-contained data: URI, so every
//      image has to be baked in at build time; every PNG here adds its own
//      size x 1.33 to the page.)
//
//   2. src/c/generated/background_presets.h
//        BG_PRESET_COUNT and bg_preset_resource_id(n) -> RESOURCE_ID_BG_PRESET_<n>
//      -- the watch loads the chosen preset with gbitmap_create_with_resource()
//      and uses that bitmap AS the background cache (no second copy in RAM).
//
//   3. package.json pebble.resources.media
//      -- (re)creates one {"type":"bitmap","name":"BG_PRESET_<n>"} entry per
//      PNG found; entries for PNGs that no longer exist are removed.
//
// With no PNGs present all three are still generated (count 0), so the
// project builds with zero presets. Re-run after adding/removing/renaming a
// file in resources/backgrounds/ and before `pebble build`
// (scripts/generate-all.js runs it for you).
//
// Usage:  node scripts/generate-backgrounds.js

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var R = require('./lib/resources');
var SOURCE_DIR = R.dir('square', 'backgrounds');
var ROUND_DIR = R.dir('round', 'backgrounds');
var LEGACY_DIR = R.dir('legacy', 'backgrounds');
var JS_OUT = path.join(ROOT, 'src', 'pkjs', 'data', 'generated', 'background-images.js');
var H_OUT = path.join(ROOT, 'src', 'c', 'generated', 'background_presets.h');
var PKG = path.join(ROOT, 'package.json');
var MEDIA_PREFIX = 'BG_PRESET_';

var numbers = [];
var images = {};
var imagesRound = {};
var imagesBw = {};
var totalBytes = 0;
var ignored = [];

if (fs.existsSync(SOURCE_DIR)) {
  fs.readdirSync(SOURCE_DIR).forEach(function (file) {
    var m = /^([0-9]+)\.png$/i.exec(file);
    if (!m) { ignored.push(file); return; }
    var n = parseInt(m[1], 10);
    if (n < 1 || n > 255) { ignored.push(file); return; }
    var buf = fs.readFileSync(path.join(SOURCE_DIR, file));
    totalBytes += buf.length;
    images[String(n)] = 'data:image/png;base64,' + buf.toString('base64');
    numbers.push(n);
    if (fs.existsSync(path.join(ROUND_DIR, file))) imagesRound[String(n)] = 'data:image/png;base64,' + fs.readFileSync(path.join(ROUND_DIR, file)).toString('base64');
    // Predefined backgrounds are not offered on the B&W watches (flint, diorite).
  });
}
numbers.sort(function (a, b) { return a - b; });

// ---- 1. settings page data ------------------------------------------------
var js = [];
js.push('// GENERATED FILE -- do not edit by hand.');
js.push('// Produced by scripts/generate-backgrounds.js from resources/{square,round,legacy}/backgrounds/<n>.png.');
js.push('module.exports = {');
js.push('  count: ' + numbers.length + ',');
js.push('  numbers: ' + JSON.stringify(numbers) + ',');
js.push('  images: ' + JSON.stringify(images, null, 2).replace(/\n/g, '\n  ') + ',');
js.push('  imagesRound: ' + JSON.stringify(imagesRound, null, 2).replace(/\n/g, '\n  ') + ',');
js.push('  imagesBw: ' + JSON.stringify(imagesBw, null, 2).replace(/\n/g, '\n  '));
js.push('};');
fs.writeFileSync(JS_OUT, js.join('\n') + '\n');

// ---- 2. C resource table ----------------------------------------------------
var h = [];
h.push('// GENERATED FILE -- do not hand-edit.');
h.push('// Produced by scripts/generate-backgrounds.js from resources/{square,round,legacy}/backgrounds/<n>.png.');
h.push('#pragma once');
h.push('');
h.push('#include <pebble.h>');
h.push('');
h.push('// Number of predefined background images compiled into this build.');
h.push('#define BG_PRESET_COUNT ' + numbers.length);
h.push('');
h.push('// Resource id of predefined background <n> (1-based, the number in the PNG');
h.push('// file name), or 0 when there is no such image.');
h.push('// On a round watch only the presets that have a resources/round/backgrounds/<n>.png exist, on a');
h.push('// black and white one (flint, diorite) none (predefined backgrounds are not offered there).');
h.push('static inline uint32_t bg_preset_resource_id(uint8_t n) {');
['#ifdef PBL_ROUND', '#elif defined(PBL_BW)', '#else'].forEach(function (cond, pass) {
  h.push(cond);
  h.push('  switch (n) {');
  numbers.forEach(function (n) {
    if (pass === 0 && !imagesRound[String(n)]) return;
    if (pass === 1 && !imagesBw[String(n)]) return;
    h.push('    case ' + n + ': return RESOURCE_ID_' + MEDIA_PREFIX + n + ';');
  });
  h.push('    default: return 0;');
  h.push('  }');
});
h.push('#endif');
h.push('}');
fs.writeFileSync(H_OUT, h.join('\n') + '\n');

// ---- 3. package.json media entries ------------------------------------------
var pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
var media = pkg.pebble.resources.media;
var kept = media.filter(function (e) { return String(e.name).indexOf(MEDIA_PREFIX) !== 0; });
numbers.forEach(function (n) {
  R.shapedMedia(MEDIA_PREFIX + n, 'backgrounds/' + n + '.png', false, true).forEach(function (e) { kept.push(e); });
});
pkg.pebble.resources.media = kept;
fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');

console.log('backgrounds: ' + numbers.length + ' image(s) [' + numbers.join(', ') + '], ' +
  Math.round(totalBytes / 1024) + ' KB of PNG -> ~' + Math.round(totalBytes * 1.34 / 1024) + ' KB added to the settings page');
if (ignored.length) console.log('  ignored (not <n>.png): ' + ignored.join(', '));
