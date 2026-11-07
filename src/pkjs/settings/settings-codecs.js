// Converts saved CONFIG_* settings into validated numeric values and byte
var settings = require('./settings');
var platform = require('../platform');
var getSetting = settings.getSetting;
var presetsLookups = require('../presets-lookups');
var MAX_FEATURES = presetsLookups.MAX_FEATURES;
var FONT_MAX_CONTENT_ID = presetsLookups.FONT_MAX_CONTENT_ID;
var MARKER_STYLE_PRESET_FIELDS = presetsLookups.MARKER_STYLE_PRESET_FIELDS;

function clampFontId(v) { return platform.bwFont(clampInt(v, 0, FONT_MAX_CONTENT_ID, 1), 27); }

function tempUnitCode() {
  var v = getSetting('CONFIG_TEMP_UNIT', 'C');
  if (v === 'F') return 1;
  if (v === 'K') return 2;
  return 0;
}

function windSpeedUnitCode() {
  var v = getSetting('CONFIG_WIND_SPEED_UNIT', 'kmh');
  if (v === 'mph') return 1;
  if (v === 'ms') return 2;
  if (v === 'kn') return 3;
  return 0;
}

function showSecondsCode() {
  return (getSetting('CONFIG_SHOW_SECONDS', 'false') === 'true') ? 1 : 0;
}

function customColorByte(key, fallbackByte) {
  var v = parseInt(getSetting(key, String(fallbackByte)), 10);
  if (isNaN(v) || v < 0 || v > 255) return fallbackByte;
  return v;
}
// B&W watches: any colour (old settings, presets, the colour pickers of a shared profile) is reduced to
// black or white, and text/accent are forced to contrast with the background so a scheme can never end
// up invisible. Returns [bg, text, accent] bytes for the day ('CONFIG_' prefix) or night scheme.
function bwScheme(prefix, defBg, defText, defAccent) {
  var bg = platform.bwByte(customColorByte(prefix + '_BG', defBg));
  var text = platform.bwByte(customColorByte(prefix + '_TEXT', defText));
  var accent = platform.bwByte(customColorByte(prefix + '_ACCENT', defAccent));
  var opposite = bg === 0xFF ? 0xC0 : 0xFF;
  if (text === bg) text = opposite;
  accent = text; // no accent colour on a 1-bit screen
  return [bg, text, accent];
}
function customBgByte() { return platform.bw ? bwScheme('CONFIG_CUSTOM', 0xFF, 0xC0, 0xC0)[0] : customColorByte('CONFIG_CUSTOM_BG', 0xFF); }
function customTextByte() { return platform.bw ? bwScheme('CONFIG_CUSTOM', 0xFF, 0xC0, 0xC0)[1] : customColorByte('CONFIG_CUSTOM_TEXT', 0xC0); }
function customAccentByte() { return platform.bw ? bwScheme('CONFIG_CUSTOM', 0xFF, 0xC0, 0xC0)[2] : customColorByte('CONFIG_CUSTOM_ACCENT', 0xC0); }

function nightSchemeEnabledCode() {
  return getSetting('CONFIG_NIGHT_ENABLED', 'false') === 'true' ? 1 : 0;
}
function nightCustomBgByte() { return platform.bw ? bwScheme('CONFIG_NIGHT_CUSTOM', 0xC0, 0xFF, 0xFF)[0] : customColorByte('CONFIG_NIGHT_CUSTOM_BG', 0xC0); }
function nightCustomTextByte() { return platform.bw ? bwScheme('CONFIG_NIGHT_CUSTOM', 0xC0, 0xFF, 0xFF)[1] : customColorByte('CONFIG_NIGHT_CUSTOM_TEXT', 0xFF); }
function nightCustomAccentByte() { return platform.bw ? bwScheme('CONFIG_NIGHT_CUSTOM', 0xC0, 0xFF, 0xFF)[2] : customColorByte('CONFIG_NIGHT_CUSTOM_ACCENT', 0xFF); }

function weatherIconStyleCode() {
  var id = parseInt(getSetting('CONFIG_WEATHER_ICON_STYLE', '1'), 10);
  if (isNaN(id) || id < 0 || id > 2) id = 1;
  if (platform.bw && id === 2) id = 0; // no full-colour icons on a B&W watch: simple
  return id;
}
function aqiUnitCode() {
  var id = parseInt(getSetting('CONFIG_AQI_UNIT', '0'), 10);
  if (isNaN(id) || id < 0 || id > 1) id = 0;
  return id;
}
function altitudeUnitCode() {
  var id = parseInt(getSetting('CONFIG_ALTITUDE_UNIT', '0'), 10);
  if (isNaN(id) || id < 0 || id > 1) id = 0;
  return id;
}

function shakeSecondsCode() {
  var secs = parseInt(getSetting('CONFIG_SHAKE_LABEL_SECONDS', '3'), 10);
  if (isNaN(secs) || secs < 1) secs = 1;
  if (secs > 30) secs = 30;
  return secs;
}

