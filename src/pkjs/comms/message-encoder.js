// ---- AppMessage message encoder ------------------------------------------
//
// Owns: turning settings (via settings-codecs.js), astronomy data and
// weather data into AppMessage-ready dicts, and the top-level send
// functions index.js / refresh-manager.js call with that data.
// Public API: sendFlatDict, sendInvalid, sendWeatherData,
// buildFullKeysetDict -- everything else here is a private
// implementation detail of building those dicts.

var settings = require('../settings/settings');
var getSetting = settings.getSetting;
var settingsCodecs = require('../settings/settings-codecs');
var scheduledStyle = require('../scheduled-style');
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
var borderWeatherModeCode = settingsCodecs.borderWeatherModeCode;
var borderWeatherPxCode = settingsCodecs.borderWeatherPxCode;
var borderWeatherSchemeCode = settingsCodecs.borderWeatherSchemeCode;
var borderWeatherShakeCode = settingsCodecs.borderWeatherShakeCode;
var borderWeatherSemiCode = settingsCodecs.borderWeatherSemiCode;
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

// Must match PlanetId's order in watch_data.h exactly -- PLANET_RISE and
// PLANET_SET are packed in this order.
var PLANET_ORDER = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

// Astronomy fields every refresh: sun/planet rise/set times, moon phase,
// Saturn ring tilt and the active meteor shower.
// astro = { moonPhase, riseSet, sunRiseTomorrow, saturnRingOpenPct, meteorShower }
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
    // Order must match ASTRO_BLOB_OFFSETS in comms_decoder.c.
    'ASTRO_U8_BLOB': [
      astro.saturnRingOpenPct, moonPhase.illuminatedPct, moonPhase.waxing ? 1 : 0,
      meteorIntensity, featureDisplay.meteorGradientColorByte(meteorIntensity)
    ]
  };
}

// One hand's 14-byte HandConfig blob, in HandConfig's own field order
// (see hand_layer.h): style, width, length, back_offset, middle_offset,
// secondary_width, color, outline_enabled, outline_color, translucent,
// hollow, hollow_thickness, shadow_enabled, shadow_distance_px.
function handBytes(style, width, length, backOffset, middleOffset, secondaryWidth,
                    color, outlineEnabled, outlineColor, translucent,
                    hollow, hollowThickness, shadowEnabled, shadowDistance) {
  return [
    style, width, length, toU8(backOffset), toU8(middleOffset), secondaryWidth,
    color, outlineEnabled, outlineColor, translucent,
    hollow, hollowThickness, shadowEnabled, shadowDistance
  ];
}

// HANDS: 42 bytes, hour/minute/second HandConfig back to back.
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

// One ring's 8-byte MarkerRingConfig blob, in MarkerRingConfig's own
// field order (see watch_data.h): style, thickness, inner_eccentricity,
// outer_eccentricity, inner_border_pct, outer_border_pct, translucent, color.
function markerRingBytes(style, thickness, innerEcc, outerEcc, innerBorder, outerBorder, translucent, color) {
  return [style, thickness, innerEcc, outerEcc, innerBorder, outerBorder, translucent, color];
}

// MARKER_RINGS: 16 bytes, hour ring then second ring.
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

