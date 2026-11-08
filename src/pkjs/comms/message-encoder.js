// AppMessage message encoder
var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var settingsCodecs = require('../settings/settings-codecs');
var scheduledStyle = require('../scheduled-style');
var platform = require('../platform');
var clampFontId = settingsCodecs.clampFontId;
var tempUnitCode = settingsCodecs.tempUnitCode;
var windSpeedUnitCode = settingsCodecs.windSpeedUnitCode;
var showSecondsCode = settingsCodecs.showSecondsCode;
var customColorByte = settingsCodecs.customColorByte;
var customBgByte = settingsCodecs.customBgByte;
var formatTempDisplay = require('../weather/weather-normalize').formatTempDisplay;
var apparentTempC = require('../weather/weather-normalize').apparentTempC;
var tempGradientColorByte = require('../weather/weather-normalize').tempGradientColorByte;
var formatUvDisplay = require('../weather/weather-normalize').formatUvDisplay;
var uvGradientColorByte = require('../weather/weather-normalize').uvGradientColorByte;
var formatPercentDisplay = require('../weather/weather-normalize').formatPercentDisplay;
var percentGradientColorByte = require('../weather/weather-normalize').percentGradientColorByte;
var overcastGrayColorByte = require('../weather/weather-normalize').overcastGrayColorByte;
var formatWindSpeedDisplay = require('../weather/weather-normalize').formatWindSpeedDisplay;
var windSpeedGradientColorByte = require('../weather/weather-normalize').windSpeedGradientColorByte;
var formatPressureDisplay = require('../weather/weather-normalize').formatPressureDisplay;
var pressureGradientColorByte = require('../weather/weather-normalize').pressureGradientColorByte;
var formatAqiDisplay = require('../weather/weather-normalize').formatAqiDisplay;
var aqiGradientColorByte = require('../weather/weather-normalize').aqiGradientColorByte;
var formatAltitudeDisplay = require('../weather/weather-normalize').formatAltitudeDisplay;
var altitudeGradientColorByte = require('../weather/weather-normalize').altitudeGradientColorByte;
var weatherIconCategory = require('../weather/weather-normalize').weatherIconCategory;
var weatherConditionColorByte = require('../weather/weather-normalize').weatherConditionColorByte;
var featureDisplay = require('../astronomy/feature-display');
var phoneMedia = require('../plugins/phone-media');
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
var aqiUnitCode = settingsCodecs.aqiUnitCode;
var altitudeUnitCode = settingsCodecs.altitudeUnitCode;
var shakeSecondsCode = settingsCodecs.shakeSecondsCode;
var shadowTranslucentCode = settingsCodecs.shadowTranslucentCode;
var shadowAngleCode = settingsCodecs.shadowAngleCode;
var bigAnalogMarkerStyleCode = settingsCodecs.bigAnalogMarkerStyleCode;
var bitmapMarkerTransparentCode = settingsCodecs.bitmapMarkerTransparentCode;
var bitmapMarkerInvertCode = settingsCodecs.bitmapMarkerInvertCode;
var pluginManager = require('../plugins/plugin-manager');
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
  var moonPhase = astro.moonPhase, riseSet = astro.riseSet, meteorShower = astro.meteorShower;
  var planetRiseArr = [], planetSetArr = [];
  PLANET_ORDER.forEach(function (name) {
    planetRiseArr.push(toEpoch(riseSet[name].rise));
    planetSetArr.push(toEpoch(riseSet[name].set));
  });
  var meteorIntensity = meteorShower ? meteorShower.intensity : 0;
  return {
    'PLANET_RISE': i32ArrayToBytes(planetRiseArr),
    'PLANET_SET': i32ArrayToBytes(planetSetArr),
    'SUN_RISE': toEpoch(riseSet.sun.rise),
    'SUN_SET': toEpoch(riseSet.sun.set),
    'SUN_RISE_TOMORROW': toEpoch(astro.sunRiseTomorrow),
    'METEOR_SHOWER_NAME': meteorShower ? meteorShower.name : '',
    'MOON_PHASE_DISPLAY': featureDisplay.formatMoonPhaseDisplay(moonPhase.illuminatedPct, moonPhase.waxing),
    'METEOR_DISPLAY': featureDisplay.formatMeteorDisplay(meteorIntensity, meteorShower ? meteorShower.name : ''),
    'SATURN_RINGS_DISPLAY': featureDisplay.formatSaturnRingsDisplay(astro.saturnRingOpenPct),
    'ASTRO_U8_BLOB': [
      astro.saturnRingOpenPct, moonPhase.illuminatedPct, moonPhase.waxing ? 1 : 0,
      meteorIntensity, featureDisplay.meteorGradientColorByte(meteorIntensity)
    ]
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
  ].map(function (m, i) { return platform.bw && i >= 4 ? 0 : bwMode(m); });
}
function edgeCustomPrims() {
  return settingsCodecs.edgeCustomPrimsStrings().map(parseCustomPrimsSetting).map(function (c, i) {
    return platform.bw && i >= 4 ? { ids: [], aux: [] } : c;
  });
}
function edgeFeatureCodesRaw() {
  return [
    settingsCodecs.upperMiddleLine1ContentCode(), settingsCodecs.upperMiddleLine2ContentCode(),
    settingsCodecs.bottomMiddleLine1ContentCode(), settingsCodecs.bottomMiddleLine2ContentCode(),
    settingsCodecs.middleLeftLine1ContentCode(), settingsCodecs.middleLeftLine2ContentCode(),
    settingsCodecs.middleRightLine1ContentCode(), settingsCodecs.middleRightLine2ContentCode()
  ].map(function (c, i) { return platform.bw && i >= 4 ? 0 : c; });
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
  dict['EDGE_LINE_PRIMITIVE_IDS'] = edgeLinePrimitiveIdsBytes();
  dict['EDGE_LINE_PRIMITIVE_AUX'] = edgeLinePrimitiveAuxBytes();
  dict['BG_ANIM_MODE'] = bgAnimModeCode();
  dict['SHAKE_ANIM_MODE'] = shakeAnimModeCode();
  dict['CORNER_COLOR_MODE'] = cornerColorModeBytes();
  dict['SHAKE_ONLY_MASK'] = shakeOnlyMaskCode();
  dict['PLUGIN_TEXTS'] = pluginManager.textsBytes();
  dict['BORDER_DATA'] = borderData.bytes();
  dict['SETTINGS_U8_BLOB'] = [
    tempUnitCode(), windSpeedUnitCode(), shakeSecondsCode(), startupClockAnimModeCode(),
    outlineEnabledCode(), cornerFontCode(), centerCircleRadiusCode(), centerCircleColorCode(),
    customHourInnerThicknessCode(), customSecInnerThicknessCode(), hourlyVibeModeCode(),
    hourlyVibeIntervalMinCode(), hourlyVibePatternCode(), hourlyVibeDaysMaskCode(),
    weatherIconStyleCode(), aqiUnitCode(), altitudeUnitCode(),
    batterySaverEnabledCode(), bitmapMarkerTransparentCode(), drawDebugCode(),
    hourlyVibeOverrideQuietCode(),
    bgImageSync.modeCode(), bgImageSync.presetCode(),
    borderWeatherModeCode(), borderWeatherPxCode(),
    borderWeatherSchemeCode(), borderWeatherShakeCode(), borderWeatherSemiCode(),
    primitiveTightMask() & 255, (primitiveTightMask() >> 8) & 255,
    bitmapMarkerInvertCode(),
    bgTranslucentCode(), shakeHandsTranslucentCode(), btLostVibeCode(),
    settingsCodecs.centerCircleOutlineCode(),
    bgImageSync.schemeOverrideCode() // keep last: matches the order of SETTINGS_BLOB_OFFSETS in comms_decoder.c
  ];
  var cornerCustomPrimsSettings = [
    getSetting('CONFIG_CORNER_TL_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_TR_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_BL_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_BR_CUSTOM_PRIMS', '')
  ].map(parseCustomPrimsSetting);
  var cornerFeatureIds = cornerContentBytes();
  dict['CORNER_PRIMITIVE_IDS'] = cornerFeatureIds.reduce(function (acc, contentId, idx) {
    var custom = cornerCustomPrimsSettings[idx];
    return acc.concat(custom.ids.length ? normalizePrimitiveSequence(custom.ids) : primitiveIdSequenceForContent(contentId));
  }, []);
  dict['CORNER_PRIMITIVE_AUX'] = cornerFeatureIds.reduce(function (acc, contentId, idx) {
    var custom = cornerCustomPrimsSettings[idx];
    return acc.concat(custom.ids.length ? normalizePrimitiveAux(custom.aux) : primitiveAuxSequenceForContent(contentId));
  }, []);
  // Phone battery / music: subscribe only while a feature uses them, and send what is known.
  phoneMedia.setNeeds(phoneMedia.needsFromPrimitiveIds(
    dict['CORNER_PRIMITIVE_IDS'].concat(dict['EDGE_LINE_PRIMITIVE_IDS']), primitiveIds));
  phoneMedia.fill(dict);
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
  populateSettingsFields(dict);
  return dict;
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
  sendFlatDict({ 'DATA_VALID': 0, 'ERROR_CODE': errorCode || 0 });
}

