// Shared resource layout for the generators.
//   resources/square/  200x228 art (Pebble Time 2, emery)
//   resources/round/   260x260 art (Pebble Round 2, gabbro), same file names as square/
//   resources/common/  size-independent assets (fonts, small icons, preview-only sources)
// shapedMedia() lists the square file for emery and the round twin for gabbro. A picture without a
// round twin is simply absent on gabbro (the generated C tables return 0 for it); pass fallback=true
// only for art the C code cannot do without (marker indices): gabbro then reuses the square file.
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');
var RES = path.join(ROOT, 'resources');
var PLATFORM = { square: 'emery', round: 'gabbro' };
var warned = {};

function dir(shape, sub) { return path.join(RES, shape, sub || ''); }
function exists(rel) { return fs.existsSync(path.join(RES, rel)); }

// Media entries for one picture that exists in both shapes. rel is relative to the shape folder.
function shapedMedia(name, rel, fallback) {
  var roundRel = 'round/' + rel;
  var haveRound = exists(roundRel);
  var out = [{ type: 'bitmap', name: name, file: 'square/' + rel, targetPlatforms: [PLATFORM.square] }];
  if (haveRound) out.push({ type: 'bitmap', name: name, file: roundRel, targetPlatforms: [PLATFORM.round] });
  else if (fallback) {
    // Only for art the C code cannot do without; costs .pbw size, so use sparingly.
    if (!warned[rel]) { warned[rel] = 1; console.log('  note: no round/' + rel + ' yet - gabbro falls back to square/' + rel); }
    out.push({ type: 'bitmap', name: name, file: 'square/' + rel, targetPlatforms: [PLATFORM.round] });
  } else if (!warned[rel]) { warned[rel] = 1; console.log('  note: no round/' + rel + ' yet - not available on gabbro'); }
  return out;
}

function commonMedia(type, name, rel) { return { type: type, name: name, file: 'common/' + rel }; }

function dataUri(file) { return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'); }

module.exports = { ROOT: ROOT, RES: RES, dir: dir, exists: exists, shapedMedia: shapedMedia, commonMedia: commonMedia, dataUri: dataUri, PLATFORM: PLATFORM };