// EDGE_LINES: 16 bytes, in the exact order watch_data.h declares the
// 16 upper/bottom/middle_left/middle_right line1/line2 content+color_mode
// fields (a truly contiguous run in the struct, hence a plain memcpy target).
function edgeContentCodesRaw() {
  return [
    settingsCodecs.upperMiddleLine1ContentCode(), settingsCodecs.upperMiddleLine2ContentCode(),
    settingsCodecs.bottomMiddleLine1ContentCode(), settingsCodecs.bottomMiddleLine2ContentCode(),
    settingsCodecs.middleLeftLine1ContentCode(), settingsCodecs.middleLeftLine2ContentCode(),
    settingsCodecs.middleRightLine1ContentCode(), settingsCodecs.middleRightLine2ContentCode()
  ];
}
// Phase 9 composer, edge/middle slots (IMPLEMENTATION_NOTES.md Update 23):
// per-slot {ids, aux} custom sequences, [] when the slot has none / isn't
// visible in the current layout.
function edgeCustomPrims() {
  return settingsCodecs.edgeCustomPrimsStrings().map(parseCustomPrimsSetting);
}
function edgeLinesBytes() {
  var customs = settingsCodecs.edgeCustomPrimsStrings();
  var content = settingsCodecs.edgeEffectiveContentCodes(edgeContentCodesRaw(), customs);
  return [
    content[0], settingsCodecs.upperMiddleLine1ColorModeCode(),
    content[1], settingsCodecs.upperMiddleLine2ColorModeCode(),
    content[2], settingsCodecs.bottomMiddleLine1ColorModeCode(),
    content[3], settingsCodecs.bottomMiddleLine2ColorModeCode(),
    content[4], settingsCodecs.middleLeftLine1ColorModeCode(),
    content[5], settingsCodecs.middleLeftLine2ColorModeCode(),
    content[6], settingsCodecs.middleRightLine1ColorModeCode(),
    content[7], settingsCodecs.middleRightLine2ColorModeCode()
  ];
}

// EDGE_LINE_PRIMITIVE_IDS / _AUX: 80 bytes each (8 slots * 10), in slot order
// (SLOT_UPPER_L1..SLOT_RIGHT_L2). A slot with a custom sequence sends that
// sequence (and its own aux bytes); every other slot derives its sequence
// from its REAL content id (not the placeholder edgeLinesBytes() may have
// substituted, which only exists to activate the slot).
// Bit n set = slot n is a user-built sequence: corners TL,TR,BL,BR are bits
// 0-3, edge/middle slots (SLOT_UPPER_L1..SLOT_RIGHT_L2) are bits 4-11. The
// watch lays those out with no automatic gaps between elements.
function customPrimsMask() {
  var mask = 0;
  ['CONFIG_CORNER_TL_CUSTOM_PRIMS', 'CONFIG_CORNER_TR_CUSTOM_PRIMS', 'CONFIG_CORNER_BL_CUSTOM_PRIMS', 'CONFIG_CORNER_BR_CUSTOM_PRIMS']
    .forEach(function (k, i) { if (parseCustomPrimsSetting(getSetting(k, '')).ids.length) mask |= (1 << i); });
  edgeCustomPrims().forEach(function (c, i) { if (c.ids.length) mask |= (1 << (4 + i)); });
  return mask;
}
function edgeLinePrimitiveIdsBytes() {
  var contentIds = edgeContentCodesRaw();
  var customs = edgeCustomPrims();
  return contentIds.reduce(function (acc, contentId, i) {
    return acc.concat(customs[i].ids.length ? normalizePrimitiveSequence(customs[i].ids) : primitiveIdSequenceForContent(contentId));
  }, []);
}
function edgeLinePrimitiveAuxBytes() {
  var contentIds = edgeContentCodesRaw();
  var customs = edgeCustomPrims();
  return contentIds.reduce(function (acc, contentId, i) {
    return acc.concat(customs[i].ids.length ? normalizePrimitiveAux(customs[i].aux) : primitiveAuxSequenceForContent(contentId));
  }, []);
}

// MARKER_TEXT: 8 bytes -- target, font_choice, offset_px (signed byte),
// hour_mask (u16 little-endian), second_mask (u16 little-endian),
// roman_numerals. Not a memcpy target on the C side (MarkerTextConfig
// has padding around its two u16 masks), but PKJS still needs to send
// exactly these 8 bytes in exactly this order for that unpack to work.
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

