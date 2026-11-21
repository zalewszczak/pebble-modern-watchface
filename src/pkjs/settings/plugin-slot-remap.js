// Merging a style preset's plugin slots into the shared slot table.
//
// A style (preset) carries the 12-entry plugin slot table it was saved with, and its complications point at slots
// by index. The table is shared by every platform, so loading a style must not overwrite it wholesale: another
// platform's complications would lose their data source (or silently show another one). Instead every slot the
// style uses is re-homed: onto the slot that already holds the same source, else onto a slot no other platform
// uses, and the style's complications are rewritten to the new indexes.
//
// Self-contained ES5 (no requires, no outer variables): the settings page embeds it through toString().
function remapPresetPluginSlots(preset, currentSlots, otherUsed, primId) {
  var COUNT = 12, FIRST = 200;
  var result = { slots: [], preset: preset, changed: false };
  var cur = [], i;
  for (i = 0; i < COUNT; i++) cur.push(typeof currentSlots[i] === 'string' ? currentSlots[i] : '');
  result.slots = cur;
  var pslots = preset && preset.__pluginSlots;
  if (!pslots || Object.prototype.toString.call(pslots) !== '[object Array]') return result;

  var out = {}, k;
  for (k in preset) if (preset.hasOwnProperty(k)) out[k] = preset[k];

  var isContentId = function (id) { return /(Content|Shake)$/.test(id) || /^corner(TL|TR|BL|BR)$/.test(id); };
  var isPrimsId = function (id) { return /CustomPrims$/.test(id); };

  // Slots the style actually references.
  var wanted = {};
  var contentOf = function (v) { var n = parseInt(v, 10); return (n >= FIRST && n < FIRST + COUNT) ? n - FIRST : -1; };
  for (k in out) {
    if (!out.hasOwnProperty(k)) continue;
    if (isContentId(k)) { var c = contentOf(out[k]); if (c >= 0) wanted[c] = true; }
    else if (isPrimsId(k)) {
      String(out[k] || '').split(',').forEach(function (e) {
        var p = e.split(':'), id = parseInt(p[0], 10), aux = p.length > 1 ? parseInt(p[1], 10) : 0;
        if (id === primId && aux >= 0 && aux < COUNT) wanted[aux] = true;
      });
    }
  }

  var map = {}, taken = {};
  var pick = function (key) {
    var j;
    for (j = 0; j < COUNT; j++) if (cur[j] === key && !taken[j]) return j;      // same source already there
    for (j = 0; j < COUNT; j++) if (!cur[j] && !otherUsed[j] && !taken[j]) return j; // empty slot
    for (j = 0; j < COUNT; j++) if (!otherUsed[j] && !taken[j]) return j;       // reuse one only this platform uses
    return -1;
  };
  for (i = 0; i < COUNT; i++) {
    if (!wanted[i]) continue;
    var key = typeof pslots[i] === 'string' ? pslots[i] : '';
    if (!key) { map[i] = i; continue; }
    var t = pick(key);
    if (t < 0) { map[i] = -1; continue; }
    cur[t] = key; taken[t] = true; map[i] = t;
    if (t !== i) result.changed = true;
  }

  for (k in out) {
    if (!out.hasOwnProperty(k)) continue;
    if (isContentId(k)) {
      var cs = contentOf(out[k]);
      if (cs >= 0 && map[cs] !== undefined) out[k] = String(map[cs] >= 0 ? FIRST + map[cs] : 0);
    } else if (isPrimsId(k)) {
      out[k] = String(out[k] || '').split(',').map(function (e) {
        var p = e.split(':'), id = parseInt(p[0], 10), aux = p.length > 1 ? parseInt(p[1], 10) : 0;
        if (id === primId && aux >= 0 && aux < COUNT && map[aux] !== undefined && map[aux] >= 0 && map[aux] !== aux) {
          return map[aux] ? (id + ':' + map[aux]) : String(id);
        }
        return e;
      }).join(',');
    }
  }
  result.preset = out;
  return result;
}

module.exports = { remapPresetPluginSlots: remapPresetPluginSlots };
