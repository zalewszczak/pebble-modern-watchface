// AppMessage message encoder
var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var settingsCodecs = require('../settings/settings-codecs');
var scheduledStyle = require('../scheduled-style');
var platform = require('../platform');
var clampFontId = settingsCodecs.clampFontId;
var showSecondsCode = settingsCodecs.showSecondsCode;
var customColorByte = settingsCodecs.customColorByte;
var customBgByte = settingsCodecs.customBgByte;
var tempGradientColorByte = require('../weather/weather-normalize').tempGradientColorByte;
var weatherIconCategory = require('../weather/weather-normalize').weatherIconCategory;
var weatherConditionColorByte = require('../weather/weather-normalize').weatherConditionColorByte;
var phoneMedia = require('../plugins/phone-media');
var phoneSlots = require('./phone-slots');
var messageSchema = require('./message-schema');
var primitiveIds = require('../config/primitive-ids-generated');
var primitiveIdSequenceForContent = require('../config/primitive-decompose').primitiveIdSequenceForContent;
var primitiveAuxSequenceForContent = require('../config/primitive-decompose').primitiveAuxSequenceForContent;
var normalizePrimitiveSequence = require('../config/primitive-decompose').normalizePrimitiveSequence;
var normalizePrimitiveAux = require('../config/primitive-decompose').normalizePrimitiveAux;
var parseCustomPrimsSetting = require('../config/primitive-decompose').parseCustomPrimsSetting;
var customTextByte = settingsCodecs.customTextByte;
var customAccentByte = settingsCodecs.customAccentByte;
var nightSchemeEnabledCode = settingsCodecs.nightSchemeEnabledCode;
var nightCustomBgByte = settingsCodecs.nightCustomBgByte;
var nightCustomTextByte = settingsCodecs.nightCustomTextByte;
var nightCustomAccentByte = settingsCodecs.nightCustomAccentByte;
var weatherIconStyleCode = settingsCodecs.weatherIconStyleCode;
var shakeSecondsCode = settingsCodecs.shakeSecondsCode;
var shadowTranslucentCode = settingsCodecs.shadowTranslucentCode;
var shadowAngleCode = settingsCodecs.shadowAngleCode;
var bigAnalogMarkerStyleCode = settingsCodecs.bigAnalogMarkerStyleCode;
var bitmapMarkerTransparentCode = settingsCodecs.bitmapMarkerTransparentCode;
var bitmapMarkerInvertCode = settingsCodecs.bitmapMarkerInvertCode;
var borderData = require('../border/border-data');
var borderWeatherModeCode = settingsCodecs.borderWeatherModeCode;
var borderWeatherPxCode = settingsCodecs.borderWeatherPxCode;
var borderWeatherSchemeCode = settingsCodecs.borderWeatherSchemeCode;
var borderWeatherShakeCode = settingsCodecs.borderWeatherShakeCode;
var borderWeatherSemiCode = settingsCodecs.borderWeatherSemiCode;
var bgTranslucentCode = settingsCodecs.bgTranslucentCode;
var shakeHandsTranslucentCode = settingsCodecs.shakeHandsTranslucentCode;
var drawFeaturesBeneathHandsCode = settingsCodecs.drawFeaturesBeneathHandsCode;
var clampInt = settingsCodecs.clampInt;
var customMarkerStyleCode = settingsCodecs.customMarkerStyleCode;
var customMarkerBorderCode = settingsCodecs.customMarkerBorderCode;
var customHourStyleCode = settingsCodecs.customHourStyleCode;
var customHourThicknessCode = settingsCodecs.customHourThicknessCode;
var customHourInnerThicknessCode = settingsCodecs.customHourInnerThicknessCode;
var customHourInnerEccCode = settingsCodecs.customHourInnerEccCode;
var customHourOuterEccCode = settingsCodecs.customHourOuterEccCode;
var customHourInnerBorderCode = settingsCodecs.customHourInnerBorderCode;
var customHourOuterBorderCode = settingsCodecs.customHourOuterBorderCode;
var customHourTranslucentCode = settingsCodecs.customHourTranslucentCode;
var customHourColorCode = settingsCodecs.customHourColorCode;
var customSecStyleCode = settingsCodecs.customSecStyleCode;
var customSecThicknessCode = settingsCodecs.customSecThicknessCode;
var customSecInnerThicknessCode = settingsCodecs.customSecInnerThicknessCode;
var customSecInnerEccCode = settingsCodecs.customSecInnerEccCode;
var customSecOuterEccCode = settingsCodecs.customSecOuterEccCode;
var customSecInnerBorderCode = settingsCodecs.customSecInnerBorderCode;
var customSecOuterBorderCode = settingsCodecs.customSecOuterBorderCode;
var customSecTranslucentCode = settingsCodecs.customSecTranslucentCode;
var customSecColorCode = settingsCodecs.customSecColorCode;
var markerTextTargetCode = settingsCodecs.markerTextTargetCode;
var markerTextFontCode = settingsCodecs.markerTextFontCode;
var markerTextOffsetCode = settingsCodecs.markerTextOffsetCode;
var markerTextHourMaskCode = settingsCodecs.markerTextHourMaskCode;
var markerTextSecMaskCode = settingsCodecs.markerTextSecMaskCode;
var markerTextRomanCode = settingsCodecs.markerTextRomanCode;
var handStyleFieldCode = settingsCodecs.handStyleFieldCode;
var handColorFieldCode = settingsCodecs.handColorFieldCode;
var handMainColorFieldCode = settingsCodecs.handMainColorFieldCode;
var handOutlineEnabledCode = settingsCodecs.handOutlineEnabledCode;
var handTranslucentCode = settingsCodecs.handTranslucentCode;
var handShadowEnabledCode = settingsCodecs.handShadowEnabledCode;
var handShadowDistanceCode = settingsCodecs.handShadowDistanceCode;
var handMiddleOffsetCode = settingsCodecs.handMiddleOffsetCode;
var handSecondaryWidthCode = settingsCodecs.handSecondaryWidthCode;
var handHollowCode = settingsCodecs.handHollowCode;
var handHollowThicknessCode = settingsCodecs.handHollowThicknessCode;
var handHourStyleCode = settingsCodecs.handHourStyleCode;
var handHourWidthCode = settingsCodecs.handHourWidthCode;
var handHourLengthCode = settingsCodecs.handHourLengthCode;
var handHourBackOffsetCode = settingsCodecs.handHourBackOffsetCode;
var handHourMiddleOffsetCode = settingsCodecs.handHourMiddleOffsetCode;
var handHourSecondaryWidthCode = settingsCodecs.handHourSecondaryWidthCode;
var handHourColorCode = settingsCodecs.handHourColorCode;
var handHourOutlineEnabledCode = settingsCodecs.handHourOutlineEnabledCode;
var handHourOutlineColorCode = settingsCodecs.handHourOutlineColorCode;
var handHourTranslucentCode = settingsCodecs.handHourTranslucentCode;
var handHourShadowEnabledCode = settingsCodecs.handHourShadowEnabledCode;
var handHourShadowDistanceCode = settingsCodecs.handHourShadowDistanceCode;
var handHourHollowCode = settingsCodecs.handHourHollowCode;
var handHourHollowThicknessCode = settingsCodecs.handHourHollowThicknessCode;
var handMinStyleCode = settingsCodecs.handMinStyleCode;
var handMinWidthCode = settingsCodecs.handMinWidthCode;
var handMinLengthCode = settingsCodecs.handMinLengthCode;
var handMinBackOffsetCode = settingsCodecs.handMinBackOffsetCode;
var handMinMiddleOffsetCode = settingsCodecs.handMinMiddleOffsetCode;
var handMinSecondaryWidthCode = settingsCodecs.handMinSecondaryWidthCode;
var handMinColorCode = settingsCodecs.handMinColorCode;
var handMinOutlineEnabledCode = settingsCodecs.handMinOutlineEnabledCode;
var handMinOutlineColorCode = settingsCodecs.handMinOutlineColorCode;
var handMinTranslucentCode = settingsCodecs.handMinTranslucentCode;
var handMinShadowEnabledCode = settingsCodecs.handMinShadowEnabledCode;
var handMinShadowDistanceCode = settingsCodecs.handMinShadowDistanceCode;
var handMinHollowCode = settingsCodecs.handMinHollowCode;
var handMinHollowThicknessCode = settingsCodecs.handMinHollowThicknessCode;
var handSecStyleCode = settingsCodecs.handSecStyleCode;
var handSecWidthCode = settingsCodecs.handSecWidthCode;
var handSecLengthCode = settingsCodecs.handSecLengthCode;
var handSecBackOffsetCode = settingsCodecs.handSecBackOffsetCode;
var handSecMiddleOffsetCode = settingsCodecs.handSecMiddleOffsetCode;
var handSecSecondaryWidthCode = settingsCodecs.handSecSecondaryWidthCode;
var handSecColorCode = settingsCodecs.handSecColorCode;
var handSecOutlineEnabledCode = settingsCodecs.handSecOutlineEnabledCode;
var handSecOutlineColorCode = settingsCodecs.handSecOutlineColorCode;
var handSecTranslucentCode = settingsCodecs.handSecTranslucentCode;
var handSecShadowEnabledCode = settingsCodecs.handSecShadowEnabledCode;
var handSecShadowDistanceCode = settingsCodecs.handSecShadowDistanceCode;
var handSecHollowCode = settingsCodecs.handSecHollowCode;
var handSecHollowThicknessCode = settingsCodecs.handSecHollowThicknessCode;
var centerCircleRadiusCode = settingsCodecs.centerCircleRadiusCode;
var centerCircleColorCode = settingsCodecs.centerCircleColorCode;
var upperMiddleLine1ContentCode = settingsCodecs.upperMiddleLine1ContentCode;
var upperMiddleLine1ColorModeCode = settingsCodecs.upperMiddleLine1ColorModeCode;
var upperMiddleLine2ContentCode = settingsCodecs.upperMiddleLine2ContentCode;
var upperMiddleLine2ColorModeCode = settingsCodecs.upperMiddleLine2ColorModeCode;
var bottomMiddleLine1ContentCode = settingsCodecs.bottomMiddleLine1ContentCode;
var bottomMiddleLine1ColorModeCode = settingsCodecs.bottomMiddleLine1ColorModeCode;
var bottomMiddleLine2ContentCode = settingsCodecs.bottomMiddleLine2ContentCode;
var bottomMiddleLine2ColorModeCode = settingsCodecs.bottomMiddleLine2ColorModeCode;
var middleLeftLine1ContentCode = settingsCodecs.middleLeftLine1ContentCode;
var middleLeftLine1ColorModeCode = settingsCodecs.middleLeftLine1ColorModeCode;
var middleLeftLine2ContentCode = settingsCodecs.middleLeftLine2ContentCode;
var middleLeftLine2ColorModeCode = settingsCodecs.middleLeftLine2ColorModeCode;
var middleRightLine1ContentCode = settingsCodecs.middleRightLine1ContentCode;
var middleRightLine1ColorModeCode = settingsCodecs.middleRightLine1ColorModeCode;
var middleRightLine2ContentCode = settingsCodecs.middleRightLine2ContentCode;
var middleRightLine2ColorModeCode = settingsCodecs.middleRightLine2ColorModeCode;
var drawDebugCode = settingsCodecs.drawDebugCode;
var shakeOnlyMaskCode = settingsCodecs.shakeOnlyMaskCode;
var bgImageSync = require('../bg-image/bg-image-sync');
var hourlyVibeModeCode = settingsCodecs.hourlyVibeModeCode;
var hourlyVibeIntervalMinCode = settingsCodecs.hourlyVibeIntervalMinCode;
var hourlyVibePatternCode = settingsCodecs.hourlyVibePatternCode;
var btLostVibeCode = settingsCodecs.btLostVibeCode;
var hourlyVibeSoundCode = settingsCodecs.hourlyVibeSoundCode;
var btLostBeepCode = settingsCodecs.btLostBeepCode;
var minutesSinceMidnight = settingsCodecs.minutesSinceMidnight;
var hourlyVibeStartMinCode = settingsCodecs.hourlyVibeStartMinCode;
var hourlyVibeEndMinCode = settingsCodecs.hourlyVibeEndMinCode;
var hourlyVibeDaysMaskCode = settingsCodecs.hourlyVibeDaysMaskCode;
var hourlyVibeOverrideQuietCode = settingsCodecs.hourlyVibeOverrideQuietCode;
var startupClockAnimModeCode = settingsCodecs.startupClockAnimModeCode;
var bgAnimModeCode = settingsCodecs.bgAnimModeCode;
var shakeAnimModeCode = settingsCodecs.shakeAnimModeCode;
var outlineEnabledCode = settingsCodecs.outlineEnabledCode;
var batterySaverEnabledCode = settingsCodecs.batterySaverEnabledCode;
var cornerFontCode = settingsCodecs.cornerFontCode;
var cornerContentBytes = settingsCodecs.cornerContentBytes;
var cornerColorModeBytes = settingsCodecs.cornerColorModeBytes;
var dailyStepGoalValue = settingsCodecs.dailyStepGoalValue;
var messageQueue = require('./message-queue');
var enqueueFlatDict = messageQueue.enqueueFlatDict;