// COLORS: 6 bytes -- custom_bg, custom_text, custom_accent,
// night_custom_bg, night_custom_text, night_custom_accent.
// Deliberately NOT night_scheme_enabled too (still its own separate
// key -- see apply_consolidated_fields()'s own comment in
// pebble-eclipse-watch.c for why).
function colorsBytes() {
  return [
    customBgByte(), customTextByte(), customAccentByte(),
    nightCustomBgByte(), nightCustomTextByte(), nightCustomAccentByte()
  ];
}

// Populates every settings-derived AppMessage field (all ~148 of
// them) into `dict`, reading current values fresh from localStorage
// each time -- no send-related side effects of its own (no cache
// write, no debug-override check, no enqueueFlatDict()), so callers
// that just want a correctly-encoded settings snapshot (the debug
// page's own "full keyset" window -- see buildFullKeysetDict()) can
// get one without it also quietly sending anything.
function populateSettingsFields(dict) {
  // Always carried, on every message -- these are purely cosmetic,
  // phone-local preferences, not eclipse data, so there's no reason
  // to gate them behind DATA_VALID or wait for a full refresh cycle.
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
  dict['EDGE_LINES'] = edgeLinesBytes();
  dict['EDGE_LINE_PRIMITIVE_IDS'] = edgeLinePrimitiveIdsBytes();
  dict['EDGE_LINE_PRIMITIVE_AUX'] = edgeLinePrimitiveAuxBytes();
  dict['BG_ANIM_MODE'] = bgAnimModeCode();
  dict['SHAKE_ANIM_MODE'] = shakeAnimModeCode();
  dict['CORNER_CONTENT'] = cornerContentBytes();
  dict['CORNER_COLOR_MODE'] = cornerColorModeBytes();
  // Phase 13 (IMPLEMENTATION_NOTES.md Update 34): 23 scattered settings
  // bytes packed into one wire blob instead of 23 separate AppMessage keys
  // -- order here MUST exactly match SETTINGS_BLOB_OFFSETS in
  // comms_decoder.c (comment there documents the pairing); verified by
  // scripts/verify-field-blob-order.js, not just by eye.
  dict['SHAKE_ONLY_MASK'] = shakeOnlyMaskCode();
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
    customPrimsMask() & 255, (customPrimsMask() >> 8) & 255
  ];
  // Phase 3 (primitive value transport): a flat 40-byte array (4 corners *
  // 10 primitive-ID slots), one primitiveIdSequenceForContent() call per
  // corner, always sent in full -- see that function's own comment for why
  // an all-zero sequence (any content id not in PRIMITIVE_TRANSPORT_SEQUENCES)
  // is the correct "not transport-enabled" signal, and primitive-decompose.js's
  // header for which content ids actually get a real sequence today.
  //
  // Phase 9 composer (see IMPLEMENTATION_NOTES.md's Updates 19-21): a non-
  // empty CONFIG_CORNER_*_CUSTOM_PRIMS setting ("id" or "id:aux" entries)
  // overrides the content-derived sequence for that one corner -- the
  // composed sequence and its aux bytes are sent as-is (normalized/padded)
  // instead of what primitiveIdSequenceForContent(contentId) would have
  // produced.
  var cornerCustomPrimsSettings = [
    getSetting('CONFIG_CORNER_TL_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_TR_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_BL_CUSTOM_PRIMS', ''),
    getSetting('CONFIG_CORNER_BR_CUSTOM_PRIMS', '')
  ].map(parseCustomPrimsSetting); // {ids, aux} -- ids empty means "no custom sequence"
  var cornerContentIdsForPrims = cornerContentBytes();
  dict['CORNER_PRIMITIVE_IDS'] = cornerContentIdsForPrims.reduce(function (acc, contentId, idx) {
    var custom = cornerCustomPrimsSettings[idx];
    return acc.concat(custom.ids.length ? normalizePrimitiveSequence(custom.ids) : primitiveIdSequenceForContent(contentId));
  }, []);
  // CORNER_PRIMITIVE_AUX: per-position aux counterpart, same shape and
  // gating -- see EDGE_LINE_PRIMITIVE_AUX's comment above. A custom
  // sequence now carries its own aux bytes (e.g. the zone index chosen in
  // the composer for a time-zone primitive).
  dict['CORNER_PRIMITIVE_AUX'] = cornerContentIdsForPrims.reduce(function (acc, contentId, idx) {
    var custom = cornerCustomPrimsSettings[idx];
    return acc.concat(custom.ids.length ? normalizePrimitiveAux(custom.aux) : primitiveAuxSequenceForContent(contentId));
  }, []);
  dict['DAILY_STEP_GOAL'] = dailyStepGoalValue();
  dict['HOURLY_VIBE_START_MIN'] = hourlyVibeStartMinCode();
  dict['HOURLY_VIBE_END_MIN'] = hourlyVibeEndMinCode();
  // Scheduled My styles: when the watch should next ask PKJS to serve one
  // (0 = none). Always sent so the watch's copy can never go stale.
  dict['NEXT_STYLE_CHECK'] = scheduledStyle.nextCheckSeconds(Date.now());
}