function issFieldsDict(issPos, issErrorCode) {
  return {
    'ISS_NEXT_PASS': (issPos && issPos.nextPass) ? toEpoch(issPos.nextPass) : 0,
    'ISS_ERROR_CODE': issErrorCode || 0
  };
}

function extraWeatherFieldsDict(extra) {
  extra = extra || {};
  var dict = {
    'ALTITUDE_M': (typeof extra.altitudeMeters === 'number') ? Math.round(extra.altitudeMeters) : -32000
  };
  if (typeof extra.altitudeMeters === 'number') {
    dict['ALTITUDE_DISPLAY'] = formatAltitudeDisplay(extra.altitudeMeters, altitudeUnitCode());
    dict['ALTITUDE_COLOR'] = altitudeGradientColorByte(extra.altitudeMeters);
  }
  if (typeof extra.windDirDeg === 'number') dict['WIND_DIR_DEG'] = Math.round(extra.windDirDeg);
  if (typeof extra.dewPointC === 'number') {
    dict['DEW_POINT_C'] = Math.round(extra.dewPointC);
    dict['DEW_POINT_DISPLAY'] = formatTempDisplay(extra.dewPointC, tempUnitCode());
  }
  if (typeof extra.pressureHpa === 'number') {
    dict['PRESSURE_HPA'] = Math.round(extra.pressureHpa);
    dict['PRESSURE_TREND'] = extra.pressureTrend || 0;
    dict['PRESSURE_DISPLAY'] = formatPressureDisplay(extra.pressureHpa);
    dict['PRESSURE_COLOR'] = pressureGradientColorByte(extra.pressureHpa);
  }
  if (typeof extra.aqiUs === 'number') dict['AQI_US'] = extra.aqiUs;
  if (typeof extra.aqiEu === 'number') dict['AQI_EU'] = extra.aqiEu;
  if (typeof extra.aqiUs === 'number' || typeof extra.aqiEu === 'number') {
    var useEu = aqiUnitCode() === 1;
    var aqiValue = useEu ? extra.aqiEu : extra.aqiUs;
    if (typeof aqiValue === 'number') {
      dict['AQI_DISPLAY'] = formatAqiDisplay(aqiValue);
      dict['AQI_COLOR'] = aqiGradientColorByte(aqiValue, aqiUnitCode());
    }
  }
  if (typeof extra.auroraKpX10 === 'number') {
    dict['AURORA_KP_X10'] = extra.auroraKpX10;
    dict['AURORA_KP_DISPLAY'] = featureDisplay.formatAuroraKpDisplay(extra.auroraKpX10);
    dict['AURORA_KP_COLOR'] = featureDisplay.auroraGradientColorByte(extra.auroraKpX10);
  }
  dict['AURORA_ERROR_CODE'] = extra.auroraErrorCode || 0;
  if (extra.forecastTempC) {
    dict['FORECAST_TEMP_C'] = extra.forecastTempC.map(function (c) {
      return (typeof c === 'number') ? Math.max(0, Math.min(255, Math.round(c) + 50)) : 255;
    });
    var forecastUnitCode = tempUnitCode();
    var forecastColorBytes = [];
    extra.forecastTempC.forEach(function (c, i) {
      dict['FORECAST_TEMP_DISPLAY_' + i] = formatTempDisplay(c, forecastUnitCode);
      forecastColorBytes.push(tempGradientColorByte(c));
    });
    dict['FORECAST_TEMP_COLORS'] = forecastColorBytes;
  }
  if (extra.forecastWx) {
    // The border ring is built from these on the phone (border/border-data.js); the watch gets only the finished ring.
    borderData.setWeather({
      forecastTempC: extra.forecastTempC,
      forecastWx: extra.forecastWx.map(function (c) { return (typeof c === 'number' && c >= 0 && c <= 9) ? c : 0; }),
      forecastRainPct: (extra.forecastRainPct || []).map(function (c) { return (typeof c === 'number' && !isNaN(c)) ? Math.max(0, Math.min(100, Math.round(c))) : 0; })
    }, extra.forecastTempC ? extra.forecastTempC.map(function (c) { return tempGradientColorByte(c); }) : []);
  }
  if (extra.forecastCondition) {
    dict['FORECAST_CONDITION'] = extra.forecastCondition.map(function (c) {
      return (typeof c === 'number') ? c : 0;
    });
    dict['FORECAST_ICON_CATEGORIES'] = extra.forecastCondition.map(function (c) {
      return weatherIconCategory(typeof c === 'number' ? c : 0, 50);
    });
  }
  return dict;
}

