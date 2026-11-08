'use strict';
// Compare two decoded RGBA images. Pixels with alpha 0 in BOTH images are ignored (gabbro's round mask).
// A pixel counts as different when one image is transparent and the other is not, or when any colour
// channel differs by more than channelTolerance.
var png = require('./png');

function compare(expected, actual, opts) {
  opts = opts || {};
  var channelTol = opts.channelTolerance || 0;
  var maxDiffPixels = opts.maxDiffPixels || 0;
  if (expected.width !== actual.width || expected.height !== actual.height) {
    return {
      ok: false, sizeMismatch: true, diffPixels: -1, total: 0,
      message: 'size differs: expected ' + expected.width + 'x' + expected.height + ', got ' + actual.width + 'x' + actual.height
    };
  }
  var n = expected.width * expected.height, diff = 0, counted = 0, maxDelta = 0;
  var diffImg = Buffer.alloc(n * 4);
  var minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (var i = 0; i < n; i++) {
    var o = i * 4;
    var ea = expected.data[o + 3], aa = actual.data[o + 3];
    var isDiff = false;
    if (ea === 0 && aa === 0) {
      // outside the screen in both: ignore
    } else {
      counted++;
      if ((ea === 0) !== (aa === 0)) isDiff = true;
      else {
        for (var c = 0; c < 3; c++) {
          var dl = Math.abs(expected.data[o + c] - actual.data[o + c]);
          if (dl > maxDelta) maxDelta = dl;
          if (dl > channelTol) isDiff = true;
        }
      }
    }
    if (isDiff) {
      diff++;
      var x = i % expected.width, y = (i / expected.width) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      diffImg[o] = 255; diffImg[o + 1] = 0; diffImg[o + 2] = 255; diffImg[o + 3] = 255;
    } else if (ea === 0 && aa === 0) {
      diffImg[o + 3] = 0;
    } else {
      // dimmed copy of the actual image, so the diff shows where the changes are in context
      diffImg[o] = actual.data[o] >> 2; diffImg[o + 1] = actual.data[o + 1] >> 2; diffImg[o + 2] = actual.data[o + 2] >> 2;
      diffImg[o + 3] = 255;
    }
  }
  return {
    ok: diff <= maxDiffPixels, diffPixels: diff, total: counted, maxDelta: maxDelta,
    bbox: diff ? { x0: minX, y0: minY, x1: maxX, y1: maxY } : null,
    diffImage: { width: expected.width, height: expected.height, data: diffImg },
    message: diff ? (diff + ' of ' + counted + ' pixels differ (bounding box ' + minX + ',' + minY + ' to ' + maxX + ',' + maxY + ')') : 'identical'
  };
}

function compareFiles(fs, expectedPath, actualPath, opts) {
  return compare(png.decode(fs.readFileSync(expectedPath)), png.decode(fs.readFileSync(actualPath)), opts);
}

module.exports = { compare: compare, compareFiles: compareFiles };