function toEpoch(d) {
  if (d && d instanceof Date) return Math.round(d.getTime() / 1000);
  return 0;
}

function i32ArrayToBytes(arr) {
  var bytes = [];
  for (var i = 0; i < arr.length; i++) {
    var v = arr[i] | 0;
    bytes.push(v & 0xFF);
    bytes.push((v >> 8) & 0xFF);
    bytes.push((v >> 16) & 0xFF);
    bytes.push((v >> 24) & 0xFF);
  }
  return bytes;
}

function toU8(v) { return ((v % 256) + 256) % 256; }

var PLANET_ORDER = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

function astroFieldsDict(astro) {
  var riseSet = astro.riseSet;
  var planetRiseArr = [], planetSetArr = [];
  PLANET_ORDER.forEach(function (name) {
    planetRiseArr.push(toEpoch(riseSet[name].rise));
    planetSetArr.push(toEpoch(riseSet[name].set));
  });
  return {
    'PLANET_RISE': i32ArrayToBytes(planetRiseArr),
    'PLANET_SET': i32ArrayToBytes(planetSetArr),
    'SUN_RISE': toEpoch(riseSet.sun.rise),
    'SUN_SET': toEpoch(riseSet.sun.set),
    'SUN_RISE_TOMORROW': toEpoch(astro.sunRiseTomorrow)
  };
}

