// Complication spacing (top, bottom, left, right in pixels) that goes with each bitmap indices style, per platform.
// MIRROR of BITMAP_STYLE_MARGINS in src/c/features/feature_layout.c (tests/pkjs/index-margins.test.js keeps them equal);
// the settings page uses it to pre-fill the manual sliders and to remember the last indices style's values.
var platform = require('../platform');

var TABLES = {
  bw: {
    3: [28, 27, 28, 28],
    4: [31, 28, 27, 27],
    5: [42, 41, 19, 21],
    6: [42, 40, 36, 37],
    7: [40, 40, 25, 25],
    11: [33, 32, 26, 26],
    12: [35, 33, 33, 33],
    13: [38, 38, 25, 25],
    14: [33, 32, 28, 27],
    15: [30, 28, 28, 28],
    16: [30, 30, 31, 31],
    17: [31, 30, 34, 35],
    18: [42, 42, 22, 22],
    19: [27, 27, 26, 26]
  },
  round: {
    3: [48, 48, 50, 50],
    4: [45, 45, 49, 49],
    5: [51, 51, 48, 48],
    6: [58, 59, 65, 65],
    7: [50, 45, 39, 33],
    11: [48, 48, 52, 52],
    12: [63, 63, 63, 63],
    13: [54, 54, 54, 54],
    14: [47, 47, 50, 49],
    15: [52, 52, 52, 50],
    16: [42, 42, 45, 45],
    17: [47, 47, 49, 49],
    18: [40, 40, 36, 36],
    19: [57, 57, 57, 57]
  },
  square: {
    3: [38, 37, 42, 39],
    4: [37, 33, 38, 33],
    5: [44, 42, 27, 20],
    6: [46, 44, 45, 45],
    7: [44, 40, 30, 26],
    11: [38, 38, 42, 39],
    12: [37, 37, 37, 35],
    13: [39, 39, 36, 35],
    14: [39, 39, 39, 38],
    15: [41, 41, 40, 39],
    16: [37, 37, 38, 36],
    17: [40, 40, 40, 38],
    18: [40, 40, 39, 38],
    19: [39, 39, 40, 40]
  }
};

var table = platform.bw ? TABLES.bw : (platform.round ? TABLES.round : TABLES.square);

// [top, bottom, left, right] of a bitmap indices style id (3-7, 11-19) on this platform, or null.
function forStyle(id) { return table[String(id)] ? table[String(id)].slice() : null; }

module.exports = { TABLES: TABLES, current: table, forStyle: forStyle, FALLBACK_STYLE: 3 };