function shadowTranslucentCode() { return getSetting('CONFIG_SHADOW_TRANSLUCENT', 'true') === 'true' ? 1 : 0; }
function shadowAngleCode() { return clampInt(getSetting('CONFIG_SHADOW_ANGLE', '120'), 0, 359, 120); }

var MARKER_STYLE_CUSTOM = 8;
var MARKER_STYLE_DEFAULT = 3;
function storedMarkerStyleId() {
  var id = parseInt(getSetting('CONFIG_BIG_ANALOG_MARKER_STYLE', String(MARKER_STYLE_DEFAULT)), 10);
  if (isNaN(id) || id < 0 || id > 19) id = MARKER_STYLE_DEFAULT;
  return id;
}
function activeMarkerPresetFields() {
  return MARKER_STYLE_PRESET_FIELDS[String(storedMarkerStyleId())] || null;
}
function bigAnalogMarkerStyleCode() {
  var id = storedMarkerStyleId();
  return MARKER_STYLE_PRESET_FIELDS[String(id)] ? MARKER_STYLE_CUSTOM : id;
}
function bitmapMarkerInvertCode() { return getSetting('CONFIG_BITMAP_MARKER_INVERT', 'false') === 'true' ? 1 : 0; }
function bitmapMarkerTransparentCode() { return getSetting('CONFIG_BITMAP_MARKER_TRANSPARENT', 'false') === 'true' ? 1 : 0; }

function drawFeaturesBeneathHandsCode() { return getSetting('CONFIG_DRAW_FEATURES_BENEATH_HANDS', 'false') === 'true' ? 1 : 0; }

var MARKER_BORDER_MIN = 0, MARKER_BORDER_MAX = 100;
function clampInt(v, lo, hi, fallback) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return fallback;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
var CUSTOM_MARKER_KEY_FIELDS = {
  CONFIG_MARKER_TEXT_TARGET: ['text', 'Target'],
  CONFIG_MARKER_TEXT_FONT: ['text', 'Font'],
  CONFIG_MARKER_TEXT_OFFSET: ['text', 'Offset'],
  CONFIG_MARKER_TEXT_HOUR_MASK: ['text', 'HourMask'],
  CONFIG_MARKER_TEXT_SEC_MASK: ['text', 'SecMask'],
  CONFIG_MARKER_TEXT_ROMAN: ['text', 'Roman']
};
['hour', 'sec'].forEach(function (kind) {
  ['Style', 'Thickness', 'InnerThickness', 'InnerEcc', 'OuterEcc', 'InnerBorder', 'OuterBorder', 'Translucent', 'Color'].forEach(function (field) {
    var key = 'CONFIG_CUSTOM_' + (kind === 'hour' ? 'HOUR' : 'SEC') + '_' + field.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase();
    CUSTOM_MARKER_KEY_FIELDS[key] = [kind, field];
  });
});
function customMarkerSetting(key, fallback) {
  var preset = activeMarkerPresetFields();
  var where = CUSTOM_MARKER_KEY_FIELDS[key];
  if (preset && where) return preset[where[0]][where[1]];
  return getSetting(key, fallback);
}
function customMarkerStyleCode(key, fallback) { return clampInt(customMarkerSetting(key, fallback), 0, 4, fallback); }
function customMarkerBorderCode(key, fallback) { return clampInt(customMarkerSetting(key, fallback), MARKER_BORDER_MIN, MARKER_BORDER_MAX, fallback); }