function handBytes(style, width, length, backOffset, middleOffset, secondaryWidth,
                    color, outlineEnabled, outlineColor, translucent,
                    hollow, hollowThickness, shadowEnabled, shadowDistance) {
  return [
    style, width, length, toU8(backOffset), toU8(middleOffset), secondaryWidth,
    color, outlineEnabled, outlineColor, translucent,
    hollow, hollowThickness, shadowEnabled, shadowDistance
  ];
}

function handsBytes() {
  return [].concat(
    handBytes(
      handHourStyleCode(), handHourWidthCode(), handHourLengthCode(), handHourBackOffsetCode(),
      handHourMiddleOffsetCode(), handHourSecondaryWidthCode(), handHourColorCode(),
      handHourOutlineEnabledCode(), handHourOutlineColorCode(), handHourTranslucentCode(),
      handHourHollowCode(), handHourHollowThicknessCode(), handHourShadowEnabledCode(), handHourShadowDistanceCode()
    ),
    handBytes(
      handMinStyleCode(), handMinWidthCode(), handMinLengthCode(), handMinBackOffsetCode(),
      handMinMiddleOffsetCode(), handMinSecondaryWidthCode(), handMinColorCode(),
      handMinOutlineEnabledCode(), handMinOutlineColorCode(), handMinTranslucentCode(),
      handMinHollowCode(), handMinHollowThicknessCode(), handMinShadowEnabledCode(), handMinShadowDistanceCode()
    ),
    handBytes(
      handSecStyleCode(), handSecWidthCode(), handSecLengthCode(), handSecBackOffsetCode(),
      handSecMiddleOffsetCode(), handSecSecondaryWidthCode(), handSecColorCode(),
      handSecOutlineEnabledCode(), handSecOutlineColorCode(), handSecTranslucentCode(),
      handSecHollowCode(), handSecHollowThicknessCode(), handSecShadowEnabledCode(), handSecShadowDistanceCode()
    )
  );
}