function buildWeatherDict(d) {
  var w = d.weather;
  var weatherCondition = w.condition, weatherTempC = w.tempC, tempHighC = w.tempHighC, tempLowC = w.tempLowC;
  var uvIndexMax = w.uvIndexMax, uvIndexCurrent = w.uvIndexCurrent, rainChancePct = w.rainChancePct;
  var humidityPct = w.humidityPct, windSpeedKmh = w.windSpeedKmh;
  var haveCloudData = (typeof w.currentCloudPct === 'number') || d.headlineSources > 0;
  var displayCloudPct = (typeof w.currentCloudPct === 'number') ? w.currentCloudPct : (d.headlineCloud || 0);
  var dict = {
    'DATA_VALID': 1,
    'LOCATION_NAME': d.locationName || '',
    'WEATHER_ERROR_CODE': d.weatherErrorCode || 0
  };
  if (haveCloudData) {
    dict['WEATHER_CLOUD_U8_BLOB'] = [
      displayCloudPct, 100 - displayCloudPct,
      overcastGrayColorByte(displayCloudPct), overcastGrayColorByte(displayCloudPct)
    ];
    dict['CLOUD_COVER_DISPLAY'] = formatPercentDisplay(displayCloudPct);
    dict['VIS_SCORE_DISPLAY'] = formatPercentDisplay(100 - displayCloudPct);
  }
  if (d.weatherOk) {
    dict['WEATHER_MAIN_U8_BLOB'] = [
      weatherCondition || 0,
      tempGradientColorByte(weatherTempC), tempGradientColorByte(tempHighC), tempGradientColorByte(tempLowC),
      tempGradientColorByte(apparentTempC(weatherTempC, windSpeedKmh, humidityPct)),
      (typeof uvIndexMax === 'number') ? Math.round(Math.max(0, Math.min(25.5, uvIndexMax)) * 10) : 0,
      (typeof uvIndexCurrent === 'number') ? Math.round(Math.max(0, Math.min(25.5, uvIndexCurrent)) * 10) : 0,
      (typeof rainChancePct === 'number') ? Math.round(rainChancePct) : 0,
      (typeof humidityPct === 'number') ? Math.round(humidityPct) : 0,
      uvGradientColorByte(uvIndexMax), uvGradientColorByte(uvIndexCurrent),
      percentGradientColorByte(rainChancePct), percentGradientColorByte(humidityPct),
      windSpeedGradientColorByte(windSpeedKmh)
    ];
    if (haveCloudData) {
      dict['WEATHER_ICON_CATEGORY'] = weatherIconCategory(weatherCondition || 0, displayCloudPct);
      dict['WEATHER_ICON_COLOR'] = weatherConditionColorByte(weatherCondition || 0, displayCloudPct, rainChancePct);
    }
    dict['WEATHER_TEMP_C'] = (typeof weatherTempC === 'number') ? Math.round(weatherTempC) : 0;
    dict['CURRENT_TEMP_DISPLAY'] = formatTempDisplay(weatherTempC, tempUnitCode());
    dict['WEATHER_TEMP_HIGH_C'] = (typeof tempHighC === 'number') ? Math.round(tempHighC) : 0;
    dict['WEATHER_TEMP_LOW_C'] = (typeof tempLowC === 'number') ? Math.round(tempLowC) : 0;
    dict['TEMP_HIGH_DISPLAY'] = formatTempDisplay(tempHighC, tempUnitCode());
    dict['TEMP_LOW_DISPLAY'] = formatTempDisplay(tempLowC, tempUnitCode());
    dict['FEELS_LIKE_DISPLAY'] = formatTempDisplay(apparentTempC(weatherTempC, windSpeedKmh, humidityPct), tempUnitCode());
    dict['WIND_SPEED_KMH'] = (typeof windSpeedKmh === 'number') ? Math.round(windSpeedKmh) : 0;
    dict['UV_DAILY_DISPLAY'] = formatUvDisplay(uvIndexMax);
    dict['UV_CURRENT_DISPLAY'] = formatUvDisplay(uvIndexCurrent);
    dict['RAIN_CHANCE_DISPLAY'] = formatPercentDisplay(rainChancePct);
    dict['HUMIDITY_DISPLAY'] = formatPercentDisplay(humidityPct);
    dict['WIND_SPEED_DISPLAY'] = formatWindSpeedDisplay(windSpeedKmh, windSpeedUnitCode());
    dict['WEATHER_WX_NOW'] = (typeof w.wxNow === 'number' && w.wxNow >= 0 && w.wxNow <= 9) ? w.wxNow : 0;
    dict['WEATHER_LAST_UPDATE'] = Math.floor(Date.now() / 1000);
  }
  return dict;
}

