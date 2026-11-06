// Shared resource layout for the generators.
//   resources/square/  200x228 art (Pebble Time 2, emery)
//   resources/round/   260x260 art (Pebble Round 2, gabbro), same file names as square/
//   resources/legacy/  144x168 1-bit art (Pebble 2 Duo / flint and Pebble 2 / diorite), same file names
//                      as square/ (see legacy_support.md; scripts/make-legacy-standins.py makes rough
//                      stand-ins from the square art until hand-made ones exist)
//   resources/common/  size-independent assets (fonts, preview-only sources, icons for emery/gabbro)
// shapedMedia() lists the square file for emery, the round twin for gabbro and the legacy twin for
// flint and diorite. A picture without a round/legacy twin is simply absent on that platform (the
// generated C tables return 0 for it); pass fallback=true only for art the C code cannot do
// without (marker indices): gabbro then reuses the square file. A legacy picture never falls back
// to the colour art: it would be far too big for a 144x168 black and white pack.
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', '..');
var RES = path.join(ROOT, 'resources');
var PLATFORM = { square: 'emery', round: 'gabbro' };
// Black and white platforms that share the legacy art (same 144x168 screen).
var LEGACY_PLATFORMS = ['flint', 'diorite'];
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
  var legacyRel = 'legacy/' + rel;
  if (exists(legacyRel)) out.push({ type: 'bitmap', name: name, file: legacyRel, targetPlatforms: LEGACY_PLATFORMS.slice() });
  else if (!warned['L' + rel]) { warned['L' + rel] = 1; console.log('  note: no legacy/' + rel + ' yet - not available on flint/diorite'); }
  return out;
}

// Common media (fonts, ...) go into the colour watches' packs only; the B&W ones get their own entries.
function commonMedia(type, name, rel) { return { type: type, name: name, file: 'common/' + rel, targetPlatforms: [PLATFORM.square, PLATFORM.round] }; }

function dataUri(file) { return 'data:image/png;base64,' + fs.readFileSync(file).toString('base64'); }

module.exports = { ROOT: ROOT, RES: RES, dir: dir, exists: exists, shapedMedia: shapedMedia, commonMedia: commonMedia, dataUri: dataUri, PLATFORM: PLATFORM, LEGACY_PLATFORMS: LEGACY_PLATFORMS };