function markerRingBytes(style, thickness, innerEcc, outerEcc, innerBorder, outerBorder, translucent, color) {
  return [style, thickness, innerEcc, outerEcc, innerBorder, outerBorder, translucent, color];
}

function markerRingsBytes() {
  return [].concat(
    markerRingBytes(
      customHourStyleCode(), customHourThicknessCode(), customHourInnerEccCode(), customHourOuterEccCode(),
      customHourInnerBorderCode(), customHourOuterBorderCode(), customHourTranslucentCode(), customHourColorCode()
    ),
    markerRingBytes(
      customSecStyleCode(), customSecThicknessCode(), customSecInnerEccCode(), customSecOuterEccCode(),
      customSecInnerBorderCode(), customSecOuterBorderCode(), customSecTranslucentCode(), customSecColorCode()
    )
  );
}

// B&W: only normal (0) / pill (2) colour modes exist; gradients and accents flatten.
function bwMode(m) { return platform.bw ? (m === 2 ? 2 : 0) : m; }
function edgeLinesBytes() {
  return [
    settingsCodecs.upperMiddleLine1ColorModeCode(), settingsCodecs.upperMiddleLine2ColorModeCode(),
    settingsCodecs.bottomMiddleLine1ColorModeCode(), settingsCodecs.bottomMiddleLine2ColorModeCode(),
    settingsCodecs.middleLeftLine1ColorModeCode(), settingsCodecs.middleLeftLine2ColorModeCode(),
    settingsCodecs.middleRightLine1ColorModeCode(), settingsCodecs.middleRightLine2ColorModeCode()
  ].map(bwMode);
}
function edgeCustomPrims() {
  return settingsCodecs.edgeCustomPrimsStrings().map(parseCustomPrimsSetting);
}
function edgeFeatureCodesRaw() {
  return [
    settingsCodecs.upperMiddleLine1ContentCode(), settingsCodecs.upperMiddleLine2ContentCode(),
    settingsCodecs.bottomMiddleLine1ContentCode(), settingsCodecs.bottomMiddleLine2ContentCode(),
    settingsCodecs.middleLeftLine1ContentCode(), settingsCodecs.middleLeftLine2ContentCode(),
    settingsCodecs.middleRightLine1ContentCode(), settingsCodecs.middleRightLine2ContentCode()
  ];
}
function primitiveTightMask() {
  var mask = 0;
  ['CONFIG_CORNER_TL_CUSTOM_PRIMS', 'CONFIG_CORNER_TR_CUSTOM_PRIMS', 'CONFIG_CORNER_BL_CUSTOM_PRIMS', 'CONFIG_CORNER_BR_CUSTOM_PRIMS']
    .forEach(function (k, i) { if (parseCustomPrimsSetting(getSetting(k, '')).ids.length) mask |= (1 << i); });
  edgeCustomPrims().forEach(function (c, i) { if (c.ids.length) mask |= (1 << (4 + i)); });
  return mask;
}
function edgeLinePrimitiveIdsBytes() {
  var contentIds = edgeFeatureCodesRaw();
  var customs = edgeCustomPrims();
  return contentIds.reduce(function (acc, contentId, i) {
    return acc.concat(customs[i].ids.length ? normalizePrimitiveSequence(customs[i].ids) : primitiveIdSequenceForContent(contentId));
  }, []);
}
function edgeLinePrimitiveAuxBytes() {
  var contentIds = edgeFeatureCodesRaw();
  var customs = edgeCustomPrims();
  return contentIds.reduce(function (acc, contentId, i) {
    return acc.concat(customs[i].ids.length ? normalizePrimitiveAux(customs[i].aux) : primitiveAuxSequenceForContent(contentId));
  }, []);
}

