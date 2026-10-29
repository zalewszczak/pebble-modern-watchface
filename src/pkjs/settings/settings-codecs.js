// GENERATED-STYLE MODULE BOUNDARY -- NOT a generated file, hand-written,
// but this file's whole job is to be the settings-codec layer: every
// exported function here reads exactly one (or a couple of related)
// CONFIG_* localStorage setting(s) via settings.js and returns the
// already-clamped/coded numeric or byte value the AppMessage-building
// code in index.js sends to the watch. None of these decide message
// layout or send anything themselves -- see message-encoder-shaped
// code (handBytes()/handsBytes()/etc.) still in index.js for that.
//
// Moved out of index.js verbatim (settings subsystem extraction) --
// see the refactoring plan for the full rationale. Behavior is
// unchanged; only the module boundary is new.

var settings = require('./settings');
var getSetting = settings.getSetting;
var presetsLookups = require('../presets-lookups');
var MAX_FEATURES = presetsLookups.MAX_FEATURES;
var FONT_MAX_CONTENT_ID = presetsLookups.FONT_MAX_CONTENT_ID;
var MARKER_STYLE_PRESET_FIELDS = presetsLookups.MARKER_STYLE_PRESET_FIELDS;

// Unified font ids (see font_lookup.h) -- CONFIG_CORNER_FONT/CONFIG_MARKER_TEXT_FONT are all just the numeric
// id as a string now, straight from config-page.js's <select> value,
// so there's no string-to-code mapping layer needed here anymore --
// clamped to FONT_LOOKUP's own 0-37 range (see FONT_LOOKUP in
// config-page.js) rather than trusting whatever the webview sent.
function clampFontId(v) { return clampInt(v, 0, FONT_MAX_CONTENT_ID, 1); }

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

// Custom colors are stored as raw packed GColor argb bytes (0-255) --
// the settings page's 64-color picker computes these directly in the
// browser (0xC0 | (r2<<4) | (g2<<2) | b2, matching Pebble's own 2-bit-
// per-channel packing), so this side just passes them through with a
// sane fallback if something's missing or out of range.
function customColorByte(key, fallbackByte) {
  var v = parseInt(getSetting(key, String(fallbackByte)), 10);
  if (isNaN(v) || v < 0 || v > 255) return fallbackByte;
  return v;
}
function customBgByte() { return customColorByte('CONFIG_CUSTOM_BG', 0xFF); }
function customTextByte() { return customColorByte('CONFIG_CUSTOM_TEXT', 0xC0); }
function customAccentByte() { return customColorByte('CONFIG_CUSTOM_ACCENT', 0xC0); }

function nightSchemeEnabledCode() {
  return getSetting('CONFIG_NIGHT_ENABLED', 'false') === 'true' ? 1 : 0;
}
function nightCustomBgByte() { return customColorByte('CONFIG_NIGHT_CUSTOM_BG', 0xC0); }
function nightCustomTextByte() { return customColorByte('CONFIG_NIGHT_CUSTOM_TEXT', 0xFF); }
function nightCustomAccentByte() { return customColorByte('CONFIG_NIGHT_CUSTOM_ACCENT', 0xFF); }

// 0=simple, 1=hollow, 2=filled -- only hollow is actually implemented
// on-watch right now (see draw_weather_icon_hollow() in
// pebble-eclipse-watch.c); simple/filled are drawing-side stubs.
function weatherIconStyleCode() {
  var id = parseInt(getSetting('CONFIG_WEATHER_ICON_STYLE', '1'), 10);
  if (isNaN(id) || id < 0 || id > 2) id = 1;
  return id;
}
// 0=US AQI (EPA scale, 0-500+), 1=European AQI (0-100+) -- which of the
// two values already fetched (see fetchAirQualityIfEnabled) the "Air
// quality" corner content displays.
function aqiUnitCode() {
  var id = parseInt(getSetting('CONFIG_AQI_UNIT', '0'), 10);
  if (isNaN(id) || id < 0 || id > 1) id = 0;
  return id;
}
// 0=meters, 1=feet -- used by the "Altitude" corner content.
function altitudeUnitCode() {
  var id = parseInt(getSetting('CONFIG_ALTITUDE_UNIT', '0'), 10);
  if (isNaN(id) || id < 0 || id > 1) id = 0;
  return id;
}

