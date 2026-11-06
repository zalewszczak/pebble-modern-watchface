// Font lookup, availability, and option rendering
var presetsLookups = require('../presets-lookups');
var FONT_LOOKUP = presetsLookups.FONT_LOOKUP;
var esc = require('./config-template').esc;
var platform = require('../platform');

function fontFlag(v) {
  if (v === 'false') return false;
  if (v === 'true') return true;
  return !!v;
}

function googleFontsHref() {
  var seen = {};
  var params = [];
  FONT_LOOKUP.forEach(function (f) {
    if (!f.google) return;
    var italAxis = fontFlag(f.italic) ? '1' : '0';
    var key = f.google + '|' + italAxis + '|' + f.weight;
    if (seen[key]) return;
    seen[key] = true;
    params.push('family=' + encodeURIComponent(f.google).replace(/%20/g, '+') + ':ital,wght@' + italAxis + ',' + f.weight);
  });
  return 'https://fonts.googleapis.com/css2?' + params.join('&') + '&display=swap';
}

function cdnFontLinks() {
  var seen = {};
  var links = [];
  FONT_LOOKUP.forEach(function (f) {
    if (!f.cdn || seen[f.cdn]) return;
    seen[f.cdn] = true;
    links.push('<link rel="stylesheet" href="https://fonts.cdnfonts.com/css/' + encodeURIComponent(f.cdn) + '">');
  });
  return links.join('');
}

function directWebfontStyle() {
  var seen = {};
  var rules = [];
  FONT_LOOKUP.forEach(function (f) {
    if (!f.webfontUrl || !f.webfontFamily || seen[f.webfontFamily]) return;
    seen[f.webfontFamily] = true;
    rules.push("@font-face{font-family:'" + f.webfontFamily + "';src:url('" + f.webfontUrl + "') format('" + (f.webfontFormat || 'woff') + "');font-display:swap;}");
  });
  return rules.length ? ('<style>' + rules.join('') + '</style>') : '';
}

function fontLookupEntry(id) {
  for (var i = 0; i < FONT_LOOKUP.length; i++) {
    if (FONT_LOOKUP[i].id === id) return FONT_LOOKUP[i];
  }
  return FONT_LOOKUP[0];
}

function fontOptionsHtml(selectedId) {
  return FONT_LOOKUP.filter(function (f) {
    return !platform.bw || platform.BW_FONT_IDS.indexOf(f.id) >= 0 || f.id === selectedId;
  }).sort(function (a, b) {
    var byLabel = String(a.label || '').localeCompare(String(b.label || ''), undefined, { sensitivity: 'base' });
    return byLabel || (a.id - b.id);
  }).map(function (f) {
    return '<option value="' + f.id + '" data-preview="' + esc(f.preview) + '" data-height="' + f.height +
      '" data-small="' + (fontFlag(f.small) ? '1' : '0') + '"' +
      (selectedId === f.id ? ' selected' : '') + '>' + esc(f.label) + '</option>';
  }).join('');
}

module.exports = {
  fontFlag: fontFlag,
  googleFontsHref: googleFontsHref,
  cdnFontLinks: cdnFontLinks,
  directWebfontStyle: directWebfontStyle,
  fontLookupEntry: fontLookupEntry,
  fontOptionsHtml: fontOptionsHtml
};