function markerTextBytes() {
  var hourMask = markerTextHourMaskCode();
  var secMask = markerTextSecMaskCode();
  return [
    markerTextTargetCode(),
    markerTextFontCode(),
    toU8(markerTextOffsetCode()),
    hourMask & 0xFF, (hourMask >> 8) & 0xFF,
    secMask & 0xFF, (secMask >> 8) & 0xFF,
    markerTextRomanCode()
  ];
}

function colorsBytes() {
  return [
    customBgByte(), customTextByte(), customAccentByte(),
    nightCustomBgByte(), nightCustomTextByte(), nightCustomAccentByte()
  ];
}

// The logical corner + edge sequences (what the settings describe), before phone-owned values become slots.
function logicalLayout() {
  var cornerCustomPrimsSettings = [
    getSetting('CONFIG_CORNER_TL_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_TR_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_BL_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_BR_CUSTOM_PRIMS', '')
  ].map(parseCustomPrimsSetting);
  var cornerFeatureIds = cornerContentBytes();
  var cornerIds = cornerFeatureIds.reduce(function (acc, contentId, idx) {
    var custom = cornerCustomPrimsSettings[idx];
    return acc.concat(custom.ids.length ? normalizePrimitiveSequence(custom.ids) : primitiveIdSequenceForContent(contentId));
  }, []);
  var cornerAux = cornerFeatureIds.reduce(function (acc, contentId, idx) {
    var custom = cornerCustomPrimsSettings[idx];
    return acc.concat(custom.ids.length ? normalizePrimitiveAux(custom.aux) : primitiveAuxSequenceForContent(contentId));
  }, []);
  return { cornerIds: cornerIds, cornerAux: cornerAux, edgeIds: edgeLinePrimitiveIdsBytes(), edgeAux: edgeLinePrimitiveAuxBytes() };
}