var UNIT_INPUTS_KEY = 'LAST_UNIT_INPUTS';
function rememberUnitInputs(d) {
  try {
    var w = d.weather || {}, e = d.extraWeather || {};
    localStorage.setItem(UNIT_INPUTS_KEY, JSON.stringify({
      ok: !!d.weatherOk, tempC: w.tempC, highC: w.tempHighC, lowC: w.tempLowC, humidity: w.humidityPct, windKmh: w.windSpeedKmh,
      dewC: e.dewPointC, altM: e.altitudeMeters, forecastTempC: e.forecastTempC, aqiUs: e.aqiUs, aqiEu: e.aqiEu
    }));
  } catch (err) { }
}
function unitDisplayDict() {
  var raw = null;
  try { raw = JSON.parse(localStorage.getItem(UNIT_INPUTS_KEY)); } catch (err) { return null; }
  if (!raw || typeof raw !== 'object') return null;
  var dict = {}, tempUnit = tempUnitCode();
  if (raw.ok) {
    dict['CURRENT_TEMP_DISPLAY'] = formatTempDisplay(raw.tempC, tempUnit);
    dict['TEMP_HIGH_DISPLAY'] = formatTempDisplay(raw.highC, tempUnit);
    dict['TEMP_LOW_DISPLAY'] = formatTempDisplay(raw.lowC, tempUnit);
    dict['FEELS_LIKE_DISPLAY'] = formatTempDisplay(apparentTempC(raw.tempC, raw.windKmh, raw.humidity), tempUnit);
    dict['WIND_SPEED_DISPLAY'] = formatWindSpeedDisplay(raw.windKmh, windSpeedUnitCode());
  }
  if (typeof raw.dewC === 'number') dict['DEW_POINT_DISPLAY'] = formatTempDisplay(raw.dewC, tempUnit);
  if (typeof raw.altM === 'number') dict['ALTITUDE_DISPLAY'] = formatAltitudeDisplay(raw.altM, altitudeUnitCode());
  if (Array.isArray(raw.forecastTempC)) {
    raw.forecastTempC.forEach(function (c, i) { dict['FORECAST_TEMP_DISPLAY_' + i] = formatTempDisplay(c, tempUnit); });
  }
  if (typeof raw.aqiUs === 'number' || typeof raw.aqiEu === 'number') {
    var aqiUnit = aqiUnitCode();
    var aqiValue = aqiUnit === 1 ? raw.aqiEu : raw.aqiUs;
    if (typeof aqiValue === 'number') {
      dict['AQI_DISPLAY'] = formatAqiDisplay(aqiValue);
      dict['AQI_COLOR'] = aqiGradientColorByte(aqiValue, aqiUnit);
    }
  }
  return Object.keys(dict).length ? dict : null;
}
function resendUnitDisplays() {
  var dict = unitDisplayDict();
  if (!dict) return false;
  try {
    var cached = JSON.parse(localStorage.getItem('LAST_FULL_COMPUTED_DICT'));
    if (cached && typeof cached === 'object') {
      Object.keys(dict).forEach(function (k) { cached[k] = dict[k]; });
      localStorage.setItem('LAST_FULL_COMPUTED_DICT', JSON.stringify(cached));
    }
  } catch (err) { }
  enqueueFlatDict(dict);
  return true;
}