function customHourStyleCode() { return customMarkerStyleCode('CONFIG_CUSTOM_HOUR_STYLE', 0); }
function customHourThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_THICKNESS', '3'), 0, 20, 3); }
function customHourInnerThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_INNER_THICKNESS', '3'), 1, 20, 3); }
function customHourInnerEccCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_INNER_ECC', '0'), 0, 100, 0); }
function customHourOuterEccCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_OUTER_ECC', '0'), 0, 100, 0); }
function customHourInnerBorderCode() { return customMarkerBorderCode('CONFIG_CUSTOM_HOUR_INNER_BORDER', 20); }
function customHourOuterBorderCode() {
  var outer = customMarkerBorderCode('CONFIG_CUSTOM_HOUR_OUTER_BORDER', 100);
  var inner = customHourInnerBorderCode();
  return outer < inner ? inner : outer;
}
function customHourTranslucentCode() { return customMarkerSetting('CONFIG_CUSTOM_HOUR_TRANSLUCENT', 'false') === 'true' ? 1 : 0; }
function customHourColorCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_COLOR', '0'), 0, 2, 0); }
function customSecStyleCode() { return customMarkerStyleCode('CONFIG_CUSTOM_SEC_STYLE', 0); }
function customSecThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_THICKNESS', '1'), 0, 10, 1); }
function customSecInnerThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_INNER_THICKNESS', '1'), 1, 10, 1); }
function customSecInnerEccCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_INNER_ECC', '0'), 0, 100, 0); }
function customSecOuterEccCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_OUTER_ECC', '0'), 0, 100, 0); }
function customSecInnerBorderCode() { return customMarkerBorderCode('CONFIG_CUSTOM_SEC_INNER_BORDER', 70); }
function customSecOuterBorderCode() {
  var outer = customMarkerBorderCode('CONFIG_CUSTOM_SEC_OUTER_BORDER', 100);
  var inner = customSecInnerBorderCode();
  return outer < inner ? inner : outer;
}
function customSecTranslucentCode() { return customMarkerSetting('CONFIG_CUSTOM_SEC_TRANSLUCENT', 'false') === 'true' ? 1 : 0; }
function customSecColorCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_COLOR', '0'), 0, 2, 0); }
function markerTextTargetCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_TARGET', '0'), 0, 2, 0); }
function markerTextFontCode() { return platform.bwFont(clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_FONT', '0'), 0, FONT_MAX_CONTENT_ID, 0), 1); }
function markerTextOffsetCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_OFFSET', '0'), -50, 50, 0); }
function markerTextHourMaskCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_HOUR_MASK', '4095'), 0, 4095, 4095); }
function markerTextSecMaskCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_SEC_MASK', '4095'), 0, 4095, 4095); }
function markerTextRomanCode() { return customMarkerSetting('CONFIG_MARKER_TEXT_ROMAN', 'false') === 'true' ? 1 : 0; }

function handStyleFieldCode(key, fallback) { return clampInt(getSetting(key, fallback), 0, 10, fallback); }
function handColorFieldCode(key, fallback) { return clampInt(getSetting(key, fallback), 0, 2, fallback); }
function handMainColorFieldCode(key, fallback) { return clampInt(getSetting(key, fallback), 0, 3, fallback); }
function handOutlineEnabledCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
function handTranslucentCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
function handShadowEnabledCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
function handShadowDistanceCode(key) { return clampInt(getSetting(key, '2'), 1, 5, 2); }
function handMiddleOffsetCode(key) { return clampInt(getSetting(key, '0'), -40, 80, 0); }
function handSecondaryWidthCode(key) { return clampInt(getSetting(key, '6'), 1, 40, 6); }
function handHollowCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
function handHollowThicknessCode(key) { return clampInt(getSetting(key, '1'), 1, 40, 1); }

function handHourStyleCode() { return handStyleFieldCode('CONFIG_HAND_HOUR_STYLE', 1); }
function handHourWidthCode() { return clampInt(getSetting('CONFIG_HAND_HOUR_WIDTH', '12'), 1, 40, 12); }
function handHourLengthCode() { return clampInt(getSetting('CONFIG_HAND_HOUR_LENGTH', '51'), 10, 100, 51); }
function handHourBackOffsetCode() { return clampInt(getSetting('CONFIG_HAND_HOUR_BACK_OFFSET', '0'), -40, 40, 0); }
function handHourMiddleOffsetCode() { return handMiddleOffsetCode('CONFIG_HAND_HOUR_MIDDLE_OFFSET'); }
function handHourSecondaryWidthCode() { return handSecondaryWidthCode('CONFIG_HAND_HOUR_SECONDARY_WIDTH'); }
function handHourColorCode() { return handMainColorFieldCode('CONFIG_HAND_HOUR_COLOR', 0); }
function handHourOutlineEnabledCode() { return handOutlineEnabledCode('CONFIG_HAND_HOUR_OUTLINE_ENABLED'); }
function handHourOutlineColorCode() { return handColorFieldCode('CONFIG_HAND_HOUR_OUTLINE_COLOR', 0); }
function handHourTranslucentCode() { return handTranslucentCode('CONFIG_HAND_HOUR_TRANSLUCENT'); }
function handHourShadowEnabledCode() { return handShadowEnabledCode('CONFIG_HAND_HOUR_SHADOW_ENABLED'); }
function handHourShadowDistanceCode() { return handShadowDistanceCode('CONFIG_HAND_HOUR_SHADOW_DISTANCE'); }
function handHourHollowCode() { return handHollowCode('CONFIG_HAND_HOUR_HOLLOW'); }
function handHourHollowThicknessCode() { return handHollowThicknessCode('CONFIG_HAND_HOUR_HOLLOW_THICKNESS'); }

function handMinStyleCode() { return handStyleFieldCode('CONFIG_HAND_MIN_STYLE', 1); }
function handMinWidthCode() { return clampInt(getSetting('CONFIG_HAND_MIN_WIDTH', '18'), 1, 40, 18); }
function handMinLengthCode() { return clampInt(getSetting('CONFIG_HAND_MIN_LENGTH', '78'), 10, 100, 78); }
function handMinBackOffsetCode() { return clampInt(getSetting('CONFIG_HAND_MIN_BACK_OFFSET', '0'), -40, 40, 0); }
function handMinMiddleOffsetCode() { return handMiddleOffsetCode('CONFIG_HAND_MIN_MIDDLE_OFFSET'); }
function handMinSecondaryWidthCode() { return handSecondaryWidthCode('CONFIG_HAND_MIN_SECONDARY_WIDTH'); }
function handMinColorCode() { return handMainColorFieldCode('CONFIG_HAND_MIN_COLOR', 0); }
function handMinOutlineEnabledCode() { return handOutlineEnabledCode('CONFIG_HAND_MIN_OUTLINE_ENABLED'); }
function handMinOutlineColorCode() { return handColorFieldCode('CONFIG_HAND_MIN_OUTLINE_COLOR', 0); }
function handMinTranslucentCode() { return handTranslucentCode('CONFIG_HAND_MIN_TRANSLUCENT'); }
function handMinShadowEnabledCode() { return handShadowEnabledCode('CONFIG_HAND_MIN_SHADOW_ENABLED'); }
function handMinShadowDistanceCode() { return handShadowDistanceCode('CONFIG_HAND_MIN_SHADOW_DISTANCE'); }
function handMinHollowCode() { return handHollowCode('CONFIG_HAND_MIN_HOLLOW'); }
function handMinHollowThicknessCode() { return handHollowThicknessCode('CONFIG_HAND_MIN_HOLLOW_THICKNESS'); }

function handSecStyleCode() { return handStyleFieldCode('CONFIG_HAND_SEC_STYLE', 0); }
function handSecWidthCode() { return clampInt(getSetting('CONFIG_HAND_SEC_WIDTH', '2'), 1, 40, 2); }
function handSecLengthCode() { return clampInt(getSetting('CONFIG_HAND_SEC_LENGTH', '85'), 10, 100, 85); }
function handSecBackOffsetCode() { return clampInt(getSetting('CONFIG_HAND_SEC_BACK_OFFSET', '0'), -40, 40, 0); }
function handSecMiddleOffsetCode() { return handMiddleOffsetCode('CONFIG_HAND_SEC_MIDDLE_OFFSET'); }
function handSecSecondaryWidthCode() { return handSecondaryWidthCode('CONFIG_HAND_SEC_SECONDARY_WIDTH'); }
function handSecColorCode() { return handMainColorFieldCode('CONFIG_HAND_SEC_COLOR', 1); }
function handSecOutlineEnabledCode() { return handOutlineEnabledCode('CONFIG_HAND_SEC_OUTLINE_ENABLED'); }
function handSecOutlineColorCode() { return handColorFieldCode('CONFIG_HAND_SEC_OUTLINE_COLOR', 0); }
function handSecTranslucentCode() { return handTranslucentCode('CONFIG_HAND_SEC_TRANSLUCENT'); }
function handSecShadowEnabledCode() { return handShadowEnabledCode('CONFIG_HAND_SEC_SHADOW_ENABLED'); }
function handSecShadowDistanceCode() { return handShadowDistanceCode('CONFIG_HAND_SEC_SHADOW_DISTANCE'); }
function handSecHollowCode() { return handHollowCode('CONFIG_HAND_SEC_HOLLOW'); }
function handSecHollowThicknessCode() { return handHollowThicknessCode('CONFIG_HAND_SEC_HOLLOW_THICKNESS'); }

function centerCircleRadiusCode() { return clampInt(getSetting('CONFIG_CENTER_CIRCLE_RADIUS', '3'), 0, 30, 3); }
function centerCircleColorCode() { return handColorFieldCode('CONFIG_CENTER_CIRCLE_COLOR', 0); }

function dualContextSetting(baseKey, fallback) {
  return getSetting(baseKey + '_ANALOG', getSetting(baseKey, fallback));
}
function analogEdgeAvailability() {
  var markerStyle = storedMarkerStyleId();
  var override = getSetting('CONFIG_BITMAP_CORNER_OVERRIDE', 'false') === 'true';
  if (markerStyle < 3 || markerStyle === 5 || markerStyle >= 8) {
    return { upper: true, bottom: true, left: true, right: true };
  }
  if (markerStyle === 7) {
    return { upper: true, bottom: true, left: true, right: true };
  }
  if (markerStyle === 3 || markerStyle === 4 || markerStyle === 6) {
    return { upper: true, bottom: true, left: override, right: override };
  }
  return { upper: true, bottom: override, left: override, right: override };
}
function dualContextVisible(edgeKey) {
  return analogEdgeAvailability()[edgeKey];
}

function upperMiddleLine1ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_UPPER_MIDDLE_LINE1_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('upper')) return 0;
  return id;
}
function upperMiddleLine1ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_UPPER_MIDDLE_LINE1_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('upper')) return 0;
  return id;
}
function upperMiddleLine2ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_UPPER_MIDDLE_LINE2_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('upper')) return 0;
  return id;
}
function upperMiddleLine2ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_UPPER_MIDDLE_LINE2_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('upper')) return 0;
  return id;
}
function bottomMiddleLine1ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT', '105'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('bottom')) return 0;
  return id;
}
function bottomMiddleLine1ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_BOTTOM_MIDDLE_LINE1_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('bottom')) return 0;
  return id;
}
function bottomMiddleLine2ContentCode() {
  var id = parseInt(getSetting('CONFIG_BOTTOM_MIDDLE_LINE2_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!analogEdgeAvailability().bottom) return 0;
  return id;
}
function bottomMiddleLine2ColorModeCode() {
  var id = parseInt(getSetting('CONFIG_BOTTOM_MIDDLE_LINE2_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!analogEdgeAvailability().bottom) return 0;
  return id;
}
function middleLeftLine1ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_LEFT_LINE1_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('left')) return 0;
  return id;
}
function middleLeftLine1ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_LEFT_LINE1_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('left')) return 0;
  return id;
}
function middleLeftLine2ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_LEFT_LINE2_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('left')) return 0;
  return id;
}
function middleLeftLine2ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_LEFT_LINE2_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('left')) return 0;
  return id;
}
function middleRightLine1ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_RIGHT_LINE1_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('right')) return 0;
  return id;
}
function middleRightLine1ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_RIGHT_LINE1_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('right')) return 0;
  return id;
}
function middleRightLine2ContentCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_RIGHT_LINE2_CONTENT', '0'), 10);
  if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
  if (!dualContextVisible('right')) return 0;
  return id;
}
function middleRightLine2ColorModeCode() {
  var id = parseInt(dualContextSetting('CONFIG_MIDDLE_RIGHT_LINE2_COLOR', '0'), 10);
  if (isNaN(id) || id < 0 || id > 3) id = 0;
  if (!dualContextVisible('right')) return 0;
  return id;
}

