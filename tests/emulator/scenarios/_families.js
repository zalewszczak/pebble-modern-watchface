'use strict';
// Scenarios that depend on what the platform / the resources in this tree offer. They are generated per platform,
// so the list follows the project (new indices styles, backgrounds or complications appear automatically).
// Each returned scenario has the same shape as a scenarios/*.json file, plus "group".

var ALL_SLOTS_OFF = {
  cornerTL: '0', cornerTR: '0', cornerBL: '0', cornerBR: '0',
  upperMiddleLine1Content: '0', upperMiddleLine2Content: '0', bottomMiddleLine1Content: '0', bottomMiddleLine2Content: '0',
  middleLeftLine1Content: '0', middleLeftLine2Content: '0', middleRightLine1Content: '0', middleRightLine2Content: '0'
};

// Complications that need a connection to something the test cannot provide.
var SKIP_CATEGORIES = { none: 1, plugins: 1 };
var WIDE_ONLY_IN_LINES = { wide: 1 };
// Weather complications are shown with several data sets; the rest use the default one.
var MULTI_DATASET = { weather: ['mild', 'snow', 'storm'], astro: ['mild'] };

function chunks(list, n) { var out = []; for (var i = 0; i < list.length; i += n) out.push(list.slice(i, i + n)); return out; }

function complications(platform, info) {
  var out = [];
  info.categories.forEach(function (cat) {
    if (SKIP_CATEGORIES[cat.id]) return;
    var ids = cat.items.map(function (it) { return String(it.id); });
    var slots = WIDE_ONLY_IN_LINES[cat.id] ? info.lineSlots.slice() : info.cornerSlots.concat(info.lineSlots);
    var sets = MULTI_DATASET[cat.id] || ['mild'];
    chunks(ids, slots.length).forEach(function (chunk, ci) {
      sets.forEach(function (ds) {
        var preset = JSON.parse(JSON.stringify(ALL_SLOTS_OFF));
        preset.drawFeaturesBeneathHands = false;
        chunk.forEach(function (id, i) { preset[slots[i]] = id; });
        var name = 'compl-' + cat.id + '-' + (ci + 1) + (sets.length > 1 ? '-' + ds : '');
        out.push({
          name: name, group: 'complications', exampleStyle: 1, dataset: ds, preset: preset,
          description: cat.label + ' complications ' + chunk.join(',') + ' (slots: ' + slots.slice(0, chunk.length).join(', ') + '), data set "' + ds + '"'
        });
      });
    });
  });
  return out;
}

function indices(platform, info) {
  var out = [];
  var dark = { customBgValue: '192', customTextValue: '255', customAccentValue: '255' };   // white on black
  var light = { customBgValue: '255', customTextValue: '192', customAccentValue: '192' };  // black on white
  var ids = info.drawnIndices.concat(info.bitmapIndices);
  var schemes = info.shape === 'bw' ? [['dark', dark], ['light', light]] : [['', {}]];
  ids.forEach(function (id) {
    schemes.forEach(function (sch) {
      var preset = Object.assign({ bigAnalogMarkerStyle: id }, sch[1]);
      out.push({ name: 'indices-' + id + (sch[0] ? '-' + sch[0] : ''), group: 'indices', exampleStyle: 1, preset: preset,
        description: 'Example style 1 with indices style ' + id + (sch[0] ? ' (' + sch[0] + ' scheme)' : '') });
    });
  });
  // the two blend options of the bitmap styles, on one style
  var first = info.bitmapIndices[0];
  if (first) {
    out.push({ name: 'indices-' + first + '-invert', group: 'indices', exampleStyle: 1, preset: Object.assign({ bigAnalogMarkerStyle: first, bitmapMarkerInvert: true }, info.shape === 'bw' ? dark : {}), description: 'Bitmap indices ' + first + ', inverted blend' });
    if (info.shape !== 'bw') out.push({ name: 'indices-' + first + '-transparent', group: 'indices', exampleStyle: 1, preset: { bigAnalogMarkerStyle: first, bitmapMarkerTransparent: true }, description: 'Bitmap indices ' + first + ', semi-transparent' });
  }
  return out;
}

function backgrounds(platform, info) {
  return info.backgrounds.map(function (n) {
    return { name: 'bg-' + n, group: 'backgrounds', exampleStyle: 1, preset: { useCustomBg: true, bgSource: 'p:' + n }, description: 'Example style 1 on predefined background ' + n };
  });
}

module.exports = function (platform, info) {
  return [].concat(complications(platform, info), indices(platform, info), backgrounds(platform, info));
};