// How long (seconds) a shake keeps the smooth second hand running.
function shakeSecondsCode() {
  var secs = parseInt(getSetting('CONFIG_SHAKE_LABEL_SECONDS', '3'), 10);
  if (isNaN(secs) || secs < 1) secs = 1;
  if (secs > 30) secs = 30;
  return secs;
}

// A single global style choice -- solid black shadows, or dithered
// translucent ones -- applied to every hand's shadow. Defaults to translucent.
function shadowTranslucentCode() { return getSetting('CONFIG_SHADOW_TRANSLUCENT', 'true') === 'true' ? 1 : 0; }
// Single shared light-source direction for every hand's shadow --
// see hand_layer.h's own comment for why a separate angle per hand
// made no sense.
function shadowAngleCode() { return clampInt(getSetting('CONFIG_SHADOW_ANGLE', '120'), 0, 359, 120); }

// The built-in marker presets (bigAnalogMarkerStyle 0 None, 1 Braun,
// 2 Swiss, 9 Classy, 10 Minimal -- see MARKER_STYLE_PRESET_FIELDS in
// presets-lookups.js) don't exist on the watch: it only knows the
// bitmap styles (3-7) and Custom (8). While one of those presets is
// the selected style, this sends 8 and every customHour*/customSec*/
// markerText* codec below reports the preset's own values (numerals
// included) in place of whatever is stored, so the watch simply
// receives an ordinary custom marker. The
// stored choice itself is untouched, so the settings menu keeps showing
// the preset. Normally the stored custom fields already equal the preset
// (the settings page copies them in on selection -- see
// applyMarkerStylePresetToCustom() in config-page.js); resolving here as
// well covers settings saved before that existed and a refresh that
// lands before the settings page has ever been reopened.
var MARKER_STYLE_CUSTOM = 8;
var MARKER_STYLE_DEFAULT = 3; // Modern (bitmap) -- also what a missing/garbled stored value falls back to
function storedMarkerStyleId() {
  var id = parseInt(getSetting('CONFIG_BIG_ANALOG_MARKER_STYLE', String(MARKER_STYLE_DEFAULT)), 10);
  if (isNaN(id) || id < 0 || id > 10) id = MARKER_STYLE_DEFAULT;
  return id;
}
function activeMarkerPresetFields() {
  return MARKER_STYLE_PRESET_FIELDS[String(storedMarkerStyleId())] || null;
}
function bigAnalogMarkerStyleCode() {
  var id = storedMarkerStyleId();
  return MARKER_STYLE_PRESET_FIELDS[String(id)] ? MARKER_STYLE_CUSTOM : id;
}
// Bitmap marker styles' own transparency -- deliberately separate from
// bigAnalogHandsTransparentCode() above (that one used to double as
// this too, which meant toggling hand transparency also silently
// dimmed the markers whether or not that's what was wanted).
function bitmapMarkerInvertCode() { return getSetting('CONFIG_BITMAP_MARKER_INVERT', 'false') === 'true' ? 1 : 0; }
function bitmapMarkerTransparentCode() { return getSetting('CONFIG_BITMAP_MARKER_TRANSPARENT', 'false') === 'true' ? 1 : 0; }

// Whether the corners/edges feature overlay draws underneath the
// analog hands instead of on top of them -- only meaningful (and only
// shown on the settings page) when bottomStyle is 'analog'.
function drawFeaturesBeneathHandsCode() { return getSetting('CONFIG_DRAW_FEATURES_BENEATH_HANDS', 'false') === 'true' ? 1 : 0; }