function drawDebugCode() { return getSetting('CONFIG_DRAW_DEBUG', 'false') === 'true' ? 1 : 0; }
function hourlyVibeModeCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_MODE', '0'), 0, 2, 0); }
function hourlyVibeIntervalMinCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_INTERVAL_MIN', '30'), 1, 180, 30); }
function btLostVibeCode() { return clampInt(getSetting('CONFIG_BT_LOST_VIBE', '0'), 0, 3, 0); }
function hourlyVibePatternCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_PATTERN', '0'), 0, 2, 0); }
function minutesSinceMidnight(hhmm) {
  var parts = String(hhmm || '00:00').split(':');
  var h = clampInt(parts[0], 0, 23, 0), m = clampInt(parts[1], 0, 59, 0);
  return h * 60 + m;
}
function hourlyVibeStartMinCode() { return minutesSinceMidnight(getSetting('CONFIG_HOURLY_VIBE_START_TIME', '00:00')); }
function hourlyVibeEndMinCode() { return minutesSinceMidnight(getSetting('CONFIG_HOURLY_VIBE_END_TIME', '00:00')); }
function hourlyVibeDaysMaskCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_DAYS_MASK', '127'), 0, 127, 127); }
function hourlyVibeOverrideQuietCode() { return getSetting('CONFIG_HOURLY_VIBE_OVERRIDE_QUIET', 'true') === 'true' ? 1 : 0; }
function startupClockAnimModeCode() {
  var v = parseInt(getSetting('CONFIG_STARTUP_CLOCK_ANIM_MODE', '1'), 10);
  return v === 1 ? 1 : 0;
}
// The watch only needs to know whether the ring is on: 0 off, 1 weather, 2 calendar. Everything that decides
// what it looks like is built on the phone (border/border-data.js) and sent as BORDER_DATA.
function borderWeatherModeCode() { return require('../border/border-data').source(); }
function borderWeatherSchemeCode() {
  var v = parseInt(getSetting('CONFIG_BORDER_WEATHER_SCHEME', '0'), 10);
  return (v === 1 || v === 2) ? v : 0;
}
function borderWeatherShakeCode() { return getSetting('CONFIG_BORDER_WEATHER_SHAKE', 'false') === 'true' ? 1 : 0; }
function borderWeatherSemiCode() { return getSetting('CONFIG_BORDER_WEATHER_SEMI', 'false') === 'true' ? 1 : 0; }
function bgTranslucentCode() { return getSetting('CONFIG_BG_TRANSLUCENT', 'false') === 'true' ? 1 : 0; }
function shakeHandsTranslucentCode() { return getSetting('CONFIG_SHAKE_HANDS_TRANSLUCENT', 'false') === 'true' ? 1 : 0; }
function borderWeatherPxCode() {
  var v = parseInt(getSetting('CONFIG_BORDER_WEATHER_PX', '8'), 10);
  if (isNaN(v)) v = 8;
  return Math.max(2, Math.min(40, v));
}
function bgAnimModeCode() {
  var v = parseInt(getSetting('CONFIG_BG_ANIM_MODE', '0'), 10);
  return (v === 1 || v === 2) ? 1 : 0;
}
function shakeAnimModeCode() {
  var v = parseInt(getSetting('CONFIG_SHAKE_ANIM_MODE', '0'), 10);
  return (v === 1 || v === 3) ? 1 : 0;
}
function outlineEnabledCode() {
  var raw = getSetting('CONFIG_OUTLINE_ENABLED', '1');
  if (raw === 'true') return 1;
  if (raw === 'false') return 0;
  var v = parseInt(raw, 10);
  return [0, 1, 2].indexOf(v) === -1 ? 1 : v;
}
function batterySaverEnabledCode() { return getSetting('CONFIG_BATTERY_SAVER_ENABLED', 'false') === 'true' ? 1 : 0; }
var DEFAULT_CORNER_FONT = 27;
function cornerFontCode() {
  return platform.bwFont(clampInt(getSetting('CONFIG_CORNER_FONT', String(DEFAULT_CORNER_FONT)), 0, FONT_MAX_CONTENT_ID, DEFAULT_CORNER_FONT), DEFAULT_CORNER_FONT);
}