// Layout + slot table. Always sent together: the slot numbers in the layout index into the table.
function populateFeatureFields(dict) {
  var lay = logicalLayout();
  // Phone battery / music: subscribe only while a feature uses them (decided on the logical ids).
  phoneMedia.setNeeds(phoneMedia.needsFromPrimitiveIds(lay.cornerIds.concat(lay.edgeIds), primitiveIds, lay.cornerAux.concat(lay.edgeAux)));
  var all = phoneSlots.compile(lay.cornerIds.concat(lay.edgeIds), lay.cornerAux.concat(lay.edgeAux));
  dict['CORNER_PRIMITIVE_IDS'] = all.ids.slice(0, lay.cornerIds.length);
  dict['CORNER_PRIMITIVE_AUX'] = all.aux.slice(0, lay.cornerAux.length);
  dict['EDGE_LINE_PRIMITIVE_IDS'] = all.ids.slice(lay.cornerIds.length);
  dict['EDGE_LINE_PRIMITIVE_AUX'] = all.aux.slice(lay.cornerAux.length);
  dict['PHONE_SLOTS'] = all.bytes;
  phoneMedia.fill(dict);
}

function populateSettingsFields(dict) {
  dict['SHOW_SECONDS'] = showSecondsCode();
  dict['COLORS'] = colorsBytes();
  dict['NIGHT_SCHEME_ENABLED'] = nightSchemeEnabledCode();
  dict['SHADOW_TRANSLUCENT'] = shadowTranslucentCode();
  dict['SHADOW_ANGLE'] = shadowAngleCode();
  dict['BIG_ANALOG_MARKER_STYLE'] = bigAnalogMarkerStyleCode();
  dict['DRAW_FEATURES_BENEATH_HANDS'] = drawFeaturesBeneathHandsCode();
  dict['MARKER_RINGS'] = markerRingsBytes();
  dict['MARKER_TEXT'] = markerTextBytes();
  dict['HANDS'] = handsBytes();
  dict['EDGE_LINE_COLOR_MODE'] = edgeLinesBytes();
  dict['BG_ANIM_MODE'] = bgAnimModeCode();
  dict['SHAKE_ANIM_MODE'] = shakeAnimModeCode();
  dict['CORNER_COLOR_MODE'] = cornerColorModeBytes();
  dict['SHAKE_ONLY_MASK'] = shakeOnlyMaskCode();
  dict['BORDER_DATA'] = borderData.bytes();
  dict['SETTINGS_U8_BLOB'] = [
    shakeSecondsCode(), startupClockAnimModeCode(),
    outlineEnabledCode(), cornerFontCode(), centerCircleRadiusCode(), centerCircleColorCode(),
    customHourInnerThicknessCode(), customSecInnerThicknessCode(), hourlyVibeModeCode(),
    hourlyVibeIntervalMinCode(), hourlyVibePatternCode(), hourlyVibeDaysMaskCode(),
    weatherIconStyleCode(),
    batterySaverEnabledCode(), bitmapMarkerTransparentCode(), drawDebugCode(),
    hourlyVibeOverrideQuietCode(),
    bgImageSync.modeCode(), bgImageSync.presetCode(),
    borderWeatherModeCode(), borderWeatherPxCode(),
    borderWeatherSchemeCode(), borderWeatherShakeCode(), borderWeatherSemiCode(),
    primitiveTightMask() & 255, (primitiveTightMask() >> 8) & 255,
    bitmapMarkerInvertCode(),
    bgTranslucentCode(), shakeHandsTranslucentCode(), btLostVibeCode(),
    settingsCodecs.centerCircleOutlineCode(),
    bgImageSync.schemeOverrideCode(),
    hourlyVibeSoundCode(), btLostBeepCode() // keep last: matches the order of SETTINGS_BLOB_OFFSETS in comms_decoder.c
  ];
  populateFeatureFields(dict);
  dict['DAILY_STEP_GOAL'] = dailyStepGoalValue();
  dict['HOURLY_VIBE_START_MIN'] = hourlyVibeStartMinCode();
  dict['HOURLY_VIBE_END_MIN'] = hourlyVibeEndMinCode();
  dict['NEXT_STYLE_CHECK'] = scheduledStyle.nextCheckSeconds(Date.now());
}

