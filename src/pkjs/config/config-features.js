// Corner and edge feature picker options
var presetsLookups = require('../presets-lookups');
var CORNER_CATEGORIES = presetsLookups.CORNER_CATEGORIES;
var esc = require('./config-template').esc;

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
