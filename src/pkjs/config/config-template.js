// ---- Shared settings-page template helpers -------------------------------
// Provides HTML escaping, section headings, legends, and reusable button
// groups for the settings-page controls.

var presetsLookups = require('../presets-lookups');
var CORNER_CATEGORIES = presetsLookups.CORNER_CATEGORIES;

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}


// iOS-style "app icon" for each collapsible settings section: a
// rounded-square colour swatch (SECTION_META's own `color`) with a
// small white glyph centered in it (see .section-icon/.section-icon
// svg below), shown to the left of that section's title + one-line
// summary sub-header (see buildSectionLegendHtml() and the
// compute*Subheader() family of functions in the runtime script
// further down -- this constant only supplies the icon, not the sub-
// header text). Keyed by the same short id toggleSection()/the
// section-legend's own onclick already use (examples/style/colors/
// corners/.../testing), not the longer human label, so a header's
// three pieces (legend markup, category-icon-style glyph, sub-header
// updater) never drift out of sync with each other. `weather` and
// `astronomy` deliberately reuse the EXACT same glyph CORNER_CATEGORIES
// (presets-lookups.js) already has for its own "weather"/"astro"
// category buttons (the Features section's own per-category icons)
// rather than new art, so a person already recognizes them by the
// time they reach this section -- read directly off that array below
// instead of a second hand-typed copy, so the two can\'t drift apart.
// `animated: true` (Animation's own entry) spins its glyph forever via
// the .section-icon-animation svg CSS rule -- the one icon here that's
// actually in motion, fittingly.
function sectionCategoryIcon(categoryId) {
  for (var i = 0; i < CORNER_CATEGORIES.length; i++) {
    if (CORNER_CATEGORIES[i].id === categoryId) return CORNER_CATEGORIES[i].icon;
  }
  return '';
}
var SECTION_META = {
  examples:  { color: '#af52de', icon:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c.4 3.2 1 4.8 2.2 6S17 9.6 20 10c-3.2.4-4.8 1-6 2.2S12.4 14.8 12 18c-.4-3.2-1-4.8-2.2-6S6.8 10.4 4 10c3.2-.4 4.8-1 6-2.2S11.6 5.2 12 2z"/><path d="M18.5 14.5c.2 1.1.4 1.6.8 2 .4.4.9.6 2 .8-1.1.2-1.6.4-2 .8-.4.4-.6.9-.8 2-.2-1.1-.4-1.6-.8-2-.4-.4-.9-.6-2-.8 1.1-.2 1.6-.4 2-.8.4-.4.6-.9.8-2z"/></svg>' },
  style:     { color: '#5e5ce6', icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19.4 3.6c1 1 1 2.6 0 3.5L11 15.5l-3.2-3.2L16.2 4c1-1 2.5-1 3.5-.4z"/><path d="M9.3 13.7L5.8 17.2c-.7.7-1 1.6-1 2.6 0 .5-.3 1-.9 1.1-.4.1-.8-.2-.7-.6.1-1 .5-1.6 1.1-2.2.8-.8 1.3-1.8 1.4-2.9l.1-1"/></svg>' },
  colors:    { color: '#ff375f', icon:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2S5.5 11 5.5 15.2A6.5 6.5 0 0 0 12 21.7a6.5 6.5 0 0 0 6.5-6.5C18.5 11 12 2 12 2z"/></svg>' },
  corners:   { color: '#ff9500', icon:
    '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2.2"/><rect x="13" y="3" width="8" height="8" rx="2.2"/><rect x="3" y="13" width="8" height="8" rx="2.2"/><rect x="13" y="13" width="8" height="8" rx="2.2"/></svg>' },
  animation: { color: '#34c759', animated: true, icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3a9 9 0 1 1 -6.36 2.64"/></svg>' },
  presets:   { color: '#b8860b', icon:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 2h11a1 1 0 0 1 1 1v18.2c0 .8-.9 1.3-1.6.9L12 18.3l-4.9 3.8c-.7.4-1.6-.1-1.6-.9V3a1 1 0 0 1 1-1z"/></svg>' },
  weather:   { color: '#0a84ff', icon: sectionCategoryIcon('weather') },
  location:  { color: '#ff3b30', icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 21s7-7.7 7-13a7 7 0 1 0-14 0c0 5.3 7 13 7 13z"/><circle cx="12" cy="8" r="2.6"/></svg>' },
  updates:   { color: '#00c7be', icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12a7.5 7.5 0 0 1 13-5.1M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M17.3 3.8v3.4h-3.4M6.7 20.2v-3.4h3.4"/></svg>' },
  other:     { color: '#5856d6', icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.8 2.4A1 1 0 0 0 5 20h14a1 1 0 0 0 .8-1.6L18 16z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>' },
  faq:       { color: '#5856d6', icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.6 9a2.5 2.5 0 1 1 4.1 1.9c-.9.7-1.7 1.2-1.7 2.6"/><circle cx="12" cy="16.7" r=".8" fill="currentColor" stroke="none"/></svg>' },
  testing:   { color: '#8e8e93', icon:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="14" rx="5" ry="6" fill="currentColor" stroke="none"/><line x1="12" y1="8" x2="12" y2="20"/><line x1="4.5" y1="11" x2="7.5" y2="10"/><line x1="4.5" y1="14" x2="7.5" y2="14"/><line x1="4.5" y1="18" x2="7.5" y2="17.3"/><line x1="19.5" y1="11" x2="16.5" y2="10"/><line x1="19.5" y1="14" x2="16.5" y2="14"/><line x1="19.5" y1="18" x2="16.5" y2="17.3"/><path d="M9 5.5L10.5 8M15 5.5L13.5 8"/><circle cx="12" cy="5.5" r="1.2" fill="currentColor" stroke="none"/></svg>' }
};

// Builds one section-legend header: the rounded-square icon (from
// SECTION_META), a title + (initially empty, filled in live by
// refreshAllSectionSubheaders() at the bottom of the runtime script)
// one-line summary sub-header stacked underneath it, and the existing
// expand/collapse chevron -- replaces what used to be a single plain-
// text line for every fieldset's own <div class="section-legend">.
// `sectionId` must match both a SECTION_META key and the id
// toggleSection(id)/chev-<id>/section-<id> already use for that
// fieldset, so all the pieces stay wired to the same section.
function sectionLegendHtml(sectionId, title) {
  var meta = SECTION_META[sectionId] || {};
  return (
'    <div class="section-legend" onclick="toggleSection(\'' + sectionId + '\')">' +
'      <span class="section-icon section-icon-' + sectionId + (meta.animated ? ' section-icon-animated' : '') + '" style="background:' + (meta.color || '#999') + ';">' + (meta.icon || '') + '</span>' +
'      <span class="section-legend-text">' +
'        <span class="section-legend-title">' + esc(title) + '</span>' +
'        <span class="section-legend-sub" id="subhead-' + sectionId + '"></span>' +
'      </span>' +
'      <span class="chevron" id="chev-' + sectionId + '">&#9656;</span>' +
'    </div>'
  );
}

// Nested, one-level-down variant of sectionLegendHtml() above -- see
// .subsection-legend's own comment for why this exists separately
// rather than just registering these in SECTION_META. `id` gets
// wired to subsec-<id>/subsecchev-<id>/subsubhead-<id>/subsecpreview-<id>
// (toggleSubsection() below), all independent of the outer Style
// section's own toggleSection('style'); collapsing/expanding one
// doesn't touch the other. previewHtml is whatever the caller wants
// shown in the small thumbnail slot at render time (a static "?" is
// fine here -- refreshHandsIndicesPreviews() below fills in the real
// current-preset thumbnail live, the same "computed after render,
// kept live by the same delegated listeners every other sub-header
// already uses" pattern as refreshAllSectionSubheaders()).
function subsectionLegendHtml(id, title, previewHtml) {
  return (
'    <div class="subsection-legend" onclick="toggleSubsection(\'' + id + '\')">' +
'      <span class="subsection-legend-preview" id="subsecpreview-' + id + '">' + (previewHtml || '') + '</span>' +
'      <span class="subsection-legend-text">' +
'        <span class="subsection-legend-title">' + esc(title) + '</span>' +
'        <span class="subsection-legend-sub" id="subsubhead-' + id + '"></span>' +
'      </span>' +
'      <span class="chevron" id="subsecchev-' + id + '">&#9656;</span>' +
'    </div>'
  );
}

// A vertical stack of buttons that behaves like a radio group -- same
// "one active at a time, tap to switch" idea as .mode-btn-group (the
// side-by-side DIGITAL/ANALOG layout buttons), just stacked
// instead of side-by-side, for option lists too long/wordy to fit
// 3+ across (the two Animation section pickers). Backed by one hidden
// input (same "hidden input is the real value, buttons just reflect
// it" pattern selectBottomStyle()/selectSunTimeMode() already use)
// rather than actual radio inputs, so save() and applyStyleCornersJson()
// read it the same simple way as every other hidden-input field.
// Falls back to the first option (Off, for every current caller) when
// currentValue doesn't match any of them -- e.g. a preset saved by an
// older version of this page whose value set has since changed, or
// hand-edited/corrupted persisted settings. Without this, a stray
// value used to leave every button unhighlighted (looking like
// nothing at all was selected) rather than falling back to a sane,
// visibly-selected default. selectVerticalOption() below applies the
// same fallback client-side, for values that arrive after the initial
// render (preset apply, popup pre-fill).
function verticalButtonGroupHtml(groupId, hiddenId, options, currentValue, onclickFn) {
  var validValue = options.some(function (opt) { return String(opt.value) === String(currentValue); })
    ? currentValue : options[0].value;
  var buttons = options.map(function (opt) {
    var active = String(validValue) === String(opt.value);
    var call = onclickFn ?
      onclickFn + '(\'' + esc(opt.value) + '\')' :
      'selectVerticalOption(\'' + groupId + '\', \'' + hiddenId + '\', \'' + esc(opt.value) + '\')';
    return '<button type="button" class="mode-btn-vertical' + (active ? ' active' : '') + '" data-value="' + esc(opt.value) + '" onclick="' + call + '">' + esc(opt.label) + '</button>';
  }).join('');
  return '<div class="mode-btn-group-vertical" id="' + groupId + '">' + buttons + '</div>' +
    '<input type="hidden" id="' + hiddenId + '" value="' + esc(validValue) + '">';
}

// Same idea as verticalButtonGroupHtml() above, but for a short (2-4
// option) side-by-side row in the exact same style the Layout
// section's own DIGITAL/ANALOG buttons use (.mode-btn/.mode-btn-group)
// -- an optional icon (one of MODE_BTN_ICONS, or any other inline SVG
// string) above the label, same as those two already have. `onclickFn`
// lets one caller (the Sky style row) hook its own extra side effect
// (showing/hiding the Weather-drawing-style row underneath) in on top
// of the plain "set the hidden field, toggle .active" behavior every
// other row just uses directly -- see selectSkyMode()'s own comment.
function modeButtonGroupHtml(groupId, hiddenId, options, currentValue, onclickFn) {
  var buttons = options.map(function (opt) {
    var active = String(currentValue) === String(opt.value);
    var call = onclickFn ?
      onclickFn + '(\'' + esc(opt.value) + '\')' :
      'selectModeButton(\'' + groupId + '\', \'' + hiddenId + '\', \'' + esc(opt.value) + '\')';
    return '<button type="button" class="mode-btn' + (active ? ' active' : '') + '" data-value="' + esc(opt.value) + '" onclick="' + call + '">' + (opt.icon || '') + '<span>' + esc(opt.label) + '</span></button>';
  }).join('');
  return '<div class="mode-btn-group" id="' + groupId + '">' + buttons + '</div>' +
    '<input type="hidden" id="' + hiddenId + '" value="' + esc(currentValue) + '">';
}

// The plain 3-role (0=Main/1=Accent/2=Background, optionally 3=None)
// color choice used all over these popups -- schemeColorOptionsHtml()'s
// own <option> list turned into the same button-row shape as everything
// else here instead, rather than the full swatch-preview color picker
// the actual Colors section above uses (that one shows real colors
// because it HAS 64 real ones to choose from; these 3-4 are just roles
// that resolve to whatever the current color scheme says Main/Accent/
// Background actually are, so naming them is all there is to show).
function colorRoleButtonGroupHtml(groupId, hiddenId, currentValue, includeNone) {
  var options = [
    { value: '0', label: 'Main' },
    { value: '1', label: 'Accent' },
    { value: '2', label: 'Background' }
  ];
  if (includeNone) options.push({ value: '3', label: 'None' });
  return modeButtonGroupHtml(groupId, hiddenId, options, currentValue || '0');
}

module.exports = {
  esc: esc,
  sectionCategoryIcon: sectionCategoryIcon,
  SECTION_META: SECTION_META,
  sectionLegendHtml: sectionLegendHtml,
  subsectionLegendHtml: subsectionLegendHtml,
  verticalButtonGroupHtml: verticalButtonGroupHtml,
  modeButtonGroupHtml: modeButtonGroupHtml,
  colorRoleButtonGroupHtml: colorRoleButtonGroupHtml
};