function sendWeatherData(d) {
  rememberUnitInputs(d);
  var dict = buildWeatherDict(d);
  [astroFieldsDict(d.astro), extraWeatherFieldsDict(d.extraWeather), issFieldsDict(d.issPos, d.issErrorCode)]
    .forEach(function (part) { Object.keys(part).forEach(function (k) { dict[k] = part[k]; }); });
  sendFlatDict(dict);
}

function sendFakeWeather(v) {
  var weather = {
    condition: v.WEATHER_CONDITION, tempC: v.WEATHER_TEMP_C, tempHighC: v.WEATHER_TEMP_HIGH_C,
    tempLowC: v.WEATHER_TEMP_LOW_C, uvIndexMax: v.UV_INDEX_X10 / 10, uvIndexCurrent: v.UV_INDEX_CURRENT_X10 / 10,
    rainChancePct: v.RAIN_CHANCE_PCT, humidityPct: v.HUMIDITY_PCT, windSpeedKmh: v.WIND_SPEED_KMH,
    currentCloudPct: v.CLOUD_COVER
  };
  var dict = buildWeatherDict({ weather: weather, weatherOk: true, weatherErrorCode: 0, headlineSources: 0, headlineCloud: 0, locationName: '' });
  delete dict['LOCATION_NAME'];
  dict['DATA_VALID'] = 1;
  var extra = extraWeatherFieldsDict({
    windDirDeg: v.WIND_DIR_DEG, dewPointC: v.DEW_POINT_C, pressureHpa: v.PRESSURE_HPA,
    pressureTrend: v.PRESSURE_TREND, aqiUs: v.AQI_US, aqiEu: v.AQI_EU
  });
  delete extra['AURORA_ERROR_CODE'];
  delete extra['ALTITUDE_M'];
  Object.keys(extra).forEach(function (k) { dict[k] = extra[k]; });
  enqueueFlatDict(dict);
}

module.exports = {
  sendFlatDict: sendFlatDict,
  sendInvalid: sendInvalid,
  sendWeatherData: sendWeatherData,
  sendFakeWeather: sendFakeWeather,
  resendUnitDisplays: resendUnitDisplays,
  buildFullKeysetDict: buildFullKeysetDict
};
