// ---- Derived settings-page state ----------------------------------------
// Converts the current settings snapshot into values used to build the page.
// deriveConfigState() is side-effect free and returns the complete state object.

var presetsLookups = require('../presets-lookups');
var CORNER_CATEGORIES = presetsLookups.CORNER_CATEGORIES;
var EXAMPLE_STYLE_COUNT = 9;
var EXAMPLE_STYLE_IMAGES = require('../data/generated/example-style-images');
var EXAMPLE_STYLE_PRESETS = require('../example-style-presets');

function deriveConfigState(current) {
  var autoLocChecked = current.autoLoc ? 'checked' : '';
  var manualDisabled = current.autoLoc ? 'disabled' : '';
  var testModeChecked = current.testMode ? 'checked' : '';
  var testDisabled = current.testMode ? '' : 'disabled';
  // Falls back to the most recently sent raw chunk (see
  // rawMessageLogButtonsHtml() in config-debug.js) rather than the old
  // single LAST_COMPUTED_DICT snapshot -- same as clicking the newest of the
  // buttons below would load, just done automatically on page open.
  var rawLogEntries = current.rawMessageLog || [];
  var mostRecentRawChunk = rawLogEntries.length ? rawLogEntries[rawLogEntries.length - 1].dict : null;
  var debugTextareaInitial = (current.debugOverrideEnabled && current.debugOverrideData)
    ? current.debugOverrideData
    : (mostRecentRawChunk ? JSON.stringify(mostRecentRawChunk, null, 2) : '');
  var secondsChecked = current.showSeconds ? 'checked' : '';
  var cornerFontId = parseInt(current.cornerFont || '27', 10);

  // Client-side copy of the feature catalogue (see presets-lookups.js).
  var cornerCategoriesForClient = CORNER_CATEGORIES;

  // One <button> per example-style slot (see EXAMPLE_STYLE_COUNT's own
  // comment above) -- a screenshot if one's been generated for that
  // slot, otherwise just its number as an empty placeholder tile;
  // disabled (not clickable) until that slot has an actual preset.
  var exampleStylesButtonsHtml = '';
  for (var exStyleI = 1; exStyleI <= EXAMPLE_STYLE_COUNT; exStyleI++) {
    var exStyleImg = EXAMPLE_STYLE_IMAGES[String(exStyleI)];
    var exStyleHasPreset = EXAMPLE_STYLE_PRESETS[String(exStyleI)] != null;
    exampleStylesButtonsHtml +=
      '<button type="button" class="example-style-btn" onclick="openExampleStyleModal(' + exStyleI + ')"' +
      (exStyleHasPreset ? '' : ' disabled') + '>' +
      (exStyleImg
        ? '<img src="' + exStyleImg + '" alt="Example style ' + exStyleI + '">'
        : '<span class="example-style-btn-empty">' + exStyleI + '</span>') +
      '</button>';
  }

  // Which edge-middle slots (upper/bottom/left/right-middle) does the
  // current mode/style support, and are the 4 corners themselves
  // suppressed? Must match computeSlotAvailability()'s client-side
  // logic (and features_recompute_slots's rules in features_layer.c)
  // exactly, or the settings page would show slots as available that
  // the watch itself won't actually draw. (Not currently read by
  // anything below -- computeSlotAvailability() is what actually
  // drives the rendered page -- but kept in sync anyway since this
  // comment already promises it matches, and a future reader/caller
  // shouldn't inherit a silently-stale copy.)
  var markerStyleNum = parseInt(current.bigAnalogMarkerStyle || '3', 10);
  var isBitmapMarkerStyle = (markerStyleNum >= 3 && markerStyleNum <= 7) || (markerStyleNum >= 11 && markerStyleNum <= 19); // everything else is ring-based (0 None, 1/2/9/10 presets, 8 Custom)
  // The Modern/Roman variants (11-19) lay features out like Fancy (7), the last pre-variant style.
  if (markerStyleNum >= 11) markerStyleNum = 7;
  var bitmapCornerOverride = !!current.bitmapCornerOverride;
  var edgeAvail;
  if (!isBitmapMarkerStyle) {
    edgeAvail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: false };
  } else if (markerStyleNum === 3 || markerStyleNum === 4 || markerStyleNum === 6) {
    edgeAvail = { upper: true, bottom: true, left: bitmapCornerOverride, right: bitmapCornerOverride, cornersGrayed: !bitmapCornerOverride };
  } else if (markerStyleNum === 5) {
    // Tally -- its mask art leaves all 4 corners clear.
    edgeAvail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: false };
  } else if (markerStyleNum === 7) {
    edgeAvail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: !bitmapCornerOverride };
  } else {
    edgeAvail = { upper: true, bottom: bitmapCornerOverride, left: bitmapCornerOverride, right: bitmapCornerOverride, cornersGrayed: !bitmapCornerOverride };
  }
  function hexFromPackedByte(byte) {
    var b = parseInt(byte, 10);
    if (isNaN(b)) return '#000000';
    var r2 = (b >> 4) & 3, g2 = (b >> 2) & 3, b2 = b & 3;
    function ch(v) { var h = (v * 85).toString(16); return h.length < 2 ? '0' + h : h; }
    return '#' + ch(r2) + ch(g2) + ch(b2);
  }
  // Colors are always three concrete packed bytes now -- there's no
  // "preset vs custom" mode stored anywhere. Picking a preset (see
  // chooseColorPreset() below) just writes its RGB straight into these
  // same three hidden fields, same as tapping each swatch individually
  // would, so the page only ever has one representation of "current
  // colors" to read back on load -- whether that happens to currently
  // match one of COLOR_SCHEMES is worked out fresh each time by
  // matchingPresetId(), not tracked as its own separate state.
  function resolveInitialColors(bgByte, textByte, accentByte) {
    return {
      bg: hexFromPackedByte(bgByte),
      text: hexFromPackedByte(textByte),
      accent: hexFromPackedByte(accentByte)
    };
  }
  var initialColors = resolveInitialColors(current.customBg || '255', current.customText || '192', current.customAccent || '192');
  var initialNightColors = resolveInitialColors(current.nightCustomBg || '192', current.nightCustomText || '255', current.nightCustomAccent || '255');

  return {
    autoLocChecked: autoLocChecked,
    manualDisabled: manualDisabled,
    testModeChecked: testModeChecked,
    testDisabled: testDisabled,
    rawLogEntries: rawLogEntries,
    mostRecentRawChunk: mostRecentRawChunk,
    debugTextareaInitial: debugTextareaInitial,
    secondsChecked: secondsChecked,
    cornerFontId: cornerFontId,
    cornerCategoriesForClient: cornerCategoriesForClient,
    exampleStylesButtonsHtml: exampleStylesButtonsHtml,
    markerStyleNum: markerStyleNum,
    isBitmapMarkerStyle: isBitmapMarkerStyle,
    bitmapCornerOverride: bitmapCornerOverride,
    edgeAvail: edgeAvail,
    initialColors: initialColors,
    initialNightColors: initialNightColors
  };
}

module.exports = {
  deriveConfigState: deriveConfigState
};