function buildFullKeysetDict() {
  var dict = {};
  try {
    var raw = localStorage.getItem('LAST_FULL_COMPUTED_DICT');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') dict = parsed;
    }
  } catch (e) {
  }
  dropUnknownKeys(dict);
  populateSettingsFields(dict);
  return dict;
}

// A dictionary cached by an older version can hold keys this version no longer has; sending one would fail
// the whole chunk.
function dropUnknownKeys(dict) {
  Object.keys(dict).forEach(function (k) {
    if (messageSchema.KEY_TYPE_MAP[k] === undefined && k !== 'MESSAGE_TYPE') delete dict[k];
  });
}

function sendFlatDict(dict) {
  populateSettingsFields(dict);

  try {
    if (Object.prototype.hasOwnProperty.call(dict, 'SUN_RISE')) {
      localStorage.setItem('LAST_FULL_COMPUTED_DICT', JSON.stringify(dict));
    }
  } catch (e) {
  }

  var toSend = dict;

  if (getSetting('CONFIG_DEBUG_OVERRIDE_ENABLED', 'false') === 'true') {
    try {
      var parsed = JSON.parse(getSetting('CONFIG_DEBUG_OVERRIDE_DATA', ''));
      if (parsed && typeof parsed === 'object') {
        toSend = parsed;
        console.log('modern: DEBUG OVERRIDE active, sending user-edited data instead of computed data');
      }
    } catch (e) {
      console.log('modern: DEBUG OVERRIDE enabled but stored data is not valid JSON, sending normal computed data instead: ' + e);
    }
  }

  enqueueFlatDict(toSend);
}

function sendInvalid(errorCode) {
  phoneSlots.applyInvalid(errorCode);
  sendFlatDict({ 'DATA_VALID': 0, 'ERROR_CODE': errorCode || 0 });
}

function issFieldsDict(issPos, issErrorCode) {
  return {
    'ISS_NEXT_PASS': (issPos && issPos.nextPass) ? toEpoch(issPos.nextPass) : 0,
    'ISS_ERROR_CODE': issErrorCode || 0
  };
}

