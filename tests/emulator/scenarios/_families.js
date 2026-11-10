'use strict';
// Scenarios generated per platform from what the tree offers. One family: the "tour".
//
// A tour scenario shows a batch of complications and, at the same time, a different indices style, background,
// complication font and icon style (and on flint alternately a dark and a light scheme). The batches walk through the whole
// complication catalogue (twice for the weather ones, with different data), and there are enough scenarios that every
// indices style and every predefined background of the platform appears once - so few screenshots cover many features.
// If a tour screenshot changes, the scenario's description names everything in it.

var SKIP_CATEGORIES = { none: 1, plugins: 1 };
var DATASETS = ['mild', 'rain', 'snow', 'hot', 'storm'];
// complication fonts: the small ones (XS/S) fit the slots; ids from presets-lookups FONT_LOOKUP
var FONTS = ['27', '28', '29', '0', '1', '2', '10', '17', '21', '22', '24', '16', '19', '20', '25', '26', '14', '15', '18', '23'];
var ICON_STYLES = ['1', '2', '0']; // Hollow, Full color, Simple
var DARK = { customBgValue: '192', customTextValue: '255', customAccentValue: '255' };   // white on black
var LIGHT = { customBgValue: '255', customTextValue: '192', customAccentValue: '192' };  // black on white

function chunks(list, n) { var out = []; for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }
function pick(list, i) { return list[i % list.length]; }

function catIds(info, pred) {
  var out = [];
  info.categories.forEach(function (c) { if (!SKIP_CATEGORIES[c.id] && pred(c)) c.items.forEach(function (it) { out.push(String(it.id)); }); });
  return out;
}

function contentSets(info) {
  var slots = info.cornerSlots.concat(info.lineSlots);
  var sets = [], usedData = {};
  function add(ids, slotList, dataset, label) {
    sets.push({ slots: slotList, ids: ids, dataset: dataset, label: label });
    ids.forEach(function (id) { (usedData[id] = usedData[id] || {})[dataset] = 1; });
  }
  // pass 1: every complication except the wide ones, packed tightly, data sets rotating
  chunks(catIds(info, function (c) { return c.id !== 'wide'; }), slots.length).forEach(function (ids, i) { add(ids, slots, pick(DATASETS, i), 'catalogue ' + (i + 1)); });
  // the wide ones only fit the line slots
  add(catIds(info, function (c) { return c.id === 'wide'; }), info.lineSlots, 'mild', 'wide');
  // pass 2: the weather complications again, each with a data set it has not been shown with yet
  chunks(catIds(info, function (c) { return c.id === 'weather'; }), slots.length).forEach(function (ids, i) {
    var ds = ['storm', 'hot', 'snow', 'rain', 'mild'].filter(function (d) { return ids.every(function (id) { return !usedData[id][d]; }); })[0] ||
      ['storm', 'hot', 'snow'][i % 3];
    add(ids, slots, ds, 'weather again ' + (i + 1));
  });
  return sets;
}

module.exports = function (platform, info) {
  var sets = contentSets(info);
  var indices = [];
  info.bitmapIndices.forEach(function (id) { indices.push({ label: id, preset: { bigAnalogMarkerStyle: id } }); });
  ['0', '2', '10'].forEach(function (id) { indices.push({ label: id + ' (drawn)', preset: { bigAnalogMarkerStyle: id } }); });
  if (info.bitmapIndices[0]) {
    var f = info.bitmapIndices[0];
    indices.push({ label: f + ' inverted', preset: { bigAnalogMarkerStyle: f, bitmapMarkerInvert: true } });
    if (info.shape !== 'bw') indices.push({ label: f + ' semi-transparent', preset: { bigAnalogMarkerStyle: f, bitmapMarkerTransparent: true } });
  }
  var bgs = info.backgrounds;
  var base = sets.length;
  // enough scenarios that every indices style and every background appears; extra ones repeat the catalogue batches shifted by a slot
  for (var k = 0; sets.length < Math.max(indices.length, bgs.length); k++) {
    var src = sets[k % (base - 1)];
    var ids = src.ids.slice(); ids.push(ids.shift());
    sets.push({ slots: src.slots, ids: ids, dataset: pick(DATASETS, k + 2), label: 'catalogue shifted ' + (k + 1) });
  }
  var pad = String(sets.length).length;
  return sets.map(function (set, i) {
    var preset = { drawFeaturesBeneathHands: false };
    ['cornerTL', 'cornerTR', 'cornerBL', 'cornerBR'].concat(info.lineSlots).forEach(function (s) { preset[s] = '0'; });
    set.ids.forEach(function (id, j) { preset[set.slots[j]] = id; });
    var ind = pick(indices, i), font = pick(FONTS, i), icon = pick(ICON_STYLES, i), bg = bgs.length ? pick(bgs, i) : null;
    Object.assign(preset, ind.preset, { cornerFont: font, weatherIconStyle: icon });
    var scheme = '';
    if (info.shape === 'bw') { Object.assign(preset, i % 2 ? LIGHT : DARK); scheme = i % 2 ? ', light scheme' : ', dark scheme'; }
    if (bg) { preset.useCustomBg = true; preset.bgSource = 'p:' + bg; }
    var n = ('000' + (i + 1)).slice(-pad);
    return {
      name: 'tour-' + n, group: 'tour', exampleStyle: 1, dataset: set.dataset, preset: preset,
      description: 'Tour ' + n + ': ' + set.label + ' - complications ' + set.ids.join(',') + ' with data "' + set.dataset + '"; indices ' + ind.label +
        '; font ' + font + '; icon style ' + icon + (bg ? '; background ' + bg : '') + scheme
    };
  });
};
