'use strict';
// What the project in this tree offers per platform (read from the generated tables, so the tests follow
// whatever resources the tree was built with).
var path = require('path');
var PKJS = path.resolve(__dirname, '..', '..', '..', 'src', 'pkjs');

function shapeOf(platform) {
  if (platform === 'gabbro' || platform === 'chalk') return 'round';
  if (platform === 'flint' || platform === 'diorite' || platform === 'aplite') return 'bw';
  return 'square';
}

function info(platform) {
  var shape = shapeOf(platform);
  var bg = require(path.join(PKJS, 'data', 'generated', 'background-images'));
  var markers = require(path.join(PKJS, 'data', 'generated', 'marker-preview-images'));
  var backgrounds = shape === 'round' ? Object.keys(bg.imagesRound || {}) : shape === 'bw' ? Object.keys(bg.imagesBw || {}) : (bg.numbers || []).map(String);
  var base = Object.keys(markers).filter(function (k) { return k !== 'round' && k !== 'bw'; });
  var bitmap = shape === 'square' ? base : Object.keys(markers[shape] || {});
  if (!bitmap.length) bitmap = base;
  var num = function (a, b) { return a - b; };
  return {
    shape: shape,
    backgrounds: backgrounds.map(Number).sort(num).map(String),
    // 0 none, 1 Braun, 2 Swiss, 9 Classy, 10 Minimal are drawn by code on every platform; the rest are bitmap styles
    drawnIndices: ['0', '1', '2', '9', '10'],
    bitmapIndices: bitmap.map(Number).sort(num).map(String),
    cornerSlots: shape === 'round' ? [] : ['cornerTL', 'cornerTR', 'cornerBL', 'cornerBR'],
    lineSlots: ['upperMiddleLine1Content', 'upperMiddleLine2Content', 'bottomMiddleLine1Content', 'bottomMiddleLine2Content',
      'middleLeftLine1Content', 'middleLeftLine2Content', 'middleRightLine1Content', 'middleRightLine2Content'],
    categories: require(path.join(PKJS, 'presets-lookups')).CORNER_CATEGORIES
  };
}

module.exports = { info: info, shapeOf: shapeOf };