// Phone-side extras only feed the border ring now; their text values live in the phone slots.
function applyExtraWeather(extra) {
  if (!extra || !extra.forecastWx) return;
  // The border ring is built from these on the phone (border/border-data.js); the watch gets only the finished ring.
  borderData.setWeather({
    forecastTempC: extra.forecastTempC,
    forecastWx: extra.forecastWx.map(function (c) { return (typeof c === 'number' && c >= 0 && c <= 9) ? c : 0; }),
    forecastRainPct: (extra.forecastRainPct || []).map(function (c) { return (typeof c === 'number' && !isNaN(c)) ? Math.max(0, Math.min(100, Math.round(c))) : 0; }),
    borderHourly: extra.borderHourly ? {
      start: extra.borderHourly.start,
      tempC: extra.borderHourly.tempC,
      wx: extra.borderHourly.wx.map(function (c) { return (typeof c === 'number' && c >= 0 && c <= 9) ? c : 0; }),
      rain: extra.borderHourly.rain,
      tempColor: extra.borderHourly.tempC.map(function (c) { return typeof c === 'number' ? tempGradientColorByte(c) : 0; })
    } : null
  }, extra.forecastTempC ? extra.forecastTempC.map(function (c) { return tempGradientColorByte(c); }) : []);
}

function buildWeatherDict(d) {
  var w = d.weather;
  var weatherCondition = w.condition;
  var haveCloudData = (typeof w.currentCloudPct === 'number') || d.headlineSources > 0;
  var displayCloudPct = (typeof w.currentCloudPct === 'number') ? w.currentCloudPct : (d.headlineCloud || 0);
  var dict = {
    'DATA_VALID': 1,
    'WEATHER_ERROR_CODE': d.weatherErrorCode || 0
  };
  if (d.weatherOk) {
    // The weather condition icon is still drawn by the watch (it needs the watch's day/night), so its
    // category and colour travel as they always did; every text value is in the phone slots.
    if (haveCloudData) {
      dict['WEATHER_ICON_CATEGORY'] = weatherIconCategory(weatherCondition || 0, displayCloudPct);
      dict['WEATHER_ICON_COLOR'] = weatherConditionColorByte(weatherCondition || 0, displayCloudPct, w.rainChancePct);
    }
    dict['WEATHER_WX_NOW'] = (typeof w.wxNow === 'number' && w.wxNow >= 0 && w.wxNow <= 9) ? w.wxNow : 0;
    dict['WEATHER_LAST_UPDATE'] = Math.floor(Date.now() / 1000);
  }
  return dict;
}

function sendWeatherData(d) {
  phoneSlots.applyWeather(d);
  applyExtraWeather(d.extraWeather);
  var dict = buildWeatherDict(d);
  [astroFieldsDict(d.astro), issFieldsDict(d.issPos, d.issErrorCode)]
    .forEach(function (part) { Object.keys(part).forEach(function (k) { dict[k] = part[k]; }); });
  sendFlatDict(dict);
}

function sendFakeWeather(v) {
  phoneSlots.applyFake(v);
  var weather = {
    condition: v.WEATHER_CONDITION, tempC: v.WEATHER_TEMP_C, rainChancePct: v.RAIN_CHANCE_PCT, currentCloudPct: v.CLOUD_COVER
  };
  var dict = buildWeatherDict({ weather: weather, weatherOk: true, weatherErrorCode: 0, headlineSources: 0, headlineCloud: 0 });
  populateFeatureFields(dict);
  enqueueFlatDict(dict);
}

// Re-sends the layout and slot table from the data already known (plugin text, phone battery and music
// changed, or a unit setting was edited).
function sendFeatureLayout() {
  var dict = {};
  populateFeatureFields(dict);
  enqueueFlatDict(dict);
}

module.exports = {
  sendFlatDict: sendFlatDict,
  sendInvalid: sendInvalid,
  sendWeatherData: sendWeatherData,
  sendFakeWeather: sendFakeWeather,
  sendFeatureLayout: sendFeatureLayout,
  buildFullKeysetDict: buildFullKeysetDict
};
