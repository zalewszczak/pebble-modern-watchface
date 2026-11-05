// Active watch platform: 'emery' (Time 2, 200x228) or 'gabbro' (Round 2, 260x260).
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

// Generated image tables are { <id>: dataUri, round: { <id>: dataUri } }. Returns the table for the
// active shape (round art over square art), without the nested "round" key.
function shapeImages(table) {
  var out = {}, k;
  for (k in table) if (k !== 'round' && table.hasOwnProperty(k)) out[k] = table[k];
  if (round && table.round) for (k in table.round) if (table.round.hasOwnProperty(k) && table.round[k]) out[k] = table.round[k];
  return out;
}

module.exports = {
  shapeImages: shapeImages,
  name: name,
  round: round,
  w: round ? 260 : 200,
  h: round ? 260 : 228,
  suffix: round ? '_R' : ''
};
