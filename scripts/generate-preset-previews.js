#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var sharp = require('sharp');

var R = require('./lib/resources');

// Marker preset pictures (marker_preset_<name>.png) are per shape now:
//   resources/square/images/  (emery)      resources/round/images/  (gabbro)     resources/legacy/images/  (flint, diorite)
// Until a shape has its own picture the page falls back to the square one (see platform.shapeImages), and the
// square set itself still falls back to the old shared folders so an unmoved tree keeps working.
var SQUARE_DIRS = [R.dir('square', 'images'), path.join(R.RES, 'common', 'images'), path.join(R.RES, 'common', 'infographics')];
var ROUND_DIRS = [R.dir('round', 'images')];
var LEGACY_DIRS = [R.dir('legacy', 'images')];
var OUTPUT_FILE = path.join(__dirname, '..', 'src', 'pkjs', 'data', 'generated', 'marker-preset-images.js');
var PREFIX = 'marker_preset_';
var KNOWN_NAMES = ['braun', 'minimal', 'classy', 'swiss'];

var entries = {};
var entriesRound = {};
var entriesBw = {};
var found = [];
var totalBytes = 0;

function findPicture(dirs, name) {
  for (var i = 0; i < dirs.length; i++) {
    var f = path.join(dirs[i], PREFIX + name + '.png');
    if (fs.existsSync(f)) return f;
  }
  return null;
}

// Pure black becomes transparent, then the picture is returned as a PNG data URI.
async function toDataUri(sourcePath) {
    var sourceBuffer = fs.readFileSync(sourcePath);
    totalBytes += sourceBuffer.length;

    var metadata = await sharp(sourceBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      console.error(
        'generate-preset-previews: could not determine dimensions of ' + sourcePath
      );
      return null;
    }

    // 1. Crop and extract raw RGBA pixel data
    var rawImage = await sharp(sourceBuffer)
      .extract({
        left: 0,
        top: 0,
        width: metadata.width,
        height: metadata.height
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    var pixels = rawImage.data;
    var channels = rawImage.info.channels; // Guaranteed to be 4 due to ensureAlpha()

    // 2. Iterate through pixels to make pure black transparent
    for (var i = 0; i < pixels.length; i += channels) {
      // If R, G, and B are all 0 (pure black)
      if (pixels[i] === 0 && pixels[i+1] === 0 && pixels[i+2] === 0) {
         pixels[i+3] = 0; // Set Alpha to 0
      }
    }

    // 3. Convert modified raw pixels back to a PNG buffer
    var transparentBuffer = await sharp(pixels, {
      raw: {
        width: rawImage.info.width,
        height: rawImage.info.height,
        channels: channels
      }
    })
    .png()
    .toBuffer();
    
    totalBytes += transparentBuffer.length;
    return 'data:image/png;base64,' + transparentBuffer.toString('base64');
}

async function buildPresetPreviews() {
  for (const name of KNOWN_NAMES) {
    var sq = findPicture(SQUARE_DIRS, name);
    if (!sq) continue;
    var uri = await toDataUri(sq);
    if (!uri) continue;
    entries[name] = uri;
    found.push(name);
    var rd = findPicture(ROUND_DIRS, name);
    if (rd) entriesRound[name] = await toDataUri(rd);
    var lg = findPicture(LEGACY_DIRS, name);
    if (lg) entriesBw[name] = await toDataUri(lg);
  }

  var missing = KNOWN_NAMES.filter(function (n) { return found.indexOf(n) === -1; });

  var lines = [];
  lines.push('// GENERATED FILE -- do not edit by hand.');
  lines.push('// Produced by scripts/generate-preset-previews.js from');
  lines.push('// resources/{square,round,legacy}/images/marker_preset_<name>.png. Re-run that script after');
  lines.push('// adding or changing any marker-preset picture, before `pebble build`.');
  lines.push('module.exports = ' + JSON.stringify(entries, null, 2) + ';');
  lines.push('module.exports.round = ' + JSON.stringify(entriesRound, null, 2) + ';');
  lines.push('module.exports.bw = ' + JSON.stringify(entriesBw, null, 2) + ';');
  lines.push('');
  if (!fs.existsSync(path.dirname(OUTPUT_FILE))) fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n'));

  console.log('generate-preset-previews: wrote ' + OUTPUT_FILE);
  console.log('generate-preset-previews: embedded ' + found.length + ' marker-preset picture(s) (round: ' + Object.keys(entriesRound).length + ', legacy: ' + Object.keys(entriesBw).length + ')' +
    ' (' + totalBytes + ' raw bytes before base64): ' + (found.join(', ') || '(none)'));
  if (missing.length) {
    console.log('generate-preset-previews: no ' + missing.map(function (n) { return PREFIX + n + '.png'; }).join(', ') +
      ' found. Those marker preset buttons will simply show no picture in settings until that resource PNG exists.');
  }
};

// Execute the async function
buildPresetPreviews().catch(console.error);
