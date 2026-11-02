// Derived settings-page state
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
  var rawLogEntries = current.rawMessageLog || [];
  var mostRecentRawChunk = rawLogEntries.length ? rawLogEntries[rawLogEntries.length - 1].dict : null;
  var debugTextareaInitial = (current.debugOverrideEnabled && current.debugOverrideData)
    ? current.debugOverrideData
    : (mostRecentRawChunk ? JSON.stringify(mostRecentRawChunk, null, 2) : '');
  var secondsChecked = current.showSeconds ? 'checked' : '';
  var cornerFontId = parseInt(current.cornerFont || '27', 10);

  var cornerCategoriesForClient = CORNER_CATEGORIES;

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

  var markerStyleNum = parseInt(current.bigAnalogMarkerStyle || '3', 10);
  var isBitmapMarkerStyle = (markerStyleNum >= 3 && markerStyleNum <= 7) || (markerStyleNum >= 11 && markerStyleNum <= 19);
  if (markerStyleNum >= 11) markerStyleNum = 7;
  var bitmapCornerOverride = !!current.bitmapCornerOverride;
  var edgeAvail;
  if (!isBitmapMarkerStyle) {
    edgeAvail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: false };
  } else if (markerStyleNum === 3 || markerStyleNum === 4 || markerStyleNum === 6) {
    edgeAvail = { upper: true, bottom: true, left: bitmapCornerOverride, right: bitmapCornerOverride, cornersGrayed: !bitmapCornerOverride };
  } else if (markerStyleNum === 5) {
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
