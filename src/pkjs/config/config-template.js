// Shared settings-page template helpers
var presetsLookups = require('../presets-lookups');
var CORNER_CATEGORIES = presetsLookups.CORNER_CATEGORIES;

function esc(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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
