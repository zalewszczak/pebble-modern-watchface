// ---- Corner and edge feature picker options -----------------------------

var presetsLookups = require('../presets-lookups');
var CORNER_CATEGORIES = presetsLookups.CORNER_CATEGORIES;
var esc = require('./config-template').esc;

// Flattened, id-ascending view of CORNER_CATEGORIES (see
// presets-lookups.js's own header comment for why that's the single
// source of truth now) -- used to build the flat <option> lists the
// hidden per-slot <select>s need. Category grouping/curated item order
// only matters to the categorized picker itself (see
// categoryItemOptionsHtml() in config-page.js), not to these hidden
// stores.

var CORNER_CONTENT_OPTIONS = [];
CORNER_CATEGORIES.forEach(function (cat) {
  cat.items.forEach(function (item) {
    CORNER_CONTENT_OPTIONS.push({ id: item.id, label: item.label });
  });
});
CORNER_CONTENT_OPTIONS.sort(function (a, b) { return a.id - b.id; });
function cornerContentOptionsHtml(selected) {
  return CORNER_CONTENT_OPTIONS.map(function (o) {
    return '<option value="' + o.id + '"' + (String(selected) === String(o.id) ? ' selected' : '') + '>' + esc(o.label) + '</option>';
  }).join('');
}

module.exports = {
  CORNER_CONTENT_OPTIONS: CORNER_CONTENT_OPTIONS,
  cornerContentOptionsHtml: cornerContentOptionsHtml
};