// Custom hour/second marker system (bigAnalogMarkerStyleCode() === 8,
// which is also what a Minimal/Braun/Swiss/Classy preset is sent as) --
// see MarkerRingConfig/MarkerTextConfig in marker_layer.h for what each
// field means and its valid range. Border values are 0-100% "reach"
// (marker_reach_px() in marker_layer.c does the actual px mapping,
// on-watch, from real screen dimensions) -- a mark is drawn directly
// between its inner and outer border points, no separate length field.
var MARKER_BORDER_MIN = 0, MARKER_BORDER_MAX = 100;
function clampInt(v, lo, hi, fallback) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return fallback;
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}
// CONFIG_CUSTOM_HOUR_INNER_BORDER -> ['hour', 'InnerBorder'],
// CONFIG_MARKER_TEXT_TARGET -> ['text', 'Target'] etc. -- each stored
// custom-marker/numerals key paired with the same group/field name
// presets-lookups.js's MARKER_STYLE_PRESET_FIELDS uses.
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
// getSetting() for one of those keys, except that while a marker preset
// is the selected style the preset's own value wins (see the comment
// above bigAnalogMarkerStyleCode()).
function customMarkerSetting(key, fallback) {
  var preset = activeMarkerPresetFields();
  var where = CUSTOM_MARKER_KEY_FIELDS[key];
  if (preset && where) return preset[where[0]][where[1]];
  return getSetting(key, fallback);
}
function customMarkerStyleCode(key, fallback) { return clampInt(customMarkerSetting(key, fallback), 0, 4, fallback); } // 3 is reserved/unused -- see MarkerRingConfig's own style comment
function customMarkerBorderCode(key, fallback) { return clampInt(customMarkerSetting(key, fallback), MARKER_BORDER_MIN, MARKER_BORDER_MAX, fallback); }

function customHourStyleCode() { return customMarkerStyleCode('CONFIG_CUSTOM_HOUR_STYLE', 0); }
function customHourThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_THICKNESS', '3'), 0, 20, 3); } // 0 is a real value here -- see draw_marker_ring()'s own "thickness 0 means this ring draws nothing at all" comment; the config page's "None" shape commits exactly that
// Only meaningful for style 4 (tapered) -- sent as its own simple
// field, not part of the MARKER_RINGS blob, see custom_hour_marker_
// inner_thickness's own comment in eclipse_data.h for why.
function customHourInnerThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_INNER_THICKNESS', '3'), 1, 20, 3); }
function customHourInnerEccCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_INNER_ECC', '0'), 0, 100, 0); }
function customHourOuterEccCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_OUTER_ECC', '0'), 0, 100, 0); }
function customHourInnerBorderCode() { return customMarkerBorderCode('CONFIG_CUSTOM_HOUR_INNER_BORDER', 20); }
function customHourOuterBorderCode() {
  var outer = customMarkerBorderCode('CONFIG_CUSTOM_HOUR_OUTER_BORDER', 100);
  var inner = customHourInnerBorderCode();
  return outer < inner ? inner : outer; // outer never below inner -- see MarkerRingConfig
}
function customHourTranslucentCode() { return customMarkerSetting('CONFIG_CUSTOM_HOUR_TRANSLUCENT', 'false') === 'true' ? 1 : 0; }
// 0=main, 1=accent, 2=background -- see MarkerRingConfig's own color
// comment in eclipse_data.h.
function customHourColorCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_HOUR_COLOR', '0'), 0, 2, 0); }
function customSecStyleCode() { return customMarkerStyleCode('CONFIG_CUSTOM_SEC_STYLE', 0); }
function customSecThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_THICKNESS', '1'), 0, 10, 1); } // see customHourThicknessCode()
function customSecInnerThicknessCode() { return clampInt(customMarkerSetting('CONFIG_CUSTOM_SEC_INNER_THICKNESS', '1'), 1, 10, 1); } // see customHourInnerThicknessCode()
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
function markerTextFontCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_FONT', '0'), 0, FONT_MAX_CONTENT_ID, 0); }
function markerTextOffsetCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_OFFSET', '0'), -50, 50, 0); }
function markerTextHourMaskCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_HOUR_MASK', '4095'), 0, 4095, 4095); }
function markerTextSecMaskCode() { return clampInt(customMarkerSetting('CONFIG_MARKER_TEXT_SEC_MASK', '4095'), 0, 4095, 4095); }
function markerTextRomanCode() { return customMarkerSetting('CONFIG_MARKER_TEXT_ROMAN', 'false') === 'true' ? 1 : 0; }

