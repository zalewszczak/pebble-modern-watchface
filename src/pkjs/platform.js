// Active watch platform: 'emery' (Time 2, 200x228), 'gabbro' (Round 2, 260x260), or one of the black
// and white 144x168 watches 'flint' (Pebble 2 Duo) / 'diorite' (Pebble 2), which share one code path (bw).
var KEY = 'LAST_PLATFORM';

function detect() {
  var name = null;
  try {
    var info = Pebble.getActiveWatchInfo && Pebble.getActiveWatchInfo();
    if (info && info.platform) name = String(info.platform).toLowerCase();
  } catch (e) { }
  try {
    if (name) localStorage.setItem(KEY, name);
    else name = localStorage.getItem(KEY);
  } catch (e) { }
  return name || 'emery';
}

var name = detect();
var round = name === 'gabbro';
var bw = name === 'flint' || name === 'diorite';

// Generated image tables are { <id>: dataUri, round: { <id>: dataUri }, bw: { <id>: dataUri } }.
// Returns the table for the active shape (round or B&W art over square art), without the nested keys.
// On a B&W watch an entry with no legacy twin keeps its square image so the page still has something
// to show (the watch itself never uses it).
function shapeImages(table) {
  var out = {}, k;
  for (k in table) if (k !== 'round' && k !== 'bw' && table.hasOwnProperty(k)) out[k] = table[k];
  if (round && table.round) for (k in table.round) if (table.round.hasOwnProperty(k) && table.round[k]) out[k] = table.round[k];
  if (bw && table.bw) for (k in table.bw) if (table.bw.hasOwnProperty(k) && table.bw[k]) out[k] = table.bw[k];
  return out;
}

// ---- black and white helpers (no-ops on the colour watches) ----
// GColor8 byte -> 0xC0 (black) or 0xFF (white) by luminance (weights 3/6/1 over the 2-bit channels,
// the same rule as bw_color_is_white() in src/c/platform/platform_bw.h).
function bwByte(b) {
  var lum = ((b >> 4) & 3) * 3 + ((b >> 2) & 3) * 6 + (b & 3);
  return lum > 15 ? 0xFF : 0xC0;
}
// Fonts a B&W watch has (ids in src/c/fonts/font_lookup.c): the system fonts 0-13 and the custom ones
// that ship in a small size. Anything else maps to the default Digital Dream (27).
var BW_FONT_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 17, 19, 20, 22, 23, 26, 27, 28, 29];
function bwFont(id, fallback) {
  if (!bw) return id;
  return BW_FONT_IDS.indexOf(id) >= 0 ? id : (fallback === undefined ? 27 : fallback);
}

module.exports = {
  shapeImages: shapeImages,
  name: name,
  round: round,
  bw: bw,
  bwByte: bwByte,
  bwFont: bwFont,
  BW_FONT_IDS: BW_FONT_IDS,
  w: bw ? 144 : (round ? 260 : 200),
  h: bw ? 168 : (round ? 260 : 228),
  suffix: round ? '_R' : (bw ? '_BW' : '')
};
