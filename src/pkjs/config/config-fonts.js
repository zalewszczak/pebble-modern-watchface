// ---- font domain: lookup, availability, and <option> rendering -----------
//
// Moved out of config-page.js (configuration architecture extraction,
// JS8 second slice). Everything here reads only FONT_LOOKUP
// (presets-lookups.js) plus the generic esc() helper (config-
// template.js) -- no dependency on hands, markers, or any other
// domain, and nothing else in config-page.js depends on these except
// by calling them.

var presetsLookups = require('../presets-lookups');
var FONT_LOOKUP = presetsLookups.FONT_LOOKUP;
var esc = require('./config-template').esc;

// Same "don't silently do the opposite of what was written" fix as
// secondsAvailableForDigital()'s parseInt change below, for
// FONT_LOOKUP's boolean fields (mainClock, small, italic, romanOk)
// instead of its numeric ones. A plain `f.mainClock` truthy check treats the
// STRING 'false' as true (any non-empty string is truthy in JS), so a
// value that's accidentally been quoted -- an easy mistake, since
// `mainClock: false` and `small: false` are both written explicitly
// throughout FONT_LOOKUP already, not just omitted -- silently flips
// to the opposite of what was intended instead of erroring. Leaves
// every other value's existing truthy/falsy behavior untouched
// (including a bare `true`/omitted/undefined), so this only closes
// the specific 'true'/'false' string trap, not a general type check.
function fontFlag(v) {
  if (v === 'false') return false;
  if (v === 'true') return true;
  return !!v;
}

// Builds one combined Google Fonts stylesheet URL covering every
// `google` family (at its own specific weight/italic) FONT_LOOKUP
// actually uses, deduplicated -- so the settings page only ever makes
// one request instead of one per font. Used for the live font-picker
// previews (see fontPickerModal below) -- purely cosmetic, the watch
// itself never touches Google Fonts.
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

// Same idea as googleFontsHref() above, for the handful of fonts
// (RebelRedux, Digital dream, Fizzy Soda as of this comment -- see
// each entry's own `cdn` field and comment in presets-lookups.js)
// that aren't on Google Fonts at all but ARE hosted as a free webfont
// on cdnfonts.com. Unlike Google Fonts (one combined stylesheet
// request covering every family), cdnfonts.com serves one stylesheet
// per font family, so this returns one <link> per distinct `cdn` slug
// instead of trying to combine them -- still just one request per
// font actually used, not per FONT_LOOKUP entry (Digital Dream Small/
// Digital Dream share the same slug and so the same single link).
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

// Same idea as cdnFontLinks() above, for a font that isn't hosted
// anywhere with a ready-made CSS endpoint (no Google Fonts entry, no
// cdnfonts.com page) but IS directly downloadable as a webfont file
// from its own source site -- LCD Solid's `webfontUrl` (wfonts.com,
// https://www.wfonts.com/font/lcd-solid) is the first of these.
// Builds one @font-face rule per distinct `webfontFamily` directly,
// since there's no external stylesheet to <link> to for these; the
// matching `preview` font-family in FONT_LOOKUP just needs to name
// the same family this declares.
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

// Fastest way to go from an id to its entry -- every font picker
// needs this (rendering the current selection, gating Show Seconds,
// auto-pairing the small companion, etc.).
function fontLookupEntry(id) {
  for (var i = 0; i < FONT_LOOKUP.length; i++) {
    if (FONT_LOOKUP[i].id === id) return FONT_LOOKUP[i];
  }
  return FONT_LOOKUP[0];
}

// <option> list for a font <select> (the corner/edge font picker and the
// font-import target). Every font is offered.
function fontOptionsHtml(selectedId) {
  return FONT_LOOKUP.slice().sort(function (a, b) {
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
