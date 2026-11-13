// Builds the settings object in the configuration webview and returns it
module.exports =
'function collectSettings(forceRefresh) {' +
'  var mins = parseInt(document.getElementById("updateMins").value, 10);' +
'  if (isNaN(mins) || mins < 5) mins = 20;' +
'  var showSecondsVal = document.getElementById("showSeconds").checked;' +
'  var avail = computeSlotAvailability();' +
'  function dualCtxVal(base, field, ctx) {' +
'    var el = document.getElementById(base + field);' +
'    return el ? el.value : "0";' +
'  }' +
'  var settings = {' +
'    CONFIG_AUTO_LOC: document.getElementById("autoLoc").checked,' +
'    CONFIG_LAT: document.getElementById("lat").value,' +
'    CONFIG_LON: document.getElementById("lon").value,' +
'    CONFIG_LOCATION_NAME: document.getElementById("locationName").value,' +
'    CONFIG_OWM_KEY: document.getElementById("owmKey").value,' +
'    CONFIG_UPDATE_MINS: mins,' +
'    CONFIG_TEMP_UNIT: document.getElementById("tempUnit").value,' +
'    CONFIG_WIND_SPEED_UNIT: document.getElementById("windSpeedUnit").value,' +
'    CONFIG_AQI_UNIT: document.getElementById("aqiUnit").value,' +
'    CONFIG_ALTITUDE_UNIT: document.getElementById("altitudeUnit").value,' +
'    CONFIG_WEATHER_ICON_STYLE: document.getElementById("weatherIconStyle").value,' +
'    CONFIG_SHOW_SECONDS: showSecondsVal,' +
'    CONFIG_CUSTOM_BG: document.getElementById("customBgValue").value,' +
'    CONFIG_CUSTOM_TEXT: document.getElementById("customTextValue").value,' +
'    CONFIG_CUSTOM_ACCENT: document.getElementById("customAccentValue").value,' +
'    CONFIG_NIGHT_ENABLED: document.getElementById("nightEnabled").checked,' +
'    CONFIG_NIGHT_CUSTOM_BG: document.getElementById("nightCustomBgValue").value,' +
'    CONFIG_NIGHT_CUSTOM_TEXT: document.getElementById("nightCustomTextValue").value,' +
'    CONFIG_NIGHT_CUSTOM_ACCENT: document.getElementById("nightCustomAccentValue").value,' +
'    CONFIG_SHADOW_TRANSLUCENT: document.getElementById("shadowTranslucent").value,' +
'    CONFIG_SHADOW_ANGLE: document.getElementById("shadowAngle").value,' +
'    CONFIG_BIG_ANALOG_MARKER_STYLE: document.getElementById("bigAnalogMarkerStyle").value,' +
'    CONFIG_BITMAP_MARKER_TRANSPARENT: document.getElementById("bitmapMarkerTransparent").checked,' +
'    CONFIG_BITMAP_MARKER_INVERT: document.getElementById("bitmapMarkerInvert").checked,' +
'    CONFIG_UPPER_MIDDLE_LINE1_SHAKE: document.getElementById("upperMiddleLine1Shake").value,' +
'    CONFIG_UPPER_MIDDLE_LINE2_SHAKE: document.getElementById("upperMiddleLine2Shake").value,' +
'    CONFIG_BOTTOM_MIDDLE_LINE1_SHAKE: document.getElementById("bottomMiddleLine1Shake").value,' +
'    CONFIG_BOTTOM_MIDDLE_LINE2_SHAKE: document.getElementById("bottomMiddleLine2Shake").value,' +
'    CONFIG_MIDDLE_LEFT_LINE1_SHAKE: document.getElementById("middleLeftLine1Shake").value,' +
'    CONFIG_MIDDLE_LEFT_LINE2_SHAKE: document.getElementById("middleLeftLine2Shake").value,' +
'    CONFIG_MIDDLE_RIGHT_LINE1_SHAKE: document.getElementById("middleRightLine1Shake").value,' +
'    CONFIG_MIDDLE_RIGHT_LINE2_SHAKE: document.getElementById("middleRightLine2Shake").value,' +
'    CONFIG_CORNER_TL_SHAKE: document.getElementById("cornerTLShake").value,' +
'    CONFIG_CORNER_TR_SHAKE: document.getElementById("cornerTRShake").value,' +
'    CONFIG_CORNER_BL_SHAKE: document.getElementById("cornerBLShake").value,' +
'    CONFIG_CORNER_BR_SHAKE: document.getElementById("cornerBRShake").value,' +
'    CONFIG_USE_CUSTOM_BG: document.getElementById("useCustomBg").checked,' +
'    CONFIG_BG_SOURCE: document.getElementById("bgSource").value,' +
'    CONFIG_USE_WEATHER_BG: document.getElementById("useWeatherBg").checked,' +
'    CONFIG_WEATHER_BG_STYLE: document.getElementById("weatherBgStyle").value,' +
'    CONFIG_BG_TRANSLUCENT: document.getElementById("bgTranslucent").checked,' +
'    CONFIG_BG_CYCLE: document.getElementById("bgCycle") ? document.getElementById("bgCycle").value : "0",' +
'    CONFIG_USE_PLUGIN_BG: document.getElementById("usePluginBg").checked,' +
'    CONFIG_PLUGIN_BG_SOURCE: document.getElementById("pluginBgSource").value,' +
'    CONFIG_PLUGIN_BG_DITHER: document.getElementById("pluginBgDither").value,' +
'    CONFIG_PLUGIN_BG_COLOR: document.getElementById("pluginBgColor").value,' +
'    CONFIG_PLUGIN_BG_FIT: document.getElementById("pluginBgFit").value,' +
'    CONFIG_PLUGIN_BG_AUTO_SCHEME: document.getElementById("pluginBgAutoScheme").checked,' +
'    CONFIG_PLUGIN_BG_CACHE: document.getElementById("pluginBgCache").checked,' +
'    CONFIG_BORDER_SOURCE: document.getElementById("borderSource").value,' +
'    CONFIG_BORDER_CAL_MODE: document.getElementById("borderCalMode").value,' +
'    CONFIG_BORDER_CAL_SCHEME: document.getElementById("borderCalScheme").value,' +
'    CONFIG_BORDER_CAL_COLOR: document.getElementById("borderCalColor").value,' +
'    CONFIG_BORDER_CAL_ALLDAY: document.getElementById("borderCalAllDay").checked,' +
'    CONFIG_BORDER_WEATHER_MODE: document.getElementById("borderWeatherMode").value,' +
'    CONFIG_BORDER_WEATHER_PX: document.getElementById("borderWeatherPx").value,' +
'    CONFIG_BORDER_WEATHER_SCHEME: document.getElementById("borderWeatherScheme").value,' +
'    CONFIG_BORDER_WEATHER_SHAKE: document.getElementById("borderWeatherShake").checked,' +
'    CONFIG_BORDER_WEATHER_SEMI: document.getElementById("borderWeatherSemi").checked,' +
'    CONFIG_BG_SLOT_UPDATES: (typeof bgSlotUpdates === "object" && bgSlotUpdates) ? bgSlotUpdates : {},' +
'    CONFIG_BITMAP_CORNER_OVERRIDE: document.getElementById("bitmapCornerOverride").checked,' +
'    CONFIG_DRAW_FEATURES_BENEATH_HANDS: document.getElementById("drawFeaturesBeneathHands").checked,' +
'    CONFIG_UPPER_MIDDLE_LINE1_CONTENT_ANALOG: dualCtxVal("upperMiddleLine1", "Content", "analog"),' +
'    CONFIG_UPPER_MIDDLE_LINE1_COLOR_ANALOG: dualCtxVal("upperMiddleLine1", "Color", "analog"),' +
'    CONFIG_UPPER_MIDDLE_LINE2_CONTENT_ANALOG: dualCtxVal("upperMiddleLine2", "Content", "analog"),' +
'    CONFIG_UPPER_MIDDLE_LINE2_COLOR_ANALOG: dualCtxVal("upperMiddleLine2", "Color", "analog"),' +
'    CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG: dualCtxVal("bottomMiddleLine1", "Content", "analog"),' +
'    CONFIG_BOTTOM_MIDDLE_LINE1_COLOR_ANALOG: dualCtxVal("bottomMiddleLine1", "Color", "analog"),' +
'    CONFIG_BOTTOM_MIDDLE_LINE2_CONTENT: !avail.bottom ? "0" : document.getElementById("bottomMiddleLine2Content").value,' +
'    CONFIG_BOTTOM_MIDDLE_LINE2_COLOR: document.getElementById("bottomMiddleLine2Color").value,' +
'    CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG: dualCtxVal("middleLeftLine1", "Content", "analog"),' +
'    CONFIG_MIDDLE_LEFT_LINE1_COLOR_ANALOG: dualCtxVal("middleLeftLine1", "Color", "analog"),' +
'    CONFIG_MIDDLE_LEFT_LINE2_CONTENT_ANALOG: dualCtxVal("middleLeftLine2", "Content", "analog"),' +
'    CONFIG_MIDDLE_LEFT_LINE2_COLOR_ANALOG: dualCtxVal("middleLeftLine2", "Color", "analog"),' +
'    CONFIG_MIDDLE_RIGHT_LINE1_CONTENT_ANALOG: dualCtxVal("middleRightLine1", "Content", "analog"),' +
'    CONFIG_MIDDLE_RIGHT_LINE1_COLOR_ANALOG: dualCtxVal("middleRightLine1", "Color", "analog"),' +
'    CONFIG_MIDDLE_RIGHT_LINE2_CONTENT_ANALOG: dualCtxVal("middleRightLine2", "Content", "analog"),' +
'    CONFIG_MIDDLE_RIGHT_LINE2_COLOR_ANALOG: dualCtxVal("middleRightLine2", "Color", "analog"),' +
'    CONFIG_STARTUP_CLOCK_ANIM_MODE: document.getElementById("startupClockAnimMode").value,' +
'    CONFIG_BG_ANIM_MODE: document.getElementById("bgAnimMode").value,' +
'    CONFIG_SHAKE_ANIM_MODE: document.getElementById("shakeAnimMode").value,' +
'    CONFIG_SHAKE_HANDS_TRANSLUCENT: document.getElementById("shakeHandsTranslucent").checked,' +
'    CONFIG_OUTLINE_ENABLED: document.getElementById("outlineStyle").value,' +
'    CONFIG_BATTERY_SAVER_ENABLED: document.getElementById("batterySaverEnabled").checked,' +
'    CONFIG_CORNER_FONT: document.getElementById("cornerFont").value,' +
'    CONFIG_CORNER_TL: avail.cornersGrayed ? "0" : document.getElementById("cornerTL").value,' +
'    CONFIG_CORNER_TR: avail.cornersGrayed ? "0" : document.getElementById("cornerTR").value,' +
'    CONFIG_CORNER_BL: avail.cornersGrayed ? "0" : document.getElementById("cornerBL").value,' +
'    CONFIG_CORNER_BR: avail.cornersGrayed ? "0" : document.getElementById("cornerBR").value,' +
'    CONFIG_CORNER_TL_COLOR: document.getElementById("cornerTLColor").value,' +
'    CONFIG_CORNER_TR_COLOR: document.getElementById("cornerTRColor").value,' +
'    CONFIG_CORNER_BL_COLOR: document.getElementById("cornerBLColor").value,' +
'    CONFIG_CORNER_BR_COLOR: document.getElementById("cornerBRColor").value,' +
'    CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG: dualCtxVal("upperMiddleLine1", "CustomPrims", "analog"),' +
'    CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS_ANALOG: dualCtxVal("upperMiddleLine2", "CustomPrims", "analog"),' +
'    CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG: dualCtxVal("bottomMiddleLine1", "CustomPrims", "analog"),' +
'    CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS_ANALOG: dualCtxVal("middleLeftLine1", "CustomPrims", "analog"),' +
'    CONFIG_MIDDLE_LEFT_LINE2_CUSTOM_PRIMS_ANALOG: dualCtxVal("middleLeftLine2", "CustomPrims", "analog"),' +
'    CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS_ANALOG: dualCtxVal("middleRightLine1", "CustomPrims", "analog"),' +
'    CONFIG_MIDDLE_RIGHT_LINE2_CUSTOM_PRIMS_ANALOG: dualCtxVal("middleRightLine2", "CustomPrims", "analog"),' +
'    CONFIG_BOTTOM_MIDDLE_LINE2_CUSTOM_PRIMS: !avail.bottom ? "" : document.getElementById("bottomMiddleLine2CustomPrims").value,' +
'    CONFIG_CORNER_TL_CUSTOM_PRIMS: avail.cornersGrayed ? "" : document.getElementById("cornerTLCustomPrims").value,' +
'    CONFIG_CORNER_TR_CUSTOM_PRIMS: avail.cornersGrayed ? "" : document.getElementById("cornerTRCustomPrims").value,' +
'    CONFIG_CORNER_BL_CUSTOM_PRIMS: avail.cornersGrayed ? "" : document.getElementById("cornerBLCustomPrims").value,' +
'    CONFIG_CORNER_BR_CUSTOM_PRIMS: avail.cornersGrayed ? "" : document.getElementById("cornerBRCustomPrims").value,' +
'    CONFIG_STEP_GOAL: document.getElementById("stepGoal").value,' +
'    CONFIG_SHAKE_LABEL_SECONDS: document.getElementById("shakeLabelSeconds").value,' +
'    CONFIG_TEST_MODE: document.getElementById("testMode").checked,' +
'    CONFIG_TEST_DATETIME: document.getElementById("testDateTime").value,' +
'    CONFIG_DEBUG_OVERRIDE_ENABLED: document.getElementById("debugOverrideEnabled").checked,' +
'    CONFIG_CUSTOM_HOUR_STYLE: document.getElementById("customHourStyle").value,' +
'    CONFIG_CUSTOM_HOUR_THICKNESS: document.getElementById("customHourThickness").value,' +
'    CONFIG_CUSTOM_HOUR_INNER_THICKNESS: document.getElementById("customHourInnerThickness").value,' +
'    CONFIG_CUSTOM_HOUR_INNER_ECC: document.getElementById("customHourInnerEcc").value,' +
'    CONFIG_CUSTOM_HOUR_OUTER_ECC: document.getElementById("customHourOuterEcc").value,' +
'    CONFIG_CUSTOM_HOUR_INNER_BORDER: document.getElementById("customHourInnerBorder").value,' +
'    CONFIG_CUSTOM_HOUR_OUTER_BORDER: document.getElementById("customHourOuterBorder").value,' +
'    CONFIG_CUSTOM_HOUR_TRANSLUCENT: document.getElementById("customHourTranslucent").value === "true",' +
'    CONFIG_CUSTOM_HOUR_COLOR: document.getElementById("customHourColor").value,' +
'    CONFIG_CUSTOM_SEC_STYLE: document.getElementById("customSecStyle").value,' +
'    CONFIG_CUSTOM_SEC_THICKNESS: document.getElementById("customSecThickness").value,' +
'    CONFIG_CUSTOM_SEC_INNER_THICKNESS: document.getElementById("customSecInnerThickness").value,' +
'    CONFIG_CUSTOM_SEC_INNER_ECC: document.getElementById("customSecInnerEcc").value,' +
'    CONFIG_CUSTOM_SEC_OUTER_ECC: document.getElementById("customSecOuterEcc").value,' +
'    CONFIG_CUSTOM_SEC_INNER_BORDER: document.getElementById("customSecInnerBorder").value,' +
'    CONFIG_CUSTOM_SEC_OUTER_BORDER: document.getElementById("customSecOuterBorder").value,' +
'    CONFIG_CUSTOM_SEC_TRANSLUCENT: document.getElementById("customSecTranslucent").value === "true",' +
'    CONFIG_CUSTOM_SEC_COLOR: document.getElementById("customSecColor").value,' +
'    CONFIG_MARKER_TEXT_TARGET: document.getElementById("markerTextTarget").value,' +
'    CONFIG_MARKER_TEXT_FONT: document.getElementById("markerTextFont").value,' +
'    CONFIG_MARKER_TEXT_OFFSET: document.getElementById("markerTextOffset").value,' +
'    CONFIG_MARKER_TEXT_HOUR_MASK: document.getElementById("markerTextHourMask").value,' +
'    CONFIG_MARKER_TEXT_SEC_MASK: document.getElementById("markerTextSecMask").value,' +
'    CONFIG_MARKER_TEXT_ROMAN: document.getElementById("markerTextRoman").checked,' +
'    CONFIG_HAND_HOUR_STYLE: document.getElementById("handHourStyle").value,' +
'    CONFIG_HAND_HOUR_WIDTH: document.getElementById("handHourWidth").value,' +
'    CONFIG_HAND_HOUR_LENGTH: document.getElementById("handHourLength").value,' +
'    CONFIG_HAND_HOUR_BACK_OFFSET: document.getElementById("handHourBackOffset").value,' +
'    CONFIG_HAND_HOUR_MIDDLE_OFFSET: document.getElementById("handHourMiddleOffset").value,' +
'    CONFIG_HAND_HOUR_SECONDARY_WIDTH: document.getElementById("handHourSecondaryWidth").value,' +
'    CONFIG_HAND_HOUR_COLOR: document.getElementById("handHourColor").value,' +
'    CONFIG_HAND_HOUR_OUTLINE_ENABLED: document.getElementById("handHourOutlineEnabled").value,' +
'    CONFIG_HAND_HOUR_OUTLINE_COLOR: document.getElementById("handHourOutlineColor").value,' +
'    CONFIG_HAND_HOUR_TRANSLUCENT: document.getElementById("handHourTranslucent").value === "true",' +
'    CONFIG_HAND_HOUR_SHADOW_ENABLED: document.getElementById("handHourShadowEnabled").value === "true",' +
'    CONFIG_HAND_HOUR_SHADOW_DISTANCE: document.getElementById("handHourShadowDistance").value,' +
'    CONFIG_HAND_HOUR_HOLLOW: document.getElementById("handHourHollow").value === "true",' +
'    CONFIG_HAND_HOUR_HOLLOW_THICKNESS: document.getElementById("handHourHollowThickness").value,' +
'    CONFIG_HAND_MIN_STYLE: document.getElementById("handMinStyle").value,' +
'    CONFIG_HAND_MIN_WIDTH: document.getElementById("handMinWidth").value,' +
'    CONFIG_HAND_MIN_LENGTH: document.getElementById("handMinLength").value,' +
'    CONFIG_HAND_MIN_BACK_OFFSET: document.getElementById("handMinBackOffset").value,' +
'    CONFIG_HAND_MIN_MIDDLE_OFFSET: document.getElementById("handMinMiddleOffset").value,' +
'    CONFIG_HAND_MIN_SECONDARY_WIDTH: document.getElementById("handMinSecondaryWidth").value,' +
'    CONFIG_HAND_MIN_COLOR: document.getElementById("handMinColor").value,' +
'    CONFIG_HAND_MIN_OUTLINE_ENABLED: document.getElementById("handMinOutlineEnabled").value,' +
'    CONFIG_HAND_MIN_OUTLINE_COLOR: document.getElementById("handMinOutlineColor").value,' +
'    CONFIG_HAND_MIN_TRANSLUCENT: document.getElementById("handMinTranslucent").value === "true",' +
'    CONFIG_HAND_MIN_SHADOW_ENABLED: document.getElementById("handMinShadowEnabled").value === "true",' +
'    CONFIG_HAND_MIN_SHADOW_DISTANCE: document.getElementById("handMinShadowDistance").value,' +
'    CONFIG_HAND_MIN_HOLLOW: document.getElementById("handMinHollow").value === "true",' +
'    CONFIG_HAND_MIN_HOLLOW_THICKNESS: document.getElementById("handMinHollowThickness").value,' +
'    CONFIG_HAND_SEC_STYLE: document.getElementById("handSecStyle").value,' +
'    CONFIG_HAND_SEC_WIDTH: document.getElementById("handSecWidth").value,' +
'    CONFIG_HAND_SEC_LENGTH: document.getElementById("handSecLength").value,' +
'    CONFIG_HAND_SEC_BACK_OFFSET: document.getElementById("handSecBackOffset").value,' +
'    CONFIG_HAND_SEC_MIDDLE_OFFSET: document.getElementById("handSecMiddleOffset").value,' +
'    CONFIG_HAND_SEC_SECONDARY_WIDTH: document.getElementById("handSecSecondaryWidth").value,' +
'    CONFIG_HAND_SEC_COLOR: document.getElementById("handSecColor").value,' +
'    CONFIG_HAND_SEC_OUTLINE_ENABLED: document.getElementById("handSecOutlineEnabled").value,' +
'    CONFIG_HAND_SEC_OUTLINE_COLOR: document.getElementById("handSecOutlineColor").value,' +
'    CONFIG_HAND_SEC_TRANSLUCENT: document.getElementById("handSecTranslucent").value === "true",' +
'    CONFIG_HAND_SEC_SHADOW_ENABLED: document.getElementById("handSecShadowEnabled").value === "true",' +
'    CONFIG_HAND_SEC_SHADOW_DISTANCE: document.getElementById("handSecShadowDistance").value,' +
'    CONFIG_HAND_SEC_HOLLOW: document.getElementById("handSecHollow").value === "true",' +
'    CONFIG_HAND_SEC_HOLLOW_THICKNESS: document.getElementById("handSecHollowThickness").value,' +
'    CONFIG_CENTER_CIRCLE_RADIUS: document.getElementById("centerCircleRadius").value,' +
'    CONFIG_CENTER_CIRCLE_COLOR: document.getElementById("centerCircleColor").value,' +
'    CONFIG_CENTER_CIRCLE_OUTLINE: document.getElementById("centerCircleOutline").value,' +
'    CONFIG_DEBUG_OVERRIDE_DATA: document.getElementById("debugData").value,' +
'    CONFIG_PRESET_1_NAME: document.getElementById("presetSlot1Name").value,' +
'    CONFIG_PRESET_1_JSON: document.getElementById("presetSlot1Json").value,' +
'    CONFIG_PRESET_1_IMAGE: document.getElementById("presetSlot1Image").value,' +
'    CONFIG_PRESET_2_NAME: document.getElementById("presetSlot2Name").value,' +
'    CONFIG_PRESET_2_JSON: document.getElementById("presetSlot2Json").value,' +
'    CONFIG_PRESET_2_IMAGE: document.getElementById("presetSlot2Image").value,' +
'    CONFIG_PRESET_3_NAME: document.getElementById("presetSlot3Name").value,' +
'    CONFIG_PRESET_3_JSON: document.getElementById("presetSlot3Json").value,' +
'    CONFIG_PRESET_3_IMAGE: document.getElementById("presetSlot3Image").value,' +
'    CONFIG_PRESET_4_NAME: document.getElementById("presetSlot4Name").value,' +
'    CONFIG_PRESET_4_JSON: document.getElementById("presetSlot4Json").value,' +
'    CONFIG_PRESET_4_IMAGE: document.getElementById("presetSlot4Image").value,' +
'    CONFIG_PRESET_5_NAME: document.getElementById("presetSlot5Name").value,' +
'    CONFIG_PRESET_5_JSON: document.getElementById("presetSlot5Json").value,' +
'    CONFIG_PRESET_5_IMAGE: document.getElementById("presetSlot5Image").value,' +
'    CONFIG_PRESET_6_NAME: document.getElementById("presetSlot6Name").value,' +
'    CONFIG_PRESET_6_JSON: document.getElementById("presetSlot6Json").value,' +
'    CONFIG_PRESET_6_IMAGE: document.getElementById("presetSlot6Image").value,' +
'    CONFIG_PRESET_1_SCHEDULE: document.getElementById("presetSlot1Schedule").value,' +
'    CONFIG_PRESET_2_SCHEDULE: document.getElementById("presetSlot2Schedule").value,' +
'    CONFIG_PRESET_3_SCHEDULE: document.getElementById("presetSlot3Schedule").value,' +
'    CONFIG_PRESET_4_SCHEDULE: document.getElementById("presetSlot4Schedule").value,' +
'    CONFIG_PRESET_5_SCHEDULE: document.getElementById("presetSlot5Schedule").value,' +
'    CONFIG_PRESET_6_SCHEDULE: document.getElementById("presetSlot6Schedule").value,' +
'    CONFIG_DRAW_DEBUG: document.getElementById("drawDebug").checked,' +
'    CONFIG_HOURLY_VIBE_MODE: document.getElementById("hourlyVibeMode").value,' +
'    CONFIG_HOURLY_VIBE_INTERVAL_MIN: document.getElementById("hourlyVibeIntervalMin").value,' +
'    CONFIG_HOURLY_VIBE_PATTERN: document.getElementById("hourlyVibePattern").value,' +
'    CONFIG_BT_LOST_VIBE: document.getElementById("btLostVibe").value,' +
'    CONFIG_HOURLY_VIBE_START_TIME: document.getElementById("hourlyVibeStartTime").value,' +
'    CONFIG_HOURLY_VIBE_END_TIME: document.getElementById("hourlyVibeEndTime").value,' +
'    CONFIG_HOURLY_VIBE_DAYS_MASK: document.getElementById("hourlyVibeDaysMask").value,' +
'    CONFIG_HOURLY_VIBE_OVERRIDE_QUIET: (function () { var el = document.getElementById("hourlyVibeOverrideQuiet"); return el ? el.checked : true; })()' +
'  };' +
'  settings.CONFIG_FORCE_REFRESH = !!forceRefresh;' +
'  var wsEl = document.getElementById("weatherSource");' +
'  settings.CONFIG_WEATHER_SOURCE = wsEl ? (wsEl.disabled ? wsEl.getAttribute("data-stored") : wsEl.value) : "plugin";' +
'  pluginGcSlots();' +
'  settings.CONFIG_PLUGIN_SLOTS = JSON.stringify(PLUGIN_SLOTS);' +
'  return settings;' +
'}' +
'function save(forceRefresh) {' +
'  var settings = collectSettings(forceRefresh);' +
'  if (LIVE.active) { liveSend(settings, true); return; }' +
'  var returnTo = getQueryParam("return_to", "pebblejs://close#");' +
'  document.location = returnTo + encodeURIComponent(JSON.stringify(settings));' +
'}' +
'function phoneAction(payload) {' +
'  if (LIVE.active) { return Pebble.sendMessage("pkjs", { type: "action", payload: payload }).then(function () { liveStatus("Sent"); }, function () { liveStatus("Not sent: no connection to the phone app", true); }); }' +
'  var returnTo = getQueryParam("return_to", "pebblejs://close#");' +
'  document.location = returnTo + encodeURIComponent(JSON.stringify(payload));' +
'}' +
'var LIVE = { active: false, last: "", seen: "", busy: false, timer: null };' +
'function liveStatus(text, isError) {' +
'  var el = document.getElementById("liveStatus");' +
'  if (!el) return;' +
'  el.textContent = text;' +
'  el.style.color = isError ? "#d9822b" : "";' +
'}' +
'function liveJson(settings) {' +
'  var copy = {};' +
'  for (var k in settings) if (k !== "CONFIG_FORCE_REFRESH" && k !== "CONFIG_BG_SLOT_UPDATES") copy[k] = settings[k];' +
'  copy.__bg = Object.keys(settings.CONFIG_BG_SLOT_UPDATES || {}).join(",");' +
'  return JSON.stringify(copy);' +
'}' +
'function liveSend(settings, force) {' +
'  if (LIVE.busy) return;' +
'  LIVE.busy = true;' +
'  var json = liveJson(settings);' +
'  var sentBg = {};' +
'  for (var bk in (settings.CONFIG_BG_SLOT_UPDATES || {})) sentBg[bk] = true;' +
'  liveStatus("Sending\u2026");' +
'  Pebble.sendMessage("pkjs", { type: "settings", settings: settings }).then(function (reply) {' +
'    LIVE.busy = false;' +
'    if (reply && reply.ok === false) { liveStatus("Phone app reported an error", true); return; }' +
'    LIVE.last = json;' +
'    if (typeof bgSlotUpdates === "object") { for (var k in sentBg) delete bgSlotUpdates[k]; }' +
'    liveStatus(force ? "Sent to the watch" : "Live \u2013 changes are sent to the watch");' +
'  }, function () {' +
'    LIVE.busy = false;' +
'    liveStatus("Could not reach the phone app \u2013 will retry", true);' +
'  });' +
'}' +
'function liveTick() {' +
'  if (!LIVE.active || LIVE.busy) return;' +
'  var settings;' +
'  try { settings = collectSettings(false); } catch (e) { return; }' +
'  var json = liveJson(settings);' +
'  if (json === LIVE.last) { LIVE.seen = json; return; }' +
'  if (json !== LIVE.seen) { LIVE.seen = json; return; }' +
'  liveSend(settings, false);' +
'}' +
'function setModeUi(kind) {' +
'  var btn = document.getElementById("saveBtn");' +
'  if (btn) btn.textContent = (kind === "live") ? "Send" : "Save";' +
'  try { document.title = "Modern Settings (" + kind + ")"; } catch (e) {}' +
'}' +
'function liveInit() {' +
'  if (typeof LIVE_MODE === "undefined" || !LIVE_MODE) { setModeUi("legacy"); return; }' +
'  if (typeof Pebble === "undefined" || typeof Pebble.sendMessage !== "function") { setModeUi("warn"); return; }' +
'  setModeUi("live");' +
'  LIVE.active = true;' +
'  try { LIVE.last = liveJson(collectSettings(false)); } catch (e) { LIVE.last = ""; }' +
'  LIVE.seen = LIVE.last;' +
'  liveStatus("Live \u2013 changes are sent to the watch");' +
'  LIVE.timer = setInterval(liveTick, 800);' +
'}' +
'function getQueryParam(name, defaultValue) {' +
'  var query = location.search.substring(1);' +
'  var vars = query.split("&");' +
'  for (var i = 0; i < vars.length; i++) {' +
'    var pair = vars[i].split("=");' +
'    if (pair[0] === name) return decodeURIComponent(pair[1] || "");' +
'  }' +
'  return defaultValue;' +
'}' +
'';