// For the settings page's own debug "full keyset" window (see
// showConfiguration in index.js and fullKeysetData in config-page.js) --
// every key the watch could currently receive, ready to hand-edit and
// send as-is. Starts from the last genuinely computed full send (the
// same LAST_FULL_COMPUTED_DICT resendLastFullData() in index.js already
// uses) so the eclipse/weather/astronomy fields are real values
// rather than blank/zeroed placeholders, then overlays fresh settings
// on top (same reasoning as resendLastFullData()'s own fix: those
// need to reflect whatever's actually configured right now, not
// whatever happened to be true whenever that snapshot was last
// cached). No network fetch of its own -- opening the settings page
// should be instant, not wait on a fresh weather/astronomy call just
// to populate a debug textarea.
function buildFullKeysetDict() {
  var dict = {};
  try {
    var raw = localStorage.getItem('LAST_FULL_COMPUTED_DICT');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') dict = parsed;
    }
  } catch (e) {
    // Corrupt/missing cache -- fall back to settings-only, below.
  }
  populateSettingsFields(dict);
  return dict;
}

// Builds the full flat dict (eclipse/weather/sky data passed in, plus
// the cosmetic settings/features fields merged in below) exactly as
// before, then hands it to enqueueFlatDict() (comms/message-queue.js) to
// be split into typed chunks and sent one at a time -- see
// message-schema.js's KEY_TYPE_MAP. Kept the name/shape of the old
// single-big-message sendDict() so every call site (mostly in index.js,
// plus the debug-override/localStorage-snapshot logic already living
// here) stayed untouched.
//
// The actual field-by-field population (dict['CLOCK_FONT'] = ...,
// all ~148 of them) lives in populateSettingsFields() below, split
// out so the settings page's own debug "full keyset" window (see
// buildFullKeysetDict()) can get a fresh, correctly-encoded settings
// snapshot without going through this function's OWN side effects
// (the LAST_FULL_COMPUTED_DICT cache write, the debug-override check,
// and -- the one that actually matters here -- enqueueFlatDict()
// itself, which would mean just opening the settings page quietly
// sent something to the watch).
function sendFlatDict(dict) {
  populateSettingsFields(dict);

  try {
    // Separate from the raw-message log recordRawMessage() builds
    // once each chunk actually sends (comms/message-queue.js) -- this
    // one is ONLY overwritten when `dict` is a genuine full-data send
    // (from sendWeatherData(), which always sets SUN_RISE --
    // vs. the cosmetic-only sendFlatDict({}) push settings-only saves
    // trigger, or sendInvalid()'s {DATA_VALID:0,...}, neither of
    // which ever sets it). refreshAndSend()'s skip-path resend (refresh-manager.js)
    // needs something that's reliably the real, complete thing, not
    // just whatever the most recent send of any kind happened to be.
    if (Object.prototype.hasOwnProperty.call(dict, 'SUN_RISE')) {
      localStorage.setItem('LAST_FULL_COMPUTED_DICT', JSON.stringify(dict));
    }
  } catch (e) {
    // Not critical if this fails (storage full, etc.) -- just means
    // refreshAndSend()'s (refresh-manager.js) skip-path resend won't have a fresh snapshot
    // to fall back on this time (see resendLastFullData()).
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

  // Splits toSend into per-subject chunks (STATUS/ECLIPSE/WEATHER/
  // ASTRONOMY/SKY_EFFECTS/FEATURES/SETTINGS) and queues them -- see
  // enqueueFlatDict() in comms/message-queue.js.
  enqueueFlatDict(toSend);
}


function sendInvalid(errorCode) {
  sendFlatDict({ 'DATA_VALID': 0, 'ERROR_CODE': errorCode || 0 });
}

function issFieldsDict(issPos, issErrorCode) {
  return {
    'ISS_NEXT_PASS': (issPos && issPos.nextPass) ? toEpoch(issPos.nextPass) : 0,
    // Always sent (0 = this cycle's fetch was fine, or the ISS feature
    // wasn't in use at all) -- the watch needs it every cycle to know
    // whether to trust ISS_NEXT_PASS.
    'ISS_ERROR_CODE': issErrorCode || 0
  };
}

// Bundles the newer weather-extra fields (pressure/wind direction/dew
// point/air quality) into one object param on the two send functions
// below, rather than growing their already-long positional parameter
// lists by another 6 -- extra = { windDirDeg, dewPointC, pressureHpa,
// pressureTrend, aqiUs, aqiEu }, any of which may be null/undefined.
//
// Fields sourced from a live network fetch (everything except
// ALTITUDE_M, which comes from the phone's own GPS) are OMITTED
// entirely -- not sent as a zeroed default -- when that value is
// null/not a number, i.e. when the fetch failed or genuinely returned
// nothing. dict_find() on the watch only touches a field when its key
// is actually present, so an omitted key means "leave whatever's
// already showing alone" -- a transient network hiccup no longer
// wipes out the last known-good reading the way sending an
// unconditional 0 used to.
function extraWeatherFieldsDict(extra) {
  extra = extra || {};
  var dict = {
    // -32000 = sentinel for "no altitude available" (many phones don't
    // report GPS altitude, and manual-coordinates mode never has it --
    // see getLocation()). A real altitude can legitimately be negative
    // (Death Valley, the Dead Sea shore) or exactly 0 (sea level), so
    // those can't double as the "missing" signal the way they might
    // elsewhere -- this needs its own out-of-range sentinel instead.
    // Always sent (never omitted): unlike the fields below, "no GPS
    // altitude" is a stable fact about this phone/location, not a
    // transient fetch failure to protect a previous reading from.
    'ALTITUDE_M': (typeof extra.altitudeMeters === 'number') ? Math.round(extra.altitudeMeters) : -32000
  };
  if (typeof extra.altitudeMeters === 'number') {
    // Deliberately NOT sent for the -32000/"unavailable" case -- see
    // formatAltitudeDisplay()'s own comment (weather-normalize.js) on why
    // that special case stays on the watch instead of being replicated
    // here.
    dict['ALTITUDE_DISPLAY'] = formatAltitudeDisplay(extra.altitudeMeters, altitudeUnitCode());
    dict['ALTITUDE_COLOR'] = altitudeGradientColorByte(extra.altitudeMeters);
  }
  if (typeof extra.windDirDeg === 'number') dict['WIND_DIR_DEG'] = Math.round(extra.windDirDeg);
  if (typeof extra.dewPointC === 'number') {
    dict['DEW_POINT_C'] = Math.round(extra.dewPointC);
    dict['DEW_POINT_DISPLAY'] = formatTempDisplay(extra.dewPointC, tempUnitCode()); // no color: case 37 never used a gradient
  }
  if (typeof extra.pressureHpa === 'number') {
    dict['PRESSURE_HPA'] = Math.round(extra.pressureHpa);
    dict['PRESSURE_TREND'] = extra.pressureTrend || 0; // trend only means anything alongside a real pressure reading
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
  // x10 -- same convention as every other _x10/_decideg field. Kp is
  // fractional (thirds: .00/.33/.67), hence the scaling rather than
  // sending it as a plain 0-9 integer.
  if (typeof extra.auroraKpX10 === 'number') {
    dict['AURORA_KP_X10'] = extra.auroraKpX10;
    dict['AURORA_KP_DISPLAY'] = featureDisplay.formatAuroraKpDisplay(extra.auroraKpX10);
    dict['AURORA_KP_COLOR'] = featureDisplay.auroraGradientColorByte(extra.auroraKpX10);
  }
  // Always sent, same reasoning as ISS_ERROR_CODE above.
  dict['AURORA_ERROR_CODE'] = extra.auroraErrorCode || 0;
  // "Weather in N hours"/"Weather in N days" (features_layer.c ids
  // 87-95) -- sent as byte arrays, one entry per forecast slot: 1h
  // through 6h ahead, then 1 through 3 days ahead (indices 0-5, 6-8;
  // content id - 87 either way, same index watch_data.h's own
  // forecast_temp_c/forecast_condition use). Only sent when the
  // daily-forecast fetch that produced them actually succeeded, same
  // reasoning as every other field here -- a transient failure
  // shouldn't wipe out the watch's last known-good forecast.
  // forecast_temp_c can't go through as a plain signed byte (AppMessage
  // byte-array tuples are unsigned), so each value is offset by +50
  // celsius first; 255 is the "not available" sentinel for a single
  // entry within an otherwise-successful fetch (see forecastTempC's own
  // per-index null check in weather.js).
  if (extra.forecastTempC) {
    dict['FORECAST_TEMP_C'] = extra.forecastTempC.map(function (c) {
      return (typeof c === 'number') ? Math.max(0, Math.min(255, Math.round(c) + 50)) : 255;
    });
    // Phase 7: per-index display text (9 discrete keys -- AppMessage has no
    // "array of strings" type, and 9 individual cstring keys mean zero
    // watch-side string-splitting/parsing, matching the "least possible
    // watch processing" goal better than one delimited string would) plus
    // one 9-byte color blob (reusing the same packed-array wire shape
    // FORECAST_CONDITION already uses below, since colors ARE plain bytes).
    // Not sent per-index for an unavailable entry -- formatTempDisplay()
    // already returns '' for a non-number input, which is this module's
    // universal "nothing to show yet" signal, so no special-casing needed
    // here. The watch checks its own -128 sentinel on forecast_temp_c[idx]
    // before ever looking at these anyway (same belt-and-suspenders
    // ordering as altitude's N/A case -- see feature_value_weather.c).
    var forecastUnitCode = tempUnitCode();
    var forecastColorBytes = [];
    extra.forecastTempC.forEach(function (c, i) {
      dict['FORECAST_TEMP_DISPLAY_' + i] = formatTempDisplay(c, forecastUnitCode);
      forecastColorBytes.push(tempGradientColorByte(c));
    });
    dict['FORECAST_TEMP_COLORS'] = forecastColorBytes;
  }
  if (extra.forecastWx) {
    // Detailed per-hour weather class + rain chance (%) for the weather border.
    dict['FORECAST_WX'] = extra.forecastWx.map(function (c) {
      return (typeof c === 'number' && c >= 0 && c <= 9) ? c : 0;
    });
  }
  if (extra.forecastRainPct) {
    dict['FORECAST_RAIN'] = extra.forecastRainPct.map(function (c) {
      return (typeof c === 'number' && !isNaN(c)) ? Math.max(0, Math.min(100, Math.round(c))) : 0;
    });
  }
  if (extra.forecastCondition) {
    dict['FORECAST_CONDITION'] = extra.forecastCondition.map(function (c) {
      return (typeof c === 'number') ? c : 0;
    });
    // Same category function as WEATHER_ICON_CATEGORY above, with the same
    // neutral 50% cloud guess the watch always used for forecast icons
    // (no per-hour cloud forecast is fetched -- see feature_value_weather.c's
    // own comment on this).
    dict['FORECAST_ICON_CATEGORIES'] = extra.forecastCondition.map(function (c) {
      return weatherIconCategory(typeof c === 'number' ? c : 0, 50);
    });
  }
  return dict;
}


// Builds the full data dict and hands it to sendFlatDict().
// d = {
//   locationName, astro (see astroFieldsDict), issPos, issErrorCode,
//   headlineCloud, headlineSources  -- cloud-cover outlook (OWM-blended)
//   weather: Open-Meteo snapshot ("extras": condition, tempC, ...),
//   weatherOk, weatherErrorCode, extraWeather (see extraWeatherFieldsDict)
// }
// When weatherOk is false every field sourced from the snapshot is OMITTED
// (not zeroed), so a transient network failure can't wipe the watch's last
// known-good readings. weatherErrorCode/issErrorCode are always sent (0 =
// fetch fine); see servicelog.js's classifyError() for what a nonzero value
// means.
function buildWeatherDict(d) {
  var w = d.weather;
  var weatherCondition = w.condition, weatherTempC = w.tempC, tempHighC = w.tempHighC, tempLowC = w.tempLowC;
  var uvIndexMax = w.uvIndexMax, uvIndexCurrent = w.uvIndexCurrent, rainChancePct = w.rainChancePct;
  var humidityPct = w.humidityPct, windSpeedKmh = w.windSpeedKmh;
  // Prefer the snapshot's current cloud cover; fall back to the OWM-blended outlook.
  var haveCloudData = (typeof w.currentCloudPct === 'number') || d.headlineSources > 0;
  var displayCloudPct = (typeof w.currentCloudPct === 'number') ? w.currentCloudPct : (d.headlineCloud || 0);
  var dict = {
    'DATA_VALID': 1,
    'LOCATION_NAME': d.locationName || '',
    'WEATHER_ERROR_CODE': d.weatherErrorCode || 0
  };
  if (haveCloudData) {
    // Order must match WEATHER_CLOUD_BLOB_OFFSETS in comms_decoder.c.
    dict['WEATHER_CLOUD_U8_BLOB'] = [
      displayCloudPct, 100 - displayCloudPct,
      overcastGrayColorByte(displayCloudPct), overcastGrayColorByte(displayCloudPct)
    ];
    dict['CLOUD_COVER_DISPLAY'] = formatPercentDisplay(displayCloudPct);
    dict['VIS_SCORE_DISPLAY'] = formatPercentDisplay(100 - displayCloudPct);
  }
  if (d.weatherOk) {
    // Order must match WEATHER_MAIN_BLOB_OFFSETS in comms_decoder.c.
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
      // The icon's value and color are both PKJS-decided.
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
    dict['WEATHER_LAST_UPDATE'] = Math.floor(Date.now() / 1000);
  }
  return dict;
}

// Full data dict: weather + astronomy + extra weather + ISS fields.
function sendWeatherData(d) {
  var dict = buildWeatherDict(d);
  [astroFieldsDict(d.astro), extraWeatherFieldsDict(d.extraWeather), issFieldsDict(d.issPos, d.issErrorCode)]
    .forEach(function (part) { Object.keys(part).forEach(function (k) { dict[k] = part[k]; }); });
  sendFlatDict(dict);
}

// Settings-page "Fake weather" debug panel: raw slider values (legacy
// field names, see buildFakeWeatherDict() in config-page.js) -> a WEATHER
// dict in the real wire format, enqueued as-is (nothing persisted).
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
  buildFullKeysetDict: buildFullKeysetDict
};
