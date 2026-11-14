// config-page.js -- builds the settings webview HTML for the classic
var APP_VERSION = "4.0.6-beta";

var PRESETS_LOOKUPS = require('./presets-lookups');
var FONT_LOOKUP = PRESETS_LOOKUPS.FONT_LOOKUP;
var FONT_CATEGORIES = PRESETS_LOOKUPS.FONT_CATEGORIES;
var COLOR_SCHEMES = PRESETS_LOOKUPS.COLOR_SCHEMES;
var CORNER_COLOR_MODE_LABELS = PRESETS_LOOKUPS.CORNER_COLOR_MODE_LABELS;
var CORNER_CATEGORIES = PRESETS_LOOKUPS.CORNER_CATEGORIES;
var HAND_PRESETS = PRESETS_LOOKUPS.HAND_PRESETS;
var MARKER_STYLE_PRESET_FIELDS = PRESETS_LOOKUPS.MARKER_STYLE_PRESET_FIELDS;
var ABOUT_LOGO_SVG = require('./data/generated/about-logo-svg');
function aboutLogoMarkup(className, attrs) {
  return '<svg class="' + className + '" viewBox="' + ABOUT_LOGO_SVG.viewBox + '"' +
    ' xmlns="http://www.w3.org/2000/svg"' + (attrs || '') + '>' +
    '<path fill-rule="evenodd" d="' + ABOUT_LOGO_SVG.path + '"/></svg>';
}

var configTemplate = require('./config/config-template');
var esc = configTemplate.esc;
var sectionCategoryIcon = configTemplate.sectionCategoryIcon;
var SECTION_META = configTemplate.SECTION_META;
var sectionLegendHtml = configTemplate.sectionLegendHtml;
var subsectionLegendHtml = configTemplate.subsectionLegendHtml;
var verticalButtonGroupHtml = configTemplate.verticalButtonGroupHtml;
var modeButtonGroupHtml = configTemplate.modeButtonGroupHtml;
var colorRoleButtonGroupHtml = configTemplate.colorRoleButtonGroupHtml;

var platform = require('./platform');
var MARKER_PREVIEW_IMAGES = platform.shapeImages(require('./data/generated/marker-preview-images'));
// Per-platform display names for the bitmap indices (the art differs per platform, so do the names).
var MARKER_TITLE_OVERRIDES = platform.round
  ? { '4': 'Simple', '12': 'Roman Tall', '13': 'Bebas' }
  : (platform.bw
    ? { '11': 'Rays', '12': 'Heavy', '13': 'Classy', '15': 'Squared', '16': 'Maurice', '17': 'Quickie', '18': 'Speed' }
    : {});
function markerTitle(value, fallback) { return MARKER_TITLE_OVERRIDES.hasOwnProperty(value) ? MARKER_TITLE_OVERRIDES[value] : fallback; }
var MARKER_VARIANT_STYLES = [
  { value: '11', title: markerTitle('11', 'Modern Bold') },
  { value: '12', title: markerTitle('12', 'Modern F') },
  { value: '13', title: markerTitle('13', 'Modern H') },
  { value: '14', title: markerTitle('14', 'Modern P') },
  { value: '15', title: markerTitle('15', 'Modern P Round') },
  { value: '16', title: markerTitle('16', 'Modern S') },
  { value: '17', title: markerTitle('17', 'Modern W') },
  { value: '18', title: markerTitle('18', 'Modern W Round') },
  { value: '19', title: markerTitle('19', 'Roman') }
];

var HAND_STYLE_IMAGES = require('./data/generated/hand-style-images');
var MARKER_PRESET_IMAGES = platform.shapeImages(require('./data/generated/marker-preset-images'));

var HAND_STYLE_DIAGRAM_IMAGES = require('./data/generated/hand-style-diagram-images');
var HAND_STYLE_ICON_IMAGES = require('./data/generated/hand-style-icon-images');
var WEATHER_ICON_STYLE_PREVIEWS = require('./data/generated/weather-icon-style-previews');
var PREVIEW_ICON_IMAGES = require('./data/generated/preview-icon-images');
var PREVIEW_ICON_TOKENS = require('./config/preview-icons').PREVIEW_ICON_TOKENS;

var EXAMPLE_STYLE_COUNT = require('./config/config-state').EXAMPLE_STYLE_COUNT; // one source of truth (was a stale 5)
var EXAMPLE_STYLE_IMAGES = platform.shapeImages(require('./data/generated/example-style-images'));
var EXAMPLE_STYLE_PRESETS = require('./example-style-presets');

var HOURLY_VIBE_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
var QUIET_TIME_API_AVAILABLE = true;

var FONT_PREVIEW_IMAGES = require('./data/generated/font-preview-images');

var configFonts = require('./config/config-fonts');
var googleFontsHref = configFonts.googleFontsHref;
var cdnFontLinks = configFonts.cdnFontLinks;
var directWebfontStyle = configFonts.directWebfontStyle;
var fontLookupEntry = configFonts.fontLookupEntry;
var fontOptionsHtml = configFonts.fontOptionsHtml;
var fontManagerSource = require('./config/font-manager');

var configFeatures = require('./config/config-features');
var CORNER_CONTENT_OPTIONS = configFeatures.CORNER_CONTENT_OPTIONS;
var cornerContentOptionsHtml = configFeatures.cornerContentOptionsHtml;

var primitiveDecomposeModule = require('./config/primitive-decompose');
var primitiveContentDecompositions = {};
PRESETS_LOOKUPS.CORNER_CATEGORIES.forEach(function (cat) {
  cat.items.forEach(function (it) {
    primitiveContentDecompositions[it.id] = primitiveDecomposeModule.primitiveChipsForContent(it.id);
  });
});
var primitivePalette = primitiveDecomposeModule.PRIMITIVE_PALETTE;
var primitiveTransportSequences = primitiveDecomposeModule.PRIMITIVE_TRANSPORT_SEQUENCES;
var primitiveTransportAux = primitiveDecomposeModule.PRIMITIVE_TRANSPORT_AUX;
var primitiveTimezoneZones = primitiveDecomposeModule.TIMEZONE_ZONES;
var primitiveForecastSlots = primitiveDecomposeModule.FORECAST_SLOTS;
var primitivePreviewText = primitiveDecomposeModule.PRIMITIVE_PREVIEW_TEXT;
var primitiveIds = require('./config/primitive-ids-generated');
var composerClientSource = require('./config/config-composer');

var configMarkers = require('./config/config-markers');
var markBtnGridHtml = configMarkers.markBtnGridHtml;
var MARKER_BORDER_MIN = configMarkers.MARKER_BORDER_MIN;
var MARKER_BORDER_MAX = configMarkers.MARKER_BORDER_MAX;
var customMarkerHiddenInputsHtml = configMarkers.customMarkerHiddenInputsHtml;
var customMarkerModalHtml = configMarkers.customMarkerModalHtml;
var textMarkerModalHtml = configMarkers.textMarkerModalHtml;

var schemeColorOptionsHtml = require('./config/config-colors').schemeColorOptionsHtml;

var configBackground = require('./config/config-background');
var configPlugins = require('./config/config-plugins');
var configBorder = require('./config/config-border');
var configHands = require('./config/config-hands');
var handHiddenInputsHtml = configHands.handHiddenInputsHtml;
var HAND_COPY_SOURCE = configHands.HAND_COPY_SOURCE;
var HAND_COPY_SOURCE_LABEL = configHands.HAND_COPY_SOURCE_LABEL;
var handEditorModalHtml = configHands.handEditorModalHtml;

var configPresets = require('./config/config-presets');
var presetSlotHtml = configPresets.presetSlotHtml;
var configPresetSchedule = require('./config/config-preset-schedule');
var configDebug = require('./config/config-debug');
var serviceStatusRowsHtml = configDebug.serviceStatusRowsHtml;
var rawMessageLogButtonsHtml = configDebug.rawMessageLogButtonsHtml;
var fakeWeatherPanelHtml = configDebug.fakeWeatherPanelHtml;

var FAQ_ITEMS = PRESETS_LOOKUPS.FAQ_ITEMS;

function faqItemsHtml() {
  return FAQ_ITEMS.map(function (item, index) {
    return '<div class="faq-item" data-faq-index="' + index + '">' +
      '<button type="button" class="faq-question" onclick="toggleFaqItem(' + index + ')">' +
        '<span>' + esc(item[0]) + '</span><span class="faq-chevron">&#9656;</span>' +
      '</button>' +
      '<div class="faq-answer"><p>' + esc(item[1]) + '</p></div>' +
    '</div>';
  }).join('');
}

// B&W watches have two looks only: white on black or black on white (no accent colour).
function bwSchemeSelectHtml(night, current) {
  var bgVal = parseInt(night ? current.nightCustomBg : current.customBg, 10);
  if (isNaN(bgVal)) bgVal = night ? 192 : 255;
  var white = platform.bwByte(bgVal) === 0xFF;
  var id = night ? 'bwNightScheme' : 'bwDayScheme';
  return '<select id="' + id + '" onchange="onBwSchemeChange(' + (night ? 'true' : 'false') + ')">' +
    '<option value="0"' + (white ? '' : ' selected') + '>White text on black</option>' +
    '<option value="1"' + (white ? ' selected' : '') + '>Black text on white</option>' +
    '</select>';
}

