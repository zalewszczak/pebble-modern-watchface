#!/usr/bin/env node
// Reads the "Example styles" section's screenshot PNGs --
// resources/example-styles/<n>.png, one per numbered example-style
// slot -- and generates src/pkjs/data/generated/example-style-images.js as a lookup
// table of data: URIs the settings page can embed directly. Same
// reasoning and same generated-file shape as
// generate-marker-previews.js right next to this file (see that
// script's own top-of-file comment for why this has to happen at
// build time rather than at runtime): the settings page is one
// self-contained data:text/html URI with no server behind it, so any
// preview image has to already be baked in as base64 by build time.
//
// Usage:
//   node scripts/generate-example-style-previews.js
//
// Run this whenever you add or change an example-style screenshot in
// resources/example-styles/, before `pebble build`. A slot with no
// PNG yet just shows an empty placeholder tile in settings -- not an
// error, and doesn't stop the app from building or running.
//
// How many example-style slots exist at all is controlled by a
// single place: EXAMPLE_STYLE_COUNT in src/pkjs/config/config-state.js. This
// script doesn't need to know that number -- it just embeds whichever
// numbered PNGs it actually finds (1.png, 2.png, ...), and the
// settings page ignores any entry beyond its own EXAMPLE_STYLE_COUNT.

var fs = require('fs');
var path = require('path');

var R = require('./lib/resources');
var SOURCE_DIR = R.dir('square', 'example-styles');
var ROUND_DIR = R.dir('round', 'example-styles');
var LEGACY_DIR = R.dir('legacy', 'example-styles');
var OUTPUT_FILE = path.join(__dirname, '..', 'src', 'pkjs', 'data', 'generated', 'example-style-images.js');
var SUFFIX = '.png';

var entries = {};
var entriesRound = {};
var entriesBw = {};
var found = [];
var unrecognized = [];
var totalBytes = 0;

var files = [];
if (fs.existsSync(SOURCE_DIR)) {
  files = fs.readdirSync(SOURCE_DIR).filter(function (f) {
    return f.slice(-SUFFIX.length) === SUFFIX;
  });
}

files.forEach(function (file) {
  var stem = file.slice(0, -SUFFIX.length);
  if (!/^[0-9]+$/.test(stem)) {
    unrecognized.push(file);
    return;
  }
  var buf = fs.readFileSync(path.join(SOURCE_DIR, file));
  totalBytes += buf.length;
  entries[stem] = 'data:image/png;base64,' + buf.toString('base64');
  if (fs.existsSync(path.join(ROUND_DIR, file))) entriesRound[stem] = R.dataUri(path.join(ROUND_DIR, file));
  if (fs.existsSync(path.join(LEGACY_DIR, file))) entriesBw[stem] = R.dataUri(path.join(LEGACY_DIR, file));
  found.push(stem);
});

var lines = [];
lines.push('// GENERATED FILE -- do not edit by hand.');
lines.push('// Produced by scripts/generate-example-style-previews.js from');
lines.push('// resources/{square,round,legacy}/example-styles/<n>.png. Re-run that script after adding or');
lines.push('// changing any example-style screenshot, before `pebble build`.');
lines.push('module.exports = ' + JSON.stringify(entries, null, 2) + ';');
lines.push('module.exports.round = ' + JSON.stringify(entriesRound, null, 2) + ';');
lines.push('module.exports.bw = ' + JSON.stringify(entriesBw, null, 2) + ';');
lines.push('');

if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));

console.log('generate-example-style-previews: wrote ' + OUTPUT_FILE);
console.log('generate-example-style-previews: embedded ' + found.length + ' preview image(s) from ' + SOURCE_DIR +
  ' (' + totalBytes + ' raw bytes before base64, which itself runs about 33% larger): ' + (found.join(', ') || '(none)'));
if (unrecognized.length) {
  console.log('generate-example-style-previews: found ' + unrecognized.join(', ') + ' in ' + SOURCE_DIR +
    ', but the filename isn\'t a plain number -- ignored. Expected e.g. 1.png, 2.png, ... matching each slot\'s index.');
}

// To have this run automatically as part of your normal build instead
// of remembering to run it by hand, either:
//   - add an npm "scripts" entry, e.g.
//       "build": "node scripts/generate-example-style-previews.js && node scripts/generate-marker-previews.js && pebble build"
//     and use `npm run build` instead of `pebble build` directly, or
//   - add this script to whatever shell alias/CI step you already use
//     to invoke `pebble build`.