var EDGE_CUSTOM_PRIMS_SLOTS = [
  { key: 'CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS', dual: true, edge: 'upper' },
  { key: 'CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS', dual: true, edge: 'upper' },
  { key: 'CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS', dual: true, edge: 'bottom' },
  { key: 'CONFIG_BOTTOM_MIDDLE_LINE2_CUSTOM_PRIMS', dual: false, edge: 'bottom' },
  { key: 'CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS', dual: true, edge: 'left' },
  { key: 'CONFIG_MIDDLE_LEFT_LINE2_CUSTOM_PRIMS', dual: true, edge: 'left' },
  { key: 'CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS', dual: true, edge: 'right' },
  { key: 'CONFIG_MIDDLE_RIGHT_LINE2_CUSTOM_PRIMS', dual: true, edge: 'right' }
];
function edgeCustomPrimsStrings() {
  return EDGE_CUSTOM_PRIMS_SLOTS.map(function (def) {
    if (def.dual) {
      if (!dualContextVisible(def.edge)) return '';
      return String(dualContextSetting(def.key, '') || '');
    }
    if (!analogEdgeAvailability()[def.edge]) return '';
    return String(getSetting(def.key, '') || '');
  });
}
function cornerContentBytes() {
  var keys = ['CONFIG_CORNER_TL', 'CONFIG_CORNER_TR', 'CONFIG_CORNER_BL', 'CONFIG_CORNER_BR'];
  return keys.map(function (k) {
    var id = parseInt(getSetting(k, '0'), 10);
    if (isNaN(id) || id < 0 || id > MAX_FEATURES) id = 0;
    return id;
  });
}
function cornerColorModeBytes() {
  var keys = ['CONFIG_CORNER_TL_COLOR', 'CONFIG_CORNER_TR_COLOR', 'CONFIG_CORNER_BL_COLOR', 'CONFIG_CORNER_BR_COLOR'];
  return keys.map(function (k) {
    var id = parseInt(getSetting(k, '0'), 10);
    if (isNaN(id) || id < 0 || id > 3) id = 0;
    if (platform.bw) id = (id === 2 ? 2 : 0);
    return id;
  });
}
function dailyStepGoalValue() {
  var v = parseInt(getSetting('CONFIG_STEP_GOAL', '10000'), 10);
  if (isNaN(v) || v < 1000) v = 10000;
  if (v > 60000) v = 60000;
  return v;
}