function buildConfigHtml(current) {
  var configState = require('./config/config-state').deriveConfigState(current);
  var autoLocChecked = configState.autoLocChecked;
  var manualDisabled = configState.manualDisabled;
  var testModeChecked = configState.testModeChecked;
  var testDisabled = configState.testDisabled;
  var rawLogEntries = configState.rawLogEntries;
  var mostRecentRawChunk = configState.mostRecentRawChunk;
  var debugTextareaInitial = configState.debugTextareaInitial;
  var secondsChecked = configState.secondsChecked;
  var cornerFontId = configState.cornerFontId;
  var cornerCategoriesForClient = configState.cornerCategoriesForClient;
  var exampleStylesButtonsHtml = configState.exampleStylesButtonsHtml;
  var markerStyleNum = configState.markerStyleNum;
  var isBitmapMarkerStyle = configState.isBitmapMarkerStyle;
  var bitmapCornerOverride = configState.bitmapCornerOverride;
  var edgeAvail = configState.edgeAvail;
  var initialColors = configState.initialColors;
  var initialNightColors = configState.initialNightColors;

  return '<!DOCTYPE html>' +
'<html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">' +
'<title>Modern Settings</title>' +
'<link rel="preconnect" href="https://fonts.googleapis.com">' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
'<link rel="stylesheet" href="' + googleFontsHref() + '">' +
cdnFontLinks() +
directWebfontStyle() +
'<style id="mainStyle">' +
'  :root { --page-bg: #f4f4f4; --card-bg: #fff; --text: #222; --text-strong: #333; --text-muted: #666; --text-faint: #888; --text-faint2: #555; --text-disabled: #999; --border: #ccc; --border-light: #eee; --border-lighter: #ddd; --btn-bg: #fafafa; }' +
'  @media (prefers-color-scheme: dark) {' +
'    :root { --page-bg: #1c1c1e; --card-bg: #2c2c2e; --text: #f2f2f2; --text-strong: #e5e5e5; --text-muted: #aaa; --text-faint: #999; --text-faint2: #bbb; --text-disabled: #777; --border: #48484a; --border-light: #3a3a3c; --border-lighter: #545456; --btn-bg: #3a3a3c; }' +
'  }' +
'  body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 0; padding: 16px 20px 90px; background: var(--page-bg); color: var(--text); }' +
'  html, body { touch-action: manipulation; }' +
'  /* Full-screen startup loader */' +
'  #startupLoader { position: fixed; inset: 0; z-index: 99999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: var(--page-bg); color: var(--text); opacity: 1; transition: opacity 360ms ease; }' +
'  #startupLoader.hidden { opacity: 0; pointer-events: none; }' +
'  #startupLoaderTitle { font-size: 22px; font-weight: 700; letter-spacing: .2px; }' +
'  #startupLoaderSubtitle { font-size: 13px; color: var(--text-muted); }' +
'  #startupProgressTrack { width: min(280px, 72vw); height: 8px; overflow: hidden; border-radius: 999px; background: var(--border-light); box-shadow: inset 0 1px 2px rgba(0,0,0,.08); }' +
'  #startupProgressBar { width: 0%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #d98b9b, #e8b46a, #9ac6b0); transition: width 260ms ease-out; }' +
'  #startupProgressPercent { min-width: 3em; text-align: center; font-size: 12px; color: var(--text-faint); font-variant-numeric: tabular-nums; }' +
'  button, .mode-btn, .slot-btn, .slider-step-btn { touch-action: manipulation; -webkit-user-select: none; user-select: none; }' +
'  fieldset { border: none; background: var(--card-bg); border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.08); min-width: 0; }' +
'  legend { font-weight: 600; font-size: 14px; padding: 0; color: var(--text-strong); }' +
'  label { display: block; font-size: 14px; margin: 10px 0 4px; color: var(--text-strong); }' +
'  input[type=text], input[type=number], select { width: 100%; box-sizing: border-box; padding: 8px; font-size: 15px; border: 1px solid var(--border); border-radius: 5px; background: var(--card-bg); color: var(--text); }' +
'  input[type=time], input[type=datetime-local] { display: block; width: 50vw; max-width: 50vw; margin: 0 auto; box-sizing: border-box; padding: 13px 40px 13px 12px; font-size: 24px; font-weight: 600; min-height: 46px; border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg); color: var(--text); }' +
'  input[type=time]::-webkit-calendar-picker-indicator, input[type=datetime-local]::-webkit-calendar-picker-indicator { transform: scale(1.3); cursor: pointer; }' +
'  input[disabled], select[disabled] { background: var(--border-light); color: var(--text-disabled); }' +
'  .checkbox-row { display: flex; align-items: center; gap: 10px; }' +
'  .radio-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }' +
'  input[type=checkbox] { appearance: none; -webkit-appearance: none; width: 30px; height: 30px; flex-shrink: 0; margin: 0; padding: 0; box-sizing: border-box; border: 2px solid var(--border); border-radius: 8px; background: var(--card-bg); position: relative; }' +
'  input[type=checkbox]:checked { background: #ff9200; border-color: #ff9200; }' +
'  input[type=checkbox]:checked::after { content: ""; position: absolute; left: 9px; top: 4px; width: 7px; height: 14px; border: solid #fff; border-width: 0 3px 3px 0; transform: rotate(45deg); }' +
'  input[type=checkbox][disabled] { background: var(--border-light); border-color: var(--border-lighter); }' +
'  input[type=checkbox][disabled]:checked { background: #f0c785; border-color: #f0c785; }' +
'  .help { color: var(--text-faint); font-size: 12px; margin-top: 4px; }' +
'  .field-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 0 4px; }' +
'  .field-label-row > label { margin: 0; }' +
'  .field-label-row > .secondary-btn { width: auto; flex: 1 1 auto; margin-top: 0; }' +
'  .help-btn { flex: 0 0 auto; width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); background: var(--btn-bg); color: var(--text-faint); font-size: 12px; font-weight: 700; line-height: 18px; text-align: center; padding: 0; cursor: pointer; -webkit-appearance: none; }' +
'  .faq-search-wrap { position: relative; margin: 0 0 12px; }' +
'  .faq-search { width: 100%; box-sizing: border-box; padding: 10px 12px 10px 34px; border: 1px solid var(--border); border-radius: 8px; background: var(--btn-bg); color: var(--text-strong); font-size: 13px; }' +
'  .faq-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-faint); pointer-events: none; font-size: 15px; }' +
'  .faq-item { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: var(--btn-bg); margin-bottom: 7px; }' +
'  .faq-question { width: 100%; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; color: var(--text-strong); text-align: left; padding: 10px 11px; font-size: 13px; font-weight: 650; cursor: pointer; }' +
'  .faq-question:hover { background: var(--border-light); }' +
'  .faq-question .faq-chevron { margin-left: auto; color: var(--text-faint); transition: transform .16s ease; flex: 0 0 auto; }' +
'  .faq-item.open .faq-chevron { transform: rotate(90deg); }' +
'  .faq-answer { display: none; padding: 0 11px 11px; color: var(--text-faint); font-size: 12px; line-height: 1.45; border-top: 1px solid var(--border-light); }' +
'  .faq-item.open .faq-answer { display: block; }' +
'  .faq-answer p { margin: 9px 0 0; }' +
'  .faq-empty { display: none; padding: 12px 4px; color: var(--text-faint); font-size: 12px; text-align: center; }' +
'  .checkbox-row .help-btn, .radio-row .help-btn { margin-left: auto; }' +
'  .section-intro { cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
'  .section-intro.expanded { white-space: normal; overflow: visible; text-overflow: clip; }' +
'  .tooltip-warning { color: #ff9200; font-weight: 600; }' +
'  .radio-row { display: flex; gap: 16px; margin-top: 8px; flex-wrap: wrap; }' +
'  .radio-row label { display: flex; align-items: center; gap: 6px; margin: 0; font-weight: normal; }' +
'  .radio-row input { width: auto; }' +
'  .secondary-btn { width: 100%; padding: 12px; font-size: 14px; font-weight: 600; color: var(--text-strong); background: var(--border-light); border: 1px solid var(--border); border-radius: 8px; margin-top: 12px; }' +
'  .preset-slot-row { display: flex; gap: 6px; align-items: stretch; margin-top: 8px; }' +
'  .preset-apply-btn { flex: 1; box-sizing: border-box; padding: 12px; font-size: 14px; font-weight: 600; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 8px; text-align: left; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
'  .preset-apply-btn:disabled { opacity: 0.45; }' +
'  .preset-icon-btn { width: 44px; flex-shrink: 0; font-size: 18px; background: var(--btn-bg); border: 1px solid var(--border); border-radius: 8px; color: var(--text-strong); }' +
'  .preset-name-input { flex: 1; box-sizing: border-box; }' +
configPresetSchedule.css +
'  .example-style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }' +
'  .example-style-btn { position: relative; aspect-ratio: ' + platform.w + ' / ' + platform.h + '; box-sizing: border-box; border-radius: 8px; border: 1px solid var(--border); background: var(--btn-bg); overflow: hidden; padding: 0; }' +
'  .example-style-btn:disabled { opacity: 0.4; }' +
'  .example-style-btn img { width: 100%; height: 100%; object-fit: contain; display: block; }' +
'  .example-style-btn-empty { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 13px; font-weight: 600; color: var(--text); }' +
'  .style-picker-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }' +
'  .style-picker-btn { position: relative; aspect-ratio: ' + platform.w + ' / ' + platform.h + '; box-sizing: border-box; border-radius: 8px; border: 1px solid var(--border); background: var(--btn-bg); overflow: hidden; padding: 0; }' +
'  .style-picker-btn img { width: 100%; height: 100%; object-fit: contain; display: block; }' +
'  .bitmap-marker-img { filter: invert(1); }' +
'  .style-picker-btn-empty { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 11px; font-weight: 600; color: var(--text); text-align: center; padding: 4px; box-sizing: border-box; }' +
'  .style-picker-btn-cap { position: absolute; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.55); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 2px; text-align: center; line-height: 1.2; }' +
'  .style-picker-btn-cap-top { position: absolute; left: 0; right: 0; top: 0; background: rgba(0,0,0,0.55); color: #fff; font-size: 10px; font-weight: 700; padding: 3px 2px; text-align: center; line-height: 1.2; }' +
'  .style-picker-custom-btn { width: 100%; box-sizing: border-box; padding: 12px; font-size: 14px; font-weight: 600; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 8px; margin-top: 10px; }' +
'  .style-picker-custom-btn:active { background: var(--border-light); }' +
'  .style-picker-none-btn { color: #b23a3a; border-color: #d99; background: rgba(178,58,58,0.08); }' +
'  .style-picker-none-btn:active { background: rgba(178,58,58,0.16); }' +
'  .font-picker-btn { display: flex; align-items: stretch; width: 100%; box-sizing: border-box; text-align: left; padding: 0; background: var(--btn-bg); border: 1px solid var(--border); border-radius: 8px; margin-top: 8px; overflow: hidden; }' +
'  #fontPickerModal .modal-box { height: 75vh; max-height: 75vh; }' +
'  .font-picker-btn:active { background: var(--border-light); }' +
'  .font-picker-btn.selected { border-color: #ff9200; border-width: 2px; }' +
'  .font-picker-preview { flex: 0 0 34%; display: flex; align-items: center; justify-content: center; padding: 10px 4px; box-sizing: border-box; border-right: 1px solid var(--border); overflow: hidden; white-space: nowrap; color: var(--text-strong); line-height: 1.1; }' +
'  .font-picker-name { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: 4px; padding: 8px 12px; font-size: 13px; font-weight: 600; color: var(--text-strong); box-sizing: border-box; }' +
'  .font-picker-size { display: inline-flex; align-items: center; justify-content: center; padding: 2px 7px; border-radius: 999px; font-size: 9px; line-height: 1.2; font-weight: 700; letter-spacing: 0.45px; white-space: nowrap; }' +
'  .font-picker-size-xs { background: #dbeafe; color: #245b9e; }' +
'  .font-picker-size-s { background: #dcfce7; color: #28734a; }' +
'  .font-picker-size-m { background: #fef3c7; color: #8a6410; }' +
'  .font-picker-size-l { background: #ffedd5; color: #a45116; }' +
'  .font-picker-size-xl { background: #fee2e2; color: #a33a3a; }' +
'  .font-picker-tags { display: flex; flex-wrap: nowrap; align-items: center; gap: 3px; align-self: stretch; min-width: 0; overflow: hidden; }' +
'  .font-picker-tags > * { flex: 0 0 auto; }' +
'  .font-picker-height { font-size: 10px; line-height: 1.2; font-weight: 300; font-stretch: condensed; letter-spacing: 0.32px; color: var(--text-faint); }' +
'  .font-picker-tags-divider { width: 1px; height: 8px; background: var(--border); }' +
'  .font-picker-tag { display: inline-flex; align-items: center; justify-content: center; padding: 1.4px 4.9px; border-radius: 999px; font-size: 6.3px; line-height: 1.2; font-weight: 400; font-stretch: condensed; letter-spacing: 0.32px; white-space: nowrap; text-transform: uppercase; background: var(--border-lighter); color: var(--text-muted); }' +
'  .font-preview-img { display: inline-block; width: 100%; height: 100%; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center; -webkit-mask-size: contain; mask-size: contain; }' +
'  .hand-style-icon-preview { flex: 0 0 25%; }' +
'  .hand-style-icon-preview img { max-width: 100%; max-height: 100%; display: block; filter: none; }' +
'  @media (prefers-color-scheme: dark) {' +
'    .bitmap-marker-img { filter: none; }' +
'    .hand-style-icon-preview img { filter: invert(1); }' +
'  }' +
'  .weather-icon-style-preview { flex: 0 0 25%; }' +
'  .weather-icon-style-preview img { width: 28px; height: 28px; object-fit: contain; display: block; image-rendering: pixelated; }' +
'  .font-picker-trigger { margin-top: 6px; }' +
'  .color-preset-btn { display: block; width: 100%; text-align: left; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; margin-top: 8px; box-sizing: border-box; }' +
'  .color-preset-btn.selected { border: 2px solid #ff9200; box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }' +
'  .color-preset-main-line { display: block; font-size: 15px; font-weight: 700; }' +
'  .color-preset-accent-line { display: block; font-size: 12px; font-weight: 600; margin-top: 2px; }' +
'  .color-preset-trigger { margin-top: 6px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }' +
'  .color-preset-trigger-text { display: flex; flex-direction: column; min-width: 0; }' +
'  .color-preset-chevron { font-size: 24px; font-weight: 700; opacity: 0.5; flex-shrink: 0; }' +
'  .secondary-btn:active { background: var(--border-lighter); }' +
'  .save-bar { position: fixed; left: 0; right: 0; bottom: 0; padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px)); background: var(--page-bg); box-shadow: 0 -2px 6px rgba(0,0,0,0.1); }' +
'  .save-bar button { width: 100%; padding: 14px; font-size: 16px; font-weight: 600; color: #fff; background: #ff9200; border: none; border-radius: 8px; }' +
'  .save-bar button:active { background: #e08300; }' +
'  #topBar { position: fixed; top: 0; left: 0; right: 0; max-height: 25vh; overflow: hidden; background: var(--page-bg); box-shadow: 0 2px 6px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; padding-top: calc(10px + env(safe-area-inset-top, 0px)); box-sizing: border-box; z-index: 50; }' +
'  .top-bar-left { display: flex; flex-direction: column; justify-content: center; flex: 0 1 66%; min-width: 0; }' +
'  .top-bar-actions { display: flex; gap: 6px; align-items: center; }' +
'  .back-btn { padding: 6px 10px; font-size: 13px; font-weight: 600; color: var(--text-strong); background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; }' +
'  .back-btn:active { background: var(--border-light); }' +
'  .about-btn { width: 30px; height: 30px; padding: 3px; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; border: 1px solid var(--border); border-radius: 6px; background: var(--card-bg); box-shadow: 0 1px 3px rgba(0,0,0,0.12); }' +
'  .about-btn-logo { display: block; width: 22px; height: 22px; border-radius: 4px; fill: currentColor; color: #000; }' +
'  @media (prefers-color-scheme: dark) { .about-btn-logo { color: #fff; } }' +
'  .about-btn:active { background: var(--border-light); transform: scale(0.96); }' +
'  .donate-btn { padding: 6px 10px; font-size: 13px; font-weight: 700; color: #6b5a72; background: linear-gradient(135deg, #ffd6e0, #ffe8c2, #eaf6c8, #c8ecec, #d6d6f5, #ffd6e0); background-size: 300% 300%; animation: donateGradientShift 18s ease-in-out infinite; border: none; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }' +
'  @keyframes donateGradientShift { 0% { background-position: 0% 50%; } 25% { background-position: 50% 100%; } 50% { background-position: 100% 50%; } 75% { background-position: 50% 0%; } 100% { background-position: 0% 50%; } }' +
'  .donate-btn:active { filter: brightness(0.94); }' +
'  .top-bar-title { font-size: 15px; font-weight: 700; margin-top: 6px; color: var(--text); white-space: nowrap; }' +
'  .top-bar-desc { font-size: 7px; line-height: 1.3; color: var(--text-muted); margin-top: 3px; }' +
'  .top-bar-preview { flex: 0 1 33%; display: flex; justify-content: center; align-items: center; min-width: 0; height: 100%; max-height: calc(25vh - 20px); padding: 1%; box-sizing: border-box; }' +
'  #previewCanvas { height: 50%; max-height: 50%; width: auto; max-width: 98%; border-radius: ' + (platform.round ? '50%' : '4px') + '; }' +
((platform.bw || current.liveMode) ? '  .top-bar-preview { display: none !important; } .top-bar-left { flex: 1 1 100%; }' : '') +
(platform.round ? '  .slot-corner-tl, .slot-corner-tr, .slot-corner-bl, .slot-corner-br { display: none !important; }' : '') +
'  .subsection { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-light); }' +
'  .scheme-active-badge { font-size: 11px; font-weight: 700; color: #2e8b3d; background: rgba(46,139,61,0.15); border-radius: 4px; padding: 2px 6px; margin-left: 8px; vertical-align: middle; }' +
'  .scheme-active-badge.inactive { color: #c0392b; background: rgba(192,57,43,0.15); }' +
'  .color-role-buttons { display: flex; gap: 8px; margin-top: 6px; }' +
'  .color-role-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 4px; border: 1px solid var(--border); border-radius: 8px; background: var(--btn-bg); }' +
'  .color-role-btn:active { background: var(--border-light); }' +
'  .color-role-swatch { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border); box-sizing: border-box; }' +
'  .color-role-label { font-size: 11px; color: var(--text-faint2); }' +
'  .service-status-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; }' +
'  .service-dot { width: 12px; height: 12px; border-radius: 50%; flex: 0 0 auto; border: 1px solid var(--border); }' +
'  .service-dot-gray { background: #999; }' +
'  .service-dot-green { background: #2ecc71; }' +
'  .service-dot-yellow { background: #f1c40f; }' +
'  .service-dot-red { background: #e74c3c; }' +
'  .service-name { flex: 1 1 auto; font-size: 13px; color: var(--text); }' +
'  .service-info-btn { width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border); background: var(--btn-bg); color: var(--text-faint2); font-size: 12px; font-style: italic; font-weight: 700; line-height: 18px; text-align: center; padding: 0; flex: 0 0 auto; }' +
'  .service-log-line { font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-word; padding: 3px 0; border-bottom: 1px solid var(--border-light); color: var(--text); }' +
'  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: none; align-items: flex-end; justify-content: center; z-index: 100; overflow: hidden; }' +
'  .modal-overlay.open { display: flex; }' +
'  .modal-box { background: var(--card-bg); border-radius: 12px 12px 0 0; padding: 16px; width: 100%; max-width: 400px; max-height: 80vh; box-sizing: border-box; display: flex; flex-direction: column; overflow: hidden; }' +
'  #aboutModal { align-items: center; }' +
'  .about-modal-box { width: calc(100% - 32px); max-width: 340px; max-height: 78vh; border-radius: 14px; padding: 18px; box-shadow: 0 14px 42px rgba(0,0,0,0.28); transform-origin: center center; animation: about-modal-in 360ms cubic-bezier(.18,.9,.25,1.15) both; }' +
'  @keyframes about-modal-in { from { transform: translate(var(--about-dx, 0px), var(--about-dy, 0px)) scale(.08); opacity: 0; } 65% { transform: translate(0, 0) scale(1.025); opacity: 1; } to { transform: translate(0, 0) scale(1); opacity: 1; } }' +
'  .about-logo { width: 62px; height: 62px; margin: 0 auto 10px; display: block; border-radius: 12px; cursor: pointer; transform-origin: 50% 50%; -webkit-tap-highlight-color: transparent; user-select: none; fill: currentColor; color: #000; }' +
'  @media (prefers-color-scheme: dark) { .about-logo { color: #fff; } }' +
'  .about-logo.logo-tap-effect { animation: about-logo-tap 560ms cubic-bezier(.18,.9,.25,1.2); }' +
'  @keyframes about-logo-tap { 0% { transform: scale(1) rotate(0deg); filter: brightness(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); } 18% { transform: scale(.88) rotate(-7deg); filter: brightness(1.35); box-shadow: 0 0 0 5px rgba(255,255,255,.16), 0 0 18px 4px rgba(255,205,92,.28); } 42% { transform: scale(1.14) rotate(5deg); filter: brightness(1.75); box-shadow: 0 0 0 10px rgba(255,255,255,.07), 0 0 28px 8px rgba(255,205,92,.20); } 68% { transform: scale(.97) rotate(-2deg); filter: brightness(1.12); box-shadow: 0 0 0 4px rgba(255,255,255,.08), 0 0 12px 2px rgba(255,205,92,.12); } 100% { transform: scale(1) rotate(0deg); filter: brightness(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); } }' +
'  .about-logo.logo-tap-effect::selection { background: transparent; }' +
'  .about-title { text-align: center; font-size: 20px; line-height: 1.1; font-weight: 800; color: var(--text-strong); }' +
'  .about-subtitle { margin-top: 4px; text-align: center; font-size: 12px; color: var(--text-muted); }' +
'  .about-info { margin-top: 16px; padding: 11px 12px; border: 1px solid var(--border-light); border-radius: 9px; background: var(--page-bg); }' +
'  .about-info-row { display: flex; gap: 10px; padding: 4px 0; font-size: 12px; line-height: 1.35; }' +
'  .about-info-label { flex: 0 0 72px; font-weight: 700; color: var(--text-muted); }' +
'  .about-info-value { min-width: 0; flex: 1 1 auto; color: var(--text); }' +
'  .about-description { margin: 13px 2px 0; text-align: center; font-size: 11px; line-height: 1.45; color: var(--text-muted); }' +
'  .about-source { display: block; margin: 15px 2px 0; text-align: center; font-size: 11px; line-height: 1.35; color: #3f6fa8; text-decoration: none; word-break: break-word; }' +
'  .about-source:active { text-decoration: underline; }' +
'  .about-ok-btn { width: 100%; padding: 11px; font-size: 14px; font-weight: 700; color: var(--text-strong); background: var(--border-light); border: none; border-radius: 8px; margin-top: 8px; }' +
'  .about-ok-btn:active { background: var(--border); }' +
'  body.retro-easter-egg { --retro-bg: #edf3e6; --retro-card: #f8fbf4; --retro-text: #174c2d; --retro-strong: #083b20; --retro-muted: #3f7455; --retro-border: #6c9a7b; --retro-accent: #176b3d; --retro-shadow: rgba(23,107,61,.22); font-family: "Courier New", Courier, monospace; background: var(--retro-bg); color: var(--retro-text); }' +
'  body.retro-easter-egg::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 99998; background: repeating-linear-gradient(to bottom, rgba(23,107,61,.045) 0, rgba(23,107,61,.045) 1px, transparent 1px, transparent 4px); mix-blend-mode: multiply; opacity: .65; }' +
'  body.retro-easter-egg #topBar, body.retro-easter-egg .save-bar { background: var(--retro-bg); box-shadow: 0 2px 0 var(--retro-border); }' +
'  body.retro-easter-egg fieldset, body.retro-easter-egg .modal-box { background: var(--retro-card); border: 2px solid var(--retro-border); border-radius: 0; box-shadow: 4px 4px 0 var(--retro-shadow); }' +
'  body.retro-easter-egg input[type=text], body.retro-easter-egg input[type=number], body.retro-easter-egg input[type=time], body.retro-easter-egg input[type=datetime-local], body.retro-easter-egg select { background: var(--retro-card); color: var(--retro-text); border-color: var(--retro-border); border-radius: 0; font-family: inherit; box-shadow: inset 2px 2px 0 rgba(23,107,61,.08); }' +
'  body.retro-easter-egg button { border-radius: 0 !important; font-family: inherit; }' +
'  body.retro-easter-egg .back-btn, body.retro-easter-egg .about-btn, body.retro-easter-egg .secondary-btn, body.retro-easter-egg .mode-btn, body.retro-easter-egg .color-role-btn, body.retro-easter-egg .service-info-btn { background: var(--retro-card); color: var(--retro-text); border-color: var(--retro-border); box-shadow: 2px 2px 0 var(--retro-shadow); }' +
'  body.retro-easter-egg .donate-btn { background: var(--retro-accent); color: var(--retro-card); border: 2px solid var(--retro-strong); border-radius: 0; box-shadow: 2px 2px 0 var(--retro-strong); animation: none; }' +
'  body.retro-easter-egg .top-bar-title, body.retro-easter-egg .section-title, body.retro-easter-egg label, body.retro-easter-egg .modal-title { letter-spacing: .04em; text-transform: uppercase; }' +
'  body.retro-easter-egg .about-modal-box { border: 2px solid var(--retro-accent); box-shadow: 6px 6px 0 var(--retro-shadow); }' +
'  body.retro-easter-egg .about-logo { image-rendering: pixelated; border-radius: 0; border: 2px solid var(--retro-accent); padding: 2px; background: var(--retro-card); cursor: pointer; }' +
'  body.retro-easter-egg .about-title { color: var(--retro-strong); letter-spacing: .12em; text-transform: uppercase; }' +
'  body.retro-easter-egg .about-subtitle, body.retro-easter-egg .about-description, body.retro-easter-egg .about-info-label { color: var(--retro-muted); }' +
'  body.retro-easter-egg .about-info { background: var(--retro-bg); border-color: var(--retro-border); border-radius: 0; }' +
'  body.retro-easter-egg .about-info-value { color: var(--retro-text); }' +
'  body.retro-easter-egg .about-source { color: var(--retro-accent); font-weight: 700; }' +
'  body.retro-easter-egg .about-ok-btn { background: var(--retro-accent); color: var(--retro-card); border: 2px solid var(--retro-strong); box-shadow: 2px 2px 0 var(--retro-strong); }' +
'  body.retro-easter-egg input[type=range] { height: 30px; }' +
'  body.retro-easter-egg input[type=range]::-webkit-slider-runnable-track { height: 10px; border-radius: 0; background: var(--retro-card); border: 2px solid var(--retro-border); box-shadow: inset 2px 2px 0 rgba(23,107,61,.16), inset -2px -2px 0 rgba(255,255,255,.55); }' +
'  body.retro-easter-egg input[type=range]::-webkit-slider-thumb { width: 22px; height: 26px; margin-top: -10px; border-radius: 0; background: var(--retro-card); border: 2px solid var(--retro-strong); box-shadow: inset 2px 2px 0 rgba(255,255,255,.7), inset -2px -2px 0 rgba(23,107,61,.28), 2px 2px 0 var(--retro-shadow); }' +
'  body.retro-easter-egg input[type=range]::-moz-range-track { height: 10px; border-radius: 0; background: var(--retro-card); border: 2px solid var(--retro-border); box-shadow: inset 2px 2px 0 rgba(23,107,61,.16), inset -2px -2px 0 rgba(255,255,255,.55); }' +
'  body.retro-easter-egg input[type=range]::-moz-range-thumb { width: 22px; height: 26px; border-radius: 0; background: var(--retro-card); border: 2px solid var(--retro-strong); box-shadow: inset 2px 2px 0 rgba(255,255,255,.7), inset -2px -2px 0 rgba(23,107,61,.28), 2px 2px 0 var(--retro-shadow); }' +
'  body.retro-easter-egg input[type=checkbox] { width: 26px; height: 26px; border-radius: 0; background: var(--retro-card); border: 2px solid var(--retro-strong); box-shadow: inset 2px 2px 0 rgba(23,107,61,.28), inset -2px -2px 0 rgba(255,255,255,.72); }' +
'  body.retro-easter-egg input[type=checkbox]:checked { background: var(--retro-card); border-color: var(--retro-strong); }' +
'  body.retro-easter-egg input[type=checkbox]:checked::after { left: 6px; top: 3px; width: 7px; height: 13px; border-color: var(--retro-accent); border-width: 0 3px 3px 0; }' +
'  body.retro-easter-egg input[type=checkbox][disabled] { background: var(--retro-bg); border-color: var(--retro-border); box-shadow: inset 2px 2px 0 rgba(23,107,61,.16); }' +
'  body.liquid-glass-easter-egg { --glass-bg: rgba(246,248,252,.74); --glass-card: rgba(255,255,255,.48); --glass-card-strong: rgba(255,255,255,.68); --glass-text: #18202b; --glass-muted: rgba(42,50,63,.68); --glass-border: rgba(255,255,255,.72); --glass-shadow: rgba(25,34,49,.18); --glass-tint: rgba(111,133,255,.18); background: radial-gradient(circle at 12% 8%, rgba(117,167,255,.22), transparent 30%), radial-gradient(circle at 88% 22%, rgba(255,153,213,.18), transparent 27%), linear-gradient(145deg, #edf1f8, #f8f9fc 55%, #e9eef7); color: var(--glass-text); }' +
'  body.liquid-glass-easter-egg::before { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 99996; background: radial-gradient(circle at 30% 15%, rgba(255,255,255,.38), transparent 28%), radial-gradient(circle at 80% 72%, rgba(126,165,255,.14), transparent 30%); }' +
'  body.liquid-glass-easter-egg::after { content: ""; position: fixed; inset: 0; pointer-events: none; z-index: 99998; background: linear-gradient(120deg, rgba(255,255,255,.22), transparent 24%, transparent 74%, rgba(255,255,255,.16)); mix-blend-mode: screen; }' +
'  body.liquid-glass-easter-egg #topBar, body.liquid-glass-easter-egg .save-bar { background: rgba(246,248,252,.55); border-bottom: 1px solid rgba(255,255,255,.78); box-shadow: 0 8px 28px rgba(40,54,80,.10); backdrop-filter: blur(24px) saturate(145%); -webkit-backdrop-filter: blur(24px) saturate(145%); }' +
'  body.liquid-glass-easter-egg fieldset, body.liquid-glass-easter-egg .modal-box { background: linear-gradient(145deg, rgba(255,255,255,.62), rgba(245,248,255,.36)); border: 1px solid var(--glass-border); border-radius: 22px; box-shadow: 0 18px 48px var(--glass-shadow), inset 0 1px 0 rgba(255,255,255,.82); backdrop-filter: blur(24px) saturate(145%); -webkit-backdrop-filter: blur(24px) saturate(145%); }' +
'  body.liquid-glass-easter-egg .card, body.liquid-glass-easter-egg .faq-item, body.liquid-glass-easter-egg .about-info { background: rgba(255,255,255,.34); border-color: rgba(255,255,255,.68); box-shadow: inset 0 1px 0 rgba(255,255,255,.72), 0 8px 24px rgba(42,55,80,.08); backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%); }' +
'  body.liquid-glass-easter-egg input[type=text], body.liquid-glass-easter-egg input[type=number], body.liquid-glass-easter-egg input[type=time], body.liquid-glass-easter-egg input[type=datetime-local], body.liquid-glass-easter-egg select, body.liquid-glass-easter-egg .faq-search { background: rgba(255,255,255,.44); color: var(--glass-text); border: 1px solid rgba(255,255,255,.8); border-radius: 15px; box-shadow: inset 0 1px 1px rgba(255,255,255,.78), 0 3px 12px rgba(34,47,73,.07); backdrop-filter: blur(14px) saturate(145%); -webkit-backdrop-filter: blur(14px) saturate(145%); }' +
'  body.liquid-glass-easter-egg button { border-radius: 999px !important; border-color: rgba(255,255,255,.76); box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 5px 14px rgba(38,52,78,.10); transition: transform .16s ease, box-shadow .16s ease, background .16s ease; }' +
'  body.liquid-glass-easter-egg button:active { transform: scale(.97); box-shadow: inset 0 1px 2px rgba(35,45,65,.12), 0 2px 7px rgba(38,52,78,.10); }' +
'  body.liquid-glass-easter-egg .back-btn, body.liquid-glass-easter-egg .about-btn, body.liquid-glass-easter-egg .secondary-btn, body.liquid-glass-easter-egg .mode-btn, body.liquid-glass-easter-egg .color-role-btn, body.liquid-glass-easter-egg .service-info-btn { background: rgba(255,255,255,.42); color: var(--glass-text); border: 1px solid rgba(255,255,255,.78); }' +
'  body.liquid-glass-easter-egg .donate-btn { color: #2b2142; background: linear-gradient(135deg, rgba(255,205,231,.72), rgba(204,223,255,.70), rgba(218,250,232,.68)); border: 1px solid rgba(255,255,255,.86); box-shadow: inset 0 1px 0 rgba(255,255,255,.95), 0 7px 18px rgba(71,79,120,.13); animation: glass-shimmer 8s ease-in-out infinite; }' +
'  body.liquid-glass-easter-egg .about-btn { background: rgba(255,255,255,.58); }' +
'  body.liquid-glass-easter-egg .about-logo { border-radius: 18px; box-shadow: 0 10px 25px rgba(39,50,75,.15), inset 0 1px 0 rgba(255,255,255,.85); }' +
'  body.liquid-glass-easter-egg .about-modal-box { background: linear-gradient(145deg, rgba(255,255,255,.70), rgba(244,248,255,.45)); border-radius: 28px; box-shadow: 0 28px 70px rgba(31,43,66,.22), inset 0 1px 0 rgba(255,255,255,.9); }' +
'  body.liquid-glass-easter-egg .about-info { background: rgba(255,255,255,.30); border-radius: 17px; }' +
'  body.liquid-glass-easter-egg .about-source { color: #4969d7; font-weight: 650; }' +
'  body.liquid-glass-easter-egg .about-ok-btn { color: #26314c; background: linear-gradient(180deg, rgba(255,255,255,.76), rgba(225,233,249,.54)); border: 1px solid rgba(255,255,255,.9); }' +
'  body.liquid-glass-easter-egg input[type=range] { height: 32px; }' +
'  body.liquid-glass-easter-egg input[type=range]::-webkit-slider-runnable-track { height: 10px; border-radius: 999px; background: rgba(255,255,255,.42); border: 1px solid rgba(255,255,255,.72); box-shadow: inset 0 1px 3px rgba(52,65,90,.12), 0 2px 8px rgba(45,58,82,.07); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }' +
'  body.liquid-glass-easter-egg input[type=range]::-webkit-slider-thumb { width: 25px; height: 25px; margin-top: -8px; border-radius: 50%; background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.98), rgba(240,246,255,.72) 42%, rgba(184,205,255,.64)); border: 1px solid rgba(255,255,255,.92); box-shadow: inset 0 1px 2px rgba(255,255,255,.95), 0 4px 12px rgba(54,69,104,.20); }' +
'  body.liquid-glass-easter-egg input[type=range]::-moz-range-track { height: 10px; border-radius: 999px; background: rgba(255,255,255,.42); border: 1px solid rgba(255,255,255,.72); box-shadow: inset 0 1px 3px rgba(52,65,90,.12), 0 2px 8px rgba(45,58,82,.07); }' +
'  body.liquid-glass-easter-egg input[type=range]::-moz-range-thumb { width: 25px; height: 25px; border-radius: 50%; background: rgba(245,249,255,.84); border: 1px solid rgba(255,255,255,.92); box-shadow: inset 0 1px 2px rgba(255,255,255,.95), 0 4px 12px rgba(54,69,104,.20); }' +
'  body.liquid-glass-easter-egg input[type=checkbox] { width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,.45); border: 1px solid rgba(255,255,255,.84); box-shadow: inset 0 1px 2px rgba(255,255,255,.9), 0 4px 10px rgba(54,69,104,.12); }' +
'  body.liquid-glass-easter-egg input[type=checkbox]:checked { background: linear-gradient(145deg, rgba(114,150,255,.90), rgba(83,119,229,.72)); border-color: rgba(255,255,255,.92); box-shadow: inset 0 1px 2px rgba(255,255,255,.65), 0 4px 13px rgba(76,104,207,.24); }' +
'  body.liquid-glass-easter-egg input[type=checkbox]:checked::after { left: 8px; top: 5px; width: 7px; height: 13px; border-color: #fff; border-width: 0 3px 3px 0; }' +
'  body.liquid-glass-easter-egg input[type=checkbox][disabled] { opacity: .48; }' +
'  @keyframes glass-shimmer { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }' +
'  @media (prefers-reduced-motion: reduce) { body.liquid-glass-easter-egg button, body.liquid-glass-easter-egg .donate-btn { transition: none; animation: none; } }' +
'  @media (prefers-color-scheme: dark) {' +
'    body.retro-easter-egg { --retro-bg: #07110b; --retro-card: #0d1b12; --retro-text: #76e69a; --retro-strong: #a1ffbd; --retro-muted: #54aa70; --retro-border: #286b42; --retro-accent: #43bd69; --retro-shadow: rgba(0,0,0,.7); }' +
'    body.retro-easter-egg::after { background: repeating-linear-gradient(to bottom, rgba(118,230,154,.055) 0, rgba(118,230,154,.055) 1px, transparent 1px, transparent 4px); mix-blend-mode: screen; opacity: .7; }' +
'    body.liquid-glass-easter-egg { --glass-bg: rgba(25,29,38,.66); --glass-card: rgba(48,54,68,.48); --glass-card-strong: rgba(67,75,92,.60); --glass-text: #f2f5fb; --glass-muted: rgba(226,232,243,.68); --glass-border: rgba(255,255,255,.20); --glass-shadow: rgba(0,0,0,.38); --glass-tint: rgba(126,151,255,.22); background: radial-gradient(circle at 12% 8%, rgba(92,126,255,.20), transparent 30%), radial-gradient(circle at 88% 22%, rgba(255,111,198,.13), transparent 27%), linear-gradient(145deg, #171b24, #222733 55%, #151a24); }' +
'    body.liquid-glass-easter-egg::before { background: radial-gradient(circle at 30% 15%, rgba(255,255,255,.08), transparent 28%), radial-gradient(circle at 80% 72%, rgba(90,132,255,.14), transparent 30%); }' +
'    body.liquid-glass-easter-egg #topBar, body.liquid-glass-easter-egg .save-bar { background: rgba(23,27,36,.55); border-color: rgba(255,255,255,.16); }' +
'    body.liquid-glass-easter-egg fieldset, body.liquid-glass-easter-egg .modal-box { background: linear-gradient(145deg, rgba(65,72,88,.58), rgba(31,36,47,.46)); border-color: rgba(255,255,255,.20); }' +
'    body.liquid-glass-easter-egg input[type=text], body.liquid-glass-easter-egg input[type=number], body.liquid-glass-easter-egg input[type=time], body.liquid-glass-easter-egg input[type=datetime-local], body.liquid-glass-easter-egg select, body.liquid-glass-easter-egg .faq-search { background: rgba(52,59,73,.50); color: var(--glass-text); border-color: rgba(255,255,255,.20); }' +
'    body.liquid-glass-easter-egg .back-btn, body.liquid-glass-easter-egg .about-btn, body.liquid-glass-easter-egg .secondary-btn, body.liquid-glass-easter-egg .mode-btn, body.liquid-glass-easter-egg .color-role-btn, body.liquid-glass-easter-egg .service-info-btn { background: rgba(255,255,255,.10); color: var(--glass-text); border-color: rgba(255,255,255,.20); }' +
'    body.liquid-glass-easter-egg .donate-btn { color: #fff; background: linear-gradient(135deg, rgba(145,106,171,.55), rgba(84,116,181,.58), rgba(74,143,126,.48)); border-color: rgba(255,255,255,.25); }' +
'    body.liquid-glass-easter-egg .about-modal-box { background: linear-gradient(145deg, rgba(67,75,92,.70), rgba(28,33,44,.54)); }' +
'    body.liquid-glass-easter-egg .about-ok-btn { color: #f5f7fc; background: linear-gradient(180deg, rgba(93,103,126,.68), rgba(50,57,72,.58)); border-color: rgba(255,255,255,.22); }' +
'    body.liquid-glass-easter-egg input[type=range]::-webkit-slider-runnable-track { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.20); box-shadow: inset 0 1px 3px rgba(0,0,0,.25), 0 2px 8px rgba(0,0,0,.16); }' +
'    body.liquid-glass-easter-egg input[type=range]::-webkit-slider-thumb { background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.92), rgba(177,194,224,.70) 45%, rgba(99,124,171,.66)); border-color: rgba(255,255,255,.34); }' +
'    body.liquid-glass-easter-egg input[type=range]::-moz-range-track { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.20); }' +
'    body.liquid-glass-easter-egg input[type=range]::-moz-range-thumb { background: rgba(177,194,224,.70); border-color: rgba(255,255,255,.34); }' +
'    body.liquid-glass-easter-egg input[type=checkbox] { background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.24); }' +
'    body.liquid-glass-easter-egg input[type=checkbox]:checked { background: linear-gradient(145deg, rgba(113,143,236,.88), rgba(72,102,190,.72)); }' +
'  }' +
'  @keyframes retro-easter-flicker { 0%, 100% { opacity: 1; } 47% { opacity: .96; } 48% { opacity: .78; } 49% { opacity: 1; } }' +
'  @keyframes retro-easter-flash { 0% { filter: brightness(1); transform: scale(1); } 35% { filter: brightness(1.8); transform: scale(1.08); } 100% { filter: brightness(1); transform: scale(1); } }' +
'  .about-logo.retro-easter-flash { animation: retro-easter-flash 420ms steps(3,end); }' +
'  body.retro-easter-egg .about-logo.logo-tap-effect { animation-name: about-logo-retro-tap; animation-duration: 520ms; animation-timing-function: steps(4,end); }' +
'  @keyframes about-logo-retro-tap { 0% { transform: translate(0,0) scale(1); filter: brightness(1); box-shadow: 0 0 0 transparent; } 20% { transform: translate(-2px,1px) scale(1.05); filter: brightness(1.7); box-shadow: 3px 0 0 rgba(67,189,105,.45), -3px 0 0 rgba(67,189,105,.2); } 40% { transform: translate(3px,-1px) scale(.94); filter: brightness(1.9); box-shadow: -3px 0 0 rgba(67,189,105,.5), 3px 0 0 rgba(67,189,105,.18); } 60% { transform: translate(-1px,1px) scale(1.08); filter: brightness(1.35); box-shadow: 0 0 0 4px rgba(67,189,105,.18); } 100% { transform: translate(0,0) scale(1); filter: brightness(1); box-shadow: 0 0 0 transparent; } }' +
'  body.liquid-glass-easter-egg .about-logo.logo-tap-effect { animation-name: about-logo-glass-tap; animation-duration: 650ms; }' +
'  @keyframes about-logo-glass-tap { 0% { transform: scale(1); filter: brightness(1) saturate(1); box-shadow: 0 10px 25px rgba(39,50,75,.15), inset 0 1px 0 rgba(255,255,255,.85); } 35% { transform: scale(1.12); filter: brightness(1.28) saturate(1.25); box-shadow: 0 0 0 7px rgba(255,255,255,.18), 0 18px 36px rgba(88,112,196,.24), inset 0 1px 0 rgba(255,255,255,.98); } 70% { transform: scale(.97); filter: brightness(1.08) saturate(1.1); box-shadow: 0 0 0 14px rgba(255,255,255,.04), 0 12px 28px rgba(88,112,196,.18), inset 0 1px 0 rgba(255,255,255,.9); } 100% { transform: scale(1); filter: brightness(1) saturate(1); box-shadow: 0 10px 25px rgba(39,50,75,.15), inset 0 1px 0 rgba(255,255,255,.85); } }' +
'  body.retro-easter-egg .about-modal-box { animation: retro-easter-flicker 3.8s steps(1,end) infinite, about-modal-in 360ms cubic-bezier(.18,.9,.25,1.15) both; }' +
'  .modal-title { font-weight: 600; font-size: 15px; margin-bottom: 10px; text-align: center; color: var(--text); flex: 0 0 auto; }' +
'  .donate-modal-box { position: relative; animation: donate-modal-in 480ms cubic-bezier(.2,.85,.25,1) both; }' +
'  @keyframes donate-modal-in { from { transform: translateY(28px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }' +
'  .donate-modal-box::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 92px; pointer-events: none; border-radius: 12px 12px 0 0; background: linear-gradient(135deg, rgba(18,22,34,.98), rgba(31,31,46,.96)); opacity: .98; }' +
'  .donate-header { position: relative; overflow: hidden; margin: -16px -16px 13px; padding: 10px 16px 13px; border-bottom: 1px solid var(--border-light); background: linear-gradient(180deg, #171a28 0%, #242333 100%); }' +
'  .donate-header { min-height: 86px; }' +
'  .donate-matrix { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; image-rendering: pixelated; opacity: .9; }' +
'  .donate-header::after { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; background: linear-gradient(180deg, rgba(10,16,12,.15), rgba(10,16,12,.55)); }' +
'  .donate-header-content { position: relative; z-index: 2; text-align: center; }' +
'  .donate-header-title { font-family: monospace; font-size: 19px; font-weight: 800; letter-spacing: .3px; color: #fff; text-shadow: 0 1px 0 rgba(0,0,0,.35); }' +
'  .donate-header-subtitle { margin-top: 3px; font-size: 11px; color: rgba(255,255,255,.72); }' +
'  .hand-editor-diagram { width: 100%; height: auto; display: block; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 10px; flex: 0 0 auto; }' +
'  .hand-editor-diagram:not([src]), .hand-editor-diagram[src=""] { display: none; }' +
'  .modal-scroll-body { overflow-y: auto; flex: 1 1 auto; min-height: 0; }' +
'  .modal-footer { flex: 0 0 auto; }' +
'  .hex-grid { position: relative; width: 260px; height: 255px; margin: 0 auto; }' +
'  .hex-swatch { position: absolute; width: 26px; height: 30px; margin: -15px 0 0 -13px; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); border: 1px solid rgba(0,0,0,0.15); box-sizing: border-box; }' +
'  .hex-swatch.hollow { border: none; background: transparent !important; pointer-events: none; }' +
'  .hex-swatch.selected { border: 2px solid #ff9200; }' +
'  .modal-cancel-btn { width: 100%; padding: 12px; font-size: 14px; font-weight: 600; color: var(--text-strong); background: var(--border-light); border: none; border-radius: 8px; margin-top: 12px; }' +
'  .donate-modal-box { max-height: 90vh; }' +
'  .donate-content { overflow-y: auto; flex: 1 1 auto; min-height: 0; position: relative; z-index: 1; }' +
'  .donate-intro { text-align: center; color: var(--text-muted); font-size: 12px; line-height: 1.45; margin: 0 4px 12px; animation: donate-content-in 500ms 120ms both; }' +
'  @keyframes donate-content-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }' +
'  .donate-method { position: relative; isolation: isolate; border: 2px solid transparent; border-radius: 11px; padding: 12px; margin-top: 10px; background: linear-gradient(var(--card-bg), var(--card-bg)) padding-box, conic-gradient(from 0deg, #ffd6e7, #ffe7b8, #e1f7c9, #ccecff, #ddd0ff, #ffd6e7) border-box; background-size: 100% 100%, 200% 200%; animation: donate-rainbow 5s linear infinite, donate-card-in 550ms both; box-shadow: 0 2px 8px rgba(0,0,0,.06); }' +
'  .donate-method:nth-child(2) { animation-delay: 370ms; }' +
'  .donate-method:nth-child(3) { animation-delay: 670ms; }' +
'  .donate-method:nth-child(4) { animation-delay: 970ms; }' +
'  @keyframes donate-rainbow { to { background-position: 100% 100%, 0% 50%; } }' +
'  @keyframes donate-card-in { from { opacity: 0; transform: translateY(12px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }' +
'  .donate-method-title { font-size: 13px; font-weight: 800; color: var(--text-strong); margin-bottom: 5px; }' +
'  .donate-method-note { font-size: 11px; line-height: 1.35; color: var(--text-muted); margin-bottom: 9px; }' +
'  .donate-paypal { text-align: center; padding: 4px 0 2px; }' +
'  .donate-paypal input[type=image] { max-width: 100%; height: auto; }' +
'  .donate-address { display: block; padding: 8px 9px; border-radius: 6px; background: var(--card-bg); border: 1px solid var(--border-light); color: var(--text); font-family: monospace; font-size: 11px; line-height: 1.35; word-break: break-all; user-select: text; -webkit-user-select: text; }' +
'  .donate-footnote { text-align: center; color: var(--text-faint); font-size: 11px; line-height: 1.4; margin: 12px 6px 2px; }' +
'  .modal-confirm-btn { width: 100%; padding: 12px; font-size: 14px; font-weight: 600; color: #fff; background: #ff9200; border: none; border-radius: 8px; margin-top: 8px; }' +
'  .modal-confirm-btn:active { background: #e08300; }' +
'  .modal-confirm-btn.danger { background: #e03131; }' +
'  .modal-confirm-btn.danger:active { background: #c92a2a; }' +
'  .confirm-image-compare { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 4px 0 12px; }' +
'  .confirm-compare-img { width: 32%; height: auto; display: block; border-radius: 8px; box-sizing: border-box; border: 3px solid; background: #000; }' +
'  .confirm-compare-img.border-red { border-color: #e03131; }' +
'  .confirm-compare-img.border-green { border-color: #2f9e44; }' +
'  .confirm-compare-arrow { font-size: 22px; line-height: 1; color: var(--text-faint); flex-shrink: 0; }' +
'  .example-style-modal-img { max-width: min(50%, 3cm); width: auto; height: auto; margin: 0 auto; border-radius: 8px; display: block; }' +
'  .example-style-modal-title { font-weight: 700; font-size: 16px; margin-top: 10px; text-align: center; color: var(--text-strong); }' +
'  .mode-btn-group { display: flex; width: 100%; margin-top: 6px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); box-sizing: border-box; }' +
'  .primitive-strip { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }' +
'  .primitive-chip { display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 600; border-radius: 10px; line-height: 1.4; }' +
'  .primitive-chip-value { background: var(--btn-bg); color: var(--text-strong); border: 1px solid var(--border); }' +
'  .primitive-chip-label { background: #ff9200; color: #fff; }' +
'  .primitive-chip-icon { background: var(--btn-bg); color: var(--text-faint); border: 1px dashed var(--border); font-style: italic; }' +
'  .primitive-chip-space, .primitive-chip-slash { background: none; color: var(--text-faint); padding: 3px 2px; font-weight: 700; }' +
'  #slotEditModal .modal-box { overflow: hidden; height: 90vh; max-height: 90vh; }' +
'  #slotEditPrimitives { display: none !important; }' +
'  .slot-edit-scroll { flex: 1 1 auto !important; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding-bottom: 8px; }' +
'  .perm-warning { color:#b3261e; background:rgba(224,60,49,0.10); border:1px solid rgba(224,60,49,0.45); border-radius:8px; padding:8px 10px; margin:8px 0; font-size:12.5px; line-height:1.4; }' +
'  .slot-edit-footer { flex: 0 0 auto; padding-top: 10px; border-top: 1px solid var(--border-light); background: var(--card-bg); }' +
'  #slotEditModal .modal-box > * { flex-shrink: 0; }' +
'  .slot-preview { flex: 0 0 auto; background: var(--card-bg); margin: 0 -16px 8px; padding: 0 16px 8px; border-bottom: 1px solid var(--border-light); }' +
'  .slot-preview-canvas { display: block; width: 100%; height: 64px; border-radius: 10px; border: 1px solid var(--border); }' +
'  .slot-preview-info { display: flex; gap: 12px; align-items: center; margin-top: 6px; font-size: 11px; color: var(--text-faint); }' +
'  .slot-preview-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 3px; border: 1px solid var(--border); vertical-align: -2px; margin-right: 4px; }' +
'  .composer-row { display: flex; gap: 6px; margin-top: 8px; align-items: center; flex-wrap: wrap; }' +
'  .composer-btn { padding: 8px 14px; font-size: 14px; font-weight: 600; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 8px; }' +
'  .composer-btn:active { background: var(--border-light); }' +
'  .composer-btn:disabled { opacity: 0.4; }' +
'  .composer-btn-grow { flex: 1; }' +
'  .composer-chip { padding: 5px 9px; font-size: 12px; font-weight: 600; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 10px; cursor: grab; }' +
'  .composer-chip.selected { background: #ff9200; color: #fff; border-color: #ff9200; box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }' +
'  .composer-error { color: #d00; font-size: 13px; font-weight: 600; margin-top: 6px; }' +
'  .composer-count { font-size: 12px; color: var(--text-faint); margin-left: auto; }' +
'  .category-btn-group { display: flex; flex-wrap: wrap; margin-top: 6px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }' +
'  .category-btn { width: 35px; height: 35px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; padding: 0; box-sizing: border-box; background: var(--btn-bg); border: none; border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); border-radius: 0; margin: 0; color: var(--text-strong); }' +
'  .category-btn:last-child { border-right: none; }' +
'  .category-btn.active { background: #ff9200; border-color: #ff9200; color: #fff; }' +
'  .category-btn svg { width: 21px; height: 21px; pointer-events: none; }' +
'  .font-category-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; flex: 0 0 auto; margin: 0 -16px 10px; padding: 0 16px; scrollbar-width: none; }' +
'  .font-category-scroll::-webkit-scrollbar { display: none; }' +
'  .font-category-row { display: flex; width: max-content; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }' +
'  .font-category-btn { flex: 0 0 auto; padding: 8px 14px; font-size: 12px; font-weight: 600; white-space: nowrap; background: var(--btn-bg); border: none; border-right: 1px solid var(--border); color: var(--text-strong); }' +
'  .font-category-btn:last-child { border-right: none; }' +
'  .font-category-btn.active { background: #ff9200; border-color: #ff9200; color: #fff; }' +
'  .mode-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 8px 0 10px; font-size: 12px; font-weight: 700; color: var(--text-strong); background: var(--btn-bg); border: none; border-right: 1px solid var(--border); }' +
'  .mode-btn svg { width: 23px; height: 26px; display: block; }' +
'  .mode-btn:last-child { border-right: none; }' +
'  .mode-btn.active { background: #ff9200; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }' +
'  .mode-btn-group-vertical { display: flex; flex-direction: column; width: 100%; margin-top: 6px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); box-sizing: border-box; }' +
'  .mode-btn-vertical { display: block; width: 100%; text-align: left; padding: 10px 12px; font-size: 13px; font-weight: 700; color: var(--text-strong); background: var(--btn-bg); border: none; border-bottom: 1px solid var(--border); box-sizing: border-box; }' +
'  .mode-btn-vertical:last-child { border-bottom: none; }' +
'  .mode-btn-vertical.active { background: #ff9200; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }' +
'  .day-toggle-group { display: flex; width: 100%; margin-top: 6px; border-radius: 6px; overflow: hidden; border: 1px solid var(--border); box-sizing: border-box; }' +
'  .day-toggle-btn { flex: 1; padding: 10px 0; font-size: 13px; font-weight: 700; color: var(--text-strong); background: var(--btn-bg); border: none; border-right: 1px solid var(--border); }' +
'  .day-toggle-btn:last-child { border-right: none; }' +
'  .day-toggle-btn.active { background: #ff9200; color: #fff; box-shadow: inset 0 2px 4px rgba(0,0,0,0.35); }' +
'  .slider-row { margin-top: 12px; }' +
'  .slider-row label { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-faint2); margin-bottom: 2px; }' +
'  .slider-row label .val { font-weight: 700; color: var(--text-strong); }' +
'  input[type=range] { width: 100%; -webkit-appearance: none; appearance: none; height: 30px; background: transparent; margin: 0; }' +
'  input[type=range]::-webkit-slider-runnable-track { height: 6px; border-radius: 3px; background: var(--border-lighter); }' +
'  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #ff9200; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.4); margin-top: -9px; }' +
'  input[type=range]::-moz-range-track { height: 6px; border-radius: 3px; background: var(--border-lighter); }' +
'  input[type=range]::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #ff9200; border: 2px solid #fff; }' +
'  .mark-btn-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 6px; }' +
'  .mark-btn { padding: 8px 0; font-size: 12px; font-weight: 700; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 6px; }' +
'  .mark-btn.active { background: #ff9200; color: #fff; border-color: #ff9200; }' +
'  .raw-log-btn-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; margin-top: 6px; }' +
'  .raw-log-btn { padding: 8px 2px; font-size: 11px; font-weight: 600; font-family: monospace; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 6px; }' +
'  .raw-log-btn.active { background: #ff9200; color: #fff; border-color: #ff9200; }' +
'  .preset-btn-row { display: flex; gap: 6px; margin-top: 8px; }' +
'  .preset-btn-row button { flex: 1; padding: 8px 0; font-size: 11px; font-weight: 700; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 6px; }' +
'  .marker-edit-btn { width: 100%; box-sizing: border-box; padding: 12px; font-size: 14px; font-weight: 600; color: var(--text-strong); background: var(--btn-bg); border: 1px solid var(--border); border-radius: 8px; margin-top: 8px; text-align: left; }' +
'  .marker-edit-btn:disabled { opacity: 0.45; }' +
'  .section-legend { cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; margin: 0; padding: 4px 0; user-select: none; color: var(--text-strong); }' +
'  .section-icon { width: 30px; height: 30px; border-radius: 8px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.25); }' +
'  .section-icon svg { width: 17px; height: 17px; display: block; }' +
'  @keyframes sectionIconSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }' +
'  .section-icon-animated svg { animation: sectionIconSpin 2.2s linear infinite; transform-origin: 50% 50%; }' +
'  .section-legend-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; justify-content: center; }' +
'  .section-legend-title { font-size: 15px; font-weight: 700; line-height: 1.15; }' +
'  .section-legend-sub { font-size: 11.2px; line-height: 1.25; color: var(--text-faint); margin-top: 1px; min-width: 0; white-space: nowrap; overflow: hidden; position: relative; }' +
'  .subsection-legend { cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%; box-sizing: border-box; margin: 12px 0 0; padding: 8px; border: 1px solid var(--border); border-radius: 8px; background: var(--btn-bg); user-select: none; color: var(--text-strong); }' +
'  .subsection-legend-preview { width: 34px; height: 34px; border-radius: 6px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--card-bg); border: 1px solid var(--border-light); }' +
'  .subsection-legend-preview img { max-width: 100%; max-height: 100%; display: block; }' +
'  .subsection-legend-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; justify-content: center; }' +
'  .subsection-legend-title { font-size: 14px; font-weight: 700; line-height: 1.15; }' +
'  .subsection-legend-sub { font-size: 11px; line-height: 1.25; color: var(--text-faint); margin-top: 1px; min-width: 0; white-space: nowrap; overflow: hidden; position: relative; }' +
'  .subsection-body { border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; padding: 10px 8px 4px; margin-top: -1px; margin-bottom: 4px; }' +
'  .subhead-sub-inner { display: inline-block; white-space: nowrap; }' +
'  .subhead-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-left: 3px; border: 1px solid rgba(0,0,0,0.25); vertical-align: middle; }' +
'  .chevron { display: inline-block; flex: 0 0 auto; font-size: 24px; line-height: 1; transition: transform 0.15s; }' +
'  .chevron.open { transform: rotate(90deg); }' +
'  .slider-with-buttons { display: flex; align-items: center; gap: 8px; }' +
'  .slider-with-buttons input[type=range] { flex: 1; }' +
'  .slider-step-btn { width: 34px; height: 34px; flex-shrink: 0; border-radius: 8px; background: var(--btn-bg); border: 1px solid var(--border); font-size: 20px; font-weight: 700; color: var(--text-strong); line-height: 1; }' +
'  .grayed-out { opacity: 0.4; pointer-events: none; }' +
'  #slotPickerDiagram { position: relative; width: 240px; height: 274px; margin: 10px auto; background: linear-gradient(to bottom, #4a90d9, #bfe3f5); border-radius: 8px; overflow: hidden; }' +
'  .slot-btn { position: absolute; min-width: 54px; padding: 5px 8px; font-size: 11px; font-weight: 700; color: #222; background: rgba(255,255,255,0.85); border: 1px solid rgba(0,0,0,0.2); border-radius: 6px; text-align: center; }' +
'  .slot-btn:active { background: #fff; }' +
'  .slot-btn.slot-off { color: #777; font-weight: 400; }' +
'  .slot-btn.slot-shake { border: 2px dashed #e07a00; padding: 4px 7px; }' +
'  .slot-legend { margin: 8px 2px 0; font-size: 12px; line-height: 1.4; color: var(--text-muted); }' +
'  .slot-legend .slot-legend-sample { display: inline-block; padding: 0 5px; border: 2px dashed #e07a00; border-radius: 5px; font-weight: 700; color: var(--text); }' +
'  .slot-btn.slot-na { color: #aaa; background: rgba(230,230,230,0.7); font-style: italic; pointer-events: none; }' +
'  .slot-corner-tl { left: 6px; top: 6px; }' +
'  .slot-corner-tr { right: 6px; top: 6px; }' +
'  .slot-corner-bl { left: 6px; bottom: 6px; }' +
'  .slot-corner-br { right: 6px; bottom: 6px; }' +
'  .slot-upper-l1 { left: 50%; top: 34px; transform: translateX(-50%); }' +
'  .slot-upper-l2 { left: 50%; top: 62px; transform: translateX(-50%); }' +
'  .slot-bottom-l1 { left: 50%; bottom: 62px; transform: translateX(-50%); }' +
'  .slot-bottom-l2 { left: 50%; bottom: 34px; transform: translateX(-50%); }' +
'  .slot-middle-left-l1 { left: 6px; top: calc(50% - 15px); transform: translateY(-50%); }' +
'  .slot-middle-left-l2 { left: 6px; top: calc(50% + 15px); transform: translateY(-50%); }' +
'  .slot-middle-right-l1 { right: 6px; top: calc(50% - 15px); transform: translateY(-50%); }' +
'  .slot-middle-right-l2 { right: 6px; top: calc(50% + 15px); transform: translateY(-50%); }' +
    configBackground.backgroundCss() +
    configBorder.borderCss() +
'</style></head>' +
'<body>' +

'<div id="startupLoader" aria-live="polite">' +
'  <div id="startupLoaderTitle">Loading Modern</div>' +
'  <div id="startupLoaderSubtitle">Preparing the watchface preview…</div>' +
'  <div id="startupProgressTrack"><div id="startupProgressBar"></div></div>' +
'  <div id="startupProgressPercent">0%</div>' +
'</div>' +

'<div id="topBar">' +
'  <div class="top-bar-left">' +
'    <div class="top-bar-actions">' +
(current.liveMode ? '' : '      <button type="button" class="back-btn" onclick="goBack()">&lsaquo; Back</button>') +
'      <button type="button" class="donate-btn" onclick="openDonateModal()">&#9825; Donate</button>' +
'      <button type="button" class="about-btn" id="aboutButton" onclick="openAboutModal(this)" aria-label="About Modern" title="About Modern">' + aboutLogoMarkup('about-btn-logo', ' aria-hidden="true" focusable="false"') + '</button>' +
'    </div>' +
(current.liveMode ? '' : '    <div class="top-bar-title">Modern Watchface' + (platform.bw ? '' : ' Preview') + '</div>') +
((platform.bw || current.liveMode) ? '' : '    <div class="top-bar-desc">Look, this preview—it’s very good, believe me, but it’s not 100% perfect yet. Nobody knows watch screens better than me, and right now, it’s not reflecting 1:1. We have a couple of tiny bugs, very small bugs, highly overrated bugs that are hard to fix, frankly. But I’m working on it hard, harder than anyone else, total dedication! Many people are saying it’s already the best preview they’ve ever seen. Thank you for your attention to this matter!</div>') +
'  </div>' +
'  <div class="top-bar-preview">' +
'    <canvas id="previewCanvas" width="176" height="' + Math.round(176 * platform.h / platform.w) + '"></canvas>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="aboutModal" onclick="if (event.target === this) closeAboutModal();">' +
'  <div class="modal-box about-modal-box">' +
'    ' + aboutLogoMarkup('about-logo', ' id="aboutEasterEggLogo" role="img" aria-label="Modern logo" onclick="tapAboutLogo()" title="Modern"') +
'    <div class="about-title">Modern</div>' +
'    <div class="about-subtitle">Modern analog watchface for Pebble</div>' +
'    <div class="about-info">' +
'      <div class="about-info-row"><div class="about-info-label">Version</div><div class="about-info-value">' + APP_VERSION + '</div></div>' +
'      <div class="about-info-row"><div class="about-info-label">Creator</div><div class="about-info-value">Łukasz Zalewski</div></div>' +
'      <div class="about-info-row"><div class="about-info-label">Platform</div><div class="about-info-value">Pebble Time 2 / Emery</div></div>' +
'    </div>' +
'    <div class="about-description">Find out more about the project on github, feel free to contribute as well.</div>' +
'    <a class="about-source" href="#" onclick="event.preventDefault(); Pebble.openUrl(\'https://github.com/zalewszczak/pebble-modern-watchface\'); return false;">Source code on GitHub</a>' +
'    <button type="button" class="about-ok-btn" onclick="closeAboutModal()">OK</button>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="slotEditModal" onclick="if (event.target === this) closeSlotEditor();">' +
'  <div class="modal-box">' +
'    <div class="modal-title" id="slotEditTitle" style="display:none;">Edit slot</div>' +
'    <div class="slot-preview" id="slotEditPreviewWrap">' +
'      <canvas id="slotEditPreviewCanvas" class="slot-preview-canvas"></canvas>' +
'    </div>' +
'    <div class="slot-edit-scroll" id="slotEditScroll">' +
'    <div class="mode-btn-group" id="slotEditKindGroup" style="margin-top:2px;">' +
'      <button type="button" class="mode-btn" onclick="slotEditSetOff()">OFF</button>' +
'      <button type="button" class="mode-btn" onclick="slotEditSetKind(false)">PREDEFINED</button>' +
'      <button type="button" class="mode-btn" onclick="slotEditSetKind(true)">CUSTOM</button>' +
'    </div>' +
'    <input type="checkbox" id="slotEditCustomPrimsToggle" style="display:none;">' +
'    <div id="slotEditPrebuiltBlock">' +
'    <label>Category</label>' +
'    <div class="category-btn-group" id="slotEditCategoryGroup"></div>' +
'    <input type="hidden" id="slotEditCategory">' +
'    <label for="slotEditContent" style="margin-top:10px;">Content</label>' +
'    <select id="slotEditContent" onchange="onSlotEditContentChange()">' + cornerContentOptionsHtml(0) + '</select>' +
'    <div class="primitive-strip" id="slotEditPrimitives" style="display:none !important;"></div>' +
'    <div class="perm-warning" id="slotEditPermWarn" style="display:none;"></div>' +
'    <div class="help" id="slotEditCategoryHelp" style="display:none;">Shows the time-zone option used for the selected location. Daylight saving rules may vary by location.</div>' +
'    </div>' +
'    <div id="slotEditCustomPrimsSection" style="display:none;">' +
'      <div id="slotEditCustomPrimsBody" style="display:none;">' +
'        <div class="primitive-strip" id="composerStrip"></div>' +
'        <div class="help" id="composerEmpty" style="display:none;">Nothing here yet. Use the palette below.</div>' +
'        <div class="composer-row">' +
'          <button type="button" class="composer-btn composer-btn-grow" id="composerLeft" onclick="composerMove(-1)">&larr;</button>' +
'          <button type="button" class="composer-btn composer-btn-grow" id="composerDelete" onclick="composerDelete()">Delete</button>' +
'          <button type="button" class="composer-btn composer-btn-grow" id="composerRight" onclick="composerMove(1)">&rarr;</button>' +
'          <span class="composer-count" id="composerCount"></span>' +
'        </div>' +
'        <div class="composer-row" id="composerSelZoneRow" style="display:none;">' +
'          <label style="margin:0; flex:1 1 100%;" id="composerSelZoneLabel">Zone for selected</label>' +
'          <select id="composerSelZone" onchange="composerOnSelZoneChange()" style="flex:1 1 100%;"></select>' +
'        </div>' +
'        <div class="composer-row" id="composerSelTextRow" style="display:none;">' +
'          <label style="margin:0; flex:1 1 100%;">Text for selected</label>' +
'          <input type="text" id="composerSelText" maxlength="15" oninput="composerOnSelTextInput()" style="flex:1 1 100%;">' +
'        </div>' +
'        <label style="margin-top:12px;">Add from palette</label>' +
'        <div class="composer-row" style="margin-top:4px;">' +
'          <select id="composerAddGroup" onchange="composerOnAddGroupChange()" style="flex:1;"></select>' +
'          <select id="composerAddItem" onchange="composerUpdateAddZoneVisibility()" style="flex:2;"></select>' +
'        </div>' +
'        <div class="composer-row" id="composerAddZoneRow" style="display:none;">' +
'          <label style="margin:0; flex:1 1 100%;" id="composerAddZoneLabel">Zone</label>' +
'          <select id="composerAddZone" style="flex:1 1 100%;"></select>' +
'        </div>' +
'        <div class="composer-row" id="composerAddTextRow" style="display:none;">' +
'          <label style="margin:0; flex:1 1 100%;">Text</label>' +
'          <input type="text" id="composerAddText" maxlength="15" placeholder="e.g. H, L, UV (15 characters max)" style="flex:1 1 100%;">' +
'        </div>' +
'        <div class="composer-row">' +
'          <button type="button" class="composer-btn composer-btn-grow" onclick="composerAddFromPalette()">Add element</button>' +
'        </div>' +
'        <div class="composer-error" id="composerError" style="display:none;"></div>' +
'      </div>' +
'    </div>' +
'    <div class="mode-btn-group" id="slotEditColorGroup" style="margin-top:14px;">' +
'      <button type="button" class="mode-btn" onclick="slotEditorSelectColor(0)">MONO</button>' +
'      <button type="button" class="mode-btn" style="' + (platform.bw ? 'display:none;' : '') + '" onclick="slotEditorSelectColor(1)">ACC</button>' +
'      <button type="button" class="mode-btn" onclick="slotEditorSelectColor(2)">PILL</button>' +
'      <button type="button" class="mode-btn" style="' + (platform.bw ? 'display:none;' : '') + '" onclick="slotEditorSelectColor(3)">COLOR</button>' +
'    </div>' +
(platform.bw ? '    <div class="help"><b>MONO</b> = plain text, <b>PILL</b> = solid capsule behind the text in the inverted color.</div>' :
'    <div class="help"><b>MONO</b> = your main color, <b>ACC</b> = accent color, <b>PILL</b> = solid background-color capsule behind main-color content, <b>COLOR</b> = dynamic (changes with the value shown).</div>') +
'    <div class="checkbox-row" style="margin-top:12px;">' +
'      <input type="checkbox" id="slotEditShake">' +
'      <label for="slotEditShake" style="margin:0;">Show only when the watch is shaken</label>' +
'    </div>' +
'    <div class="checkbox-row" id="slotEditOddRow" style="margin-top:8px; display:none;">' +
'      <input type="checkbox" id="slotEditOdd" onchange="renderSlotEditPreview()">' +
'      <label for="slotEditOdd" style="margin:0;">Show only in odd state</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-slotEditOdd\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-slotEditOdd" style="display:none;">The icon appears only when something needs your attention, and leaves empty space otherwise: <b>Battery</b> when the charge drops below 20%, <b>Bluetooth</b> when the connection to your phone is lost, <b>Quiet Time</b> while it is switched on. In combinations, every icon that has no % or ON/OFF text beside it behaves this way.</div>' +
'    </div>' +
'    <div class="slot-edit-footer">' +
'      <button type="button" onclick="saveSlotEditor()" style="width:100%; box-sizing:border-box; padding:14px; font-size:16px; font-weight:600; color:#fff; background:#ff9200; border:none; border-radius:8px;">OK</button>' +
'      <button type="button" class="modal-cancel-btn" onclick="closeSlotEditor()" style="margin-top:8px;">Cancel</button>' +
'    </div>' +
'  </div>' +
'</div>' +

customMarkerModalHtml('hour', 'Edit hour indices', 20) +
customMarkerModalHtml('sec', 'Edit seconds indices', 10) +
textMarkerModalHtml(current) +
configBackground.backgroundModalHtml() +

handEditorModalHtml('hour', 'Edit hour hand') +
handEditorModalHtml('min', 'Edit minute hand') +
handEditorModalHtml('sec', 'Edit second hand') +

'<div class="modal-overlay" id="handStyleModal" onclick="if (event.target === this) closeHandStyleModal();">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Hand style</div>' +
'    <div class="modal-scroll-body">' +
'      <div class="style-picker-grid" id="handStyleGrid"></div>' +
'      <button type="button" class="style-picker-custom-btn" onclick="chooseHandStyleCustom()">Custom</button>' +
'    </div>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="markerStyleModal" onclick="if (event.target === this) closeMarkerStyleModal();">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Hour/seconds indices style</div>' +
'    <div class="modal-scroll-body">' +
'      <div class="style-picker-grid" id="markerStyleGrid"></div>' +
'    </div>' +
'    <div style="flex: 0 0 auto;">' +
'      <button type="button" class="style-picker-custom-btn" onclick="chooseMarkerStyleCustom()">Custom</button>' +
'      <button type="button" class="style-picker-custom-btn style-picker-none-btn" onclick="chooseMarkerStyle(\'0\')">None</button>' +
'    </div>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="centerCircleModal" onclick="if (event.target === this) closeCenterCircleEditor();">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Center circle</div>' +

'    <div class="slider-row">' +
'      <label for="centerCircleRadius">Radius <span class="val" id="centerCircleRadiusVal">' + esc(current.centerCircleRadius || '3') + 'px</span></label>' +
'    <div class="slider-with-buttons">' +
'    <button type="button" class="slider-step-btn" onclick="stepSlider(\'centerCircleRadius\', -1)">&minus;</button>' +
'      <input type="range" id="centerCircleRadius" min="0" max="30" step="1" value="' + esc(current.centerCircleRadius || '3') + '" oninput="document.getElementById(\'centerCircleRadiusVal\').textContent = this.value + \'px\'; refreshEditButtonLabels();">' +
'    <button type="button" class="slider-step-btn" onclick="stepSlider(\'centerCircleRadius\', 1)">+</button>' +
'    </div>' +
'    </div>' +
'    <div class="help">Set the radius to 0 to hide the center circle.</div>' +
'    <label for="centerCircleColor">Color</label>' +
'    <select id="centerCircleColor">' + schemeColorOptionsHtml(current.centerCircleColor) + '</select>' +
'    <label for="centerCircleOutline" style="margin-top:10px;">Outline</label>' +
'    <select id="centerCircleOutline" onchange="updatePreview()"><option value="off"' + ((current.centerCircleOutline || 'off') === 'off' ? ' selected' : '') + '>No outline</option>' +
       schemeColorOptionsHtml(current.centerCircleOutline).replace(/>(Main|Accent|Background) color</g, '>$1 color outline<') + '</select>' +
'    <div class="help">An outline around the center circle, drawn the same way as hand outlines (thicker with the thick outline setting).</div>' +

'    <button type="button" class="modal-cancel-btn" onclick="closeCenterCircleEditor()" style="margin-top:14px;">Close</button>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="shadowStyleModal" onclick="if (event.target === this) closeShadowStyleEditor();">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Shadow style</div>' +

'    <label>Shadow style</label>' +
      modeButtonGroupHtml('shadowTranslucentGroup', 'shadowTranslucent', [
        { value: 'false', label: 'Solid' },
        { value: 'true', label: 'Translucent' }
      ], current.shadowTranslucent !== 'false' ? 'true' : 'false', 'selectShadowTranslucent') +
'    <div class="help">Applies the selected shadow style to all analog hands. Translucent uses dithering to make the shadow lighter.</div>' +

'    <div class="slider-row">' +
'      <label for="shadowAngle">Shadow angle <span class="val" id="shadowAngleVal">' + (current.shadowAngle || '120') + '&deg;</span></label>' +
'      <div class="slider-with-buttons">' +
'      <button type="button" class="slider-step-btn" onclick="stepSlider(\'shadowAngle\', -1)">&minus;</button>' +
'      <input type="range" id="shadowAngle" min="0" max="359" step="1" value="' + (current.shadowAngle || '120') + '" oninput="onShadowAngleInput()">' +
'      <button type="button" class="slider-step-btn" onclick="stepSlider(\'shadowAngle\', 1)">+</button>' +
'      </div>' +
'    </div>' +
'    <div class="help">Sets the direction of the shadow for all analog hands.</div>' +

'    <button type="button" class="modal-cancel-btn" onclick="closeShadowStyleEditor()" style="margin-top:14px;">Close</button>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="fontPickerModal" onclick="if (event.target === this) closeFontPicker();">' +
'  <div class="modal-box">' +
'    <div class="modal-title" id="fontPickerTitle">Font</div>' +
'    <div class="font-category-scroll"><div class="font-category-row" id="fontPickerCategoryRow"></div></div>' +
'    <div class="modal-scroll-body">' +
'      <div id="fontPickerGrid"></div>' +
'      <div class="help" id="fontPickerEmptyMsg" style="display:none; text-align:center; margin-top:16px;">No fonts match these filters -- remove some to see results.</div>' +
'      <button type="button" id="fontPickerResetFiltersBtn" class="secondary-btn" style="display:none; width:auto; margin:10px auto 0; padding:10px 16px;" onclick="resetFontCategoryFilters()">Reset filters</button>' +
'    </div>' +
'    <div class="modal-footer">' +
'      <div class="checkbox-row" id="fontPickerIncompatibleRow" style="margin-top:10px;">' +
'        <input type="checkbox" id="fontPickerShowIncompatible" onchange="renderFontPickerGrid()">' +
'        <label for="fontPickerShowIncompatible" style="margin:0;">Show incompatible fonts</label>' +
'      </div>' +
'      <button type="button" class="modal-cancel-btn" onclick="closeFontPicker()">Cancel</button>' +
'    </div>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="handStyleIconPickerModal" onclick="if (event.target === this) closeHandStyleIconPicker();">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Shape</div>' +
'    <div class="modal-scroll-body" id="handStyleIconPickerGrid"></div>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="weatherIconStylePickerModal" onclick="if (event.target === this) closeWeatherIconStylePicker();">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Icons style</div>' +
'    <div class="modal-scroll-body" id="weatherIconStylePickerGrid"></div>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="donateModal">' +
'  <div class="modal-box donate-modal-box">' +
'    <div class="donate-header">' +
'      <canvas class="donate-matrix" id="donateMatrix" aria-hidden="true"></canvas>' +
'      <div class="donate-header-content"><div class="donate-header-title">Support Modern</div><div class="donate-header-subtitle">Keep the pixels dropping</div></div>' +
'    </div>' +
'    <div class="donate-content">' +
'      <div class="donate-intro">Modern is a little passion project that spiraled out of control and ended up being this monster of configuration options and data sources for your wrist. If you enjoy using it and would like to help keep the project going, a small donation is very much appreciated. Thank you! ♥</div>' +
'      <div class="donate-method">' +
'        <div class="donate-method-title">PayPal</div>' +
'        <div class="donate-method-note">The easiest option. FYI: payments below ~1USD are swallowed by transaction fees and I recieve nothing. ¯\_(ツ)_/¯</div>' +
'        <div class="donate-paypal">' +
'          <p style="margin-top:24px;font-size:13px;opacity:.7">' +
'            <a href="#" onclick="event.preventDefault(); Pebble.openUrl(\'https://www.paypal.com/donate/?hosted_button_id=D3C427GK2PGE8\'); return false;" ' +
'            style="display:inline-block;background:#FFC439;color:#003087;' +
'            padding:11px 25px;border-radius:5px;text-decoration:none;' +
'            font-family:Arial,sans-serif;font-size:16px;font-weight:bold;' +
'            box-shadow:0 2px 4px rgba(0,0,0,.2);">' +
'            <b>Pay</b><span style="color:#009cde;font-weight:bold;">Pal</span>' +
'             Donate' +
'            </a>' +
'          </p>' +
'        </div>' +
'      </div>' +
'      <div class="donate-method">' +
'        <div class="donate-method-title">Bitcoin</div>' +
'        <div class="donate-method-note">If you prefer crypto, you can send BTC directly to this address:</div>' +
'        <div class="donate-address">1DAvDGQCXJtL2SHPz47QUjaSXBXLSXwThJ</div>' +
'      </div>' +
'      <div class="donate-method">' +
'        <div class="donate-method-title">Coinbase</div>' +
'        <div class="donate-method-note">You can also send supported coins through Coinbase to:</div>' +
'        <div class="donate-address">zalewszczak@gmail.com</div>' +
'      </div>' +
'      <div class="donate-footnote">Every contribution goes back into the project — with a little help for beer or Pebble Round 2 (whichever goal gets hit first). Cheers! 🍻</div>' +
'    </div>' +
'    <button type="button" class="modal-cancel-btn" onclick="closeDonateModal()">Close</button>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="confirmModal" onclick="if (event.target === this) closeConfirmModal();">' +
'  <div class="modal-box">' +
'    <div class="modal-title" id="confirmModalTitle"></div>' +
'    <div class="confirm-image-compare" id="confirmImageCompare" style="display:none;">' +
'      <img class="confirm-compare-img border-red" id="confirmImageLeft" alt="">' +
'      <span class="confirm-compare-arrow" id="confirmImageArrow">&#8594;</span>' +
'      <img class="confirm-compare-img border-green" id="confirmImageRight" alt="">' +
'    </div>' +
'    <div class="help" id="confirmModalMessage" style="text-align:center;"></div>' +
'    <button type="button" class="modal-confirm-btn" id="confirmModalYesBtn" onclick="confirmModalYes()">Confirm</button>' +
'    <button type="button" class="modal-cancel-btn" onclick="closeConfirmModal()">Cancel</button>' +
'  </div>' +
'</div>' +

configPresetSchedule.modalHtml +

'<div class="modal-overlay" id="serviceLogModal" onclick="if (event.target === this) closeServiceLogModal();">' +
'  <div class="modal-box">' +
'    <div class="modal-title" id="serviceLogModalTitle"></div>' +
'    <div class="modal-scroll-body" id="serviceLogModalBody"></div>' +
'    <button type="button" class="modal-cancel-btn" onclick="closeServiceLogModal()">Close</button>' +
'  </div>' +
'</div>' +

'<div class="modal-overlay" id="exampleStyleModal" onclick="if (event.target === this) closeExampleStyleModal();">' +
'  <div class="modal-box">' +
'    <img class="example-style-modal-img" id="exampleStyleModalImg" src="" alt="">' +
'    <div class="example-style-modal-title" id="exampleStyleModalTitle"></div>' +
'    <div class="help" id="exampleStyleModalDesc" style="text-align:center;"></div>' +
'    <button type="button" class="modal-confirm-btn" id="exampleStyleModalApplyBtn" onclick="confirmExampleStyleApply()">Apply this style</button>' +
'    <button type="button" class="modal-cancel-btn" onclick="closeExampleStyleModal()">Cancel</button>' +
'  </div>' +
'</div>' +

'  <fieldset>' +
    sectionLegendHtml('examples', 'Example styles') +
'    <div class="section-body" id="section-examples" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="help section-intro" onclick="toggleSectionIntro(this)">Tap a design below to preview it -- each one sets every Style, Colors, and Complications setting to match once you confirm, the same as pasting its JSON into "Style Presets" further down.</div>' +
'    <div class="example-style-grid">' + exampleStylesButtonsHtml + '</div>' +
'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('style', 'Style') +
'    <div class="section-body" id="section-style" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div id="showSecondsRow">' +
'    <div class="checkbox-row subsection">' +
'      <input type="checkbox" id="showSeconds" ' + secondsChecked + ' onchange="onShowSecondsChange()">' +
'      <label for="showSeconds" style="margin:0;">Show second hand</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-showSeconds\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-showSeconds" style="display:none;">Adds a second hand to the analog face.</div>' +
'    </div>' +

'    <div id="bigAnalogSettings" class="subsection">' +

      subsectionLegendHtml('hands', 'Hands style') +
'      <div class="subsection-body" id="subsec-hands" style="display:none;">' +
'      <div class="field-label-row"><label>Hand style</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-handStyle\')">?</button></div>' +
'      <button type="button" class="marker-edit-btn" id="handStyleTriggerBtn" style="margin-top:8px;" onclick="openHandStyleModal()">Hand style: <span id="handStyleTriggerLabel"></span> &rsaquo;</button>' +
'      <div class="help" id="help-handStyle" style="display:none;">Choose the shape of the analog hands. Custom lets you edit each hand.</div>' +

'      <div id="customHandSection">' +
'        <button type="button" class="marker-edit-btn" onclick="openHandEditor(\'hour\')">Edit hour hand: <span id="handHourStatusLabel"></span> &rsaquo;</button>' +
'        <button type="button" class="marker-edit-btn" onclick="openHandEditor(\'min\')">Edit minute hand: <span id="handMinStatusLabel"></span> &rsaquo;</button>' +
'        <button type="button" class="marker-edit-btn" id="editSecHandBtn" ' + (secondsChecked ? '' : 'disabled') + ' onclick="openHandEditor(\'sec\')">Edit second hand: <span id="handSecStatusLabel"></span> &rsaquo;</button>' +
'        <button type="button" class="marker-edit-btn" onclick="openCenterCircleEditor()">Edit center circle: <span id="centerCircleStatusLabel"></span> &rsaquo;</button>' +
          handHiddenInputsHtml(current) +
'      </div>' +
'      <button type="button" class="marker-edit-btn" id="shadowStyleTriggerBtn" onclick="openShadowStyleEditor()">Edit shadow style: <span id="shadowStyleStatusLabel"></span> &rsaquo;</button>' +
'      </div>' +

      subsectionLegendHtml('indices', 'Indices style') +
'      <div class="subsection-body" id="subsec-indices" style="display:none;">' +
'      <div class="field-label-row"><label>Hour/seconds indices style</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-indicesStyle\')">?</button></div>' +
'      <button type="button" class="marker-edit-btn" id="markerStyleTriggerBtn" style="margin-top:8px;" onclick="openMarkerStyleModal()">Indices style: <span id="markerStyleTriggerLabel"></span> &rsaquo;</button>' +
'      <select id="bigAnalogMarkerStyle" style="display:none;" onchange="onMarkerStyleChange()">' +
'        <option value="10"' + (current.bigAnalogMarkerStyle === '10' ? ' selected' : '') + '>Minimal (thin hour indices only)</option>' +
'        <option value="9"' + (current.bigAnalogMarkerStyle === '9' ? ' selected' : '') + '>Classy</option>' +
'        <option value="0"' + (current.bigAnalogMarkerStyle === '0' ? ' selected' : '') + '>None</option>' +
'        <option value="1"' + (current.bigAnalogMarkerStyle === '1' ? ' selected' : '') + '>Braun</option>' +
'        <option value="2"' + (current.bigAnalogMarkerStyle === '2' ? ' selected' : '') + '>Swiss</option>' +
'        <option value="3"' + (current.bigAnalogMarkerStyle === '3' || !current.bigAnalogMarkerStyle ? ' selected' : '') + '>Modern</option>' +
'        <option value="4"' + (current.bigAnalogMarkerStyle === '4' ? ' selected' : '') + '>' + markerTitle('4', 'Shadow') + '</option>' +
'        <option value="5"' + (current.bigAnalogMarkerStyle === '5' ? ' selected' : '') + '>Tally</option>' +
'        <option value="6"' + (current.bigAnalogMarkerStyle === '6' ? ' selected' : '') + '>Bell</option>' +
'        <option value="7"' + (current.bigAnalogMarkerStyle === '7' ? ' selected' : '') + '>Fancy</option>' +
'        <option value="8"' + (current.bigAnalogMarkerStyle === '8' ? ' selected' : '') + '>Custom</option>' +
        MARKER_VARIANT_STYLES.map(function (s) { return '<option value="' + s.value + '"' + (current.bigAnalogMarkerStyle === s.value ? ' selected' : '') + '>' + s.title + '</option>'; }).join('') +
'      </select>' +
'      <div class="checkbox-row" id="bitmapMarkerTransparentRow" style="margin-top:12px;' + (isBitmapMarkerStyle ? '' : ' display:none;') + '">' +
'        <input type="checkbox" id="bitmapMarkerTransparent" ' + (current.bitmapMarkerTransparent ? 'checked' : '') + ' onchange="onBitmapMarkerTransparentChange()">' +
'        <label for="bitmapMarkerTransparent" style="margin:0;">Semi transparent markers (see the background through them)</label>' +
'      </div>' +
'      <div class="checkbox-row" id="bitmapMarkerInvertRow" style="margin-top:8px;' + (isBitmapMarkerStyle && !platform.bw ? '' : ' display:none;') + '">' +
'        <input type="checkbox" id="bitmapMarkerInvert" ' + (current.bitmapMarkerInvert && !platform.bw ? 'checked' : '') + ' onchange="updatePreview()">' +
'        <label for="bitmapMarkerInvert" style="margin:0;">Inverted blend (markers turn black or white for contrast with the background)</label>' +
'      </div>' +
'      <div class="help" id="help-indicesStyle" style="display:none;">Choose the hour/second markers around the analog face. Custom lets you edit them.</div>' +

'      <div id="customMarkerSection" style="' + (current.bigAnalogMarkerStyle === '8' ? '' : 'display:none;') + '">' +
'        <button type="button" class="marker-edit-btn" onclick="openCustomMarkerEditor(\'hour\')">Edit hour indices: <span id="cmHourStatusLabel"></span> &rsaquo;</button>' +
'        <button type="button" class="marker-edit-btn" onclick="openCustomMarkerEditor(\'sec\')">Edit seconds indices: <span id="cmSecStatusLabel"></span> &rsaquo;</button>' +
'        <button type="button" class="marker-edit-btn" onclick="openTextMarkerEditor()">Numerals: <span id="numeralsStatusLabel"></span> &rsaquo;</button>' +
          customMarkerHiddenInputsHtml(current) +
'      </div>' +
'      </div>' +
'    </div>' +

'    <div' + (platform.bw ? ' style="display:none;"' : '') + '>' +  // no picture backgrounds on the B&W watches
      subsectionLegendHtml('background', 'Background style') +
'      <div class="subsection-body" id="subsec-background" style="display:none;">' +
        configBackground.backgroundSectionHtml(current) +
'      </div>' +
'    </div>' +
'    <div>' +
      subsectionLegendHtml('border', 'Border style') +
'      <div class="subsection-body" id="subsec-border" style="display:none;">' +
        configBorder.borderSectionHtml(current) +
'      </div>' +
'    </div>' +

'  </fieldset>' +

'  <fieldset id="cornersFieldset">' +
    sectionLegendHtml('corners', 'Complications') +
'    <div class="section-body" id="section-corners" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="help section-intro" onclick="toggleSectionIntro(this)">Complications are small info readouts (weather, health, date/time, and more) placed around your watch face. Tap a slot on the diagram below to pick what it shows and how it\'s colored -- grayed-out slots aren\'t available for your current style.</div>' +

'    <div id="slotPickerDiagram">' +
'      <button type="button" class="slot-btn slot-corner-tl" id="slotBtn-cornerTL" onclick="openSlotEditor(\'cornerTL\')"></button>' +
'      <button type="button" class="slot-btn slot-corner-tr" id="slotBtn-cornerTR" onclick="openSlotEditor(\'cornerTR\')"></button>' +
'      <button type="button" class="slot-btn slot-corner-bl" id="slotBtn-cornerBL" onclick="openSlotEditor(\'cornerBL\')"></button>' +
'      <button type="button" class="slot-btn slot-corner-br" id="slotBtn-cornerBR" onclick="openSlotEditor(\'cornerBR\')"></button>' +
'      <button type="button" class="slot-btn slot-upper-l1" id="slotBtn-upperMiddleLine1" onclick="openSlotEditor(\'upperMiddleLine1\')"></button>' +
'      <button type="button" class="slot-btn slot-upper-l2" id="slotBtn-upperMiddleLine2" onclick="openSlotEditor(\'upperMiddleLine2\')"></button>' +
'      <button type="button" class="slot-btn slot-bottom-l1" id="slotBtn-bottomMiddleLine1" onclick="openSlotEditor(\'bottomMiddleLine1\')"></button>' +
'      <button type="button" class="slot-btn slot-bottom-l2" id="slotBtn-bottomMiddleLine2" onclick="openSlotEditor(\'bottomMiddleLine2\')"></button>' +
'      <button type="button" class="slot-btn slot-middle-left-l1" id="slotBtn-middleLeftLine1" onclick="openSlotEditor(\'middleLeftLine1\')"></button>' +
'      <button type="button" class="slot-btn slot-middle-left-l2" id="slotBtn-middleLeftLine2" onclick="openSlotEditor(\'middleLeftLine2\')"></button>' +
'      <button type="button" class="slot-btn slot-middle-right-l1" id="slotBtn-middleRightLine1" onclick="openSlotEditor(\'middleRightLine1\')"></button>' +
'      <button type="button" class="slot-btn slot-middle-right-l2" id="slotBtn-middleRightLine2" onclick="openSlotEditor(\'middleRightLine2\')"></button>' +
'    </div>' +
'    <div class="slot-legend" id="slotShakeLegend" style="display:none;"><span class="slot-legend-sample">&nbsp;&nbsp;&nbsp;</span> Complications with an orange dashed border are hidden until you shake the watch.</div>' +

'    <div class="checkbox-row" id="bitmapCornerOverrideRow" style="margin-top:12px;' + ((isBitmapMarkerStyle && markerStyleNum !== 5) ? '' : ' display:none;') + '">' +
'      <input type="checkbox" id="bitmapCornerOverride" ' + (current.bitmapCornerOverride ? 'checked' : '') + ' onchange="onBitmapCornerOverrideChange()">' +
'      <label for="bitmapCornerOverride" style="margin:0;">Incompatible complications (may overlap the design)</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-bitmapCornerOverride\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-bitmapCornerOverride" style="display:none;">Allows complications to use areas that may overlap some bitmap marker designs.</div>' +

'    <div class="field-label-row"><label for="cornerFont">Font</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-cornerFont\')">?</button></div>' +

'    <select id="cornerFont" onchange="onCornerFontChange()" style="display:none;">' + fontOptionsHtml(cornerFontId, false) + '</select>' +
'    <button type="button" class="font-picker-btn font-picker-trigger" id="cornerFontTrigger" onclick="openFontPicker(\'cornerFont\')">' +
'      <span class="font-picker-preview" id="cornerFontTriggerPreview"></span>' +
'      <span class="font-picker-name" id="cornerFontTriggerName"></span>' +
'    </button>' +
'    <div class="help" id="help-cornerFont" style="display:none;">Sets the font used for complication text and the analog date.</div>' +

'    <div class="subsection">' +
'      <div class="field-label-row"><label>Outline text and icons for contrast</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-outlineStyle\')">?</button></div>' +
      modeButtonGroupHtml('outlineStyleGroup', 'outlineStyle', [
        { value: '0', label: 'None' },
        { value: '1', label: 'Thin' },
        { value: '2', label: 'Thick' }
      ], current.outlineStyle || '1', 'onOutlineStyleChange') +
'    </div>' +
'    <div class="help" id="help-outlineStyle" style="display:none;">Adds an outline to text and icons to keep them readable over the background.</div>' +

'    <div id="weatherIconStyleRow">' +
'      <div class="field-label-row"><label>Icons style</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-weatherIconStyle\')">?</button></div>' +
'      <select id="weatherIconStyle" style="display:none;">' +
'        <option value="0"' + (current.weatherIconStyle === '0' ? ' selected' : '') + '>Simple</option>' +
'        <option value="1"' + (current.weatherIconStyle === '1' || !current.weatherIconStyle ? ' selected' : '') + '>Hollow</option>' +
'        <option value="2"' + (current.weatherIconStyle === '2' ? ' selected' : '') + '>Full color</option>' +
'      </select>' +
'      <button type="button" class="font-picker-btn font-picker-trigger" id="weatherIconStyleTrigger" onclick="openWeatherIconStylePicker()">' +
'        <span class="font-picker-preview weather-icon-style-preview"></span>' +
'        <span class="font-picker-name"></span>' +
'      </button>' +
'      <div class="help" id="help-weatherIconStyle" style="display:none;">Choose how weather and complication icons are drawn in complication slots.</div>' +
'    </div>' +

'    <div style="display:none;" id="slotDataStore">' +
'      <select id="cornerTL">' + cornerContentOptionsHtml(current.cornerTL) + '</select>' +
'      <input type="hidden" id="cornerTLColor" value="' + esc(current.cornerTLColor || '0') + '">' +
'      <input type="hidden" id="cornerTLCustomPrims" value="' + esc(current.cornerTLCustomPrims || '') + '">' +
'      <input type="hidden" id="cornerTLShake" value="' + (current.cornerTLShake === '1' ? '1' : '0') + '">' +
'      <select id="cornerTR">' + cornerContentOptionsHtml(current.cornerTR) + '</select>' +
'      <input type="hidden" id="cornerTRColor" value="' + esc(current.cornerTRColor || '0') + '">' +
'      <input type="hidden" id="cornerTRCustomPrims" value="' + esc(current.cornerTRCustomPrims || '') + '">' +
'      <input type="hidden" id="cornerTRShake" value="' + (current.cornerTRShake === '1' ? '1' : '0') + '">' +
'      <select id="cornerBL">' + cornerContentOptionsHtml(current.cornerBL) + '</select>' +
'      <input type="hidden" id="cornerBLColor" value="' + esc(current.cornerBLColor || '0') + '">' +
'      <input type="hidden" id="cornerBLCustomPrims" value="' + esc(current.cornerBLCustomPrims || '') + '">' +
'      <input type="hidden" id="cornerBLShake" value="' + (current.cornerBLShake === '1' ? '1' : '0') + '">' +
'      <select id="cornerBR">' + cornerContentOptionsHtml(current.cornerBR) + '</select>' +
'      <input type="hidden" id="cornerBRColor" value="' + esc(current.cornerBRColor || '0') + '">' +
'      <input type="hidden" id="cornerBRCustomPrims" value="' + esc(current.cornerBRCustomPrims || '') + '">' +
'      <input type="hidden" id="cornerBRShake" value="' + (current.cornerBRShake === '1' ? '1' : '0') + '">' +
'      <select id="upperMiddleLine1Content">' + cornerContentOptionsHtml(current.upperMiddleLine1ContentAnalog) + '</select>' +
'      <input type="hidden" id="upperMiddleLine1Color" value="' + esc(current.upperMiddleLine1ColorAnalog || '0') + '">' +
'      <input type="hidden" id="upperMiddleLine1CustomPrims" value="' + esc(current.upperMiddleLine1CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="upperMiddleLine1Shake" value="' + (current.upperMiddleLine1Shake === '1' ? '1' : '0') + '">' +
'      <select id="upperMiddleLine2Content">' + cornerContentOptionsHtml(current.upperMiddleLine2ContentAnalog) + '</select>' +
'      <input type="hidden" id="upperMiddleLine2Color" value="' + esc(current.upperMiddleLine2ColorAnalog || '0') + '">' +
'      <input type="hidden" id="upperMiddleLine2CustomPrims" value="' + esc(current.upperMiddleLine2CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="upperMiddleLine2Shake" value="' + (current.upperMiddleLine2Shake === '1' ? '1' : '0') + '">' +
'      <select id="bottomMiddleLine1Content">' + cornerContentOptionsHtml(current.bottomMiddleLine1ContentAnalog) + '</select>' +
'      <input type="hidden" id="bottomMiddleLine1Color" value="' + esc(current.bottomMiddleLine1ColorAnalog || '0') + '">' +
'      <input type="hidden" id="bottomMiddleLine1CustomPrims" value="' + esc(current.bottomMiddleLine1CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="bottomMiddleLine1Shake" value="' + (current.bottomMiddleLine1Shake === '1' ? '1' : '0') + '">' +
'      <select id="bottomMiddleLine2Content">' + cornerContentOptionsHtml(current.bottomMiddleLine2Content) + '</select>' +
'      <input type="hidden" id="bottomMiddleLine2Color" value="' + esc(current.bottomMiddleLine2Color || '0') + '">' +
'      <input type="hidden" id="bottomMiddleLine2CustomPrims" value="' + esc(current.bottomMiddleLine2CustomPrims || '') + '">' +
'      <input type="hidden" id="bottomMiddleLine2Shake" value="' + (current.bottomMiddleLine2Shake === '1' ? '1' : '0') + '">' +
'      <select id="middleLeftLine1Content">' + cornerContentOptionsHtml(current.middleLeftLine1ContentAnalog) + '</select>' +
'      <input type="hidden" id="middleLeftLine1Color" value="' + esc(current.middleLeftLine1ColorAnalog || '0') + '">' +
'      <input type="hidden" id="middleLeftLine1CustomPrims" value="' + esc(current.middleLeftLine1CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="middleLeftLine1Shake" value="' + (current.middleLeftLine1Shake === '1' ? '1' : '0') + '">' +
'      <select id="middleLeftLine2Content">' + cornerContentOptionsHtml(current.middleLeftLine2ContentAnalog) + '</select>' +
'      <input type="hidden" id="middleLeftLine2Color" value="' + esc(current.middleLeftLine2ColorAnalog || '0') + '">' +
'      <input type="hidden" id="middleLeftLine2CustomPrims" value="' + esc(current.middleLeftLine2CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="middleLeftLine2Shake" value="' + (current.middleLeftLine2Shake === '1' ? '1' : '0') + '">' +
'      <select id="middleRightLine1Content">' + cornerContentOptionsHtml(current.middleRightLine1ContentAnalog) + '</select>' +
'      <input type="hidden" id="middleRightLine1Color" value="' + esc(current.middleRightLine1ColorAnalog || '0') + '">' +
'      <input type="hidden" id="middleRightLine1CustomPrims" value="' + esc(current.middleRightLine1CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="middleRightLine1Shake" value="' + (current.middleRightLine1Shake === '1' ? '1' : '0') + '">' +
'      <select id="middleRightLine2Content">' + cornerContentOptionsHtml(current.middleRightLine2ContentAnalog) + '</select>' +
'      <input type="hidden" id="middleRightLine2Color" value="' + esc(current.middleRightLine2ColorAnalog || '0') + '">' +
'      <input type="hidden" id="middleRightLine2CustomPrims" value="' + esc(current.middleRightLine2CustomPrimsAnalog || '') + '">' +
'      <input type="hidden" id="middleRightLine2Shake" value="' + (current.middleRightLine2Shake === '1' ? '1' : '0') + '">' +
'    </div>' +

'    <div class="subsection">' +
'      <div class="field-label-row"><label for="stepGoal">Daily step goal (used by "Step goal %")</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-stepGoal\')">?</button></div>' +
'      <input type="number" id="stepGoal" min="1000" max="60000" step="500" value="' + esc(current.stepGoal || '10000') + '">' +
'      <div class="help" id="help-stepGoal" style="display:none;">Sets the step target used by the Steps complication.</div>' +
'    </div>' +

'    <div class="checkbox-row subsection" id="drawFeaturesBeneathHandsRow">' +
'      <input type="checkbox" id="drawFeaturesBeneathHands" ' + (current.drawFeaturesBeneathHands ? 'checked' : '') + ' onchange="updatePreview()">' +
'      <label for="drawFeaturesBeneathHands" style="margin:0;">Draw complications beneath hands</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-drawFeaturesBeneathHands\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-drawFeaturesBeneathHands" style="display:none;">In Analog mode, draws complication text underneath the hands instead of on top.</div>' +
'    <div class="field-label-row" style="margin-top:12px;"><button type="button" class="secondary-btn" id="loadPrefFeaturesBtn" onclick="loadPreferredFeatures()">Load user preferences</button><button type="button" class="help-btn" onclick="toggleHelp(\'help-loadPrefFeatures\')">?</button></div>' +
'    <div class="help" id="help-loadPrefFeatures" style="display:none;">Fills Upper-middle line 2, Bottom-middle line 1 and the first line on the left and on the right with the readings you chose in the Pebble app (Settings &rarr; Plugins &rarr; Complications), in that order. They replace what those four slots show now; the change is only kept when you save.</div>' +
'    <div class="help" id="prefFeaturesStatus" style="display:none;"></div>' +
'    </div>' +
'  </fieldset>' +
'  <fieldset>' +
    sectionLegendHtml('colors', 'Colors') +
'    <div class="section-body" id="section-colors" style="display:none;">' +

'    <div class="subsection" id="daySchemeSubsection">' +
'      <label>Colors<span class="scheme-active-badge" id="daySchemeActiveBadge" style="display:none;">Active now</span></label>' +
(platform.bw ? bwSchemeSelectHtml(false, current) + '<div style="display:none;">' : '<div>') +
'      <div class="color-role-buttons">' +
'        <button type="button" class="color-role-btn" onclick="openColorPicker(\'text\')">' +
'          <span class="color-role-swatch" id="swatchMain" style="background:' + esc(initialColors.text) + ';"></span>' +
'          <span class="color-role-label">Main</span>' +
'        </button>' +
'        <button type="button" class="color-role-btn" onclick="openColorPicker(\'accent\')">' +
'          <span class="color-role-swatch" id="swatchAccent" style="background:' + esc(initialColors.accent) + ';"></span>' +
'          <span class="color-role-label">Accent</span>' +
'        </button>' +
'        <button type="button" class="color-role-btn" onclick="openColorPicker(\'bg\')">' +
'          <span class="color-role-swatch" id="swatchBg" style="background:' + esc(initialColors.bg) + ';"></span>' +
'          <span class="color-role-label">Background</span>' +
'        </button>' +
'      </div>' +
'      <div class="field-label-row"><label style="margin-top:12px;">Or pick a preset</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-colorSchemePreset\')">?</button></div>' +
'      <button type="button" class="color-preset-btn color-preset-trigger" id="colorSchemePresetTrigger" onclick="openColorPresetPicker(\'day\')">' +
'        <span class="color-preset-trigger-text">' +
'          <span class="color-preset-main-line"></span>' +
'          <span class="color-preset-accent-line"></span>' +
'        </span>' +
'        <span class="color-preset-chevron">&rsaquo;</span>' +
'      </button>' +
'      <div class="help" id="help-colorSchemePreset" style="display:none;">Applies a ready-made set of main, accent, and background colors.</div>' +
'      </div>' +  // end BW-hidden wrapper
'      <input type="hidden" id="customBgValue" value="' + esc(current.customBg || '255') + '">' +
'      <input type="hidden" id="customTextValue" value="' + esc(current.customText || '192') + '">' +
'      <input type="hidden" id="customAccentValue" value="' + esc(current.customAccent || '192') + '">' +
'    </div>' +

'    <div class="modal-overlay" id="colorPickerModal">' +
'      <div class="modal-box">' +
'        <div class="modal-title" id="colorPickerTitle">Pick a color</div>' +
'        <div class="hex-grid" id="hexColorGrid"></div>' +
'        <button type="button" class="modal-cancel-btn" onclick="closeColorPicker()">Cancel</button>' +
'      </div>' +
'    </div>' +

'    <div class="modal-overlay" id="colorPresetPickerModal" onclick="if (event.target === this) closeColorPresetPicker();">' +
'      <div class="modal-box">' +
'        <div class="modal-title" id="colorPresetPickerTitle">Color preset</div>' +
'        <div class="modal-scroll-body" id="colorPresetPickerGrid"></div>' +
'        <div class="checkbox-row" style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border);">' +
'          <input type="checkbox" id="showAllColorPresets" onchange="onShowAllColorPresetsToggle()">' +
'          <label for="showAllColorPresets" style="margin:0;">Show all presets</label>' +
'        </div>' +
'      </div>' +
'    </div>' +

'    <div class="checkbox-row subsection">' +
'      <input type="checkbox" id="nightEnabled" ' + (current.nightEnabled ? 'checked' : '') + ' onchange="onNightToggle()">' +
'      <label for="nightEnabled" style="margin:0;">Use different colors at night</label>' +
'    </div>' +
'    <div id="nightSchemeSettings" style="' + (current.nightEnabled ? '' : 'display:none;') + '">' +
'      <label>Night colors<span class="scheme-active-badge" id="nightSchemeActiveBadge" style="display:none;">Active now</span></label>' +
(platform.bw ? bwSchemeSelectHtml(true, current) + '<div style="display:none;">' : '<div>') +
'      <div class="color-role-buttons">' +
'        <button type="button" class="color-role-btn" onclick="openColorPicker(\'text\', \'night\')">' +
'          <span class="color-role-swatch" id="swatchNightMain" style="background:' + esc(initialNightColors.text) + ';"></span>' +
'          <span class="color-role-label">Main</span>' +
'        </button>' +
'        <button type="button" class="color-role-btn" onclick="openColorPicker(\'accent\', \'night\')">' +
'          <span class="color-role-swatch" id="swatchNightAccent" style="background:' + esc(initialNightColors.accent) + ';"></span>' +
'          <span class="color-role-label">Accent</span>' +
'        </button>' +
'        <button type="button" class="color-role-btn" onclick="openColorPicker(\'bg\', \'night\')">' +
'          <span class="color-role-swatch" id="swatchNightBg" style="background:' + esc(initialNightColors.bg) + ';"></span>' +
'          <span class="color-role-label">Background</span>' +
'        </button>' +
'      </div>' +
'      <div class="field-label-row"><label style="margin-top:12px;">Or pick a preset</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-nightSchemePreset\')">?</button></div>' +
'      <button type="button" class="color-preset-btn color-preset-trigger" id="nightSchemePresetTrigger" onclick="openColorPresetPicker(\'night\')">' +
'        <span class="color-preset-trigger-text">' +
'          <span class="color-preset-main-line"></span>' +
'          <span class="color-preset-accent-line"></span>' +
'        </span>' +
'        <span class="color-preset-chevron">&rsaquo;</span>' +
'      </button>' +
'      <div class="help" id="help-nightSchemePreset" style="display:none;">Applies a ready-made set of night colors.</div>' +
'      </div>' +  // end BW-hidden wrapper
'      <input type="hidden" id="nightCustomBgValue" value="' + esc(current.nightCustomBg || '192') + '">' +
'      <input type="hidden" id="nightCustomTextValue" value="' + esc(current.nightCustomText || '255') + '">' +
'      <input type="hidden" id="nightCustomAccentValue" value="' + esc(current.nightCustomAccent || '255') + '">' +
'    </div>' +
'    <div class="help section-intro" onclick="toggleSectionIntro(this)">Battery and Moon phase are now pickable as Complications content below, with their own color style.</div>' +
'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('animation', 'Animation') +
'    <div class="section-body" id="section-animation" style="display:none;">' +
'    <div class="subsection">' +
'      <div class="field-label-row"><label>Startup clock animation</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-startupClockAnim\')">?</button></div>' +
      verticalButtonGroupHtml('startupClockAnimModeGroup', 'startupClockAnimMode', [
        { value: '0', label: 'Off' },
        { value: '1', label: 'Animate clock' }
      ], current.startupClockAnimMode || '1') +
'    </div>' +
'    <div class="help" id="help-startupClockAnim" style="display:none;">Choose how the clock appears when the watchface starts.</div>' +

'    <div class="subsection">' +
'      <div class="field-label-row"><label>Animate indices on start</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-bgAnimMode\')">?</button></div>' +
      verticalButtonGroupHtml('bgAnimModeGroup', 'bgAnimMode', [
        { value: '0', label: 'Off' },
        { value: '1', label: 'Indices (hour indices animate in; seconds draw normally)' }
      ], current.bgAnimMode || '0') +
'    </div>' +
'    <div class="help" id="help-bgAnimMode" style="display:none;">Choose whether the indices animate in when the watchface appears.</div>' +

'    <div class="subsection">' +
'      <div class="field-label-row"><label>On shake animation</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-shakeAnimMode\')">?</button></div>' +
      verticalButtonGroupHtml('shakeAnimModeGroup', 'shakeAnimMode', [
        { value: '0', label: 'Off' },
        { value: '1', label: 'Smooth second hand' }
      ], current.shakeAnimMode || '0') +
'    </div>' +
'    <div class="help" id="help-shakeAnimMode" style="display:none;">Choose what happens when you shake the watch.</div>' +

'    <div class="subsection">' +
'      <div class="checkbox-row">' +
'        <input type="checkbox" id="shakeHandsTranslucent" ' + (current.shakeHandsTranslucent ? 'checked' : '') + ' onchange="updatePreview(); try { refreshAllSectionSubheaders(); } catch (e) {}">' +
'        <label for="shakeHandsTranslucent" style="margin:0;">Semi-transparent hands on shake</label>' +
'        <button type="button" class="help-btn" onclick="toggleHelp(\'help-shakeHandsTranslucent\')">?</button>' +
'      </div>' +
'    </div>' +
'    <div class="help" id="help-shakeHandsTranslucent" style="display:none;">The hands turn semi-transparent for the duration of the shake animation (see the duration slider below), so you can see the dial and complications underneath them. Works with or without the smooth second hand.</div>' +

'    <div class="subsection">' +
'      <div class="slider-row">' +
'        <div class="field-label-row"><label for="shakeLabelSeconds">Shake animations duration <span class="val" id="shakeLabelSecondsVal">' + esc(current.shakeLabelSeconds || '3') + 's</span></label><button type="button" class="help-btn" onclick="toggleHelp(\'help-shakeLabelSeconds\')">?</button></div>' +
'        <div class="slider-with-buttons">' +
'        <button type="button" class="slider-step-btn" onclick="stepSlider(\'shakeLabelSeconds\', -1)">&minus;</button>' +
'          <input type="range" id="shakeLabelSeconds" min="0" max="30" step="1" value="' + esc(current.shakeLabelSeconds || '3') + '" oninput="document.getElementById(\'shakeLabelSecondsVal\').textContent = this.value + \'s\';">' +
'        <button type="button" class="slider-step-btn" onclick="stepSlider(\'shakeLabelSeconds\', 1)">+</button>' +
'        </div>' +
'      </div>' +
'    </div>' +
'    <div class="help" id="help-shakeLabelSeconds" style="display:none;">Sets how long the shake animations (smooth second hand, semi-transparent hands) last after a shake.</div>' +
'    </div>' +

'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('presets', 'My Style Presets') +
'    <div class="section-body" id="section-presets" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="help section-intro" onclick="toggleSectionIntro(this)">Save up to 6 quick-recall snapshots of your whole Style + Colors + Complications design below, or export/import it as JSON to back it up or share it.</div>' +

'    ' + [1, 2, 3, 4, 5, 6].map(function (n) { return presetSlotHtml(current, n); }).join('') +

'    <label for="presetExportBox" style="margin-top:12px;">Export current design</label>' +
'    <button type="button" class="secondary-btn" onclick="exportDesignJson()">Generate JSON</button>' +
'    <button type="button" class="secondary-btn" onclick="copyExportBoxToClipboard()">Copy to clipboard</button>' +
'    <textarea id="presetExportBox" readonly rows="6" style="margin-top:8px; font-family:monospace; font-size:11px;" onclick="this.select();"></textarea>' +
'    <div class="help" id="presetExportStatus">Tap the box above then copy the text -- covers everything in the Style, Colors, and Complications sections.</div>' +

'    <label for="presetImportBox" style="margin-top:12px;">Import a design</label>' +
'    <button type="button" class="secondary-btn" onclick="pasteImportBoxFromClipboard()">Paste from clipboard</button>' +
'    <textarea id="presetImportBox" rows="6" placeholder="Paste JSON here" style="margin-top:8px; font-family:monospace; font-size:11px;"></textarea>' +
'    <button type="button" class="secondary-btn" onclick="importDesignJson()">Apply</button>' +
'    <div class="help" id="presetImportStatus"></div>' +
'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('weather', 'Weather') +
'    <div class="section-body" id="section-weather" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="help section-intro" onclick="toggleSectionIntro(this)">Cloud cover is always pulled from Open-Meteo (no signup needed). Optionally add an OpenWeatherMap API key to average in a second forecast.</div>' +
    configPlugins.weatherSourceHtml(current) +
'    <label for="owmKey">OpenWeatherMap API key (optional)</label>' +
'    <input type="text" id="owmKey" placeholder="leave blank to skip" value="' + esc(current.owmKey) + '">' +

'    <div class="field-label-row"><label style="margin-top:10px;">Temperature unit</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-tempUnit\')">?</button></div>' +
      modeButtonGroupHtml('tempUnitGroup', 'tempUnit', [
        { value: 'C', label: '\u00b0C' },
        { value: 'F', label: '\u00b0F' },
        { value: 'K', label: 'K' }
      ], current.tempUnit || 'C', 'onTempUnitChange') +
'    <div class="help" id="help-tempUnit" style="display:none;">Sets the temperature unit used throughout the watchface.</div>' +

'    <div class="field-label-row"><label style="margin-top:10px;">Wind speed unit</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-windSpeedUnit\')">?</button></div>' +
      modeButtonGroupHtml('windSpeedUnitGroup', 'windSpeedUnit', [
        { value: 'kmh', label: 'KM/H' },
        { value: 'mph', label: 'MPH' },
        { value: 'ms', label: 'M/S' },
        { value: 'kn', label: 'KNOTS' }
      ], current.windSpeedUnit || 'kmh') +
'    <div class="help" id="help-windSpeedUnit" style="display:none;">Sets the unit used by the Wind complication.</div>' +

'    <div class="field-label-row"><label style="margin-top:10px;">Air quality index scale</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-aqiUnit\')">?</button></div>' +
      modeButtonGroupHtml('aqiUnitGroup', 'aqiUnit', [
        { value: '0', label: 'US AQI' },
        { value: '1', label: 'EUROPEAN' }
      ], current.aqiUnit || '0') +
'    <div class="help" id="help-aqiUnit" style="display:none;">Sets the scale used by the Air Quality complication.</div>' +

'    <div class="field-label-row"><label style="margin-top:10px;">Altitude unit</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-altitudeUnit\')">?</button></div>' +
      modeButtonGroupHtml('altitudeUnitGroup', 'altitudeUnit', [
        { value: '0', label: 'METERS' },
        { value: '1', label: 'FEET' }
      ], current.altitudeUnit || '0') +
'    <div class="help" id="help-altitudeUnit" style="display:none;">Sets the unit used by the Altitude complication.</div>' +

'    <div class="field-label-row" style="margin-top:12px;"><button type="button" class="secondary-btn" id="loadPrefUnitsBtn" onclick="loadPreferredUnits()">Load units from Pebble app</button><button type="button" class="help-btn" onclick="toggleHelp(\'help-loadPrefUnits\')">?</button></div>' +
'    <div class="help" id="help-loadPrefUnits" style="display:none;">Sets the temperature, wind speed and altitude units to the ones chosen in the Pebble app (altitude follows its distance unit: km = meters, mi = feet). The air quality scale has no Pebble app equivalent and is left alone. The change is only kept when you save.</div>' +
'    <div class="help" id="prefUnitsStatus" style="display:none;"></div>' +

'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('location', 'Location') +
'    <div class="section-body" id="section-location" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="checkbox-row">' +
'      <input type="checkbox" id="autoLoc" ' + autoLocChecked + ' onchange="toggleManual()">' +
'      <label for="autoLoc" style="margin:0;">Use phone GPS automatically</label>' +
'    </div>' +
'    <label for="locationSearch">Search for a place</label>' +
'    <div style="display:flex; gap:6px;">' +
'      <input type="text" id="locationSearch" style="flex:1;" placeholder="e.g. Innsbruck, Austria" ' + manualDisabled + '>' +
'      <button type="button" id="locationSearchBtn" class="secondary-btn" style="width:auto; margin-top:0; padding:8px 14px;" onclick="searchLocation()" ' + manualDisabled + '>Find</button>' +
'    </div>' +
'    <div class="help" id="locationSearchStatus"></div>' +
'    <div class="field-label-row"><label for="lat">Manual latitude (decimal degrees)</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-manualCoords\')">?</button></div>' +
'    <input type="number" step="any" id="lat" ' + manualDisabled + ' placeholder="e.g. 40.7128" value="' + esc(current.lat) + '" oninput="onManualCoordsInput()" onblur="onManualCoordsBlur()">' +
'    <label for="lon">Manual longitude (decimal degrees)</label>' +
'    <input type="number" step="any" id="lon" ' + manualDisabled + ' placeholder="e.g. -74.0060" value="' + esc(current.lon) + '" oninput="onManualCoordsInput()" onblur="onManualCoordsBlur()">' +
'    <div class="help" id="help-manualCoords" style="display:none;">Used when automatic GPS is off. The location affects astronomy, weather and other location-based data.</div>' +
'    <input type="hidden" id="locationName" value="' + esc(current.locationName || '') + '">' +
'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('updates', 'Updates') +
'    <div class="section-body" id="section-updates" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="checkbox-row">' +
'      <input type="checkbox" id="batterySaverEnabled" ' + (current.batterySaverEnabled ? 'checked' : '') + '>' +
'      <label for="batterySaverEnabled" style="margin:0;">Preserve battery when watch is not in use</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-batterySaverEnabled\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-batterySaverEnabled" style="display:none;">Reduces updates after long periods without interaction to save battery.</div>' +
'    <div class="slider-row">' +
'      <div class="field-label-row"><label for="updateMins">Refresh interval <span class="val" id="updateMinsVal">' + esc(current.updateMins) + ' min</span></label><button type="button" class="help-btn" onclick="toggleHelp(\'help-updateMins\')">?</button></div>' +
'      <div class="slider-with-buttons">' +
'      <button type="button" class="slider-step-btn" onclick="stepSlider(\'updateMins\', -5)">&minus;</button>' +
'        <input type="range" id="updateMins" min="5" max="60" step="5" value="' + esc(current.updateMins) + '" oninput="document.getElementById(\'updateMinsVal\').textContent = this.value + \' min\';">' +
'      <button type="button" class="slider-step-btn" onclick="stepSlider(\'updateMins\', 5)">+</button>' +
'      </div>' +
'    </div>' +
'    <div class="help" id="help-updateMins" style="display:none;">Sets the minimum time between automatic data refreshes. A significant location change can trigger an earlier refresh.</div>' +
'    <div class="field-label-row">' +
'      <button type="button" class="secondary-btn" onclick="save(true)">Force refresh now</button>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-forceRefresh\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-forceRefresh" style="display:none;">Fetches fresh data now instead of waiting for the normal refresh interval.</div>' +

'    <div class="field-label-row" style="margin-top:14px;"><label style="margin:0;">Service status</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-serviceStatus\')">?</button></div>' +
'    <div class="help" id="help-serviceStatus" style="display:none;">Shows the recent result of each data service. Tap a warning or error for details.</div>' +
      serviceStatusRowsHtml(current) +
'    <input type="hidden" id="serviceLogsJson" value="' + esc(JSON.stringify(current.serviceLogs || {})) + '">' +
'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('other', 'Other') +
'    <div class="section-body" id="section-other" style="display:none;">' +
'    <div class="subsection"></div>' +

'    <label>Hourly vibrations</label>' +
      verticalButtonGroupHtml('hourlyVibeModeGroup', 'hourlyVibeMode', [
        { value: '0', label: 'Off' },
        { value: '1', label: 'On full hours' },
        { value: '2', label: 'Every X minutes' }
      ], current.hourlyVibeMode || '0', 'onHourlyVibeModeChange') +

'    <div id="hourlyVibeSubOptions" class="' + ((current.hourlyVibeMode || '0') === '0' ? 'grayed-out' : '') + '">' +

'    <div class="slider-row" id="hourlyVibeIntervalRow" style="' + ((current.hourlyVibeMode || '0') === '2' ? '' : 'display:none;') + '">' +
'      <label for="hourlyVibeIntervalMin">Minutes interval <span class="val" id="hourlyVibeIntervalMinVal">' + esc(current.hourlyVibeIntervalMin || '30') + '</span></label>' +
'      <div class="slider-with-buttons">' +
'      <button type="button" class="slider-step-btn" onclick="stepSlider(\'hourlyVibeIntervalMin\', -1)">&minus;</button>' +
'      <input type="range" id="hourlyVibeIntervalMin" min="1" max="180" step="1" value="' + esc(current.hourlyVibeIntervalMin || '30') + '" oninput="document.getElementById(\'hourlyVibeIntervalMinVal\').textContent = this.value;">' +
'      <button type="button" class="slider-step-btn" onclick="stepSlider(\'hourlyVibeIntervalMin\', 1)">+</button>' +
'      </div>' +
'    </div>' +

'    <label style="margin-top:12px;">Vibration</label>' +
      verticalButtonGroupHtml('hourlyVibePatternGroup', 'hourlyVibePattern', [
        { value: '0', label: 'Short' },
        { value: '1', label: 'Double' },
        { value: '2', label: 'Long' }
      ], current.hourlyVibePattern || '0') +

'    <div class="field-label-row"><label style="margin-top:12px;" for="hourlyVibeStartTime">Start time</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-hourlyVibeTimeRange\')">?</button></div>' +
'    <input type="time" id="hourlyVibeStartTime" value="' + esc(current.hourlyVibeStartTime || '00:00') + '" onchange="onHourlyVibeTimeChange(\'hourlyVibeStartTime\')">' +
'    <label for="hourlyVibeEndTime">End time</label>' +
'    <input type="time" id="hourlyVibeEndTime" value="' + esc(current.hourlyVibeEndTime || '00:00') + '" onchange="onHourlyVibeTimeChange(\'hourlyVibeEndTime\')">' +
'    <div class="help" id="help-hourlyVibeTimeRange" style="display:none;">The start and end times are included. Set both to 00:00 to allow vibrations all day.</div>' +

'    <label style="margin-top:12px;">Active days</label>' +
'    <div class="day-toggle-group" id="hourlyVibeDaysGroup">' +
      HOURLY_VIBE_DAY_LABELS.map(function (label, i) {
        return '<button type="button" class="day-toggle-btn active" data-bit="' + i + '" onclick="toggleHourlyVibeDay(' + i + ')">' + esc(label) + '</button>';
      }).join('') +
'    </div>' +
'    <input type="hidden" id="hourlyVibeDaysMask" value="' + esc(current.hourlyVibeDaysMask == null ? '127' : current.hourlyVibeDaysMask) + '">' +

'    </div>' +

(QUIET_TIME_API_AVAILABLE ? (
'    <div class="checkbox-row' + ((current.hourlyVibeMode || '0') === '0' ? ' grayed-out' : '') + '" style="margin-top:12px;" id="hourlyVibeOverrideQuietRow">' +
'      <input type="checkbox" id="hourlyVibeOverrideQuiet" ' + (current.hourlyVibeOverrideQuiet === false ? '' : 'checked') + '>' +
'      <label for="hourlyVibeOverrideQuiet" style="margin:0;">Override quiet time</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-hourlyVibeOverrideQuiet\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-hourlyVibeOverrideQuiet" style="display:none;">When enabled, hourly vibrations continue during Quiet Time.</div>'
    ) : '') +

'    <div class="field-label-row"><label style="margin-top:16px;">Vibrate when Bluetooth connection is lost</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-btLostVibe\')">?</button></div>' +
      verticalButtonGroupHtml('btLostVibeGroup', 'btLostVibe', [
        { value: '0', label: 'Off' },
        { value: '1', label: 'Short' },
        { value: '2', label: 'Double' },
        { value: '3', label: 'Long' }
      ], current.btLostVibe || '0') +
'    <div class="help" id="help-btLostVibe" style="display:none;">Vibrates once when the watch loses its connection to the phone. Nothing happens when the connection comes back.</div>' +

'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('faq', 'FAQ') +
'    <div class="section-body" id="section-faq" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="faq-search-wrap">' +
'      <span class="faq-search-icon">&#128269;</span>' +
'      <input type="search" id="faqSearch" class="faq-search" placeholder="Search questions..." autocomplete="off" oninput="filterFaq(this.value)">' +
'    </div>' +
'    <div id="faqList">' + faqItemsHtml() + '</div>' +
'    <div id="faqEmpty" class="faq-empty">No matching FAQ entries.</div>' +
'    </div>' +
'  </fieldset>' +

'  <fieldset>' +
    sectionLegendHtml('testing', 'Debug') +
'    <div class="section-body" id="section-testing" style="display:none;">' +
'    <div class="subsection"></div>' +
'    <div class="checkbox-row">' +
'      <input type="checkbox" id="testMode" ' + testModeChecked + ' onchange="toggleTestMode()">' +
'      <label for="testMode" style="margin:0;">Use a custom test date/time</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-testMode\')">?</button>' +
'    </div>' +
'    <label for="testDateTime">Test date &amp; time</label>' +
'    <input type="datetime-local" id="testDateTime" ' + testDisabled + ' value="' + esc(current.testDateTime) + '">' +
'    <div class="help" id="help-testMode" style="display:none;">Uses the selected date and time for astronomy calculations so you can preview another date.</div>' +
'    <input type="checkbox" id="drawDebug" style="display:none;">' + // debug bounding boxes were removed (kept so the page script still finds it)
'    <div class="subsection">' +
'      <div class="field-label-row"><label for="fontImportTarget">Import font for preview</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-fontImport\')">?</button></div>' +
'      <div class="help" id="help-fontImport" style="display:none;">Imports a local TTF, OTF, WOFF or WOFF2 file as the live settings-page preview for the selected font. This does not change the font installed on the watch or the app resources. Choose the exact font entry the file is replacing before importing it, and use the same family, weight and italic/regular style. For the most accurate result, use the original font file rather than a different webfont or a visually similar substitute. The replacement is matched to the selected font entry, not detected automatically from the filename. If the same font is used by several entries (for example different sizes), import it separately for each entry you want to override.</div>' +
'      <select id="fontImportTarget" style="width:100%;" onchange="updateFontImportStatus()">' + fontOptionsHtml(cornerFontId, false) + '</select>' +
'      <button type="button" class="secondary-btn" style="width:100%; margin-top:6px;" onclick="triggerFontImport()">Import font for preview</button>' +
'      <input type="file" id="fontPickerImportInput" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" style="display:none;" onchange="onFontImportSelected()">' +
'      <div class="help" id="fontPickerImportStatus" style="margin-top:6px;"></div>' +
'      <button type="button" id="fontPickerClearImportBtn" class="secondary-btn" style="display:none; width:100%; margin-top:6px;" onclick="clearImportedFont()">Use normal preview font</button>' +
'    </div>' +
'    <div class="subsection">' +
'      <div class="field-label-row"><label>Last 10 raw messages sent to watch</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-rawMessageLog\')">?</button></div>' +
'      <div class="help" id="help-rawMessageLog" style="display:none;">Shows recently sent data messages for troubleshooting.</div>' +
      rawMessageLogButtonsHtml(current) +
'      <input type="hidden" id="rawMessageLogJson" value="' + esc(JSON.stringify(current.rawMessageLog || [])) + '">' +
'      <label for="debugData" style="margin-top:10px;">Raw data (editable)</label>' +
'      <textarea id="debugData" rows="12" style="width:100%; box-sizing:border-box; font-family:monospace; font-size:11px;">' + esc(debugTextareaInitial) + '</textarea>' +
'      <button type="button" class="secondary-btn" id="copyDebugDataBtn" style="width:auto; margin-top:6px; padding:6px 12px;" onclick="copyTextareaContent(\'debugData\', \'copyDebugDataBtn\')">Copy</button>' +
'      <div class="checkbox-row" style="margin-top:8px;">' +
'        <input type="checkbox" id="debugOverrideEnabled" ' + (current.debugOverrideEnabled ? 'checked' : '') + '>' +
'        <label for="debugOverrideEnabled" style="margin:0;">Override data sent to watch with the text above</label>' +
'        <button type="button" class="help-btn" onclick="toggleHelp(\'help-debugOverrideEnabled\')">?</button>' +
'      </div>' +
'      <div class="help" id="help-debugOverrideEnabled" style="display:none;">Sends the edited test data instead of normal calculated data. Nothing is saved.</div>' +
'    </div>' +

      fakeWeatherPanelHtml(current) +

'    <div class="subsection">' +
'      <div class="field-label-row"><label>Full keyset (every current value)</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-fullKeyset\')">?</button></div>' +
'      <div class="help" id="help-fullKeyset" style="display:none;">Shows all available data fields and their current values. A manual send affects that send only.</div>' +
'      <textarea id="fullKeysetData" rows="16" style="width:100%; box-sizing:border-box; font-family:monospace; font-size:11px;">' + esc(current.fullKeysetJson || '{}') + '</textarea>' +
'      <button type="button" class="secondary-btn" id="copyFullKeysetBtn" style="width:auto; margin-top:6px; padding:6px 12px;" onclick="copyTextareaContent(\'fullKeysetData\', \'copyFullKeysetBtn\')">Copy</button>' +
'      <button type="button" class="secondary-btn" style="width:auto; margin-top:6px; margin-left:6px; padding:6px 12px;" onclick="sendFullKeysetToWatch()">Send to watch now</button>' +
'    </div>' +
'    </div>' +
'  </fieldset>' +

(current.liveMode
  ? '  <div class="save-bar"><div id="liveStatus" class="help" style="text-align:center; margin:0 0 6px;">Live</div><button id="saveBtn" onclick="save()">Send</button></div>'
  : '  <div class="save-bar"><button id="saveBtn" onclick="save()">Save</button></div>') +

'<script>' +
'var MARKER_PREVIEW_IMAGES = ' + JSON.stringify(MARKER_PREVIEW_IMAGES) + ';' +
'var HAND_STYLE_IMAGES = ' + JSON.stringify(HAND_STYLE_IMAGES) + ';' +
'var MARKER_PRESET_IMAGES = ' + JSON.stringify(MARKER_PRESET_IMAGES) + ';' +
'var HAND_STYLE_DIAGRAM_IMAGES = ' + JSON.stringify(HAND_STYLE_DIAGRAM_IMAGES) + ';' +
'var HAND_STYLE_ICON_IMAGES = ' + JSON.stringify(HAND_STYLE_ICON_IMAGES) + ';' +
'var FAQ_ITEMS = ' + JSON.stringify(FAQ_ITEMS) + ';' +
'var WEATHER_ICON_STYLE_PREVIEWS = ' + JSON.stringify(WEATHER_ICON_STYLE_PREVIEWS) + ';' +
'var PREVIEW_ICON_IMAGES = ' + JSON.stringify(PREVIEW_ICON_IMAGES) + ';' +
'var PREVIEW_ICON_TOKENS = ' + JSON.stringify(PREVIEW_ICON_TOKENS) + ';' +
'var WEATHER_ICON_STYLE_NAMES = ["Simple", "Hollow", "Full color"];' +
'var HAND_STYLE_NAMES = ["Baton", "Galba", "Pencil", "Dauphine", "Sword", "Pomme", "Spade", "Arrow", "Leaf", "Syringe", "Serpentine"];' +
'var EXAMPLE_STYLE_PRESETS = ' + JSON.stringify(EXAMPLE_STYLE_PRESETS) + ';' +
'var EXAMPLE_STYLE_IMAGES = ' + JSON.stringify(EXAMPLE_STYLE_IMAGES) + ';' +
'var s_exampleStyleModalSlot = null;' +
'function openExampleStyleModal(n) {' +
'  var entry = EXAMPLE_STYLE_PRESETS[String(n)];' +
'  if (!entry) return;' +
'  s_exampleStyleModalSlot = n;' +
'  var img = document.getElementById("exampleStyleModalImg");' +
'  var src = EXAMPLE_STYLE_IMAGES[String(n)];' +
'  img.style.display = src ? "" : "none";' +
'  img.src = src || "";' +
'  document.getElementById("exampleStyleModalTitle").textContent = entry.title || ("Example " + n);' +
'  document.getElementById("exampleStyleModalDesc").textContent = entry.description || "";' +
'  document.getElementById("exampleStyleModal").className = "modal-overlay open";' +
'}' +
'function closeExampleStyleModal() {' +
'  document.getElementById("exampleStyleModal").className = "modal-overlay";' +
'  s_exampleStyleModalSlot = null;' +
'}' +
'function confirmExampleStyleApply() {' +
'  var entry = s_exampleStyleModalSlot != null ? EXAMPLE_STYLE_PRESETS[String(s_exampleStyleModalSlot)] : null;' +
'  closeExampleStyleModal();' +
'  if (entry && entry.preset) applyStyleCornersJson(entry.preset);' +
'}' +
'function toggleManual() {' +
'  var on = !document.getElementById("autoLoc").checked;' +
'  document.getElementById("lat").disabled = !on;' +
'  document.getElementById("lon").disabled = !on;' +
'  document.getElementById("locationSearch").disabled = !on;' +
'  document.getElementById("locationSearchBtn").disabled = !on;' +
'}' +
'function toggleTestMode() {' +
'  document.getElementById("testDateTime").disabled = !document.getElementById("testMode").checked;' +
'}' +
'function loadRawMessage(i) {' +
'  var all = [];' +
'  try { all = JSON.parse(document.getElementById("rawMessageLogJson").value || "[]"); } catch (e) {}' +
'  var entry = all[i];' +
'  if (!entry) return;' +
'  document.getElementById("debugData").value = JSON.stringify(entry.dict, null, 2);' +
'  var grid = document.getElementById("rawLogBtnGrid");' +
'  if (grid) {' +
'    var btns = grid.getElementsByClassName("raw-log-btn");' +
'    for (var j = 0; j < btns.length; j++) btns[j].className = "raw-log-btn";' +
'  }' +
'  var btn = document.getElementById("rawLogBtn" + i);' +
'  if (btn) btn.className = "raw-log-btn active";' +
'}' +
'function copyTextareaContent(textareaId, btnId) {' +
'  var ta = document.getElementById(textareaId);' +
'  ta.focus();' +
'  ta.select();' +
'  ta.setSelectionRange(0, 999999);' +
'  var ok = false;' +
'  try { ok = document.execCommand("copy"); } catch (e) {}' +
'  var btn = document.getElementById(btnId);' +
'  if (btn) {' +
'    var original = btn.textContent;' +
'    btn.textContent = ok ? "Copied!" : "Copy failed";' +
'    setTimeout(function () { btn.textContent = original; }, 1500);' +
'  }' +
'}' +
'function sendFullKeysetToWatch() {' +
'  var text = document.getElementById("fullKeysetData").value;' +
'  try {' +
'    JSON.parse(text);' +
'  } catch (e) {' +
'    alert("Not valid JSON -- fix the text before sending:\\n\\n" + e.message);' +
'    return;' +
'  }' +
'  phoneAction({ CONFIG_SEND_FULL_KEYSET: true, CONFIG_FULL_KEYSET_DATA: text });' +
'}' +
'function compassLabelForDeg(deg) {' +
'  var DIRS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];' +
'  var idx = Math.floor((Number(deg) + 22) / 45) % 8;' +
'  if (idx < 0) idx += 8;' +
'  return DIRS[idx];' +
'}' +
'function buildFakeWeatherDict() {' +
'  function iv(id) { return parseInt(document.getElementById(id).value, 10); }' +
'  return {' +
'    WEATHER_CONDITION: iv("fakeWxCondition"),' +
'    CLOUD_COVER: iv("fakeWxCloudCover"),' +
'    VIS_SCORE: iv("fakeWxVisScore"),' +
'    CLOUD_ALTITUDE_PCT: iv("fakeWxCloudAltitude"),' +
'    WEATHER_TEMP_C: iv("fakeWxTempC"),' +
'    WEATHER_TEMP_HIGH_C: iv("fakeWxTempHighC"),' +
'    WEATHER_TEMP_LOW_C: iv("fakeWxTempLowC"),' +
'    UV_INDEX_X10: iv("fakeWxUvMax"),' +
'    UV_INDEX_CURRENT_X10: iv("fakeWxUvCurrent"),' +
'    RAIN_CHANCE_PCT: iv("fakeWxRainChance"),' +
'    HUMIDITY_PCT: iv("fakeWxHumidity"),' +
'    WIND_SPEED_KMH: iv("fakeWxWindSpeed"),' +
'    WIND_DIR_DEG: iv("fakeWxWindDir"),' +
'    DEW_POINT_C: iv("fakeWxDewPoint"),' +
'    PRESSURE_HPA: iv("fakeWxPressure"),' +
'    PRESSURE_TREND: iv("fakeWxPressureTrend"),' +
'    AQI_US: iv("fakeWxAqiUs"),' +
'    AQI_EU: iv("fakeWxAqiEu"),' +
'    WEATHER_ERROR_CODE: 0,' +
'    WEATHER_LAST_UPDATE: Math.floor(Date.now() / 1000)' +
'  };' +
'}' +
'function sendFakeWeatherToWatch() {' +
'  var dict = buildFakeWeatherDict();' +
'  phoneAction({ CONFIG_SEND_FAKE_WEATHER: true, CONFIG_FAKE_WEATHER_DATA: JSON.stringify(dict) });' +
'}' +
'function shortNameFromAddress(addr) {' +
'  if (!addr) return "";' +
'  var place = addr.city || addr.town || addr.village || addr.municipality || addr.county || addr.state || "";' +
'  var country = addr.country || "";' +
'  if (place && country) return place + ", " + country;' +
'  return place || country;' +
'}' +
'function onManualCoordsInput() {' +
'  var el = document.getElementById("locationName");' +
'  if (el) el.value = "";' +
'}' +
'function onManualCoordsBlur() {' +
'  if (!document.getElementById("autoLoc").checked && !document.getElementById("locationName").value) {' +
'    reverseGeocodeAndCacheLocationName();' +
'  }' +
'}' +
'function reverseGeocodeAndCacheLocationName() {' +
'  var lat = document.getElementById("lat").value;' +
'  var lon = document.getElementById("lon").value;' +
'  if (!lat || !lon) return;' +
'  var xhr = new XMLHttpRequest();' +
'  xhr.open("GET", "https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + encodeURIComponent(lat) + "&lon=" + encodeURIComponent(lon) + "&zoom=10&addressdetails=1", true);' +
'  xhr.timeout = 8000;' +
'  xhr.onload = function () {' +
'    try {' +
'      var data = JSON.parse(xhr.responseText);' +
'      var name = shortNameFromAddress(data && data.address);' +
'      if (name) {' +
'        document.getElementById("locationName").value = name;' +
'        refreshAllSectionSubheaders();' +
'      }' +
'    } catch (e) {}' +
'  };' +
'  xhr.send();' +
'}' +
'function searchLocation() {' +
'  var query = document.getElementById("locationSearch").value;' +
'  query = query ? query.trim() : "";' +
'  if (!query) return;' +
'  var statusEl = document.getElementById("locationSearchStatus");' +
'  statusEl.textContent = "Searching...";' +
'  var xhr = new XMLHttpRequest();' +
'  xhr.open("GET", "https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&q=" + encodeURIComponent(query), true);' +
'  xhr.timeout = 8000;' +
'  xhr.onload = function () {' +
'    try {' +
'      var results = JSON.parse(xhr.responseText);' +
'      if (results && results.length > 0) {' +
'        document.getElementById("lat").value = parseFloat(results[0].lat).toFixed(5);' +
'        document.getElementById("lon").value = parseFloat(results[0].lon).toFixed(5);' +
'        document.getElementById("locationName").value = shortNameFromAddress(results[0].address) || query;' +
'        statusEl.textContent = "Found: " + (results[0].display_name || query);' +
'        refreshAllSectionSubheaders();' +
'      } else {' +
'        statusEl.textContent = "No results found.";' +
'      }' +
'    } catch (e) {' +
'      statusEl.textContent = "Search failed.";' +
'    }' +
'  };' +
'  xhr.onerror = function () { statusEl.textContent = "Network error."; };' +
'  xhr.ontimeout = function () { statusEl.textContent = "Timed out."; };' +
'  xhr.send();' +
'}' +

'function packedByteFor(r2,g2,b2) { return 0xC0 | (r2<<4) | (g2<<2) | b2; }' +
'function chHex(v) { var h = (v*85).toString(16); return h.length<2 ? "0"+h : h; }' +
'function hexFor(r2,g2,b2) { return "#" + chHex(r2) + chHex(g2) + chHex(b2); }' +
'function hexFromByte(byte) { return hexFor((byte>>4)&3, (byte>>2)&3, byte&3); }' +

'var COLOR_SCHEMES = ' + JSON.stringify(COLOR_SCHEMES) + ';' +

'function findPresetById(id) {' +
'  for (var i = 0; i < COLOR_SCHEMES.length; i++) {' +
'    if (String(COLOR_SCHEMES[i].id) === String(id)) return COLOR_SCHEMES[i];' +
'  }' +
'  return COLOR_SCHEMES[0];' +
'}' +

'function colorsFor(bgId, textId, accentId) {' +
'  return {' +
'    bg: hexFromByte(parseInt(document.getElementById(bgId).value, 10)),' +
'    text: hexFromByte(parseInt(document.getElementById(textId).value, 10)),' +
'    accent: hexFromByte(parseInt(document.getElementById(accentId).value, 10))' +
'  };' +
'}' +
'function dayColors() {' +
'  return colorsFor("customBgValue", "customTextValue", "customAccentValue");' +
'}' +
'function nightColors() {' +
'  return colorsFor("nightCustomBgValue", "nightCustomTextValue", "nightCustomAccentValue");' +
'}' +
'function fontPreviewColor() {' +
'  return "var(--text-strong)";' +
'}' +

'function canvasFontFor(previewCss, px, fontId) {' +
'  var familyMatch = /font-family:\\s*([^;]+);?/.exec(previewCss);' +
'  var family = familyMatch ? familyMatch[1] : "sans-serif";' +
'  var weightMatch = /font-weight:\\s*([^;]+);?/.exec(previewCss);' +
'  var weight = weightMatch ? weightMatch[1].trim() : "400";' +
'  var boldPrefix = (parseInt(weight, 10) >= 600 || weight === "bold") ? "bold " : "";' +
'  var italicPrefix = /font-style:\\s*italic/.test(previewCss) ? "italic " : "";' +
'  var fallback = italicPrefix + boldPrefix + px + "px " + family;' +
'  if (fontId !== undefined && fontId !== null) {' +
'    FontManager.ensure(fontId, updatePreview);' +
'    return FontManager.canvasFont(fontId, px, fallback);' +
'  }' +
'  return fallback;' +
'}' +

'function esc(str) {' +
'  return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");' +
'}' +

'var FONT_LOOKUP = ' + JSON.stringify(FONT_LOOKUP) + ';' +
'var BW_FONT_IDS = ' + JSON.stringify(platform.BW_FONT_IDS) + ';' +
fontManagerSource +
'FontManager.init(FONT_LOOKUP);' +
'var FONT_CATEGORIES = ' + JSON.stringify(FONT_CATEGORIES) + ';' +
'var EXAMPLE_STYLE_COUNT = ' + EXAMPLE_STYLE_COUNT + ';' +
'var FONT_PREVIEW_IMAGES = ' + JSON.stringify(FONT_PREVIEW_IMAGES) + ';' +
'function fontLookupEntry(id) {' +
'  id = parseInt(id, 10);' +
'  for (var i = 0; i < FONT_LOOKUP.length; i++) {' +
'    if (FONT_LOOKUP[i].id === id) return FONT_LOOKUP[i];' +
'  }' +
'  return FONT_LOOKUP[0];' +
'}' +
'function fontFlag(v) {' +
'  if (v === "false") return false;' +
'  if (v === "true") return true;' +
'  return !!v;' +
'}' +
'function fontPickerPreviewPx(sizePx) {' +
'  return Math.max(11, Math.min(26, Math.round(sizePx * 0.5)));' +
'}' +

'var FONT_PICKER_ROLES = {' +
'  cornerFont: { selectId: "cornerFont", triggerId: "cornerFontTrigger", title: "Font", onlyMainClock: false, showIncompatibleToggle: true,' +
'    previewText: function () { return "-10\\u00b0C"; } },' +
'  markerTextFont: { selectId: "markerTextFont", triggerId: "markerTextFontTrigger", title: "Font", onlyMainClock: false, showIncompatibleToggle: false,' +
'    previewText: function () { var roman = document.getElementById("markerTextRoman"); return (roman && roman.checked) ? "XII" : "12"; } }' +
'};' +
'var currentFontPickerRole = null;' +

'var fontPickerActiveCategories = ["all"];' +
'var fontPickerPreAllCategories = [];' +

'function fontCategoryDef(id) {' +
'  for (var i = 0; i < FONT_CATEGORIES.length; i++) {' +
'    if (FONT_CATEGORIES[i].id === id) return FONT_CATEGORIES[i];' +
'  }' +
'  return null;' +
'}' +
'function fontMatchesCategoryFilters(f) {' +
'  if (fontPickerActiveCategories.indexOf("all") !== -1) return true;' +
'  var cats = f.categories || [];' +
'  return fontPickerActiveCategories.every(function (c) {' +
'    var def = fontCategoryDef(c);' +
'    if (def && def.sizeCategory) return f.sizeCategory === def.sizeCategory;' +
'    return cats.indexOf(c) !== -1;' +
'  });' +
'}' +

'function renderFontCategoryRow() {' +
'  var row = document.getElementById("fontPickerCategoryRow");' +
'  if (!row) return;' +
'  row.innerHTML = FONT_CATEGORIES.map(function (c) {' +
'    var active = fontPickerActiveCategories.indexOf(c.id) !== -1;' +
'    return \'<button type="button" class="font-category-btn\' + (active ? " active" : "") + \'" onclick="toggleFontCategory(\\\'\' + c.id + \'\\\')">\' + esc(c.label) + "</button>";' +
'  }).join("");' +
'}' +

'function toggleFontCategory(catId) {' +
'  if (catId === "all") {' +
'    if (fontPickerActiveCategories.indexOf("all") !== -1) {' +
'      fontPickerActiveCategories = fontPickerPreAllCategories.length ? fontPickerPreAllCategories.slice() : ["all"];' +
'    } else {' +
'      fontPickerPreAllCategories = fontPickerActiveCategories.slice();' +
'      fontPickerActiveCategories = ["all"];' +
'    }' +
'  } else {' +
'    var withoutAll = fontPickerActiveCategories.filter(function (c) { return c !== "all"; });' +
'    var idx = withoutAll.indexOf(catId);' +
'    if (idx !== -1) withoutAll.splice(idx, 1); else withoutAll.push(catId);' +
'    fontPickerActiveCategories = withoutAll.length ? withoutAll : ["all"];' +
'  }' +
'  renderFontCategoryRow();' +
'  renderFontPickerGrid();' +
'}' +

'function fontPreviewInnerHtml(fontId, role, text) {' +
'  var images = FONT_PREVIEW_IMAGES[fontId];' +
'  var src = images && images[role];' +
'  var color = fontPreviewColor();' +
'  if (src && !FontManager.customName(fontId)) {' +
'    var maskCss = "-webkit-mask-image:url(\'" + src + "\'); mask-image:url(\'" + src + "\'); background-color:" + color + ";";' +
'    return "<span class=\\\"font-preview-img\\\" role=\\\"img\\\" aria-label=\\\"" + esc(text) + "\\\" style=\\\"" + maskCss + "\\\"></span>";' +
'  }' +
'  var textStyle = "color:" + color + ";";' +
'  textStyle = FontManager.previewStyle(fontId, textStyle);' +
'  return "<span style=\\\"" + textStyle + "\\\">" + esc(text) + "</span>";' +
'}' +

'function updateFontTriggerLabel(role) {' +
'  var cfg = FONT_PICKER_ROLES[role];' +
'  if (!cfg) return;' +
'  var sel = document.getElementById(cfg.selectId);' +
'  var trigger = document.getElementById(cfg.triggerId);' +
'  if (!sel || !trigger) return;' +
'  var entry = fontLookupEntry(sel.value);' +
'  FontManager.ensure(entry.id, refreshAllFontTriggerLabels);' +
'  var preview = trigger.querySelector(".font-picker-preview");' +
'  var name = trigger.querySelector(".font-picker-name");' +
'  if (preview) {' +
'    preview.setAttribute("style", entry.preview + " font-size:" + fontPickerPreviewPx(entry.sizePx) + "px;");' +
'    preview.innerHTML = fontPreviewInnerHtml(entry.id, role, cfg.previewText());' +
'  }' +
'  if (name) name.textContent = entry.label;' +
'}' +
'function refreshAllFontTriggerLabels() {' +
'  Object.keys(FONT_PICKER_ROLES).forEach(updateFontTriggerLabel);' +
'}' +

'function fontImportTargetId() {' +
'  var sel = document.getElementById("fontImportTarget");' +
'  return sel ? parseInt(sel.value, 10) : null;' +
'}' +

'function updateFontImportStatus() {' +
'  var id = fontImportTargetId();' +
'  var status = document.getElementById("fontPickerImportStatus");' +
'  var clearBtn = document.getElementById("fontPickerClearImportBtn");' +
'  var name = id === null || isNaN(id) ? null : FontManager.customName(id);' +
'  if (status) status.textContent = name ? "Preview override: " + name : "";' +
'  if (clearBtn) clearBtn.style.display = name ? "" : "none";' +
'}' +

'function triggerFontImport() {' +
'  var id = fontImportTargetId();' +
'  if (id === null || isNaN(id)) return;' +
'  var input = document.getElementById("fontPickerImportInput");' +
'  if (input) input.click();' +
'}' +

'function onFontImportSelected() {' +
'  var id = fontImportTargetId();' +
'  var input = document.getElementById("fontPickerImportInput");' +
'  if (id === null || isNaN(id) || !input) return;' +
'  var status = document.getElementById("fontPickerImportStatus");' +
'  if (status) status.textContent = "Loading font…";' +
'  FontManager.importSelected(id, input, function () {' +
'    refreshAllFontTriggerLabels();' +
'    renderFontPickerGrid();' +
'    updatePreview();' +
'    updateFontImportStatus();' +
'    if (!FontManager.customName(id) && status) status.textContent = "Couldn\'t load that font file.";' +
'  });' +
'}' +

'function clearImportedFont() {' +
'  var id = fontImportTargetId();' +
'  if (id === null || isNaN(id)) return;' +
'  FontManager.clearCustom(id, function () {' +
'    refreshAllFontTriggerLabels();' +
'    renderFontPickerGrid();' +
'    updatePreview();' +
'    updateFontImportStatus();' +
'    var status = document.getElementById("fontPickerImportStatus");' +
'    if (status) status.textContent = "Using the normal preview font.";' +
'  });' +
'}' +

'function openFontPicker(role) {' +
'  currentFontPickerRole = role;' +
'  var cfg = FONT_PICKER_ROLES[role];' +
'  document.getElementById("fontPickerTitle").textContent = cfg.title;' +
'  var incompatibleRow = document.getElementById("fontPickerIncompatibleRow");' +
'  var showIncompatibleToggle = cfg.showIncompatibleToggle;' +
'  incompatibleRow.style.display = showIncompatibleToggle ? "" : "none";' +
'  if (showIncompatibleToggle) {' +
'    var currentId = document.getElementById(cfg.selectId).value;' +
'    document.getElementById("fontPickerShowIncompatible").checked = !fontFlag(fontLookupEntry(currentId).small);' +
'  }' +
'  updateFontImportStatus();' +
'  renderFontCategoryRow();' +
'  renderFontPickerGrid();' +
'  document.getElementById("fontPickerModal").className = "modal-overlay open";' +
'  scrollFontPickerToSelected();' +
'}' +
'function closeFontPicker() {' +
'  document.getElementById("fontPickerModal").className = "modal-overlay";' +
'}' +
'function scrollFontPickerToSelected() {' +
'  var container = document.querySelector("#fontPickerModal .modal-scroll-body");' +
'  var selected = document.querySelector("#fontPickerGrid .font-picker-btn.selected");' +
'  if (!container || !selected) return;' +
'  container.scrollTop = selected.offsetTop - (container.clientHeight + selected.offsetHeight + selected.offsetHeight);' +
'}' +
'function fontSizeCategoryLabel(category) {' +
'  var labels = { XS: "EXTRA SMALL", S: "SMALL", M: "MEDIUM", L: "LARGE", XL: "EXTRA LARGE" };' +
'  return labels[category] || "";' +
'}' +
'function fontSizeCategoryClass(category) {' +
'  return category === "XS" || category === "S" || category === "M" || category === "L" || category === "XL" ? category.toLowerCase() : "";' +
'}' +
'function fontTagsHtml(f) {' +
'  var tags = "";' +
'  (f.categories || []).forEach(function (c) {' +
'    var def = fontCategoryDef(c);' +
'    if (!def || def.sizeCategory) return;' +
'    tags += \'<span class="font-picker-tag">\' + esc(def.label) + "</span>";' +
'  });' +
'  if (!tags) return "";' +
'  var h = Math.round(Number(f.height));' +
'  return (isFinite(h) ? \'<span class="font-picker-tags-divider"></span><span class="font-picker-height">\' + h + \'</span><span class="font-picker-tags-divider"></span>\' : "") + tags;' +
'}' +
'function renderFontPickerGrid() {' +
'  var cfg = FONT_PICKER_ROLES[currentFontPickerRole];' +
'  if (!cfg) return;' +
'  var sel = document.getElementById(cfg.selectId);' +
'  var currentId = parseInt(sel.value, 10);' +
'  var showIncompatibleToggle = cfg.showIncompatibleToggle;' +
'  var showIncompatible = showIncompatibleToggle ? document.getElementById("fontPickerShowIncompatible").checked : true;' +
'  var previewText = cfg.previewText();' +
'  var html = "";' +
'  var pickerFonts = FONT_LOOKUP.slice().sort(function (a, b) {' +
'    var byLabel = String(a.label || "").localeCompare(String(b.label || ""), undefined, { sensitivity: "base" });' +
'    return byLabel || (a.id - b.id);' +
'  });' +
'  pickerFonts.forEach(function (f) {' +
'    if (cfg.onlyMainClock && !fontFlag(f.mainClock)) return;' +
'    if (SCREEN_BW && BW_FONT_IDS.indexOf(f.id) < 0 && f.id !== currentId) return;' +
'    if (!showIncompatible && !fontFlag(f.small) && f.id !== currentId) return;' +
'    if (!fontMatchesCategoryFilters(f)) return;' +
'    var previewStyle = f.preview + " font-size:" + fontPickerPreviewPx(f.sizePx) + "px;";' +
'    var sizeCategory = f.sizeCategory || "";' +
'    var sizeCategoryLabel = fontSizeCategoryLabel(sizeCategory);' +
'    var sizeCategoryClass = fontSizeCategoryClass(sizeCategory);' +
'    var tagsHtml = (sizeCategoryLabel ? \'<span class="font-picker-size font-picker-size-\' + sizeCategoryClass + \'">\' + sizeCategoryLabel + "</span>" : "") + fontTagsHtml(f);' +
'    html += \'<button type="button" class="font-picker-btn\' + (f.id === currentId ? " selected" : "") + \'" onclick="chooseFontOption(\' + f.id + \')">\' +' +
'      \'<span class="font-picker-preview" style="\' + previewStyle + \'">\' + fontPreviewInnerHtml(f.id, currentFontPickerRole, previewText) + "</span>" +' +
'      \'<span class="font-picker-name"><span>\' + esc(f.label) + \'</span>\' + (tagsHtml ? \'<span class="font-picker-tags">\' + tagsHtml + "</span>" : "") + "</span></button>";' +
'  });' +
'  document.getElementById("fontPickerGrid").innerHTML = html;' +
'  document.getElementById("fontPickerEmptyMsg").style.display = html ? "none" : "block";' +
'  document.getElementById("fontPickerResetFiltersBtn").style.display = html ? "none" : "block";' +
'}' +
'function resetFontCategoryFilters() {' +
'  fontPickerActiveCategories = ["all"];' +
'  fontPickerPreAllCategories = [];' +
'  renderFontCategoryRow();' +
'  renderFontPickerGrid();' +
'}' +
'function chooseFontOption(id) {' +
'  var cfg = FONT_PICKER_ROLES[currentFontPickerRole];' +
'  if (!cfg) return;' +
'  var sel = document.getElementById(cfg.selectId);' +
'  sel.value = id;' +
'  if (typeof Event === "function") sel.dispatchEvent(new Event("change"));' +
'  else { var evt = document.createEvent("HTMLEvents"); evt.initEvent("change", true, true); sel.dispatchEvent(evt); }' +
'  closeFontPicker();' +
'  refreshAllFontTriggerLabels();' +
'}' +

require('./config/config-preview') +

configBackground.backgroundScript(current) +
configBorder.borderScript() +

'var CONTENT_SELECT_IDS = ["cornerTL", "cornerTR", "cornerBL", "cornerBR", ' +
'  "upperMiddleLine1Content", "upperMiddleLine2Content", "bottomMiddleLine1Content", "bottomMiddleLine2Content", ' +
'  "middleLeftLine1Content", "middleLeftLine2Content", "middleRightLine1Content", "middleRightLine2Content"];' +
'var CORNER_CATEGORIES = ' + JSON.stringify(cornerCategoriesForClient) + ';' +
'var CORNER_PREVIEW_LABELS = {};' +
'CORNER_CATEGORIES.forEach(function (cat) {' +
'  cat.items.forEach(function (it) {' +
'    if (it.preview) CORNER_PREVIEW_LABELS[it.id] = it.preview;' +
'  });' +
'});' +
'var PRIMITIVE_DECOMPOSITIONS = ' + JSON.stringify(primitiveContentDecompositions) + ';' +
'var PRIMITIVE_PALETTE = ' + JSON.stringify(primitivePalette) + ';' +
'var PRIMITIVE_LABEL_BY_ID = {};' +
'PRIMITIVE_PALETTE.forEach(function (g) { g.items.forEach(function (it) { PRIMITIVE_LABEL_BY_ID[it.id] = it.label; }); });' +
'PRIMITIVE_LABEL_BY_ID[' + primitiveIds.PRIM_LABEL_HIGH_PREFIX + '] = "\\"H\\" label"; PRIMITIVE_LABEL_BY_ID[' + primitiveIds.PRIM_LABEL_LOW_PREFIX + '] = "\\"L\\" label";' +
'var PRIMITIVE_TRANSPORT_SEQUENCES = ' + JSON.stringify(primitiveTransportSequences) + ';' +
'var PRIMITIVE_TRANSPORT_AUX = ' + JSON.stringify(primitiveTransportAux) + ';' +
'var TIMEZONE_ZONES = ' + JSON.stringify(primitiveTimezoneZones) + ';' +
'var FORECAST_SLOTS = ' + JSON.stringify(primitiveForecastSlots) + ';' +
'var PRIMITIVE_PREVIEW_TEXT = ' + JSON.stringify(primitivePreviewText) + ';' +
'var PRIM_SPACE_ID = ' + primitiveIds.PRIM_SPACE + ';' +
'var PRIM_PLUGIN_TEXT_ID = ' + primitiveIds.PRIM_PLUGIN_TEXT + ';' +
configPlugins.pluginScript(current) +
'var COMPOSER_MAX = 10;' +
'\n' + composerClientSource + '\n' +
'function primitiveDecompositionText(contentId, forPreview) {' +
'  var idNum = parseInt(contentId, 10);' +
'  var chips = PRIMITIVE_DECOMPOSITIONS[idNum];' +
'  if (chips && chips.length) return chips.map(function (c, i) { var gap = forPreview && i > 0 && (c.kind === "icon" || chips[i - 1].kind === "icon"); return (gap ? "\\uE000" : "") + c.text; }).join("");' +
'  return CORNER_PREVIEW_LABELS[idNum] || "";' +
'}' +
'function primitiveChipsForContent(contentId) {' +
'  var idNum = parseInt(contentId, 10);' +
'  if (idNum === 0) return [];' +
'  if (PRIMITIVE_DECOMPOSITIONS[idNum]) return PRIMITIVE_DECOMPOSITIONS[idNum];' +
'  var fallback = CORNER_PREVIEW_LABELS[idNum];' +
'  return fallback ? [{ kind: "value", text: fallback }] : [];' +
'}' +
'function renderSlotEditPrimitiveStrip(contentId) {' +
'  var strip = document.getElementById("slotEditPrimitives");' +
'  if (!strip) return;' +
'  var chips = primitiveChipsForContent(contentId);' +
'  if (!chips.length) { strip.style.display = "none"; strip.innerHTML = ""; return; }' +
'  strip.style.display = "flex";' +
'  strip.innerHTML = chips.map(function (chip) {' +
'    return "<span class=\'primitive-chip primitive-chip-" + chip.kind + "\'>" + esc(chip.text) + "</span>";' +
'  }).join("");' +
'}' +
'function categoryForContentId(contentId) {' +
'  var idNum = parseInt(contentId, 10);' +
'  for (var i = 0; i < CORNER_CATEGORIES.length; i++) {' +
'    for (var j = 0; j < CORNER_CATEGORIES[i].items.length; j++) {' +
'      if (CORNER_CATEGORIES[i].items[j].id === idNum) return CORNER_CATEGORIES[i].id;' +
'    }' +
'  }' +
'  return "none";' +
'}' +
'function findCategory(categoryId) {' +
'  for (var i = 0; i < CORNER_CATEGORIES.length; i++) {' +
'    if (CORNER_CATEGORIES[i].id === categoryId) return CORNER_CATEGORIES[i];' +
'  }' +
'  return CORNER_CATEGORIES[0];' +
'}' +
'function categoryItemOptionsHtml(categoryId, selectedContentId) {' +
'  if (categoryId === "plugins") return pluginItemOptionsHtml(selectedContentId);' +
'  var items = findCategory(categoryId).items;' +
'  var html = "";' +
'  for (var i = 0; i < items.length; i++) {' +
'    if (items[i].oddOf) continue;' +
'    html += "<option value=\\"" + items[i].id + "\\"" + (String(selectedContentId) === String(items[i].id) ? " selected" : "") + ">" + items[i].label + "</option>";' +
'  }' +
'  return html;' +
'}' +
'var SLOT_DEFS = {' +
'  cornerTL: { contentId: "cornerTL", colorId: "cornerTLColor", customPrimsId: "cornerTLCustomPrims", btnId: "slotBtn-cornerTL", label: "Top-left", avail: function (a) { return !a.cornersGrayed; } },' +
'  cornerTR: { contentId: "cornerTR", colorId: "cornerTRColor", customPrimsId: "cornerTRCustomPrims", btnId: "slotBtn-cornerTR", label: "Top-right", avail: function (a) { return !a.cornersGrayed; } },' +
'  cornerBL: { contentId: "cornerBL", colorId: "cornerBLColor", customPrimsId: "cornerBLCustomPrims", btnId: "slotBtn-cornerBL", label: "Bottom-left", avail: function (a) { return !a.cornersGrayed; } },' +
'  cornerBR: { contentId: "cornerBR", colorId: "cornerBRColor", customPrimsId: "cornerBRCustomPrims", btnId: "slotBtn-cornerBR", label: "Bottom-right", avail: function (a) { return !a.cornersGrayed; } },' +
'  upperMiddleLine1: { contentId: "upperMiddleLine1Content", customPrimsId: "upperMiddleLine1CustomPrims", colorId: "upperMiddleLine1Color", btnId: "slotBtn-upperMiddleLine1", label: "Upper-middle, line 1", avail: function (a) { return a.upper; } },' +
'  upperMiddleLine2: { contentId: "upperMiddleLine2Content", customPrimsId: "upperMiddleLine2CustomPrims", colorId: "upperMiddleLine2Color", btnId: "slotBtn-upperMiddleLine2", label: "Upper-middle, line 2", avail: function (a) { return a.upper; } },' +
'  bottomMiddleLine1: { contentId: "bottomMiddleLine1Content", customPrimsId: "bottomMiddleLine1CustomPrims", colorId: "bottomMiddleLine1Color", btnId: "slotBtn-bottomMiddleLine1", label: "Bottom-middle, line 1", avail: function (a) { return a.bottom; } },' +
'  bottomMiddleLine2: { contentId: "bottomMiddleLine2Content", customPrimsId: "bottomMiddleLine2CustomPrims", colorId: "bottomMiddleLine2Color", btnId: "slotBtn-bottomMiddleLine2", label: "Bottom-middle, line 2", avail: function (a) { return a.bottom; } },' +
'  middleLeftLine1: { contentId: "middleLeftLine1Content", customPrimsId: "middleLeftLine1CustomPrims", colorId: "middleLeftLine1Color", btnId: "slotBtn-middleLeftLine1", label: "Middle-left, line 1", avail: function (a) { return a.left; } },' +
'  middleLeftLine2: { contentId: "middleLeftLine2Content", customPrimsId: "middleLeftLine2CustomPrims", colorId: "middleLeftLine2Color", btnId: "slotBtn-middleLeftLine2", label: "Middle-left, line 2", avail: function (a) { return a.left; } },' +
'  middleRightLine1: { contentId: "middleRightLine1Content", customPrimsId: "middleRightLine1CustomPrims", colorId: "middleRightLine1Color", btnId: "slotBtn-middleRightLine1", label: "Middle-right, line 1", avail: function (a) { return a.right; } },' +
'  middleRightLine2: { contentId: "middleRightLine2Content", customPrimsId: "middleRightLine2CustomPrims", colorId: "middleRightLine2Color", btnId: "slotBtn-middleRightLine2", label: "Middle-right, line 2", avail: function (a) { return a.right; } },' +
'};' +
'var CURRENT_SLOT_KEY = null;' +
'var SLOT_EDITOR_DRAFT_COLOR = 0;' +
'function computeSlotAvailability() {' +
'  var markerStyle = parseInt(document.getElementById("bigAnalogMarkerStyle").value, 10);' +
'  var override = document.getElementById("bitmapCornerOverride").checked;' +
'  if (markerStyle >= 11) markerStyle = 7;' +
'  var avail = { upper: false, bottom: false, left: false, right: false, cornersGrayed: false };' +
'    if (!isBitmapMarkerStyleId(markerStyle) && markerStyle !== 7) {' +
'      avail.upper = avail.bottom = avail.left = avail.right = true;' +
'    } else if (markerStyle === 3 || markerStyle === 4 || markerStyle === 6) {' +
'      avail.upper = avail.bottom = true; avail.left = avail.right = override; avail.cornersGrayed = !override;' +
'    } else if (markerStyle === 5) {' +
'      avail.upper = avail.bottom = avail.left = avail.right = true;' +
'    } else if (markerStyle === 7) {' +
'      avail.upper = avail.bottom = avail.left = avail.right = true; avail.cornersGrayed = !override;' +
'    } else {' +
'      avail.upper = true; avail.bottom = avail.left = avail.right = override; avail.cornersGrayed = !override;' +
'    }' +
'  if (SCREEN_ROUND) { avail.upper = avail.bottom = avail.left = avail.right = true; avail.cornersGrayed = true; }' +
'  if (SCREEN_BW) { avail.left = avail.right = false; }' +
'  return avail;' +
'}' +
'function slotIconLabels(text) {' +
'  return String(text).replace(/\\([A-Za-z+]{1,12}\\)/g, "(i)");' +
'}' +
'function slotButtonText(contentId) {' +
'  var idNum = parseInt(contentId, 10);' +
'  var chips = PRIMITIVE_DECOMPOSITIONS[idNum];' +
'  if (chips && chips.length) return chips.map(function (c) { return (c.kind === "icon" && c.text !== "LOGO") ? "(i)" : c.text; }).join("");' +
'  return slotIconLabels(CORNER_PREVIEW_LABELS[idNum] || "");' +
'}' +
'function renderSlotPicker() {' +
'  var avail = computeSlotAvailability();' +
'  var anyShake = false;' +
'  for (var key in SLOT_DEFS) {' +
'    var def = SLOT_DEFS[key];' +
'    var btn = document.getElementById(def.btnId);' +
'    var baseClass = btn.getAttribute("data-base-class");' +
'    if (!baseClass) { baseClass = btn.className; btn.setAttribute("data-base-class", baseClass); }' +
'    btn.style.display = "";' +
'    if (!def.avail(avail)) {' +
'      btn.textContent = "N/A";' +
'      btn.className = baseClass + " slot-na";' +
'      continue;' +
'    }' +
'    var val = parseInt(document.getElementById(def.contentId).value, 10);' +
'    var customEl = def.customPrimsId ? document.getElementById(def.customPrimsId) : null;' +
'    var customText = (customEl && customEl.value) ? composerPreviewLabel(customEl.value) : \"\";' +
'    if (customText) {' +
'      btn.textContent = slotIconLabels(customText);' +
'      btn.className = baseClass;' +
'    } else if (!val || !primitiveDecompositionText(val)) {' +
'      btn.textContent = "OFF";' +
'      btn.className = baseClass + " slot-off";' +
'    } else {' +
'      btn.textContent = (val >= PLUGIN_CONTENT_FIRST && val < PLUGIN_CONTENT_FIRST + PLUGIN_SLOT_COUNT) ? pluginButtonText(val) : slotButtonText(val);' +
'      btn.className = baseClass;' +
'    }' +
'    if (document.getElementById(key + "Shake").value === "1" && btn.className.indexOf("slot-off") === -1) { btn.className += " slot-shake"; anyShake = true; }' +
'  }' +
'  var legendEl = document.getElementById("slotShakeLegend");' +
'  if (legendEl) legendEl.style.display = anyShake ? "" : "none";' +
'}' +
'function setSlotEditorColorGroupVisibility(contentVal) {' +
'  var customOn = document.getElementById("slotEditCustomPrimsToggle").checked;' +
'  document.getElementById("slotEditColorGroup").style.display = (contentVal === "0" && !customOn) ? "none" : "flex";' +
'}' +
'function setSlotEditorColorButtons(value) {' +
'  SLOT_EDITOR_DRAFT_COLOR = parseInt(value, 10) || 0;' +
'  var buttons = document.getElementById("slotEditColorGroup").getElementsByClassName("mode-btn");' +
'  for (var i = 0; i < buttons.length; i++) {' +
'    buttons[i].className = "mode-btn" + (i === SLOT_EDITOR_DRAFT_COLOR ? " active" : "");' +
'  }' +
'}' +
'function slotEditorSelectColor(value) {' +
'  setSlotEditorColorButtons(value);' +
'  renderSlotEditPreview();' +
'}' +
'function onSlotEditContentChange() {' +
'  pluginResolveContentSelect(document.getElementById("slotEditContent"));' +
'  var contentVal = document.getElementById("slotEditContent").value;' +
'  setSlotEditorColorGroupVisibility(contentVal);' +
'  slotEditOddUpdate();' +
'  permissionWarningUpdate();' +
'  renderSlotEditPrimitiveStrip(contentVal);' +
'  renderSlotEditPreview();' +
'}' +
'function renderCategoryButtons() {' +
'  var group = document.getElementById("slotEditCategoryGroup");' +
'  group.innerHTML = CORNER_CATEGORIES.filter(function (c) { return c.id !== "none"; }).map(function (c) {' +
'    return \'<button type="button" class="category-btn" data-category="\' + c.id + \'" onclick="selectSlotEditCategory(\\\'\' + c.id + \'\\\')" title="\' + c.label + \'">\' + c.icon + \'</button>\';' +
'  }).join("");' +
'}' +
'function updateCategoryButtonActive(categoryId) {' +
'  var buttons = document.getElementById("slotEditCategoryGroup").getElementsByClassName("category-btn");' +
'  for (var i = 0; i < buttons.length; i++) {' +
'    buttons[i].className = "category-btn" + (buttons[i].getAttribute("data-category") === categoryId ? " active" : "");' +
'  }' +
'}' +
'function selectSlotEditCategory(categoryId) {' +
'  document.getElementById("slotEditCategory").value = categoryId;' +
'  updateCategoryButtonActive(categoryId);' +
'  onSlotEditCategoryChange();' +
'}' +
'function onSlotEditCategoryChange() {' +
'  var categoryId = document.getElementById("slotEditCategory").value;' +
'  var firstItemId = findCategory(categoryId).items[0].id;' +
'  var contentSelect = document.getElementById("slotEditContent");' +
'  contentSelect.innerHTML = categoryItemOptionsHtml(categoryId, categoryId === "plugins" ? "" : firstItemId);' +
'  contentSelect.disabled = slotEditContentDisabled(categoryId);' +
'  slotEditCategoryHelpUpdate(categoryId);' +
'  onSlotEditContentChange();' +
'}' +
'var ODD_TO_BASE = {}, BASE_TO_ODD = {};' +
'(function () { CORNER_CATEGORIES.forEach(function (c) { c.items.forEach(function (it) { if (it.oddOf) { ODD_TO_BASE[String(it.id)] = String(it.oddOf); BASE_TO_ODD[String(it.oddOf)] = String(it.id); } }); }); })();' +
'function slotEditOddUpdate() {' +
'  var v = document.getElementById("slotEditContent").value;' +
'  var has = !!BASE_TO_ODD[v];' +
'  document.getElementById("slotEditOddRow").style.display = has ? "flex" : "none";' +
'  if (!has) document.getElementById("slotEditOdd").checked = false;' +
'}' +
'function openSlotEditor(slotKey) {' +
'  var def = SLOT_DEFS[slotKey];' +
'  if (!def) return;' +
'  CURRENT_SLOT_KEY = slotKey;' +
'  document.getElementById("slotEditTitle").textContent = def.label;' +
'  var contentVal = document.getElementById(def.contentId).value;' +
'  var oddOn = !!ODD_TO_BASE[contentVal];' +
'  if (oddOn) contentVal = ODD_TO_BASE[contentVal];' +
'  var colorVal = document.getElementById(def.colorId).value;' +
'  var categoryId = categoryForContentId(contentVal);' +
'  document.getElementById("slotEditCategory").value = categoryId;' +
'  updateCategoryButtonActive(categoryId);' +
'  var contentSelect = document.getElementById("slotEditContent");' +
'  contentSelect.innerHTML = categoryItemOptionsHtml(categoryId, contentVal);' +
'  contentSelect.disabled = slotEditContentDisabled(categoryId);' +
'  slotEditCategoryHelpUpdate(categoryId);' +
'  setSlotEditorColorGroupVisibility(contentVal);' +
'  renderSlotEditPrimitiveStrip(contentVal);' +
'  setSlotEditorColorButtons(colorVal);' +
'  composerOpen(def);' +
'  document.getElementById("slotEditShake").checked = document.getElementById(slotKey + "Shake").value === "1";' +
'  slotEditOddUpdate();' +
'  permissionWarningUpdate();' +
'  document.getElementById("slotEditOdd").checked = oddOn && !!BASE_TO_ODD[contentVal];' +
'  document.getElementById("slotEditModal").className = "modal-overlay open";' +
'  renderSlotEditPreview();' +
'}' +
'function closeSlotEditor() {' +
'  document.getElementById("slotEditModal").className = "modal-overlay";' +
'  CURRENT_SLOT_KEY = null;' +
'}' +
'function saveSlotEditor() {' +
'  if (!CURRENT_SLOT_KEY) return;' +
'  var def = SLOT_DEFS[CURRENT_SLOT_KEY];' +
'  var saveContent = document.getElementById("slotEditContent").value;' +
'  if (BASE_TO_ODD[saveContent] && document.getElementById("slotEditOdd").checked) saveContent = BASE_TO_ODD[saveContent];' +
'  document.getElementById(def.contentId).value = saveContent;' +
'  document.getElementById(def.colorId).value = String(SLOT_EDITOR_DRAFT_COLOR);' +
'  document.getElementById(CURRENT_SLOT_KEY + "Shake").value = document.getElementById("slotEditShake").checked ? "1" : "0";' +
'  if (def.customPrimsId) {' +
'    var committed = composerCommitValue();' +
'    if (committed === null) return;' +
'    document.getElementById(def.customPrimsId).value = committed;' +
'  }' +
'  closeSlotEditor();' +
'  renderSlotPicker();' +
'  updateWeatherIconStyleVisibility();' +
'  updatePreview();' +
'}' +
'function updateWeatherIconStyleVisibility() {' +
'  updateWeatherIconStyleTriggerLabel();' +
'}' +

'function toggleFaqItem(index) {' +
'  var item = document.querySelectorAll(".faq-item")[index];' +
'  if (!item) return;' +
'  item.classList.toggle("open");' +
'}' +
'function filterFaq(rawQuery) {' +
'  var query = String(rawQuery || "").trim().toLowerCase();' +
'  var items = document.querySelectorAll(".faq-item");' +
'  var questionMatches = [];' +
'  var answerMatches = [];' +
'  for (var i = 0; i < FAQ_ITEMS.length; i++) {' +
'    var q = FAQ_ITEMS[i][0].toLowerCase();' +
'    var a = FAQ_ITEMS[i][1].toLowerCase();' +
'    if (!query || q.indexOf(query) !== -1) questionMatches.push(i);' +
'    else if (a.indexOf(query) !== -1) answerMatches.push(i);' +
'  }' +
'  var matches = query ? (questionMatches.length ? questionMatches : answerMatches) : questionMatches;' +
'  var visible = {};' +
'  for (var j = 0; j < matches.length; j++) visible[matches[j]] = true;' +
'  for (var k = 0; k < items.length; k++) {' +
'    var idx = parseInt(items[k].getAttribute("data-faq-index"), 10);' +
'    items[k].style.display = visible[idx] ? "" : "none";' +
'  }' +
'  var empty = document.getElementById("faqEmpty");' +
'  if (empty) empty.style.display = matches.length ? "none" : "block";' +
'}' +
'function refreshFaqSubheader() {' +
'  try { setSubheaderText("faq", FAQ_ITEMS.length + " answers about Modern and its settings"); } catch (e) {}' +
'}' +

'function toggleSection(id) {' +
'  var body = document.getElementById("section-" + id);' +
'  var chev = document.getElementById("chev-" + id);' +
'  var sub = document.getElementById("subhead-" + id);' +
'  if (!body) return;' +
'  var isOpen = body.style.display !== "none";' +
'  body.style.display = isOpen ? "none" : "";' +
'  if (chev) chev.className = isOpen ? "chevron" : "chevron open";' +
'  if (sub) sub.style.display = isOpen ? "" : "none";' +
'}' +
'function toggleSubsection(id) {' +
'  var body = document.getElementById("subsec-" + id);' +
'  var chev = document.getElementById("subsecchev-" + id);' +
'  var sub = document.getElementById("subsubhead-" + id);' +
'  if (!body) return;' +
'  var isOpen = body.style.display !== "none";' +
'  body.style.display = isOpen ? "none" : "";' +
'  if (chev) chev.className = isOpen ? "chevron" : "chevron open";' +
'  if (sub) sub.style.display = isOpen ? "" : "none";' +
'}' +
'function toggleHelp(id) {' +
'  var el = document.getElementById(id);' +
'  if (!el) return;' +
'  el.style.display = (el.style.display === "none") ? "" : "none";' +
'}' +
'function toggleSectionIntro(el) {' +
'  el.classList.toggle("expanded");' +
'}' +
'function stepSlider(id, delta) {' +
'  var el = document.getElementById(id);' +
'  if (!el) return;' +
'  var min = parseFloat(el.min), max = parseFloat(el.max);' +
'  var v = parseFloat(el.value) + delta;' +
'  if (!isNaN(min) && v < min) v = min;' +
'  if (!isNaN(max) && v > max) v = max;' +
'  el.value = v;' +
'  if (el.oninput) el.oninput();' +
'  else if (el.onchange) el.onchange();' +
'}' +

'var SLIDER_HOLD_TIMER = null;' +
'var SLIDER_HOLD_INTERVAL = null;' +
'function parseStepSliderArgs(btn) {' +
'  var attr = btn.getAttribute("onclick") || "";' +
'  var m = attr.match(/stepSlider\\(\'([^\']+)\',\\s*(-?\\d+)\\)/);' +
'  return m ? { id: m[1], delta: parseInt(m[2], 10) } : null;' +
'}' +
'function stopSliderHold() {' +
'  if (SLIDER_HOLD_TIMER) { clearTimeout(SLIDER_HOLD_TIMER); SLIDER_HOLD_TIMER = null; }' +
'  if (SLIDER_HOLD_INTERVAL) { clearInterval(SLIDER_HOLD_INTERVAL); SLIDER_HOLD_INTERVAL = null; }' +
'}' +
'function startSliderHold(btn) {' +
'  var args = parseStepSliderArgs(btn);' +
'  if (!args) return;' +
'  stopSliderHold();' +
'  SLIDER_HOLD_TIMER = setTimeout(function () {' +
'    SLIDER_HOLD_INTERVAL = setInterval(function () { stepSlider(args.id, args.delta); }, 90);' +
'  }, 400);' +
'}' +
'document.addEventListener("mousedown", function (e) {' +
'  var btn = e.target.closest && e.target.closest(".slider-step-btn");' +
'  if (btn) { startSliderHold(btn); e.preventDefault(); }' +
'});' +
'document.addEventListener("touchstart", function (e) {' +
'  var btn = e.target.closest && e.target.closest(".slider-step-btn");' +
'  if (btn) startSliderHold(btn);' +
'}, { passive: true });' +
'["mouseup", "mouseleave", "touchend", "touchcancel"].forEach(function (ev) {' +
'  document.addEventListener(ev, stopSliderHold);' +
'});' +

'function onBitmapMarkerTransparentChange() {' +
'  updatePreview();' +
'}' +
'function onMarkerStyleChange() {' +
'  var val = document.getElementById("bigAnalogMarkerStyle").value;' +
'  applyMarkerStylePresetToCustom(val);' +
'  refreshEditButtonLabels();' +
'  document.getElementById("customMarkerSection").style.display = (val === "8") ? "" : "none";' +
'  var isBitmap = isBitmapMarkerStyleId(parseInt(val, 10));' +
'  document.getElementById("bitmapMarkerTransparentRow").style.display = isBitmap ? "" : "none";' +
'  document.getElementById("bitmapMarkerInvertRow").style.display = (isBitmap && ' + (platform.bw ? 'false' : 'true') + ') ? "" : "none";' +
'  document.getElementById("bitmapCornerOverrideRow").style.display = (isBitmap && val !== "5") ? "" : "none";' +
'  updateMarkerStyleButtonLabel();' +
'  clearGrayedSlotsIfUnavailable();' +
'  renderSlotPicker();' +
'  updatePreview();' +
'}' +
'function clearGrayedSlotsIfUnavailable() {' +
'  var avail = computeSlotAvailability();' +
'  if (avail.cornersGrayed) {' +
'    var cornerIds = ["cornerTL", "cornerTR", "cornerBL", "cornerBR"];' +
'    for (var i = 0; i < cornerIds.length; i++) { document.getElementById(cornerIds[i]).value = "0"; document.getElementById(cornerIds[i] + "CustomPrims").value = ""; document.getElementById(cornerIds[i] + "Shake").value = "0"; }' +
'  }' +
'  if (!avail.left) {' +
'    document.getElementById("middleLeftLine1Content").value = "0";' +
'    document.getElementById("middleLeftLine2Content").value = "0";' +
'    document.getElementById("middleLeftLine1CustomPrims").value = "";' +
'    document.getElementById("middleLeftLine2CustomPrims").value = "";' +
'    document.getElementById("middleLeftLine1Shake").value = "0";' +
'    document.getElementById("middleLeftLine2Shake").value = "0";' +
'  }' +
'  if (!avail.right) {' +
'    document.getElementById("middleRightLine1Content").value = "0";' +
'    document.getElementById("middleRightLine2Content").value = "0";' +
'    document.getElementById("middleRightLine1CustomPrims").value = "";' +
'    document.getElementById("middleRightLine2CustomPrims").value = "";' +
'    document.getElementById("middleRightLine1Shake").value = "0";' +
'    document.getElementById("middleRightLine2Shake").value = "0";' +
'  }' +
'}' +
'function onBitmapCornerOverrideChange() {' +
'  clearGrayedSlotsIfUnavailable();' +
'  renderSlotPicker();' +
'  updatePreview();' +
'}' +

'var CM_FIELDS = ["Style", "Thickness", "InnerThickness", "InnerEcc", "OuterEcc", "InnerBorder", "OuterBorder", "Translucent", "Color"];' +
'var CM_CHECKBOX_FIELDS = ["Translucent"];' +
'function cmHiddenPrefix(kind) { return kind === "hour" ? "customHour" : "customSec"; }' +
'function cmPopupPrefix(kind) { return kind === "hour" ? "cmHour" : "cmSec"; }' +
'var MARKER_STYLE_PRESET_FIELDS = ' + JSON.stringify(MARKER_STYLE_PRESET_FIELDS) + ';' +
'var MARKER_PRESETS = {' +
'  hour: {' +
'    small:   { Style: "1", Thickness: "1", InnerEcc: "0", OuterEcc: "0", InnerBorder: "0", OuterBorder: "100" },' +
'    big:     { Style: "2", Thickness: "3", InnerEcc: "0", OuterEcc: "0", InnerBorder: "0", OuterBorder: "100" },' +
'  },' +
'  sec: {' +
'    small:   { Style: "1", Thickness: "1", InnerEcc: "0", OuterEcc: "0", InnerBorder: "60", OuterBorder: "100" },' +
'    big:     { Style: "1", Thickness: "1", InnerEcc: "0", OuterEcc: "0", InnerBorder: "60", OuterBorder: "100" },' +
'  }' +
'};' +
'var MARKER_POPUP_PRESET_STYLE_IDS = { minimal: "10", braun: "1", swiss: "2", classy: "9" };' +
'var MARKER_POPUP_PRESET_GEOMETRY = ["Style", "Thickness", "InnerThickness", "InnerEcc", "OuterEcc", "InnerBorder", "OuterBorder"];' +
'Object.keys(MARKER_POPUP_PRESET_STYLE_IDS).forEach(function (name) {' +
'  var fields = MARKER_STYLE_PRESET_FIELDS[MARKER_POPUP_PRESET_STYLE_IDS[name]];' +
'  ["hour", "sec"].forEach(function (kind) {' +
'    var geometry = {};' +
'    MARKER_POPUP_PRESET_GEOMETRY.forEach(function (f) { geometry[f] = fields[kind][f]; });' +
'    MARKER_PRESETS[kind][name] = geometry;' +
'  });' +
'});' +
'function applyMarkerStylePresetToCustom(styleVal) {' +
'  var fields = MARKER_STYLE_PRESET_FIELDS[styleVal];' +
'  if (!fields) return false;' +
'  ["hour", "sec"].forEach(function (kind) {' +
'    var hp = cmHiddenPrefix(kind);' +
'    CM_FIELDS.forEach(function (f) {' +
'      var hidden = document.getElementById(hp + f);' +
'      if (hidden && fields[kind][f] !== undefined) hidden.value = fields[kind][f];' +
'    });' +
'  });' +
'  applyMarkerTextPresetFields(fields.text);' +
'  return true;' +
'}' +
'function setMarkMask(kind, mask) {' +
'  document.getElementById(kind === "hour" ? "markerTextHourMask" : "markerTextSecMask").value = String(mask);' +
'  var m = parseInt(mask, 10) || 0;' +
'  for (var i = 0; i < 12; i++) {' +
'    var btn = document.getElementById("markBtn-" + kind + "-" + i);' +
'    if (btn) btn.className = "mark-btn" + ((m & (1 << i)) ? " active" : "");' +
'  }' +
'}' +
'function applyMarkerTextPresetFields(t) {' +
'  if (!t) return;' +
'  document.getElementById("markerTextFont").value = t.Font;' +
'  document.getElementById("markerTextRoman").checked = t.Roman === "true";' +
'  document.getElementById("markerTextOffset").value = t.Offset;' +
'  document.getElementById("markerTextOffsetVal").textContent = t.Offset + "px";' +
'  setMarkMask("hour", t.HourMask);' +
'  setMarkMask("sec", t.SecMask);' +
'  selectModeButton("markerTextTargetGroup", "markerTextTarget", t.Target);' +
'  onMarkerTextFontChange();' +
'  onMarkerTextTargetChange();' +
'  refreshAllFontTriggerLabels();' +
'}' +
'function updateCustomMarkerValLabels(kind) {' +
'  var p = cmPopupPrefix(kind);' +
'  ["Thickness", "InnerThickness", "InnerEcc", "OuterEcc", "InnerBorder", "OuterBorder"].forEach(function (f) {' +
'    var el = document.getElementById(p + f);' +
'    var out = document.getElementById(p + f + "Val");' +
'    if (el && out) out.textContent = el.value + ((f === "Thickness" || f === "InnerThickness") ? "px" : "%");' +
'  });' +
'}' +
'function updateCustomMarkerRowVisibility(kind) {' +
'  var p = cmPopupPrefix(kind);' +
'  var styleEl = document.getElementById(p + "Style");' +
'  if (!styleEl) return;' +
'  var isNone = styleEl.value === "none";' +
'  var isTapered = styleEl.value === "4";' +
'  var geomWrap = document.getElementById(p + "GeometryWrap");' +
'  var noneHelp = document.getElementById(p + "NoneHelp");' +
'  var innerRow = document.getElementById(p + "InnerThicknessRow");' +
'  var innerHelp = document.getElementById(p + "InnerThicknessHelp");' +
'  var thicknessHelp = document.getElementById(p + "ThicknessHelp");' +
'  if (geomWrap) geomWrap.style.display = isNone ? "none" : "";' +
'  if (noneHelp) noneHelp.style.display = isNone ? "" : "none";' +
'  if (innerRow) innerRow.style.display = isTapered ? "" : "none";' +
'  if (innerHelp) innerHelp.style.display = isTapered ? "" : "none";' +
'  if (thicknessHelp) thicknessHelp.style.display = isTapered ? "none" : "";' +
'}' +
'function cmHourStyleChange(val) { onCustomMarkerStyleChange("hour", val); }' +
'function cmSecStyleChange(val) { onCustomMarkerStyleChange("sec", val); }' +
'function onCustomMarkerStyleChange(kind, val) {' +
'  var p = cmPopupPrefix(kind);' +
'  selectModeButton(p + "StyleGroup", p + "Style", val);' +
'  updateCustomMarkerRowVisibility(kind);' +
'}' +
'function onCustomMarkerSliderInput(kind) {' +
'  updateCustomMarkerValLabels(kind);' +
'}' +
'function onCustomMarkerBorderInput(kind, isInner) {' +
'  var p = cmPopupPrefix(kind);' +
'  var innerEl = document.getElementById(p + "InnerBorder"), outerEl = document.getElementById(p + "OuterBorder");' +
'  var innerVal = parseInt(innerEl.value, 10), outerVal = parseInt(outerEl.value, 10);' +
'  outerEl.min = innerVal;' +
'  if (outerVal < innerVal) outerEl.value = innerVal;' +
'  updateCustomMarkerValLabels(kind);' +
'}' +
'function openCustomMarkerEditor(kind) {' +
'  var hp = cmHiddenPrefix(kind), p = cmPopupPrefix(kind);' +
'  CM_FIELDS.forEach(function (f) {' +
'    var hidden = document.getElementById(hp + f);' +
'    var popupEl = document.getElementById(p + f);' +
'    if (!hidden || !popupEl) return;' +
'    if (CM_CHECKBOX_FIELDS.indexOf(f) !== -1) { popupEl.checked = hidden.value === "true"; } else { popupEl.value = hidden.value; }' +
'  });' +
'  if (document.getElementById(hp + "Thickness").value === "0") {' +
'    document.getElementById(p + "Style").value = "none";' +
'  }' +
'  refreshModeButtonGroup(p + "StyleGroup", p + "Style");' +
'  refreshModeButtonGroup(p + "ColorGroup", p + "Color");' +
'  document.getElementById(p + "OuterBorder").min = document.getElementById(p + "InnerBorder").value;' +
'  updateCustomMarkerValLabels(kind);' +
'  updateCustomMarkerRowVisibility(kind);' +
'  document.getElementById("customMarkerModal-" + kind).className = "modal-overlay open";' +
'}' +
'function closeCustomMarkerEditor(kind) {' +
'  document.getElementById("customMarkerModal-" + kind).className = "modal-overlay";' +
'}' +
'function saveCustomMarkerEditor(kind) {' +
'  var hp = cmHiddenPrefix(kind), p = cmPopupPrefix(kind);' +
'  var isNone = document.getElementById(p + "Style").value === "none";' +
'  CM_FIELDS.forEach(function (f) {' +
'    var hidden = document.getElementById(hp + f);' +
'    var popupEl = document.getElementById(p + f);' +
'    if (!hidden || !popupEl) return;' +
'    if (isNone && f === "Style") { hidden.value = "0"; return; }' +
'    if (isNone && f === "Thickness") { hidden.value = "0"; return; }' +
'    hidden.value = (CM_CHECKBOX_FIELDS.indexOf(f) !== -1) ? String(popupEl.checked) : popupEl.value;' +
'  });' +
'  closeCustomMarkerEditor(kind);' +
'  refreshEditButtonLabels();' +
'  updatePreview();' +
'}' +
'function applyMarkerPreset(kind, name) {' +
'  var p = cmPopupPrefix(kind);' +
'  var preset = MARKER_PRESETS[kind][name];' +
'  if (!preset) return;' +
'  CM_FIELDS.forEach(function (f) {' +
'    var el = document.getElementById(p + f);' +
'    if (!el || preset[f] === undefined) return;' +
'    if (CM_CHECKBOX_FIELDS.indexOf(f) !== -1) { el.checked = preset[f] === true || preset[f] === "true"; } else { el.value = preset[f]; }' +
'  });' +
'  refreshModeButtonGroup(p + "StyleGroup", p + "Style");' +
'  refreshModeButtonGroup(p + "ColorGroup", p + "Color");' +
'  document.getElementById(p + "OuterBorder").min = document.getElementById(p + "InnerBorder").value;' +
'  updateCustomMarkerValLabels(kind);' +
'  updateCustomMarkerRowVisibility(kind);' +
'}' +
'function copyMarkerConfig(kind) {' +
'  var otherKind = kind === "hour" ? "sec" : "hour";' +
'  var otherHiddenPrefix = cmHiddenPrefix(otherKind), p = cmPopupPrefix(kind);' +
'  CM_FIELDS.forEach(function (f) {' +
'    var src = document.getElementById(otherHiddenPrefix + f);' +
'    var dst = document.getElementById(p + f);' +
'    if (!src || !dst) return;' +
'    if (CM_CHECKBOX_FIELDS.indexOf(f) !== -1) { dst.checked = src.value === "true"; } else { dst.value = src.value; }' +
'  });' +
'  if (document.getElementById(otherHiddenPrefix + "Thickness").value === "0") {' +
'    document.getElementById(p + "Style").value = "none";' +
'  }' +
'  refreshModeButtonGroup(p + "StyleGroup", p + "Style");' +
'  document.getElementById(p + "OuterBorder").min = document.getElementById(p + "InnerBorder").value;' +
'  updateCustomMarkerValLabels(kind);' +
'  updateCustomMarkerRowVisibility(kind);' +
'}' +
'function selectMarkerTextTarget(val) {' +
'  selectModeButton("markerTextTargetGroup", "markerTextTarget", val);' +
'  onMarkerTextTargetChange();' +
'  refreshEditButtonLabels();' +
'}' +
'function onMarkerTextTargetChange() {' +
'  var val = document.getElementById("markerTextTarget").value;' +
'  document.getElementById("markerTextOptions").style.display = (val === "0") ? "none" : "";' +
'  document.getElementById("markerTextHourGrid").style.display = (val === "1") ? "" : "none";' +
'  document.getElementById("markerTextSecGrid").style.display = (val === "2") ? "" : "none";' +
'  updatePreview();' +
'}' +
'function onMarkerTextFontChange() {' +
'  var font = document.getElementById("markerTextFont").value;' +
'  var romanBox = document.getElementById("markerTextRoman");' +
'  var romanHelp = document.getElementById("markerTextRomanHelp");' +
'  var incompatible = !fontFlag(fontLookupEntry(font).romanOk);' +
'  romanBox.disabled = incompatible;' +
'  if (incompatible) romanBox.checked = false;' +
'  if (romanHelp) romanHelp.textContent = incompatible ?' +
'    "Not available with this font -- its glyphs don\'t support Roman numerals correctly." :' +
'    "Shows I, II, III... instead of 1, 2, 3... -- independent of the font above.";' +
'  updatePreview();' +
'}' +
'function openTextMarkerEditor() {' +
'  document.getElementById("textMarkerModal").className = "modal-overlay open";' +
'}' +
'function closeTextMarkerEditor() {' +
'  document.getElementById("textMarkerModal").className = "modal-overlay";' +
'}' +
'function openCenterCircleEditor() {' +
'  document.getElementById("centerCircleModal").className = "modal-overlay open";' +
'}' +
'function closeCenterCircleEditor() {' +
'  document.getElementById("centerCircleModal").className = "modal-overlay";' +
'}' +
'function openShadowStyleEditor() {' +
'  document.getElementById("shadowStyleModal").className = "modal-overlay open";' +
'}' +
'function closeShadowStyleEditor() {' +
'  document.getElementById("shadowStyleModal").className = "modal-overlay";' +
'}' +
'function toggleMarkBtn(kind, i) {' +
'  var hiddenId = kind === "hour" ? "markerTextHourMask" : "markerTextSecMask";' +
'  var hidden = document.getElementById(hiddenId);' +
'  var mask = parseInt(hidden.value, 10) || 0;' +
'  var btn = document.getElementById("markBtn-" + kind + "-" + i);' +
'  var bit = 1 << i;' +
'  if (mask & bit) { mask &= ~bit; btn.className = "mark-btn"; } else { mask |= bit; btn.className = "mark-btn active"; }' +
'  hidden.value = String(mask);' +
'}' +

'var HE_FIELDS = ["Style", "Width", "Length", "BackOffset", "MiddleOffset", "SecondaryWidth", "Color", "OutlineEnabled", "OutlineColor", "Translucent", "ShadowEnabled", "ShadowDistance", "Hollow", "HollowThickness"];' +
'var HE_CHECKBOX_FIELDS = ["OutlineEnabled", "Translucent", "ShadowEnabled", "Hollow"];' +
'var HAND_STYLES_WITH_MIDDLE = ["3", "4", "5", "6", "7", "8", "9", "10"];' +
'var HAND_STYLES_WITH_SECONDARY = ["3", "4", "5", "6", "7", "9", "10"];' +
'var HAND_COPY_SOURCE = { hour: "min", min: "hour", sec: "min" };' +
'function heHiddenPrefix(kind) { return kind === "hour" ? "handHour" : (kind === "min" ? "handMin" : "handSec"); }' +
'function hePopupPrefix(kind) { return "he" + kind.charAt(0).toUpperCase() + kind.slice(1); }' +
'var HAND_PRESETS = ' + JSON.stringify(HAND_PRESETS) + ';' +
'function applyHandPresetToKind(kind, preset) {' +
'  var hp = heHiddenPrefix(kind);' +
'  for (var f in preset) {' +
'    var hidden = document.getElementById(hp + f);' +
'    if (hidden) hidden.value = preset[f];' +
'  }' +
'}' +
'function applyHandPresetExtras(entry) {' +
'  if (entry.centerCircle) {' +
'    if (entry.centerCircle.Radius !== undefined) {' +
'      document.getElementById("centerCircleRadius").value = entry.centerCircle.Radius;' +
'      var radiusVal = document.getElementById("centerCircleRadiusVal");' +
'      if (radiusVal) radiusVal.textContent = entry.centerCircle.Radius + "px";' +
'    }' +
'    if (entry.centerCircle.Color !== undefined) document.getElementById("centerCircleColor").value = entry.centerCircle.Color;' +
'    if (entry.centerCircle.Outline !== undefined) document.getElementById("centerCircleOutline").value = entry.centerCircle.Outline;' +
'  }' +
'  if (entry.shadow) {' +
'    if (entry.shadow.Translucent !== undefined) {' +
'      document.getElementById("shadowTranslucent").value = entry.shadow.Translucent;' +
'      refreshModeButtonGroup("shadowTranslucentGroup", "shadowTranslucent");' +
'    }' +
'    if (entry.shadow.Angle !== undefined) {' +
'      document.getElementById("shadowAngle").value = entry.shadow.Angle;' +
'      var angleVal = document.getElementById("shadowAngleVal");' +
'      if (angleVal) angleVal.textContent = entry.shadow.Angle + "\\u00b0";' +
'    }' +
'  }' +
'}' +
'function renderHandStyleGrid() {' +
'  var grid = document.getElementById("handStyleGrid");' +
'  if (!grid) return;' +
'  var html = "";' +
'  for (var n = 1; n <= 9; n++) {' +
'    var entry = HAND_PRESETS[String(n)];' +
'    if (!entry) continue;' +
'    var img = HAND_STYLE_IMAGES[String(n)];' +
'    html += \'<button type="button" class="style-picker-btn" onclick="chooseHandStyle(\' + n + \')">\' +' +
'      (img ? \'<img src="\' + img + \'" alt="\' + entry.title + \'">\' : \'<span class="style-picker-btn-empty">\' + entry.title + "</span>") +' +
'      \'<span class="style-picker-btn-cap-top">\' + entry.title + "</span></button>";' +
'  }' +
'  grid.innerHTML = html;' +
'}' +
'function openHandStyleModal() {' +
'  document.getElementById("handStyleModal").className = "modal-overlay open";' +
'}' +
'function closeHandStyleModal() {' +
'  document.getElementById("handStyleModal").className = "modal-overlay";' +
'}' +
'function chooseHandStyle(n) {' +
'  var entry = HAND_PRESETS[String(n)];' +
'  if (!entry) return;' +
'  applyHandPresetToKind("hour", entry.hour);' +
'  applyHandPresetToKind("min", entry.min);' +
'  applyHandPresetToKind("sec", entry.sec);' +
'  applyHandPresetExtras(entry);' +
'  closeHandStyleModal();' +
'  updateHandStyleButtonLabel();' +
'  refreshEditButtonLabels();' +
'  updatePreview();' +
'}' +
'function chooseHandStyleCustom() {' +
'  closeHandStyleModal();' +
'  updateHandStyleButtonLabel();' +
'}' +
'function handKindMatchesPresetFields(kind, presetFields) {' +
'  var hp = heHiddenPrefix(kind);' +
'  for (var f in presetFields) {' +
'    var el = document.getElementById(hp + f);' +
'    if (!el || el.value !== String(presetFields[f])) return false;' +
'  }' +
'  return true;' +
'}' +
'function computeHandStylePresetNumber() {' +
'  for (var n = 1; n <= 9; n++) {' +
'    var entry = HAND_PRESETS[String(n)];' +
'    if (!entry) continue;' +
'    if (handKindMatchesPresetFields("hour", entry.hour) && handKindMatchesPresetFields("min", entry.min) &&' +
'        handKindMatchesPresetFields("sec", entry.sec)) {' +
'      return n;' +
'    }' +
'  }' +
'  return null;' +
'}' +
'function computeHandStyleLabel() {' +
'  var n = computeHandStylePresetNumber();' +
'  return n ? HAND_PRESETS[String(n)].title : "Custom";' +
'}' +
'function updateHandStyleButtonLabel() {' +
'  var span = document.getElementById("handStyleTriggerLabel");' +
'  if (span) span.textContent = computeHandStyleLabel();' +
'}' +
'function setPreviewThumbnail(elId, html) {' +
'  var el = document.getElementById(elId);' +
'  if (!el || el.innerHTML === html) return;' +
'  el.innerHTML = html;' +
'}' +
'function refreshHandsSubsectionPreview() {' +
'  var n = computeHandStylePresetNumber();' +
'  var img = n ? HAND_STYLE_IMAGES[String(n)] : null;' +
'  setPreviewThumbnail("subsecpreview-hands", img ? (\'<img src="\' + img + \'" alt="">\') : "");' +
'  var title = n ? HAND_PRESETS[String(n)].title : "Custom";' +
'  var anyShadow = ["hour", "min", "sec"].some(function (kind) {' +
'    var el = document.getElementById(heHiddenPrefix(kind) + "ShadowEnabled");' +
'    return el && el.value === "true";' +
'  });' +
'  setSubsubheaderText("hands", title + " hands" + (anyShadow ? ", shadow on" : ""));' +
'}' +
'function refreshIndicesSubsectionPreview() {' +
'  var val = document.getElementById("bigAnalogMarkerStyle").value;' +
'  var bmp = MARKER_BITMAP_STYLES.concat(MARKER_VARIANT_STYLES).filter(function (s) { return s.value === val; })[0];' +
'  var img = null, isBitmap = false;' +
'  if (bmp) { img = MARKER_PREVIEW_IMAGES[val]; isBitmap = true; }' +
'  else {' +
'    var preset = MARKER_PRESET_STYLES.filter(function (s) { return s.value === val; })[0];' +
'    if (preset) img = MARKER_PRESET_IMAGES[preset.image];' +
'  }' +
'  setPreviewThumbnail("subsecpreview-indices", img ? (\'<img class="\' + "bitmap-marker-img" + \'" src="\' + img + \'" alt="">\') : "");' +
'  var title = MARKER_STYLE_TITLES.hasOwnProperty(val) ? MARKER_STYLE_TITLES[val] : "Custom";' +
'  setSubsubheaderText("indices", val === "0" ? "No indices" : title + " indices");' +
'}' +

'var MARKER_BITMAP_STYLES = [' +
'  { value: "3", title: "Modern" },' +
'  { value: "4", title: ' + JSON.stringify(markerTitle('4', 'Shadow')) + ' },' +
'  { value: "5", title: "Tally" },' +
'  { value: "6", title: "Bell" },' +
'  { value: "7", title: "Fancy" }' +
'];' +
'var MARKER_VARIANT_STYLES = ' + JSON.stringify(MARKER_VARIANT_STYLES) + ';' +
'var MARKER_PRESET_STYLES = [' +
'  { value: "9", title: "Classy", image: "classy" },' +
'  { value: "10", title: "Minimal", image: "minimal" },' +
'  { value: "1", title: "Braun", image: "braun" },' +
'  { value: "2", title: "Swiss", image: "swiss" }' +
'];' +
'var MARKER_STYLE_TITLES = { "0": "None", "8": "Custom" };' +
'MARKER_BITMAP_STYLES.concat(MARKER_PRESET_STYLES, MARKER_VARIANT_STYLES).forEach(function (s) { MARKER_STYLE_TITLES[s.value] = s.title; });' +
'function updateMarkerStyleButtonLabel() {' +
'  var span = document.getElementById("markerStyleTriggerLabel");' +
'  if (!span) return;' +
'  var val = document.getElementById("bigAnalogMarkerStyle").value;' +
'  span.textContent = MARKER_STYLE_TITLES.hasOwnProperty(val) ? MARKER_STYLE_TITLES[val] : "Custom";' +
'}' +
'function renderMarkerStyleGrid() {' +
'  var grid = document.getElementById("markerStyleGrid");' +
'  if (!grid) return;' +
'  var html = "";' +
'  MARKER_BITMAP_STYLES.forEach(function (s) {' +
'    var img = MARKER_PREVIEW_IMAGES[s.value];' +
'    html += \'<button type="button" class="style-picker-btn" onclick="chooseMarkerStyle(\\\'\' + s.value + \'\\\')">\' +' +
'      (img ? \'<img class="bitmap-marker-img" src="\' + img + \'" alt="\' + s.title + \'">\' : \'<span class="style-picker-btn-empty">\' + s.title + "</span>") +' +
'      \'<span class="style-picker-btn-cap">\' + s.title + "</span></button>";' +
'  });' +
'  MARKER_PRESET_STYLES.forEach(function (s) {' +
'    var img = MARKER_PRESET_IMAGES[s.image];' +
'    html += \'<button type="button" class="style-picker-btn" onclick="chooseMarkerStyle(\\\'\' + s.value + \'\\\')">\' +' +
'      (img ? \'<img class="bitmap-marker-img" src="\' + img + \'" alt="\' + s.title + \'">\' : \'<span class="style-picker-btn-empty">\' + s.title + "</span>") +' +
'      \'<span class="style-picker-btn-cap">\' + s.title + "</span></button>";' +
'  });' +
'  MARKER_VARIANT_STYLES.forEach(function (s) {' +
'    var img = MARKER_PREVIEW_IMAGES[s.value];' +
'    html += \'<button type="button" class="style-picker-btn" onclick="chooseMarkerStyle(\\\'\' + s.value + \'\\\')">\' +' +
'      (img ? \'<img class="bitmap-marker-img" src="\' + img + \'" alt="\' + s.title + \'">\' : \'<span class="style-picker-btn-empty">\' + s.title + "</span>") +' +
'      \'<span class="style-picker-btn-cap">\' + s.title + "</span></button>";' +
'  });' +
'  grid.innerHTML = html;' +
'}' +
'function openMarkerStyleModal() {' +
'  document.getElementById("markerStyleModal").className = "modal-overlay open";' +
'}' +
'function closeMarkerStyleModal() {' +
'  document.getElementById("markerStyleModal").className = "modal-overlay";' +
'}' +
'function chooseMarkerStyle(value) {' +
'  document.getElementById("bigAnalogMarkerStyle").value = value;' +
'  onMarkerStyleChange();' +
'  closeMarkerStyleModal();' +
'}' +
'function chooseMarkerStyleCustom() {' +
'  document.getElementById("bigAnalogMarkerStyle").value = "8";' +
'  onMarkerStyleChange();' +
'  closeMarkerStyleModal();' +
'}' +
'function onShadowAngleInput() {' +
'  var el = document.getElementById("shadowAngle");' +
'  var out = document.getElementById("shadowAngleVal");' +
'  if (el && out) out.textContent = el.value + "\u00b0";' +
'  updatePreview();' +
'}' +
'var PRESET_SCOPE_IDS = ["section-style", "section-colors", "section-corners", "section-animation"];' +
'function collectStyleCornersJson() {' +
'  var obj = {};' +
'  PRESET_SCOPE_IDS.forEach(function (containerId) {' +
'    var container = document.getElementById(containerId);' +
'    if (!container) return;' +
'    var els = container.querySelectorAll("input[id], select[id], textarea[id]");' +
'    els.forEach(function (el) {' +
'      if (el.type === "radio") {' +
'        if (el.checked) obj[el.name] = el.value;' +
'        return;' +
'      }' +
'      obj[el.id] = (el.type === "checkbox") ? el.checked : el.value;' +
'    });' +
'  });' +
'  if (typeof pluginSlotsInUse === "function" && typeof PLUGIN_SLOTS !== "undefined") {' +
'    var used = pluginSlotsInUse(), slots = [], any = false;' +
'    for (var si = 0; si < PLUGIN_SLOT_COUNT; si++) {' +
'      var sk = used[si] && typeof PLUGIN_SLOTS[si] === "string" ? PLUGIN_SLOTS[si] : "";' +
'      if (sk) any = true;' +
'      slots.push(sk);' +
'    }' +
'    if (any) obj.__pluginSlots = slots;' +
'  }' +
'  return obj;' +
'}' +
'function applyStyleCornersJson(obj) {' +
'  if (obj && Array.isArray(obj.__pluginSlots) && typeof PLUGIN_SLOTS !== "undefined") {' +
'    for (var psi = 0; psi < PLUGIN_SLOT_COUNT; psi++) PLUGIN_SLOTS[psi] = typeof obj.__pluginSlots[psi] === "string" ? obj.__pluginSlots[psi] : "";' +
'  }' +
'  if (obj && obj.usePluginBg === undefined && (obj.useCustomBg !== undefined || obj.useWeatherBg !== undefined)) {' +
'    var pbReset = document.getElementById("usePluginBg");' +
'    if (pbReset) pbReset.checked = false;' +
'  }' +
'  if (obj && obj.borderSource === undefined && obj.borderWeatherMode !== undefined) {' +
'    var bsrc = document.getElementById("borderSource");' + // styles saved before the ring had a source selector
'    if (bsrc) bsrc.value = String(obj.borderWeatherMode) !== "0" ? "1" : "0";' +
'  }' +
'  Object.keys(obj).forEach(function (id) {' +
'    if (id === "__pluginSlots") return;' +
'    var el = document.getElementById(id);' +
'    if (!el) {' +
'      var radio = document.querySelector(\'input[name="\' + id + \'"][value="\' + obj[id] + \'"]\');' +
'      if (radio) radio.checked = true;' +
'      return;' +
'    }' +
'    if (el.type === "checkbox") el.checked = !!obj[id]; else el.value = obj[id];' +
'  });' +
'  selectVerticalOption("bgAnimModeGroup", "bgAnimMode", document.getElementById("bgAnimMode").value);' +
'  selectVerticalOption("shakeAnimModeGroup", "shakeAnimMode", document.getElementById("shakeAnimMode").value);' +
'  bgAfterStyleApplied();' +
'  borderAfterStyleApplied();' +
'  onMarkerStyleChange();' +
'  updateHandStyleButtonLabel();' +
'  onCornerFontChange();' +
'  onShowSecondsChange();' +
'  updateColorRoleButtons();' +
'  updateColorRoleButtons("night");' +
'  renderSlotPicker();' +
'  refreshAllFontTriggerLabels();' +
'  refreshEditButtonLabels();' +
'  updatePreview();' +
'}' +
'function exportDesignJson() {' +
'  document.getElementById("presetExportBox").value = JSON.stringify(collectStyleCornersJson(), null, 2);' +
'}' +
'function copyExportBoxToClipboard() {' +
'  var box = document.getElementById("presetExportBox");' +
'  var status = document.getElementById("presetExportStatus");' +
'  if (!box.value) exportDesignJson();' +
'  box.select();' +
'  if (navigator.clipboard && navigator.clipboard.writeText) {' +
'    navigator.clipboard.writeText(box.value).then(function () {' +
'      if (status) status.textContent = "Copied to clipboard.";' +
'    }, function () {' +
'      if (status) status.textContent = "Couldn\'t copy automatically -- text is selected, copy it from there.";' +
'    });' +
'  } else if (status) {' +
'    status.textContent = "Couldn\'t copy automatically -- text is selected, copy it from there.";' +
'  }' +
'}' +
'function pasteImportBoxFromClipboard() {' +
'  var box = document.getElementById("presetImportBox");' +
'  var status = document.getElementById("presetImportStatus");' +
'  if (navigator.clipboard && navigator.clipboard.readText) {' +
'    navigator.clipboard.readText().then(function (text) {' +
'      box.value = text;' +
'      if (status) status.textContent = "Pasted -- tap Apply to use it.";' +
'    }, function () {' +
'      if (status) status.textContent = "Couldn\'t read the clipboard automatically -- paste into the box by hand instead.";' +
'    });' +
'  } else if (status) {' +
'    status.textContent = "Clipboard access isn\'t available here -- paste into the box by hand instead.";' +
'  }' +
'}' +
'function importDesignJson() {' +
'  var status = document.getElementById("presetImportStatus");' +
'  var raw = document.getElementById("presetImportBox").value;' +
'  var obj;' +
'  try { obj = JSON.parse(raw); } catch (e) {' +
'    if (status) status.textContent = "Couldn\'t parse that as JSON.";' +
'    return;' +
'  }' +
'  applyStyleCornersJson(obj);' +
'  if (status) status.textContent = "Applied.";' +
'}' +
'var s_pendingConfirmAction = null;' +
'function showConfirm(title, message, onConfirm, opts) {' +
'  opts = opts || {};' +
'  document.getElementById("confirmModalTitle").textContent = title;' +
'  document.getElementById("confirmModalMessage").textContent = message;' +
'  var compareRow = document.getElementById("confirmImageCompare");' +
'  if (opts.images && opts.images.left) {' +
'    document.getElementById("confirmImageLeft").src = opts.images.left;' +
'    compareRow.style.display = "flex";' +
'    var rightImg = document.getElementById("confirmImageRight");' +
'    var arrow = document.getElementById("confirmImageArrow");' +
'    if (opts.images.right) {' +
'      rightImg.src = opts.images.right;' +
'      rightImg.style.display = "";' +
'      arrow.style.display = "";' +
'    } else {' +
'      rightImg.style.display = "none";' +
'      arrow.style.display = "none";' +
'    }' +
'  } else {' +
'    compareRow.style.display = "none";' +
'  }' +
'  var yesBtn = document.getElementById("confirmModalYesBtn");' +
'  yesBtn.className = "modal-confirm-btn" + (opts.danger ? " danger" : "");' +
'  yesBtn.textContent = opts.confirmLabel || "Confirm";' +
'  s_pendingConfirmAction = onConfirm;' +
'  document.getElementById("confirmModal").className = "modal-overlay open";' +
'}' +
'function closeConfirmModal() {' +
'  document.getElementById("confirmModal").className = "modal-overlay";' +
'  s_pendingConfirmAction = null;' +
'}' +
'function confirmModalYes() {' +
'  var action = s_pendingConfirmAction;' +
'  closeConfirmModal();' +
'  if (action) action();' +
'}' +
'function openServiceLog(service, label) {' +
'  var all = {};' +
'  try { all = JSON.parse(document.getElementById("serviceLogsJson").value || "{}"); } catch (e) {}' +
'  document.getElementById("serviceLogModalTitle").textContent = label + " \\u2014 last attempts";' +
'  var entries = (all[service] && all[service].log) || [];' +
'  var body = document.getElementById("serviceLogModalBody");' +
'  body.innerHTML = "";' +
'  if (entries.length === 0) {' +
'    var empty = document.createElement("div");' +
'    empty.className = "help";' +
'    empty.textContent = "No attempts logged yet.";' +
'    body.appendChild(empty);' +
'  } else {' +
'    entries.slice().reverse().forEach(function (e) {' +
'      var d = new Date(e.t);' +
'      var line = document.createElement("div");' +
'      line.className = "service-log-line";' +
'      var status = e.ok ? "OK" : ("ERR " + e.code + " - " + e.label);' +
'      line.textContent = d.toLocaleDateString() + " " + d.toLocaleTimeString() + "  " + label + "  " + status;' +
'      body.appendChild(line);' +
'    });' +
'  }' +
'  document.getElementById("serviceLogModal").className = "modal-overlay open";' +
'}' +
'function closeServiceLogModal() {' +
'  document.getElementById("serviceLogModal").className = "modal-overlay";' +
'}' +
'function capturePreviewImage() {' +
'  var canvas = document.getElementById("previewCanvas");' +
'  if (!canvas || !canvas.toDataURL) return "";' +
'  try { return canvas.toDataURL("image/png"); } catch (e) { return ""; }' +
'}' +
'function applyPresetSlot(n) {' +
'  var jsonEl = document.getElementById("presetSlot" + n + "Json");' +
'  if (!jsonEl || !jsonEl.value) return;' +
'  var obj;' +
'  try { obj = JSON.parse(jsonEl.value); } catch (e) { return; }' +
'  var name = document.getElementById("presetSlot" + n + "Name").value || ("Preset " + n);' +
'  var currentImg = capturePreviewImage();' +
'  var savedImg = document.getElementById("presetSlot" + n + "Image").value;' +
'  showConfirm("Apply preset", \'Apply "\' + name + \'"? This replaces your current Style, Colors, and Complications settings.\', function () {' +
'    applyStyleCornersJson(obj);' +
'  }, (currentImg && savedImg) ? { images: { left: currentImg, right: savedImg } } : null);' +
'}' +
'function savePresetSlot(n) {' +
'  var jsonEl = document.getElementById("presetSlot" + n + "Json");' +
'  var imageEl = document.getElementById("presetSlot" + n + "Image");' +
'  var btn = document.getElementById("presetApplyBtn" + n);' +
'  var deleteBtn = document.getElementById("presetDeleteBtn" + n);' +
'  if (!jsonEl) return;' +
'  var name = document.getElementById("presetSlot" + n + "Name").value || ("Preset " + n);' +
'  var hadPreset = !!jsonEl.value;' +
'  var savedImg = imageEl.value;' +
'  var currentImg = capturePreviewImage();' +
'  showConfirm("Save preset", (hadPreset ? \'Overwrite "\' : \'Save your current design into "\') + name + \'"?\' + (hadPreset ? \' This replaces what was saved there.\' : \'\'), function () {' +
'    jsonEl.value = JSON.stringify(collectStyleCornersJson());' +
'    imageEl.value = capturePreviewImage();' +
'    if (btn) btn.disabled = false;' +
'    if (deleteBtn) deleteBtn.disabled = false;' +
'    refreshScheduleButton(n);' +
'  }, (hadPreset && savedImg && currentImg) ? { images: { left: savedImg, right: currentImg } } : null);' +
'}' +
'function deletePresetSlot(n) {' +
'  var jsonEl = document.getElementById("presetSlot" + n + "Json");' +
'  var imageEl = document.getElementById("presetSlot" + n + "Image");' +
'  var nameEl = document.getElementById("presetSlot" + n + "Name");' +
'  var btn = document.getElementById("presetApplyBtn" + n);' +
'  var deleteBtn = document.getElementById("presetDeleteBtn" + n);' +
'  if (!jsonEl || !jsonEl.value) return;' +
'  var name = nameEl.value || ("Preset " + n);' +
'  var savedImg = imageEl.value;' +
'  showConfirm("Delete preset", \'Delete "\' + name + \'"? This can\\\'t be undone.\', function () {' +
'    jsonEl.value = "";' +
'    imageEl.value = "";' +
'    nameEl.value = "Preset " + n;' +
'    if (btn) { btn.textContent = "Preset " + n; btn.disabled = true; }' +
'    if (deleteBtn) deleteBtn.disabled = true;' +
'    document.getElementById("presetSlot" + n + "Schedule").value = "";' +
'    refreshScheduleButton(n);' +
'  }, { images: savedImg ? { left: savedImg } : null, danger: true, confirmLabel: "Delete" });' +
'}' +
'function startRenamePresetSlot(n) {' +
'  var btn = document.getElementById("presetApplyBtn" + n);' +
'  var input = document.getElementById("presetNameInput" + n);' +
'  var nameEl = document.getElementById("presetSlot" + n + "Name");' +
'  if (!input || !btn) return;' +
'  input.value = nameEl ? nameEl.value : ("Preset " + n);' +
'  btn.style.display = "none";' +
'  input.style.display = "";' +
'  input.focus();' +
'  input.select();' +
'}' +
'function commitRenamePresetSlot(n) {' +
'  var btn = document.getElementById("presetApplyBtn" + n);' +
'  var input = document.getElementById("presetNameInput" + n);' +
'  var nameEl = document.getElementById("presetSlot" + n + "Name");' +
'  if (!input || !btn) return;' +
'  var newName = input.value.replace(/^\\s+|\\s+$/g, "") || ("Preset " + n);' +
'  if (nameEl) nameEl.value = newName;' +
'  btn.textContent = newName;' +
'  input.style.display = "none";' +
'  btn.style.display = "";' +
'}' +
configPresetSchedule.clientJs(current.scheduleKnownIds) +
'function onShowSecondsChange() {' +
'  var box = document.getElementById("showSeconds");' +
'  var btn = document.getElementById("editSecHandBtn");' +
'  if (btn) btn.disabled = !(box.checked && !box.disabled);' +
'  updatePreview();' +
'}' +
'function updateHandValLabels(kind) {' +
'  var p = hePopupPrefix(kind);' +
'  ["Width", "Length", "BackOffset", "MiddleOffset", "SecondaryWidth", "ShadowDistance", "HollowThickness"].forEach(function (f) {' +
'    var el = document.getElementById(p + f);' +
'    var out = document.getElementById(p + f + "Val");' +
'    if (el && out) out.textContent = el.value + "px";' +
'  });' +
'}' +
'function updateHandFieldVisibility(kind) {' +
'  var p = hePopupPrefix(kind);' +
'  var styleEl = document.getElementById(p + "Style");' +
'  if (!styleEl) return;' +
'  var showMiddle = HAND_STYLES_WITH_MIDDLE.indexOf(styleEl.value) !== -1;' +
'  var showSecondary = HAND_STYLES_WITH_SECONDARY.indexOf(styleEl.value) !== -1;' +
'  ["MiddleOffsetRow", "MiddleSecondaryHelp"].forEach(function (id) {' +
'    var el = document.getElementById(p + id);' +
'    if (el) el.style.display = showMiddle ? "" : "none";' +
'  });' +
'  var secEl = document.getElementById(p + "SecondaryWidthRow");' +
'  if (secEl) secEl.style.display = showSecondary ? "" : "none";' +
'  var diagramImg = document.getElementById(p + "Diagram");' +
'  if (diagramImg) {' +
'    var src = HAND_STYLE_DIAGRAM_IMAGES[styleEl.value];' +
'    diagramImg.style.display = src ? "" : "none";' +
'    diagramImg.src = src || "";' +
'  }' +
'  updateHandStyleIconTriggerLabel(p);' +
'}' +
'function customMarkerStyleLabel(val) {' +
'  return ["Dot", "Line", "Square", "", "Tapered"][parseInt(val, 10)] || "Dot";' +
'}' +
'function markerTextTargetLabel(val) {' +
'  if (val === "1") return "On hours";' +
'  if (val === "2") return "Every 5s";' +
'  return "Off";' +
'}' +
'function refreshEditButtonLabels() {' +
'  ["hour", "min", "sec"].forEach(function (kind) {' +
'    var el = document.getElementById(heHiddenPrefix(kind) + "Style");' +
'    var span = document.getElementById("hand" + kind.charAt(0).toUpperCase() + kind.slice(1) + "StatusLabel");' +
'    if (el && span) span.textContent = HAND_STYLE_NAMES[parseInt(el.value, 10)] || "Baton";' +
'  });' +
'  var ccSpan = document.getElementById("centerCircleStatusLabel");' +
'  var ccEl = document.getElementById("centerCircleRadius");' +
'  if (ccSpan && ccEl) {' +
'    var ccVal = parseInt(ccEl.value, 10) || 0;' +
'    ccSpan.textContent = ccVal > 0 ? (ccVal + "px") : "Off";' +
'  }' +
'  var shSpan = document.getElementById("shadowStyleStatusLabel");' +
'  var shEl = document.getElementById("shadowTranslucent");' +
'  if (shSpan && shEl) shSpan.textContent = shEl.value === "false" ? "Solid" : "Translucent";' +
'  var anyHandShadow = ["hour", "min", "sec"].some(function (kind) {' +
'    var el = document.getElementById(heHiddenPrefix(kind) + "ShadowEnabled");' +
'    return el && el.value === "true";' +
'  });' +
'  var shBtn = document.getElementById("shadowStyleTriggerBtn");' +
'  if (shBtn) shBtn.disabled = !anyHandShadow;' +
'  ["Hour", "Sec"].forEach(function (kindCap) {' +
'    var span = document.getElementById("cm" + kindCap + "StatusLabel");' +
'    var el = document.getElementById("custom" + kindCap + "Style");' +
'    var thickEl = document.getElementById("custom" + kindCap + "Thickness");' +
'    if (el && span) span.textContent = (thickEl && thickEl.value === "0") ? "Off" : customMarkerStyleLabel(el.value);' +
'  });' +
'  var numSpan = document.getElementById("numeralsStatusLabel");' +
'  var numEl = document.getElementById("markerTextTarget");' +
'  if (numSpan && numEl) numSpan.textContent = markerTextTargetLabel(numEl.value);' +
'}' +
'function updateHandStyleIconTriggerLabel(p) {' +
'  var sel = document.getElementById(p + "Style");' +
'  var trigger = document.getElementById(p + "StyleTrigger");' +
'  if (!sel || !trigger) return;' +
'  var preview = trigger.querySelector(".hand-style-icon-preview");' +
'  var name = trigger.querySelector(".font-picker-name");' +
'  var src = HAND_STYLE_ICON_IMAGES[sel.value];' +
'  if (preview) preview.innerHTML = src ? \'<img src="\' + src + \'" alt="">\' : "";' +
'  if (name) name.textContent = HAND_STYLE_NAMES[parseInt(sel.value, 10)] || "";' +
'}' +
'var HAND_STYLE_ICON_PREFIX = null;' +
'var HAND_STYLE_ICON_KIND = null;' +
'function openHandStyleIconPicker(p, kind) {' +
'  HAND_STYLE_ICON_PREFIX = p;' +
'  HAND_STYLE_ICON_KIND = kind;' +
'  renderHandStyleIconGrid();' +
'  document.getElementById("handStyleIconPickerModal").className = "modal-overlay open";' +
'}' +
'function closeHandStyleIconPicker() {' +
'  document.getElementById("handStyleIconPickerModal").className = "modal-overlay";' +
'}' +
'function renderHandStyleIconGrid() {' +
'  var sel = document.getElementById(HAND_STYLE_ICON_PREFIX + "Style");' +
'  var currentVal = sel ? sel.value : "0";' +
'  var html = "";' +
'  for (var i = 0; i < HAND_STYLE_NAMES.length; i++) {' +
'    var src = HAND_STYLE_ICON_IMAGES[String(i)];' +
'    var selected = String(i) === String(currentVal);' +
'    html += \'<button type="button" class="font-picker-btn\' + (selected ? " selected" : "") + \'" onclick="chooseHandStyleIcon(\' + i + \')">\' +' +
'      \'<span class="font-picker-preview hand-style-icon-preview">\' + (src ? \'<img src="\' + src + \'" alt="">\' : "") + "</span>" +' +
'      \'<span class="font-picker-name">\' + esc(HAND_STYLE_NAMES[i]) + "</span></button>";' +
'  }' +
'  document.getElementById("handStyleIconPickerGrid").innerHTML = html;' +
'}' +
'function chooseHandStyleIcon(value) {' +
'  var sel = document.getElementById(HAND_STYLE_ICON_PREFIX + "Style");' +
'  if (sel) sel.value = value;' +
'  closeHandStyleIconPicker();' +
'  onCustomHandStyleChange(HAND_STYLE_ICON_KIND);' +
'}' +

'function updateWeatherIconStyleTriggerLabel() {' +
'  var sel = document.getElementById("weatherIconStyle");' +
'  var trigger = document.getElementById("weatherIconStyleTrigger");' +
'  if (!sel || !trigger) return;' +
'  var preview = trigger.querySelector(".weather-icon-style-preview");' +
'  var name = trigger.querySelector(".font-picker-name");' +
'  var src = WEATHER_ICON_STYLE_PREVIEWS[sel.value];' +
'  if (preview) preview.innerHTML = src ? \'<img src="\' + src + \'" alt="">\' : "";' +
'  if (name) name.textContent = WEATHER_ICON_STYLE_NAMES[parseInt(sel.value, 10)] || "";' +
'}' +
'function openWeatherIconStylePicker() {' +
'  renderWeatherIconStylePickerGrid();' +
'  document.getElementById("weatherIconStylePickerModal").className = "modal-overlay open";' +
'}' +
'function closeWeatherIconStylePicker() {' +
'  document.getElementById("weatherIconStylePickerModal").className = "modal-overlay";' +
'}' +
'function renderWeatherIconStylePickerGrid() {' +
'  var sel = document.getElementById("weatherIconStyle");' +
'  var currentVal = sel ? sel.value : "1";' +
'  var html = "";' +
'  for (var i = 0; i < (SCREEN_BW ? 2 : WEATHER_ICON_STYLE_NAMES.length); i++) {' +
'    var src = WEATHER_ICON_STYLE_PREVIEWS[String(i)];' +
'    var selected = String(i) === String(currentVal);' +
'    html += \'<button type="button" class="font-picker-btn\' + (selected ? " selected" : "") + \'" onclick="chooseWeatherIconStyle(\' + i + \')">\' +' +
'      \'<span class="font-picker-preview weather-icon-style-preview">\' + (src ? \'<img src="\' + src + \'" alt="">\' : "") + "</span>" +' +
'      \'<span class="font-picker-name">\' + esc(WEATHER_ICON_STYLE_NAMES[i]) + "</span></button>";' +
'  }' +
'  document.getElementById("weatherIconStylePickerGrid").innerHTML = html;' +
'}' +
'function chooseWeatherIconStyle(value) {' +
'  var sel = document.getElementById("weatherIconStyle");' +
'  if (sel) sel.value = value;' +
'  closeWeatherIconStylePicker();' +
'  updateWeatherIconStyleTriggerLabel();' +
'}' +
'function updateHandHollowVisibility(kind) {' +
'  var p = hePopupPrefix(kind);' +
'  var box = document.getElementById(p + "Hollow");' +
'  var row = document.getElementById(p + "HollowThicknessRow");' +
'  if (row) row.style.display = (box && box.checked) ? "" : "none";' +
'}' +
'function onHandHollowChange(kind) {' +
'  updateHandHollowVisibility(kind);' +
'  updatePreview();' +
'}' +
'function onCustomHandStyleChange(kind) {' +
'  updateHandFieldVisibility(kind);' +
'  updatePreview();' +
'}' +
'var s_openHandEditorKind = null;' +
'function onHandSliderInput(kind) {' +
'  updateHandValLabels(kind);' +
'  updatePreview();' +
'}' +
'function openHandEditor(kind) {' +
'  s_openHandEditorKind = kind;' +
'  var hp = heHiddenPrefix(kind), p = hePopupPrefix(kind);' +
'  HE_FIELDS.forEach(function (f) {' +
'    var hidden = document.getElementById(hp + f);' +
'    var popupEl = document.getElementById(p + f);' +
'    if (!hidden || !popupEl) return;' +
'    if (HE_CHECKBOX_FIELDS.indexOf(f) !== -1) { popupEl.checked = hidden.value === "true"; } else { popupEl.value = hidden.value; }' +
'  });' +
'  updateHandValLabels(kind);' +
'  updateHandFieldVisibility(kind);' +
'  updateHandHollowVisibility(kind);' +
'  document.getElementById("handEditorModal-" + kind).className = "modal-overlay open";' +
'}' +
'function closeHandEditor(kind) {' +
'  s_openHandEditorKind = null;' +
'  document.getElementById("handEditorModal-" + kind).className = "modal-overlay";' +
'  updatePreview();' +
'}' +
'function saveHandEditor(kind) {' +
'  s_openHandEditorKind = null;' +
'  var hp = heHiddenPrefix(kind), p = hePopupPrefix(kind);' +
'  HE_FIELDS.forEach(function (f) {' +
'    var hidden = document.getElementById(hp + f);' +
'    var popupEl = document.getElementById(p + f);' +
'    if (!hidden || !popupEl) return;' +
'    hidden.value = (HE_CHECKBOX_FIELDS.indexOf(f) !== -1) ? String(popupEl.checked) : popupEl.value;' +
'  });' +
'  closeHandEditor(kind);' +
'  updateHandStyleButtonLabel();' +
'  refreshEditButtonLabels();' +
'  updatePreview();' +
'}' +
'function copyHandConfig(kind) {' +
'  var srcHp = heHiddenPrefix(HAND_COPY_SOURCE[kind]);' +
'  var p = hePopupPrefix(kind);' +
'  HE_FIELDS.forEach(function (f) {' +
'    var src = document.getElementById(srcHp + f);' +
'    var dst = document.getElementById(p + f);' +
'    if (!src || !dst) return;' +
'    if (HE_CHECKBOX_FIELDS.indexOf(f) !== -1) { dst.checked = src.value === "true"; } else { dst.value = src.value; }' +
'  });' +
'  updateHandValLabels(kind);' +
'  updateHandFieldVisibility(kind);' +
'  updateHandHollowVisibility(kind);' +
'}' +

'function onCornerFontChange() {' +
'  renderSlotPicker();' +
'  updatePreview();' +
'}' +
'function selectVerticalOption(groupId, hiddenId, val) {' +
'  var buttons = document.getElementById(groupId).getElementsByClassName("mode-btn-vertical");' +
'  var matched = false;' +
'  for (var i = 0; i < buttons.length; i++) {' +
'    if (buttons[i].getAttribute("data-value") === val) { matched = true; break; }' +
'  }' +
'  if (!matched && buttons.length) val = buttons[0].getAttribute("data-value");' +
'  document.getElementById(hiddenId).value = val;' +
'  for (var j = 0; j < buttons.length; j++) {' +
'    buttons[j].className = "mode-btn-vertical" + (buttons[j].getAttribute("data-value") === val ? " active" : "");' +
'  }' +
'  updatePreview();' +
'}' +
'function selectModeButton(groupId, hiddenId, val) {' +
'  document.getElementById(hiddenId).value = val;' +
'  var buttons = document.getElementById(groupId).getElementsByClassName("mode-btn");' +
'  for (var i = 0; i < buttons.length; i++) {' +
'    buttons[i].className = "mode-btn" + (buttons[i].getAttribute("data-value") === val ? " active" : "");' +
'  }' +
'}' +
'function refreshModeButtonGroup(groupId, hiddenId) {' +
'  var group = document.getElementById(groupId);' +
'  var hidden = document.getElementById(hiddenId);' +
'  if (!group || !hidden) return;' +
'  var buttons = group.getElementsByClassName("mode-btn");' +
'  for (var i = 0; i < buttons.length; i++) {' +
'    buttons[i].className = "mode-btn" + (buttons[i].getAttribute("data-value") === hidden.value ? " active" : "");' +
'  }' +
'}' +
'function onOutlineStyleChange(val) {' +
'  selectModeButton("outlineStyleGroup", "outlineStyle", val);' +
'  updatePreview();' +
'}' +
'function roundTimeInputToHour(el) {' +
'  if (!el || !el.value) return;' +
'  var parts = el.value.split(":");' +
'  var h = parseInt(parts[0], 10) || 0, m = parseInt(parts[1], 10) || 0;' +
'  if (m >= 30) h = (h + 1) % 24;' +
'  el.value = (h < 10 ? "0" : "") + h + ":00";' +
'}' +
'function updateHourlyVibeVisibility() {' +
'  var mode = document.getElementById("hourlyVibeMode").value;' +
'  var intervalRow = document.getElementById("hourlyVibeIntervalRow");' +
'  var subOptions = document.getElementById("hourlyVibeSubOptions");' +
'  var quietRow = document.getElementById("hourlyVibeOverrideQuietRow");' +
'  if (intervalRow) intervalRow.style.display = (mode === "2") ? "" : "none";' +
'  if (subOptions) subOptions.className = (mode === "0") ? "grayed-out" : "";' +
'  if (quietRow) quietRow.className = "checkbox-row" + (mode === "0" ? " grayed-out" : "");' +
'  if (mode === "1") {' +
'    roundTimeInputToHour(document.getElementById("hourlyVibeStartTime"));' +
'    roundTimeInputToHour(document.getElementById("hourlyVibeEndTime"));' +
'  }' +
'}' +
'function onHourlyVibeModeChange(val) {' +
'  selectVerticalOption("hourlyVibeModeGroup", "hourlyVibeMode", val);' +
'  updateHourlyVibeVisibility();' +
'}' +
'function onHourlyVibeTimeChange(id) {' +
'  if (document.getElementById("hourlyVibeMode").value === "1") {' +
'    roundTimeInputToHour(document.getElementById(id));' +
'  }' +
'  updatePreview();' +
'}' +
'function toggleHourlyVibeDay(bit) {' +
'  var hidden = document.getElementById("hourlyVibeDaysMask");' +
'  var mask = parseInt(hidden.value, 10) || 0;' +
'  mask ^= (1 << bit);' +
'  hidden.value = String(mask);' +
'  var btn = document.querySelector(\'.day-toggle-btn[data-bit="\' + bit + \'"]\');' +
'  if (btn) btn.className = "day-toggle-btn" + ((mask & (1 << bit)) ? " active" : "");' +
'  updatePreview();' +
'}' +
'function selectShadowTranslucent(val) {' +
'  selectModeButton("shadowTranslucentGroup", "shadowTranslucent", val);' +
'  refreshEditButtonLabels();' +
'  updatePreview();' +
'}' +
'function onAnalogStyleChange() { updatePreview(); }' +

'function updateColorRoleButtons(scheme) {' +
'  var colors = scheme === "night" ? nightColors() : dayColors();' +
'  var prefix = scheme === "night" ? "swatchNight" : "swatch";' +
'  document.getElementById(prefix + "Main").style.background = colors.text;' +
'  document.getElementById(prefix + "Accent").style.background = colors.accent;' +
'  document.getElementById(prefix + "Bg").style.background = colors.bg;' +
'  updateColorPresetTriggerLabel(scheme);' +
'}' +

'function hexToByte(hex) {' +
'  var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);' +
'  function to2bit(v) { return Math.round(v / 85); }' +
'  return packedByteFor(to2bit(r), to2bit(g), to2bit(b));' +
'}' +

'function mainColorPhrase(label) {' +
'  var idx = label.indexOf(",");' +
'  return idx === -1 ? label : label.substring(0, idx);' +
'}' +
'function accentColorName(label) {' +
'  var m = /,\\s*(.+?)\\s+accent$/.exec(label);' +
'  if (m) return m[1];' +
'  var m2 = /^(.+?)\\s+on\\s+/.exec(label);' +
'  return m2 ? m2[1] : label;' +
'}' +
'function matchingPresetId(colors) {' +
'  for (var i = 0; i < COLOR_SCHEMES.length; i++) {' +
'    var s = COLOR_SCHEMES[i];' +
'    if (s.bg.toLowerCase() === colors.bg.toLowerCase() && s.text.toLowerCase() === colors.text.toLowerCase() && s.accent.toLowerCase() === colors.accent.toLowerCase()) {' +
'      return s.id;' +
'    }' +
'  }' +
'  return null;' +
'}' +
'function updateColorPresetTriggerLabel(scheme) {' +
'  var colors = scheme === "night" ? nightColors() : dayColors();' +
'  var trigger = document.getElementById(scheme === "night" ? "nightSchemePresetTrigger" : "colorSchemePresetTrigger");' +
'  if (!trigger) return;' +
'  var mainLine = trigger.querySelector(".color-preset-main-line");' +
'  var accentLine = trigger.querySelector(".color-preset-accent-line");' +
'  trigger.style.background = colors.bg;' +
'  var matchId = matchingPresetId(colors);' +
'  if (matchId !== null) {' +
'    var preset = findPresetById(matchId);' +
'    if (mainLine) { mainLine.textContent = mainColorPhrase(preset.label); mainLine.style.color = preset.text; }' +
'    if (accentLine) { accentLine.textContent = accentColorName(preset.altLabel); accentLine.style.color = preset.accent; }' +
'  } else {' +
'    if (mainLine) { mainLine.textContent = "Custom"; mainLine.style.color = colors.text; }' +
'    if (accentLine) { accentLine.textContent = "Accent color"; accentLine.style.color = colors.accent; }' +
'  }' +
'}' +
'var CURRENT_PRESET_SCHEME = "day";' +
'var SHOW_ALL_COLOR_PRESETS = false;' +
'function openColorPresetPicker(scheme) {' +
'  CURRENT_PRESET_SCHEME = scheme || "day";' +
'  var nightEnabled = document.getElementById("nightEnabled");' +
'  SHOW_ALL_COLOR_PRESETS = nightEnabled ? !nightEnabled.checked : false;' +
'  document.getElementById("colorPresetPickerTitle").textContent = (scheme === "night") ? "Night color preset" : "Color preset";' +
'  var showAll = document.getElementById("showAllColorPresets");' +
'  if (showAll) showAll.checked = SHOW_ALL_COLOR_PRESETS;' +
'  renderColorPresetGrid();' +
'  document.getElementById("colorPresetPickerModal").className = "modal-overlay open";' +
'}' +
'function closeColorPresetPicker() {' +
'  document.getElementById("colorPresetPickerModal").className = "modal-overlay";' +
'}' +
'function renderColorPresetGrid() {' +
'  var scheme = CURRENT_PRESET_SCHEME;' +
'  var colors = scheme === "night" ? nightColors() : dayColors();' +
'  var matchId = matchingPresetId(colors);' +
'  var html = "";' +
'  COLOR_SCHEMES.forEach(function (s) {' +
'    if (!SHOW_ALL_COLOR_PRESETS && s.mode && s.mode !== "both" && s.mode !== scheme) return;' +
'    var selected = matchId !== null && String(matchId) === String(s.id);' +
'    html += \'<button type="button" class="color-preset-btn\' + (selected ? " selected" : "") + \'" style="background:\' + s.bg + \';" onclick="chooseColorPreset(\' + s.id + \')">\' +' +
'      \'<span class="color-preset-main-line" style="color:\' + s.text + \';">\' + esc(s.label) + "</span>" +' +
'      \'<span class="color-preset-accent-line" style="color:\' + s.accent + \';">\' + esc(s.altLabel) + "</span></button>";' +
'  });' +
'  var customSelected = matchId === null;' +
'  html += \'<button type="button" class="color-preset-btn\' + (customSelected ? " selected" : "") + \'" style="background:\' + colors.bg + \';" onclick="chooseColorPreset(null)">\' +' +
'    \'<span class="color-preset-main-line" style="color:\' + colors.text + \';">(Custom)Main color</span>\' +' +
'    \'<span class="color-preset-accent-line" style="color:\' + colors.accent + \';">Accent color</span></button>\';' +
'  document.getElementById("colorPresetPickerGrid").innerHTML = html;' +
'}' +
'function onShowAllColorPresetsToggle() {' +
'  var checkbox = document.getElementById("showAllColorPresets");' +
'  SHOW_ALL_COLOR_PRESETS = !!(checkbox && checkbox.checked);' +
'  renderColorPresetGrid();' +
'}' +
'function chooseColorPreset(id) {' +
'  var scheme = CURRENT_PRESET_SCHEME;' +
'  closeColorPresetPicker();' +
'  if (id === null || id === undefined) return;' +
'  var preset = findPresetById(id);' +
'  document.getElementById(customHiddenIdFor("text", scheme)).value = hexToByte(preset.text);' +
'  document.getElementById(customHiddenIdFor("accent", scheme)).value = hexToByte(preset.accent);' +
'  document.getElementById(customHiddenIdFor("bg", scheme)).value = hexToByte(preset.bg);' +
'  updateColorRoleButtons(scheme);' +
'  if (scheme !== "night") updatePreview();' +
'}' +

'var CURRENT_PICKER_ROLE = null;' +
'var CURRENT_PICKER_SCHEME = "day";' +
'function openColorPicker(role, scheme) {' +
'  CURRENT_PICKER_ROLE = role;' +
'  CURRENT_PICKER_SCHEME = scheme || "day";' +
'  var titles = { text: "Pick main color", accent: "Pick accent color", bg: "Pick background color" };' +
'  document.getElementById("colorPickerTitle").textContent = titles[role] || "Pick a color";' +
'  renderHexColorGrid();' +
'  document.getElementById("colorPickerModal").className = "modal-overlay open";' +
'}' +
'function closeColorPicker() {' +
'  document.getElementById("colorPickerModal").className = "modal-overlay";' +
'  CURRENT_PICKER_ROLE = null;' +
'}' +
'function goBack() {' +
'  document.location = getQueryParam("return_to", "pebblejs://close#");' +
'}' +
'var donateRaf = 0;' +
'var donateDrops = null;' +
'var DONATE_GLYPHS = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ+=<>/#";' +
'function donateMatrixFrame() {' +
'  var cv = document.getElementById("donateMatrix");' +
'  if (!cv || document.getElementById("donateModal").className.indexOf("open") < 0) { donateRaf = 0; return; }' +
'  var cell = 6, cols = 0, rows = 0;' +
'  var w = cv.clientWidth, h = cv.clientHeight;' +
'  cols = Math.max(1, Math.floor(w / cell)); rows = Math.max(1, Math.floor(h / cell));' +
'  if (cv.width !== cols * cell || cv.height !== rows * cell) { cv.width = cols * cell; cv.height = rows * cell; donateDrops = null; }' +
'  var ctx = cv.getContext("2d");' +
'  if (!donateDrops) {' +
'    donateDrops = [];' +
'    for (var c = 0; c < cols; c++) donateDrops.push({ y: -Math.random() * rows, v: 0.12 + Math.random() * 0.22, len: 4 + Math.floor(Math.random() * 7), g: [] });' +
'  }' +
'  ctx.fillStyle = "#0a100c"; ctx.fillRect(0, 0, cv.width, cv.height);' +
'  ctx.font = "bold 7px monospace"; ctx.textBaseline = "top";' +
'  for (var i = 0; i < donateDrops.length; i++) {' +
'    var d = donateDrops[i];' +
'    d.y += d.v;' +
'    if (d.y - d.len > rows) { d.y = -Math.random() * 6; d.v = 0.12 + Math.random() * 0.22; d.len = 4 + Math.floor(Math.random() * 7); }' +
'    for (var k = 0; k < d.len; k++) {' +
'      var gy = Math.floor(d.y) - k;' +
'      if (gy < 0 || gy >= rows) continue;' +
'      if (!d.g[gy] || Math.random() < 0.02) d.g[gy] = DONATE_GLYPHS.charAt(Math.floor(Math.random() * DONATE_GLYPHS.length));' +
'      var a = 1 - k / d.len;' +
'      ctx.fillStyle = k === 0 ? "#d8ffe0" : "rgba(60,255,110," + (0.15 + 0.75 * a).toFixed(2) + ")";' +
'      ctx.fillText(d.g[gy], i * cell, gy * cell);' +
'    }' +
'  }' +
'  donateRaf = window.requestAnimationFrame(donateMatrixFrame);' +
'}' +
'function startDonateSkyAnimation() {' +
'  if (donateRaf) window.cancelAnimationFrame(donateRaf);' +
'  donateDrops = null;' +
'  donateRaf = window.requestAnimationFrame(donateMatrixFrame);' +
'}' +
'function stopDonateSkyAnimation() {' +
'  if (donateRaf) window.cancelAnimationFrame(donateRaf);' +
'  donateRaf = 0;' +
'}' +
'function openDonateModal() {' +
'  document.getElementById("donateModal").className = "modal-overlay open";' +
'  startDonateSkyAnimation();' +
'}' +
'function closeDonateModal() {' +
'  document.getElementById("donateModal").className = "modal-overlay";' +
'  stopDonateSkyAnimation();' +
'}' +
'var aboutLogoTapCount = 0;' +
'var aboutLogoTapResetTimer = 0;' +
'function tapAboutLogo() {' +
'  var logo = document.getElementById("aboutEasterEggLogo");' +
'  if (logo) {' +
'    logo.classList.remove("logo-tap-effect");' +
'    void logo.getBoundingClientRect();' +
'    logo.classList.add("logo-tap-effect");' +
'  }' +
'  aboutLogoTapCount++;' +
'  if (aboutLogoTapResetTimer) window.clearTimeout(aboutLogoTapResetTimer);' +
'  if (aboutLogoTapCount >= 10) {' +
'    aboutLogoTapCount = 0;' +
'    var body = document.body;' +
'    if (body.classList.contains("retro-easter-egg")) {' +
'      body.classList.remove("retro-easter-egg");' +
'      body.classList.add("liquid-glass-easter-egg");' +
'    } else if (body.classList.contains("liquid-glass-easter-egg")) {' +
'      body.classList.remove("liquid-glass-easter-egg");' +
'    } else {' +
'      body.classList.add("retro-easter-egg");' +
'    }' +
'    var logo = document.getElementById("aboutEasterEggLogo");' +
'    if (logo) {' +
'      logo.classList.remove("retro-easter-flash");' +
'      void logo.getBoundingClientRect();' +
'      logo.classList.add("retro-easter-flash");' +
'    }' +
'    return;' +
'  }' +
'  aboutLogoTapResetTimer = window.setTimeout(function() {' +
'    aboutLogoTapCount = 0;' +
'    aboutLogoTapResetTimer = 0;' +
'  }, 2200);' +
'}' +
'function openAboutModal(button) {' +
'  var modal = document.getElementById("aboutModal");' +
'  var box = modal ? modal.querySelector(".about-modal-box") : null;' +
'  if (!modal || !box) return;' +
'  var rect = button ? button.getBoundingClientRect() : null;' +
'  var originX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;' +
'  var originY = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;' +
'  box.style.setProperty("--about-dx", (originX - window.innerWidth / 2) + "px");' +
'  box.style.setProperty("--about-dy", (originY - window.innerHeight / 2) + "px");' +
'  modal.className = "modal-overlay open";' +
'}' +
'function closeAboutModal() {' +
'  document.getElementById("aboutModal").className = "modal-overlay";' +
'}' +
'function adjustTopBarSpacing() {' +
'  var bar = document.getElementById("topBar");' +
'  if (!bar) return;' +
'  document.body.style.paddingTop = bar.offsetHeight + "px";' +
'}' +
'window.addEventListener("load", adjustTopBarSpacing);' +
'window.addEventListener("resize", adjustTopBarSpacing);' +
'function customHiddenIdFor(role, scheme) {' +
'  var prefix = scheme === "night" ? "night" : "";' +
'  if (role === "text") return prefix ? "nightCustomTextValue" : "customTextValue";' +
'  if (role === "accent") return prefix ? "nightCustomAccentValue" : "customAccentValue";' +
'  return prefix ? "nightCustomBgValue" : "customBgValue";' +
'}' +

'var PEBBLE_WHEEL_POSITIONS = [' +
'{q:-5,r:2,b:239},{q:-4,r:1,b:223},{q:-3,r:-1,b:222},{q:-3,r:0,b:206},{q:-3,r:1,b:207},{q:-3,r:3,b:219},{q:-3,r:4,b:199},{q:-2,r:-4,b:238},{q:-2,r:-3,b:221},{q:-2,r:-2,b:205},{q:-2,r:-1,b:201},{q:-2,r:0,b:202},{q:-2,r:2,b:203},{q:-2,r:3,b:195},{q:-2,r:4,b:215},{q:-2,r:5,b:235},{q:-1,r:-3,b:204},{q:-1,r:-2,b:200},{q:-1,r:-1,b:217},{q:-1,r:0,b:218},{q:-1,r:1,b:198},{q:-1,r:2,b:194},{q:-1,r:3,b:211},{q:-1,r:4,b:214},{q:0,r:-4,b:220},{q:0,r:-2,b:216},{q:0,r:-1,b:196},{q:0,r:0,b:197},{q:0,r:2,b:193},{q:0,r:3,b:210},{q:0,r:4,b:227},{q:0,r:5,b:231},{q:1,r:-5,b:237},{q:1,r:-4,b:236},{q:1,r:-2,b:233},{q:1,r:-1,b:212},{q:1,r:2,b:209},{q:1,r:3,b:226},{q:1,r:4,b:230},{q:2,r:-2,b:232},{q:2,r:1,b:208},{q:2,r:2,b:225},{q:2,r:3,b:243},{q:2,r:4,b:247},{q:3,r:-3,b:252},{q:3,r:-2,b:248},{q:3,r:-1,b:228},{q:3,r:0,b:229},{q:3,r:1,b:224},{q:3,r:2,b:242},{q:3,r:3,b:246},{q:3,r:4,b:251},{q:4,r:-5,b:254},{q:4,r:-4,b:253},{q:4,r:-3,b:249},{q:4,r:-2,b:244},{q:4,r:-1,b:240},{q:4,r:0,b:241},{q:5,r:-1,b:245},{q:6,r:-5,b:234},{q:6,r:-4,b:192},{q:6,r:-2,b:250},{q:7,r:-5,b:255},{q:7,r:-4,b:213}' +
'];' +
'var PEBBLE_WHEEL_HOLLOW = [{q:0,r:1},{q:1,r:0},{q:1,r:1},{q:2,r:-1},{q:2,r:0}];' +

'function renderHexColorGrid() {' +
'  var container = document.getElementById("hexColorGrid");' +
'  container.innerHTML = "";' +
'  var hiddenId = customHiddenIdFor(CURRENT_PICKER_ROLE, CURRENT_PICKER_SCHEME);' +
'  var selected = parseInt(document.getElementById(hiddenId).value, 10);' +
'  var size = 15;' +
'  var centerX = 130, centerY = 127.5;' +
'  function place(q, r) {' +
'    return {' +
'      x: centerX + size * Math.sqrt(3) * (q + r / 2),' +
'      y: centerY + size * 1.5 * r' +
'    };' +
'  }' +
'  for (var i = 0; i < PEBBLE_WHEEL_POSITIONS.length; i++) {' +
'    var pos = PEBBLE_WHEEL_POSITIONS[i];' +
'    var pt = place(pos.q, pos.r);' +
'    var sw = document.createElement("div");' +
'    sw.style.left = pt.x + "px";' +
'    sw.style.top = pt.y + "px";' +
'    sw.className = "hex-swatch" + (pos.b === selected ? " selected" : "");' +
'    sw.style.background = hexFromByte(pos.b);' +
'    sw.onclick = (function (byte) { return function () { pickColor(byte); }; })(pos.b);' +
'    container.appendChild(sw);' +
'  }' +
'  for (var j = 0; j < PEBBLE_WHEEL_HOLLOW.length; j++) {' +
'    var hp = PEBBLE_WHEEL_HOLLOW[j];' +
'    var hpt = place(hp.q, hp.r);' +
'    var hsw = document.createElement("div");' +
'    hsw.style.left = hpt.x + "px";' +
'    hsw.style.top = hpt.y + "px";' +
'    hsw.className = "hex-swatch hollow";' +
'    container.appendChild(hsw);' +
'  }' +
'}' +
'function pickColor(byte) {' +
'  if (!CURRENT_PICKER_ROLE) return;' +
'  var scheme = CURRENT_PICKER_SCHEME;' +
'  document.getElementById(customHiddenIdFor(CURRENT_PICKER_ROLE, scheme)).value = byte;' +
'  closeColorPicker();' +
'  updateColorRoleButtons(scheme);' +
'  if (scheme !== "night") updatePreview();' +
'}' +
'function onBwSchemeChange(night) {' +
'  var sel = document.getElementById(night ? "bwNightScheme" : "bwDayScheme");' +
'  var pre = night ? "nightCustom" : "custom";' +
'  var blackOnWhite = sel && sel.value === "1";' +
'  var bg = blackOnWhite ? 255 : 192, fg = blackOnWhite ? 192 : 255;' +
'  document.getElementById(pre + "BgValue").value = bg;' +
'  document.getElementById(pre + "TextValue").value = fg;' +
'  document.getElementById(pre + "AccentValue").value = fg;' +
'  updatePreview();' +
'}' +
'function onNightToggle() {' +
'  document.getElementById("nightSchemeSettings").style.display = document.getElementById("nightEnabled").checked ? "block" : "none";' +
'  updateSchemeActiveHighlight();' +
'}' +

'function isNightNowApprox() {' +
'  var h = new Date().getHours();' +
'  return h < 6 || h >= 20;' +
'}' +
'function updateSchemeActiveHighlight() {' +
'  var dayBadge = document.getElementById("daySchemeActiveBadge");' +
'  var nightBadge = document.getElementById("nightSchemeActiveBadge");' +
'  if (!document.getElementById("nightEnabled").checked) {' +
'    dayBadge.style.display = "none";' +
'    nightBadge.style.display = "none";' +
'    return;' +
'  }' +
'  var isNight = isNightNowApprox();' +
'  dayBadge.style.display = "";' +
'  nightBadge.style.display = "";' +
'  dayBadge.textContent = isNight ? "Not active now" : "Active now";' +
'  dayBadge.classList.toggle("inactive", isNight);' +
'  nightBadge.textContent = isNight ? "Active now" : "Not active now";' +
'  nightBadge.classList.toggle("inactive", !isNight);' +
'}' +

require('./config/config-runtime') +

'var s_slideKeyframeCounter = 0;' +
'function applySubheadSlide(outerEl) {' +
'  var inner = outerEl.firstElementChild;' +
'  if (!inner) return;' +
'  inner.style.animation = "none";' +
'  var overflow = inner.scrollWidth - outerEl.clientWidth;' +
'  if (overflow > 2) {' +
'    var pauseSec = 5;' +
'    var scrollSec = Math.max(2, inner.scrollWidth / 45);' +
'    var totalSec = pauseSec + scrollSec;' +
'    var pausePct = (pauseSec / totalSec * 100).toFixed(2);' +
'    var name = "subheadSlide" + (s_slideKeyframeCounter++);' +
'    var sheet = document.getElementById("mainStyle").sheet;' +
'    sheet.insertRule(' +
'      "@keyframes " + name + " { 0% { transform: translateX(0); } " +' +
'      pausePct + "% { transform: translateX(0); } " +' +
'      "100% { transform: translateX(" + (-inner.scrollWidth) + "px); } }",' +
'      sheet.cssRules.length' +
'    );' +
'    inner.style.animation = name + " " + totalSec.toFixed(2) + "s linear infinite";' +
'  }' +
'}' +
'function setSubheaderTextById(elId, text) {' +
'  var el = document.getElementById(elId);' +
'  if (!el) return;' +
'  var inner = el.firstElementChild;' +
'  if (inner && inner.textContent === text) return;' +
'  el.innerHTML = "";' +
'  inner = document.createElement("span");' +
'  inner.className = "subhead-sub-inner";' +
'  inner.textContent = text;' +
'  el.appendChild(inner);' +
'  applySubheadSlide(el);' +
'}' +
'function setSubheaderHtmlById(elId, html) {' +
'  var el = document.getElementById(elId);' +
'  if (!el) return;' +
'  var inner = el.firstElementChild;' +
'  if (inner && inner.innerHTML === html) return;' +
'  el.innerHTML = \'<span class="subhead-sub-inner">\' + html + "</span>";' +
'  applySubheadSlide(el);' +
'}' +
'function setSubheaderText(id, text) { setSubheaderTextById("subhead-" + id, text); }' +
'function setSubheaderHtml(id, html) { setSubheaderHtmlById("subhead-" + id, html); }' +
'function setSubsubheaderText(id, text) { setSubheaderTextById("subsubhead-" + id, text); }' +
'function computeStyleSubheader() {' +
'  var markerEl = document.getElementById("bigAnalogMarkerStyle");' +
'  var markerPart = markerEl && markerEl.selectedIndex >= 0 ? markerEl.options[markerEl.selectedIndex].text : "analog clock";' +
'  return markerPart + bgSubheaderPart();' +
'}' +
'function computeColorsSubheaderHtml() {' +
'  var nightEnabled = document.getElementById("nightEnabled").checked;' +
'  var label, colors;' +
'  if (!nightEnabled) {' +
'    label = "one set: ";' +
'    colors = dayColors();' +
'  } else if (isNightNowApprox()) {' +
'    label = "night mode: ";' +
'    colors = nightColors();' +
'  } else {' +
'    label = "day mode: ";' +
'    colors = dayColors();' +
'  }' +
'  function dot(hex) { return \'<span class="subhead-dot" style="background:\' + hex + \';"></span>\'; }' +
'  if (SCREEN_BW) return esc(label) + dot(colors.text) + dot(colors.bg);' + // B&W: two looks only, no accent
'  return esc(label) + dot(colors.text) + dot(colors.accent) + dot(colors.bg);' +
'}' +
'function countActiveFeatures() {' +
'  var avail = computeSlotAvailability();' +
'  function val(id) { return parseInt(document.getElementById(id).value, 10) || 0; }' +
'  function hasCustom(id) {' +
'    var el = document.getElementById(id.replace(/Content$/, "") + "CustomPrims");' +
'    return !!(el && el.value);' +
'  }' +
'  function edgeActive(id, usable) {' +
'    return usable && (val(id) !== 0 || hasCustom(id));' +
'  }' +
'  var count = 0;' +
'  if (!avail.cornersGrayed) {' +
'    ["cornerTL", "cornerTR", "cornerBL", "cornerBR"].forEach(function (id) { if (val(id) !== 0 || hasCustom(id)) count++; });' +
'  }' +
'  if (edgeActive("upperMiddleLine1Content", avail.upper)) count++;' +
'  if (edgeActive("upperMiddleLine2Content", avail.upper)) count++;' +
'  if (edgeActive("bottomMiddleLine1Content", avail.bottom)) count++;' +
'  if (edgeActive("bottomMiddleLine2Content", avail.bottom)) count++;' +
'  if (edgeActive("middleLeftLine1Content", avail.left)) count++;' +
'  if (edgeActive("middleLeftLine2Content", avail.left)) count++;' +
'  if (edgeActive("middleRightLine1Content", avail.right)) count++;' +
'  if (edgeActive("middleRightLine2Content", avail.right)) count++;' +
'  return count;' +
'}' +
'function computeFeaturesSubheader() {' +
'  var count = countActiveFeatures();' +
'  if (count === 0) return "No complications active";' +
'  var fontId = parseInt(document.getElementById("cornerFont").value, 10);' +
'  var fontName = fontLookupEntry(fontId).label;' +
'  return count + " complication" + (count === 1 ? "" : "s") + " active in " + fontName;' +
'}' +
'function computeAnimationSubheader() {' +
'  var parts = [];' +
'  if (document.getElementById("startupClockAnimMode").value === "1") parts.push("animated clock on start");' +
'  if (document.getElementById("bgAnimMode").value === "1") parts.push("indices on start");' +
'  if (document.getElementById("shakeAnimMode").value === "1") parts.push("smooth second hand on shake");' +
'  if (document.getElementById("shakeHandsTranslucent").checked) parts.push("semi-transparent hands on shake");' +
'  if (!parts.length) return "No animations active";' +
'  var s = parts.join(", ");' +
'  return s.charAt(0).toUpperCase() + s.slice(1);' +
'}' +
'function computePresetsSubheader() {' +
'  var used = 0;' +
'  for (var n = 1; n <= 6; n++) {' +
'    var el = document.getElementById("presetSlot" + n + "Json");' +
'    if (el && el.value) used++;' +
'  }' +
'  return used + " out of 6 presets used";' +
'}' +
'function computeWeatherSubheader() {' +
'  var tempUnit = document.getElementById("tempUnit").value;' +
'  var tempLabel = tempUnit === "F" ? "Fahrenheit" : tempUnit === "K" ? "Kelvin" : "Celsius";' +
'  var wind = document.getElementById("windSpeedUnit").value;' +
'  var windLabel = wind === "mph" ? "imperial" : wind === "kn" ? "nautical" : "metric";' +
'  var aqi = document.getElementById("aqiUnit").value;' +
'  var aqiLabel = aqi === "1" ? "European" : "US";' +
'  return tempLabel + " temp. units with " + windLabel + " and " + aqiLabel + " air quality";' +
'}' +
'function computeLocationSubheader() {' +
'  if (document.getElementById("autoLoc").checked) return "Use phone location";' +
'  var nameEl = document.getElementById("locationName");' +
'  var name = nameEl ? nameEl.value : "";' +
'  if (name) return "Use " + name;' +
'  var lat = document.getElementById("lat").value;' +
'  var lon = document.getElementById("lon").value;' +
'  if (!lat && !lon) return "Use phone location";' +
'  return "Use lat: " + lat + ", long: " + lon;' +
'}' +
'function computeOtherSubheader() {' +
'  var mode = document.getElementById("hourlyVibeMode").value;' +
'  if (mode === "0") return "Hourly vibrations off";' +
'  var when = mode === "1" ? "on full hours" : (document.getElementById("hourlyVibeIntervalMin").value + " min interval");' +
'  return "Hourly vibrations: " + when;' +
'}' +
'function computeUpdatesSubheader() {' +
'  var mins = document.getElementById("updateMins").value;' +
'  var saver = document.getElementById("batterySaverEnabled").checked;' +
'  return mins + " minute interval, battery preserver " + (saver ? "on" : "off");' +
'}' +
'function formatTestDateTime(val) {' +
'  if (!val) return null;' +
'  var parts = val.split("T");' +
'  if (parts.length < 2) return val;' +
'  var dateParts = parts[0].split("-");' +
'  if (dateParts.length !== 3) return val;' +
'  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];' +
'  var y = dateParts[0], m = parseInt(dateParts[1], 10) - 1, d = parseInt(dateParts[2], 10);' +
'  return d + " " + (months[m] || "") + " " + y + " " + parts[1];' +
'}' +
'function computeDebugSubheader() {' +
'  var testOn = document.getElementById("testMode").checked;' +
'  var overridePart = testOn ? ("Override: " + (formatTestDateTime(document.getElementById("testDateTime").value) || "not set")) : "Override: off";' +
'  var boxesOn = document.getElementById("drawDebug").checked;' +
'  var boxesPart = testOn ? "bounding boxes enabled, ": "bounding boxes disabled, ";' +
'  var lastPart = "last: none yet";' +
'  try {' +
'    var log = JSON.parse(document.getElementById("rawMessageLogJson").value || "[]");' +
'    if (log.length) {' +
'      var last = log[log.length - 1];' +
'      var d = new Date(last.t);' +
'      function pad(n, len) { var s = String(n); while (s.length < (len || 2)) s = "0" + s; return s; }' +
'      lastPart = "last " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) + "." + pad(d.getMilliseconds(), 3);' +
'    }' +
'  } catch (e) {}' +
'  return overridePart + ", " + boxesPart + lastPart;' +
'}' +
'function refreshAllSectionSubheaders() {' +
'  try { setSubheaderText("examples", EXAMPLE_STYLE_COUNT + " styles available"); } catch (e) {}' +
'  try { setSubheaderText("style", computeStyleSubheader()); } catch (e) {}' +
'  try { refreshHandsSubsectionPreview(); } catch (e) {}' +
'  try { refreshIndicesSubsectionPreview(); } catch (e) {}' +
'  try { refreshBackgroundSubsectionPreview(); } catch (e) {}' +
'  try { refreshBorderSubsectionPreview(); } catch (e) {}' +
'  try { setSubheaderHtml("colors", computeColorsSubheaderHtml()); } catch (e) {}' +
'  try { setSubheaderText("corners", computeFeaturesSubheader()); } catch (e) {}' +
'  try { setSubheaderText("animation", computeAnimationSubheader()); } catch (e) {}' +
'  try { setSubheaderText("presets", computePresetsSubheader()); } catch (e) {}' +
'  try { setSubheaderText("weather", computeWeatherSubheader()); } catch (e) {}' +
'  try { setSubheaderText("location", computeLocationSubheader()); } catch (e) {}' +
'  try { setSubheaderText("updates", computeUpdatesSubheader()); } catch (e) {}' +
'  try { setSubheaderText("other", computeOtherSubheader()); } catch (e) {}' +
'  try { refreshFaqSubheader(); } catch (e) {}' +
'  try { setSubheaderText("testing", computeDebugSubheader()); } catch (e) {}' +
'}' +
'document.addEventListener("click", refreshAllSectionSubheaders);' +
'document.addEventListener("change", refreshAllSectionSubheaders);' +
'document.addEventListener("input", refreshAllSectionSubheaders);' +

'updateColorRoleButtons("day");' +
'updateColorRoleButtons("night");' +
'  (function () {' +
'    var loader = document.getElementById("startupLoader");' +
'    var bar = document.getElementById("startupProgressBar");' +
'    var percent = document.getElementById("startupProgressPercent");' +
'    var subtitle = document.getElementById("startupLoaderSubtitle");' +
'    var progress = 0;' +
'    function setStartupProgress(value, text) {' +
'      progress = Math.max(progress, Math.min(100, value));' +
'      if (bar) bar.style.width = progress + "%";' +
'      if (percent) percent.textContent = Math.round(progress) + "%";' +
'      if (subtitle && text) subtitle.textContent = text;' +
'    }' +
'    window.__modernStartupProgress = setStartupProgress;' +
'    setStartupProgress(12, "Building the settings page…");' +
'    requestAnimationFrame(function () { setStartupProgress(28, "Building the settings page…"); });' +
'  })();' +
'bgInit();' +
'borderInit();' +
'onMarkerStyleChange();' +
'updateHourlyVibeVisibility();' +
'if (window.__modernStartupProgress) window.__modernStartupProgress(42, "Preparing controls…");' +
'updateHandStyleButtonLabel();' +
'refreshAllFontTriggerLabels();' +
'updateFontImportStatus();' +
'refreshEditButtonLabels();' +
'renderHandStyleGrid();' +
'renderMarkerStyleGrid();' +
'if (window.__modernStartupProgress) window.__modernStartupProgress(62, "Preparing previews…");' +
'renderCategoryButtons();' +
'liveInit();' +
'updateWeatherIconStyleVisibility();' +
'adjustTopBarSpacing();' +
'if (window.__modernStartupProgress) window.__modernStartupProgress(78, "Finishing layout…");' +
'if (document.fonts && document.fonts.ready) {' +
'  document.fonts.ready.then(function () {' +
'    updatePreview();' +
'    if (window.__modernStartupProgress) window.__modernStartupProgress(94, "Finalizing preview…");' +
'    setTimeout(function () {' +
'      if (window.__modernStartupProgress) window.__modernStartupProgress(100, "Ready");' +
'      var loader = document.getElementById("startupLoader");' +
'      if (loader) {' +
'        loader.classList.add("hidden");' +
'        setTimeout(function () { loader.style.display = "none"; }, 380);' +
'      }' +
'    }, 180);' +
'  });' +
'} else {' +
'  if (window.__modernStartupProgress) window.__modernStartupProgress(94, "Finalizing preview…");' +
'  setTimeout(function () {' +
'    if (window.__modernStartupProgress) window.__modernStartupProgress(100, "Ready");' +
'    var loader = document.getElementById("startupLoader");' +
'    if (loader) {' +
'      loader.classList.add("hidden");' +
'      setTimeout(function () { loader.style.display = "none"; }, 380);' +
'    }' +
'  }, 180);' +
'}' +
'updateSchemeActiveHighlight();' +
'refreshAllSectionSubheaders();' +
'if (!document.getElementById("autoLoc").checked && document.getElementById("lat").value && document.getElementById("lon").value && !document.getElementById("locationName").value) {' +
'  reverseGeocodeAndCacheLocationName();' +
'}' +
'setInterval(function () { updatePreview(); updateSchemeActiveHighlight(); refreshAllSectionSubheaders(); }, 1000);' +
'</script>' +
'</body></html>';
}

module.exports = { buildConfigHtml: buildConfigHtml };