// Hour/minute/second hand system -- see HandConfig in hand_layer.h for
// what each field means. Style 0-2 are the original dot/triangle/square;
// 3-7 are dauphine/sword/spade/arrow/pomme, and 8-10 are leaf/syringe/
// serpentine -- all of 3-10 additionally use middle_offset (leaf only
// middle_offset, the rest also secondary_width). Every hand -- whether
// picked via one of config-page.js's preset buttons or hand-edited --
// is sent as one of these full field sets; the watch has no separate
// "preset" concept of its own (see HAND_PRESETS in config-page.js).
function handStyleFieldCode(key, fallback) { return clampInt(getSetting(key, fallback), 0, 10, fallback); }
function handColorFieldCode(key, fallback) { return clampInt(getSetting(key, fallback), 0, 2, fallback); }
// A hand's own color additionally allows 3 = "none" (skip the fill) --
// outline color and the center circle color don't get that option.
function handMainColorFieldCode(key, fallback) { return clampInt(getSetting(key, fallback), 0, 3, fallback); }
function handOutlineEnabledCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
function handTranslucentCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
function handShadowEnabledCode(key) { return getSetting(key, 'false') === 'true' ? 1 : 0; }
// 0-359 degrees, same "0 = 12 o'clock, clockwise" convention as every
// other angle sent to the watch.
function handShadowDistanceCode(key) { return clampInt(getSetting(key, '2'), 1, 5, 2); }
// Same ranges as back_offset and width respectively -- only meaningful
// for styles 3-7 (dauphine/sword/spade/arrow/pomme), ignored by 0-2,
// but always sent/clamped the same way regardless of the hand's
// current style so switching styles doesn't need its own save/reset.
function handMiddleOffsetCode(key) { return clampInt(getSetting(key, '0'), -40, 80, 0); }
function handSecondaryWidthCode(key) { return clampInt(getSetting(key, '6'), 1, 40, 6); }
// hollow_thickness: same 1-40 range as width -- <= 1 draws the original
// plain 1px perimeter trace, see HandConfig.hollow's own comment in
// hand_layer.h.
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