var SHAKE_ONLY_SETTINGS = [
  'CONFIG_UPPER_MIDDLE_LINE1_SHAKE',
  'CONFIG_UPPER_MIDDLE_LINE2_SHAKE',
  'CONFIG_BOTTOM_MIDDLE_LINE1_SHAKE',
  'CONFIG_BOTTOM_MIDDLE_LINE2_SHAKE',
  'CONFIG_MIDDLE_LEFT_LINE1_SHAKE',
  'CONFIG_MIDDLE_LEFT_LINE2_SHAKE',
  'CONFIG_MIDDLE_RIGHT_LINE1_SHAKE',
  'CONFIG_MIDDLE_RIGHT_LINE2_SHAKE',
  'CONFIG_CORNER_TL_SHAKE',
  'CONFIG_CORNER_TR_SHAKE',
  'CONFIG_CORNER_BL_SHAKE',
  'CONFIG_CORNER_BR_SHAKE',
];
function shakeOnlyMaskCode() {
  var mask = 0;
  for (var i = 0; i < SHAKE_ONLY_SETTINGS.length; i++) {
    if (getSetting(SHAKE_ONLY_SETTINGS[i], '0') === '1') mask |= (1 << i);
  }
  return mask;
}

module.exports = {
  shakeOnlyMaskCode: shakeOnlyMaskCode,
  edgeCustomPrimsStrings: edgeCustomPrimsStrings,
  EDGE_CUSTOM_PRIMS_SLOTS: EDGE_CUSTOM_PRIMS_SLOTS,
  clampFontId: clampFontId,
  tempUnitCode: tempUnitCode,
  windSpeedUnitCode: windSpeedUnitCode,
  showSecondsCode: showSecondsCode,
  customColorByte: customColorByte,
  customBgByte: customBgByte,
  customTextByte: customTextByte,
  customAccentByte: customAccentByte,
  nightSchemeEnabledCode: nightSchemeEnabledCode,
  nightCustomBgByte: nightCustomBgByte,
  nightCustomTextByte: nightCustomTextByte,
  nightCustomAccentByte: nightCustomAccentByte,
  weatherIconStyleCode: weatherIconStyleCode,
  aqiUnitCode: aqiUnitCode,
  altitudeUnitCode: altitudeUnitCode,
  shakeSecondsCode: shakeSecondsCode,
  shadowTranslucentCode: shadowTranslucentCode,
  shadowAngleCode: shadowAngleCode,
  bigAnalogMarkerStyleCode: bigAnalogMarkerStyleCode,
  bitmapMarkerTransparentCode: bitmapMarkerTransparentCode,
  bitmapMarkerInvertCode: bitmapMarkerInvertCode,
  borderWeatherModeCode: borderWeatherModeCode,
  borderWeatherPxCode: borderWeatherPxCode,
  borderWeatherSchemeCode: borderWeatherSchemeCode,
  borderWeatherShakeCode: borderWeatherShakeCode,
  borderWeatherSemiCode: borderWeatherSemiCode,
  bgTranslucentCode: bgTranslucentCode,
  shakeHandsTranslucentCode: shakeHandsTranslucentCode,
  drawFeaturesBeneathHandsCode: drawFeaturesBeneathHandsCode,
  clampInt: clampInt,
  customMarkerStyleCode: customMarkerStyleCode,
  customMarkerBorderCode: customMarkerBorderCode,
  customHourStyleCode: customHourStyleCode,
  customHourThicknessCode: customHourThicknessCode,
  customHourInnerThicknessCode: customHourInnerThicknessCode,
  customHourInnerEccCode: customHourInnerEccCode,
  customHourOuterEccCode: customHourOuterEccCode,
  customHourInnerBorderCode: customHourInnerBorderCode,
  customHourOuterBorderCode: customHourOuterBorderCode,
  customHourTranslucentCode: customHourTranslucentCode,
  customHourColorCode: customHourColorCode,
  customSecStyleCode: customSecStyleCode,
  customSecThicknessCode: customSecThicknessCode,
  customSecInnerThicknessCode: customSecInnerThicknessCode,
  customSecInnerEccCode: customSecInnerEccCode,
  customSecOuterEccCode: customSecOuterEccCode,
  customSecInnerBorderCode: customSecInnerBorderCode,
  customSecOuterBorderCode: customSecOuterBorderCode,
  customSecTranslucentCode: customSecTranslucentCode,
  customSecColorCode: customSecColorCode,
  markerTextTargetCode: markerTextTargetCode,
  markerTextFontCode: markerTextFontCode,
  markerTextOffsetCode: markerTextOffsetCode,
  markerTextHourMaskCode: markerTextHourMaskCode,
  markerTextSecMaskCode: markerTextSecMaskCode,
  markerTextRomanCode: markerTextRomanCode,
  handStyleFieldCode: handStyleFieldCode,
  handColorFieldCode: handColorFieldCode,
  handMainColorFieldCode: handMainColorFieldCode,
  handOutlineEnabledCode: handOutlineEnabledCode,
  handTranslucentCode: handTranslucentCode,
  handShadowEnabledCode: handShadowEnabledCode,
  handShadowDistanceCode: handShadowDistanceCode,
  handMiddleOffsetCode: handMiddleOffsetCode,
  handSecondaryWidthCode: handSecondaryWidthCode,
  handHollowCode: handHollowCode,
  handHollowThicknessCode: handHollowThicknessCode,
  handHourStyleCode: handHourStyleCode,
  handHourWidthCode: handHourWidthCode,
  handHourLengthCode: handHourLengthCode,
  handHourBackOffsetCode: handHourBackOffsetCode,
  handHourMiddleOffsetCode: handHourMiddleOffsetCode,
  handHourSecondaryWidthCode: handHourSecondaryWidthCode,
  handHourColorCode: handHourColorCode,
  handHourOutlineEnabledCode: handHourOutlineEnabledCode,
  handHourOutlineColorCode: handHourOutlineColorCode,
  handHourTranslucentCode: handHourTranslucentCode,
  handHourShadowEnabledCode: handHourShadowEnabledCode,
  handHourShadowDistanceCode: handHourShadowDistanceCode,
  handHourHollowCode: handHourHollowCode,
  handHourHollowThicknessCode: handHourHollowThicknessCode,
  handMinStyleCode: handMinStyleCode,
  handMinWidthCode: handMinWidthCode,
  handMinLengthCode: handMinLengthCode,
  handMinBackOffsetCode: handMinBackOffsetCode,
  handMinMiddleOffsetCode: handMinMiddleOffsetCode,
  handMinSecondaryWidthCode: handMinSecondaryWidthCode,
  handMinColorCode: handMinColorCode,
  handMinOutlineEnabledCode: handMinOutlineEnabledCode,
  handMinOutlineColorCode: handMinOutlineColorCode,
  handMinTranslucentCode: handMinTranslucentCode,
  handMinShadowEnabledCode: handMinShadowEnabledCode,
  handMinShadowDistanceCode: handMinShadowDistanceCode,
  handMinHollowCode: handMinHollowCode,
  handMinHollowThicknessCode: handMinHollowThicknessCode,
  handSecStyleCode: handSecStyleCode,
  handSecWidthCode: handSecWidthCode,
  handSecLengthCode: handSecLengthCode,
  handSecBackOffsetCode: handSecBackOffsetCode,
  handSecMiddleOffsetCode: handSecMiddleOffsetCode,
  handSecSecondaryWidthCode: handSecSecondaryWidthCode,
  handSecColorCode: handSecColorCode,
  handSecOutlineEnabledCode: handSecOutlineEnabledCode,
  handSecOutlineColorCode: handSecOutlineColorCode,
  handSecTranslucentCode: handSecTranslucentCode,
  handSecShadowEnabledCode: handSecShadowEnabledCode,
  handSecShadowDistanceCode: handSecShadowDistanceCode,
  handSecHollowCode: handSecHollowCode,
  handSecHollowThicknessCode: handSecHollowThicknessCode,
  centerCircleRadiusCode: centerCircleRadiusCode,
  centerCircleColorCode: centerCircleColorCode,
  dualContextSetting: dualContextSetting,
  analogEdgeAvailability: analogEdgeAvailability,
  dualContextVisible: dualContextVisible,
  upperMiddleLine1ContentCode: upperMiddleLine1ContentCode,
  upperMiddleLine1ColorModeCode: upperMiddleLine1ColorModeCode,
  upperMiddleLine2ContentCode: upperMiddleLine2ContentCode,
  upperMiddleLine2ColorModeCode: upperMiddleLine2ColorModeCode,
  bottomMiddleLine1ContentCode: bottomMiddleLine1ContentCode,
  bottomMiddleLine1ColorModeCode: bottomMiddleLine1ColorModeCode,
  bottomMiddleLine2ContentCode: bottomMiddleLine2ContentCode,
  bottomMiddleLine2ColorModeCode: bottomMiddleLine2ColorModeCode,
  middleLeftLine1ContentCode: middleLeftLine1ContentCode,
  middleLeftLine1ColorModeCode: middleLeftLine1ColorModeCode,
  middleLeftLine2ContentCode: middleLeftLine2ContentCode,
  middleLeftLine2ColorModeCode: middleLeftLine2ColorModeCode,
  middleRightLine1ContentCode: middleRightLine1ContentCode,
  middleRightLine1ColorModeCode: middleRightLine1ColorModeCode,
  middleRightLine2ContentCode: middleRightLine2ContentCode,
  middleRightLine2ColorModeCode: middleRightLine2ColorModeCode,
  drawDebugCode: drawDebugCode,
  hourlyVibeModeCode: hourlyVibeModeCode,
  hourlyVibeIntervalMinCode: hourlyVibeIntervalMinCode,
  hourlyVibePatternCode: hourlyVibePatternCode,
  btLostVibeCode: btLostVibeCode,
  minutesSinceMidnight: minutesSinceMidnight,
  hourlyVibeStartMinCode: hourlyVibeStartMinCode,
  hourlyVibeEndMinCode: hourlyVibeEndMinCode,
  hourlyVibeDaysMaskCode: hourlyVibeDaysMaskCode,
  hourlyVibeOverrideQuietCode: hourlyVibeOverrideQuietCode,
  startupClockAnimModeCode: startupClockAnimModeCode,
  bgAnimModeCode: bgAnimModeCode,
  shakeAnimModeCode: shakeAnimModeCode,
  outlineEnabledCode: outlineEnabledCode,
  batterySaverEnabledCode: batterySaverEnabledCode,
  cornerFontCode: cornerFontCode,
  DEFAULT_CORNER_FONT: DEFAULT_CORNER_FONT,
  cornerContentBytes: cornerContentBytes,
  cornerColorModeBytes: cornerColorModeBytes,
  dailyStepGoalValue: dailyStepGoalValue
};