// Edge/middle slot settings are persisted per layout under baseKey + '_ANALOG'
// (older installs also carry a '_DIGITAL' twin, which is now ignored); falls
// back to the plain baseKey when the suffixed one was never saved.
function dualContextSetting(baseKey, fallback) {
  return getSetting(baseKey + '_ANALOG', getSetting(baseKey, fallback));
}
// Whether the marker style leaves a given edge/middle slot free. Mirrors
// computeSlotAvailability() in config-page.js (kept in sync by hand) so the
// value sent to the watch can be zeroed independently of the PERSISTED
// setting. Availability depends on the marker style (and, for a couple of
// bitmap styles, the corner-override toggle).
function analogEdgeAvailability() {
  var markerStyle = storedMarkerStyleId();
  var override = getSetting('CONFIG_BITMAP_CORNER_OVERRIDE', 'false') === 'true';
  if (markerStyle < 3 || markerStyle === 5 || markerStyle >= 8) { // ring-based styles (0-2, 8-10) and Tally leave every edge free
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
// Bottom-middle line 1 defaults to "Long date + sunrise/sunset" (content 105).
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
// bottomMiddleLine2 is a single plain setting (not a per-layout pair); its
// availability (avail.bottom) still applies, same as any other edge.
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
// Hourly vibrations -- see hourly_vibe_mode's own comment in
// eclipse_data.h for the full field layout this maps onto.
function hourlyVibeModeCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_MODE', '0'), 0, 2, 0); }
function hourlyVibeIntervalMinCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_INTERVAL_MIN', '30'), 1, 180, 30); }
function hourlyVibePatternCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_PATTERN', '0'), 0, 2, 0); }
// "HH:MM" (the config page's own <input type="time"> value) -> minutes
// since midnight (0-1439), same units hourly_vibe_start_min/
// hourly_vibe_end_min store on the watch. Falls back to '00:00' (all
// day, per that field's own comment) on anything unparseable.
function minutesSinceMidnight(hhmm) {
  var parts = String(hhmm || '00:00').split(':');
  var h = clampInt(parts[0], 0, 23, 0), m = clampInt(parts[1], 0, 59, 0);
  return h * 60 + m;
}
function hourlyVibeStartMinCode() { return minutesSinceMidnight(getSetting('CONFIG_HOURLY_VIBE_START_TIME', '00:00')); }
function hourlyVibeEndMinCode() { return minutesSinceMidnight(getSetting('CONFIG_HOURLY_VIBE_END_TIME', '00:00')); }
function hourlyVibeDaysMaskCode() { return clampInt(getSetting('CONFIG_HOURLY_VIBE_DAYS_MASK', '127'), 0, 127, 127); }
function hourlyVibeOverrideQuietCode() { return getSetting('CONFIG_HOURLY_VIBE_OVERRIDE_QUIET', 'true') === 'true' ? 1 : 0; }
// 0=off, 1=animate the hands in at startup. An old stored "planet sweep" (2)
// reads as off.
function startupClockAnimModeCode() {
  var v = parseInt(getSetting('CONFIG_STARTUP_CLOCK_ANIM_MODE', '1'), 10);
  return v === 1 ? 1 : 0;
}
// 0=off, 1=animate the markers in. The old "planets" option (1) is gone, so
// an old stored 2 ("markers") maps to 1 and an old stored 1 to off.
// Weather border: 0=off, 1=conditions, 2=temperature; thickness 2-40 px.
function borderWeatherModeCode() {
  var v = parseInt(getSetting('CONFIG_BORDER_WEATHER_MODE', '0'), 10);
  return (v >= 1 && v <= 4) ? v : 0;
}
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
  // The settings page stores 0 (Off) or 1 (Indices); older builds stored 2.
  return (v === 1 || v === 2) ? 1 : 0;
}
// 0=off, 1=shake runs the smooth second hand. The old "Planet seek" (2) is
// gone; old stored 1 and 3 ("both") keep the smooth second hand.
function shakeAnimModeCode() {
  var v = parseInt(getSetting('CONFIG_SHAKE_ANIM_MODE', '0'), 10);
  return (v === 1 || v === 3) ? 1 : 0;
}
// 0=none, 1=thin, 2=thick -- see eclipse_data.h's own outline_style
// comment. Backward-compatible with the setting's old plain boolean
// ('true'/'false', from before the Thick option existed): those map
// to thin/none respectively, same as they always looked.
function outlineEnabledCode() {
  var raw = getSetting('CONFIG_OUTLINE_ENABLED', '1');
  if (raw === 'true') return 1;
  if (raw === 'false') return 0;
  var v = parseInt(raw, 10);
  return [0, 1, 2].indexOf(v) === -1 ? 1 : v;
}
function batterySaverEnabledCode() { return getSetting('CONFIG_BATTERY_SAVER_ENABLED', 'false') === 'true' ? 1 : 0; }
// Feature font on a fresh install: Digital Dream (font id 27, see presets-lookups.js / font_lookup.c).
var DEFAULT_CORNER_FONT = 27;
function cornerFontCode() {
  return clampInt(getSetting('CONFIG_CORNER_FONT', String(DEFAULT_CORNER_FONT)), 0, FONT_MAX_CONTENT_ID, DEFAULT_CORNER_FONT);
}

// Corners: 4 slots (0=top-left, 1=top-right, 2=bottom-left,
// 3=bottom-right), each an independent content-type + color-mode
// pair. Sent as two packed byte arrays rather than 8 separate keys.
// ---- Phase 9 composer: custom primitive sequences for edge/middle slots ---
//
// Mirrors the 4 corner CONFIG_CORNER_*_CUSTOM_PRIMS settings (see
// message-encoder.js) for the 8 edge/middle slots, following each slot's own
// content-code rules exactly: the 7 dual-context slots persist one value per
// layout (CONFIG_<SLOT>_CUSTOM_PRIMS_ANALOG / _DIGITAL, read through
// dualContextSetting() like their Content/Color siblings), and
// bottomMiddleLine2 -- analog-only -- stays one plain setting. A slot the
// CURRENT layout wouldn't show right now yields '' (nothing custom is sent),
// the same transmission-time zeroing the content codes above do; the stored
// value itself is never touched.
//
// Order is EDGE_LINE_COLOR_MODE's slot order (SLOT_UPPER_L1 ..
// SLOT_RIGHT_L2).
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
    return id;
  });
}
function dailyStepGoalValue() {
  var v = parseInt(getSetting('CONFIG_STEP_GOAL', '10000'), 10);
  if (isNaN(v) || v < 1000) v = 10000;
  if (v > 60000) v = 60000;
  return v;
}

// Per-feature "show only when shaken" flags -> one 12-bit mask, bit order =
// the watch's feature slot enum (feature_slot.h): upper l1/l2, bottom l1/l2,
// middle-left l1/l2, middle-right l1/l2, corners TL/TR/BL/BR.
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
