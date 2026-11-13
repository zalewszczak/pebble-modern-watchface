var configPage = require('./config-page');
var servicelog = require('./servicelog');

require('./settings/settings-migration');

var settings = require('./settings/settings');
var getSetting = settings.getSetting;
var setSetting = settings.setSetting;
var settingsCodecs = require('./settings/settings-codecs');
var outlineEnabledCode = settingsCodecs.outlineEnabledCode;
var messageEncoder = require('./comms/message-encoder');
var sendFlatDict = messageEncoder.sendFlatDict;
var buildFullKeysetDict = messageEncoder.buildFullKeysetDict;
var messageQueue = require('./comms/message-queue');
var bgImageSync = require('./bg-image/bg-image-sync');
var pluginBg = require('./bg-image/plugin-bg');
var enqueueFlatDict = messageQueue.enqueueFlatDict;
var refreshManager = require('./refresh-manager');
var refreshAndSend = refreshManager.refreshAndSend;
var scheduleRefresh = refreshManager.scheduleRefresh;
var pluginManager = require('./plugins/plugin-manager');
var borderData = require('./border/border-data');
var phoneMedia = require('./plugins/phone-media');
var phoneMedia = require('./plugins/phone-media');
var preferences = require('./plugins/preferences');
var firstRun = require('./settings/first-run');
var configBridge = require('./plugins/config-bridge');
var startBatterySaverHourlyCheck = refreshManager.startBatterySaverHourlyCheck;

var scheduledStyle = require('./scheduled-style');

function serveScheduledStyle() {
  var r = scheduledStyle.applyDue(Date.now());
  if (r.applied) {
    console.log('modern: scheduled style applied from My style slot ' + r.slot);
    pluginManager.setSlots(pluginManager.getSlots());
    borderData.sync();
    sendFlatDict({});
    pluginBg.apply();
    bgImageSync.syncIfNeeded();
    refreshAndSend(false, false);
  }
  return r.applied;
}

firstRun.seedIfFresh();

function applyFirstRunPreferences() {
  if (!firstRun.pending()) return;
  preferences.capture(5000, function (prefs) {
    if (!firstRun.applyPreferences(prefs, pluginManager)) return;
    sendFlatDict({});
    messageEncoder.resendUnitDisplays();
    refreshAndSend(false, false);
  });
}

// A new plugin picture can be bright or dark enough to flip the color scheme (option "Day/night
// colors from picture brightness"): push the settings again, but only when the verdict changed.
pluginBg.setOnScheme(function () { if (bgImageSync.schemeChanged()) sendFlatDict({}); });

// "A different picture each day": when midnight passes, push the new selection.
setInterval(function () { if (bgImageSync.cycleChanged()) { sendFlatDict({}); bgImageSync.syncIfNeeded(); } }, 60000);

Pebble.addEventListener('ready', function () {
  console.log('modern: PKJS ready, capabilities OK, starting first refresh');
  pluginManager.init(function (bytes) { enqueueFlatDict({ PLUGIN_TEXTS: bytes }); });
  borderData.init(function (bytes) { enqueueFlatDict({ BORDER_DATA: bytes }); });
  phoneMedia.init(function (dict) { enqueueFlatDict(dict); }, function (art) { enqueueFlatDict({ MEDIA_ART: art }); });
  pluginBg.apply();
  applyFirstRunPreferences();
  serveScheduledStyle();
  refreshAndSend(false, false);
  scheduleRefresh();
  startBatterySaverHourlyCheck();
});

Pebble.addEventListener('appmessage', function (e) {
  if (e && e.payload && e.payload.REQUEST_SCHEDULED_STYLE) {
    if (!serveScheduledStyle()) {
      messageQueue.enqueueFlatDict({ 'NEXT_STYLE_CHECK': scheduledStyle.nextCheckSeconds(Date.now()) });
    }
  }
  if (e && e.payload && e.payload.BG_IMG_STAMP !== undefined) {
    bgImageSync.noteWatchStamp(e.payload.BG_IMG_STAMP);
  }
  if (e && e.payload && e.payload.REQUEST_UPDATE) {
    refreshAndSend(false, true);
    bgImageSync.syncIfNeeded();
  }
  if (e && e.payload && e.payload.BATTERY_SAVER_PHASE !== undefined) {
    refreshManager.setBatterySaverPhase(e.payload.BATTERY_SAVER_PHASE);
  }
});

function buildCurrent() {
  return {
    autoLoc: getSetting('CONFIG_AUTO_LOC', 'true') !== 'false',
    lat: getSetting('CONFIG_LAT', ''),
    lon: getSetting('CONFIG_LON', ''),
    locationName: getSetting('CONFIG_LOCATION_NAME', ''),
    owmKey: getSetting('CONFIG_OWM_KEY', ''),
    updateMins: getSetting('CONFIG_UPDATE_MINS', '20'),
    tempUnit: getSetting('CONFIG_TEMP_UNIT', 'C'),
    windSpeedUnit: getSetting('CONFIG_WIND_SPEED_UNIT', 'kmh'),
    showSeconds: getSetting('CONFIG_SHOW_SECONDS', 'false') === 'true',
    customBg: getSetting('CONFIG_CUSTOM_BG', '255'),
    customText: getSetting('CONFIG_CUSTOM_TEXT', '192'),
    customAccent: getSetting('CONFIG_CUSTOM_ACCENT', '192'),
    nightEnabled: getSetting('CONFIG_NIGHT_ENABLED', 'false') === 'true',
    nightCustomBg: getSetting('CONFIG_NIGHT_CUSTOM_BG', '192'),
    nightCustomText: getSetting('CONFIG_NIGHT_CUSTOM_TEXT', '255'),
    nightCustomAccent: getSetting('CONFIG_NIGHT_CUSTOM_ACCENT', '255'),
    weatherIconStyle: getSetting('CONFIG_WEATHER_ICON_STYLE', '1'),
    aqiUnit: getSetting('CONFIG_AQI_UNIT', '0'),
    altitudeUnit: getSetting('CONFIG_ALTITUDE_UNIT', '0'),
    shakeLabelSeconds: getSetting('CONFIG_SHAKE_LABEL_SECONDS', '3'),
    shadowTranslucent: getSetting('CONFIG_SHADOW_TRANSLUCENT', 'true'),
    shadowAngle: getSetting('CONFIG_SHADOW_ANGLE', '120'),
    bigAnalogMarkerStyle: getSetting('CONFIG_BIG_ANALOG_MARKER_STYLE', '3'),
    upperMiddleLine1Shake: getSetting('CONFIG_UPPER_MIDDLE_LINE1_SHAKE', '0'),
    upperMiddleLine2Shake: getSetting('CONFIG_UPPER_MIDDLE_LINE2_SHAKE', '0'),
    bottomMiddleLine1Shake: getSetting('CONFIG_BOTTOM_MIDDLE_LINE1_SHAKE', '0'),
    bottomMiddleLine2Shake: getSetting('CONFIG_BOTTOM_MIDDLE_LINE2_SHAKE', '0'),
    middleLeftLine1Shake: getSetting('CONFIG_MIDDLE_LEFT_LINE1_SHAKE', '0'),
    middleLeftLine2Shake: getSetting('CONFIG_MIDDLE_LEFT_LINE2_SHAKE', '0'),
    middleRightLine1Shake: getSetting('CONFIG_MIDDLE_RIGHT_LINE1_SHAKE', '0'),
    middleRightLine2Shake: getSetting('CONFIG_MIDDLE_RIGHT_LINE2_SHAKE', '0'),
    cornerTLShake: getSetting('CONFIG_CORNER_TL_SHAKE', '0'),
    cornerTRShake: getSetting('CONFIG_CORNER_TR_SHAKE', '0'),
    cornerBLShake: getSetting('CONFIG_CORNER_BL_SHAKE', '0'),
    cornerBRShake: getSetting('CONFIG_CORNER_BR_SHAKE', '0'),
    useCustomBg: !require('./platform').bw && getSetting('CONFIG_USE_CUSTOM_BG', 'false') === 'true', // no picture backgrounds on B&W
    bgSource: getSetting('CONFIG_BG_SOURCE', 'p:1'),
    useWeatherBg: !require('./platform').bw && getSetting('CONFIG_USE_WEATHER_BG', 'false') === 'true',
    weatherBgStyle: getSetting('CONFIG_WEATHER_BG_STYLE', ''),
    bgTranslucent: getSetting('CONFIG_BG_TRANSLUCENT', 'false') === 'true',
    bgCycle: getSetting('CONFIG_BG_CYCLE', '0'),
    usePluginBg: !require('./platform').bw && getSetting('CONFIG_USE_PLUGIN_BG', 'false') === 'true',
    pluginBgStatus: pluginBg.status(),
    pluginBgSource: getSetting('CONFIG_PLUGIN_BG_SOURCE', ''),
    pluginBgDither: getSetting('CONFIG_PLUGIN_BG_DITHER', 'fs'),
    pluginBgColor: getSetting('CONFIG_PLUGIN_BG_COLOR', 'neutral'),
    pluginBgFit: getSetting('CONFIG_PLUGIN_BG_FIT', 'fill'),
    pluginBgAutoScheme: getSetting('CONFIG_PLUGIN_BG_AUTO_SCHEME', 'false') === 'true',
    pluginBgCache: getSetting('CONFIG_PLUGIN_BG_CACHE', 'false') === 'true',
    borderSource: String(borderData.source()),
    borderCalMode: getSetting('CONFIG_BORDER_CAL_MODE', '1'),
    borderCalScheme: getSetting('CONFIG_BORDER_CAL_SCHEME', '0'),
    borderCalColor: getSetting('CONFIG_BORDER_CAL_COLOR', '0'),
    borderCalAllDay: getSetting('CONFIG_BORDER_CAL_ALLDAY', 'false') === 'true',
    borderCalStatus: borderData.calendarStatus(),
    mediaStatus: phoneMedia.status(),
    permissionsDenied: require('./settings/permissions').get(),
    borderWeatherMode: getSetting('CONFIG_BORDER_WEATHER_MODE', '0'),
    borderWeatherPx: getSetting('CONFIG_BORDER_WEATHER_PX', '8'),
    borderWeatherScheme: getSetting('CONFIG_BORDER_WEATHER_SCHEME', '0'),
    borderWeatherShake: getSetting('CONFIG_BORDER_WEATHER_SHAKE', 'false') === 'true',
    borderWeatherSemi: getSetting('CONFIG_BORDER_WEATHER_SEMI', 'false') === 'true',
    bgSlots: bgImageSync.getSlots(),
    bitmapMarkerTransparent: getSetting('CONFIG_BITMAP_MARKER_TRANSPARENT', 'false') === 'true',
    bitmapMarkerInvert: getSetting('CONFIG_BITMAP_MARKER_INVERT', 'false') === 'true',
    bitmapCornerOverride: getSetting('CONFIG_BITMAP_CORNER_OVERRIDE', 'false') === 'true',
    drawFeaturesBeneathHands: getSetting('CONFIG_DRAW_FEATURES_BENEATH_HANDS', 'false') === 'true',
    customHourStyle: getSetting('CONFIG_CUSTOM_HOUR_STYLE', '0'),
    customHourThickness: getSetting('CONFIG_CUSTOM_HOUR_THICKNESS', '3'),
    customHourInnerThickness: getSetting('CONFIG_CUSTOM_HOUR_INNER_THICKNESS', '3'),
    customHourInnerEcc: getSetting('CONFIG_CUSTOM_HOUR_INNER_ECC', require('./platform').eccDefault),
    customHourOuterEcc: getSetting('CONFIG_CUSTOM_HOUR_OUTER_ECC', require('./platform').eccDefault),
    customHourInnerBorder: getSetting('CONFIG_CUSTOM_HOUR_INNER_BORDER', '20'),
    customHourOuterBorder: getSetting('CONFIG_CUSTOM_HOUR_OUTER_BORDER', '100'),
    customHourTranslucent: getSetting('CONFIG_CUSTOM_HOUR_TRANSLUCENT', 'false'),
    customHourColor: getSetting('CONFIG_CUSTOM_HOUR_COLOR', '0'),
    customSecStyle: getSetting('CONFIG_CUSTOM_SEC_STYLE', '0'),
    customSecThickness: getSetting('CONFIG_CUSTOM_SEC_THICKNESS', '1'),
    customSecInnerThickness: getSetting('CONFIG_CUSTOM_SEC_INNER_THICKNESS', '1'),
    customSecInnerEcc: getSetting('CONFIG_CUSTOM_SEC_INNER_ECC', require('./platform').eccDefault),
    customSecOuterEcc: getSetting('CONFIG_CUSTOM_SEC_OUTER_ECC', require('./platform').eccDefault),
    customSecInnerBorder: getSetting('CONFIG_CUSTOM_SEC_INNER_BORDER', '70'),
    customSecOuterBorder: getSetting('CONFIG_CUSTOM_SEC_OUTER_BORDER', '100'),
    customSecTranslucent: getSetting('CONFIG_CUSTOM_SEC_TRANSLUCENT', 'false'),
    customSecColor: getSetting('CONFIG_CUSTOM_SEC_COLOR', '0'),
    markerTextTarget: getSetting('CONFIG_MARKER_TEXT_TARGET', '0'),
    markerTextFont: getSetting('CONFIG_MARKER_TEXT_FONT', '0'),
    markerTextOffset: getSetting('CONFIG_MARKER_TEXT_OFFSET', '0'),
    markerTextHourMask: getSetting('CONFIG_MARKER_TEXT_HOUR_MASK', '4095'),
    markerTextSecMask: getSetting('CONFIG_MARKER_TEXT_SEC_MASK', '4095'),
    markerTextRoman: getSetting('CONFIG_MARKER_TEXT_ROMAN', 'false'),
    handHourStyle: getSetting('CONFIG_HAND_HOUR_STYLE', '1'),
    handHourWidth: getSetting('CONFIG_HAND_HOUR_WIDTH', '12'),
    handHourLength: getSetting('CONFIG_HAND_HOUR_LENGTH', '51'),
    handHourBackOffset: getSetting('CONFIG_HAND_HOUR_BACK_OFFSET', '0'),
    handHourMiddleOffset: getSetting('CONFIG_HAND_HOUR_MIDDLE_OFFSET', '0'),
    handHourSecondaryWidth: getSetting('CONFIG_HAND_HOUR_SECONDARY_WIDTH', '6'),
    handHourColor: getSetting('CONFIG_HAND_HOUR_COLOR', '0'),
    handHourOutlineEnabled: getSetting('CONFIG_HAND_HOUR_OUTLINE_ENABLED', 'false'),
    handHourOutlineColor: getSetting('CONFIG_HAND_HOUR_OUTLINE_COLOR', '0'),
    handHourTranslucent: getSetting('CONFIG_HAND_HOUR_TRANSLUCENT', 'false'),
    handHourShadowEnabled: getSetting('CONFIG_HAND_HOUR_SHADOW_ENABLED', 'false'),
    handHourShadowDistance: getSetting('CONFIG_HAND_HOUR_SHADOW_DISTANCE', '2'),
    handHourHollow: getSetting('CONFIG_HAND_HOUR_HOLLOW', 'false'),
    handHourHollowThickness: getSetting('CONFIG_HAND_HOUR_HOLLOW_THICKNESS', '1'),
    handMinStyle: getSetting('CONFIG_HAND_MIN_STYLE', '1'),
    handMinWidth: getSetting('CONFIG_HAND_MIN_WIDTH', '18'),
    handMinLength: getSetting('CONFIG_HAND_MIN_LENGTH', '78'),
    handMinBackOffset: getSetting('CONFIG_HAND_MIN_BACK_OFFSET', '0'),
    handMinMiddleOffset: getSetting('CONFIG_HAND_MIN_MIDDLE_OFFSET', '0'),
    handMinSecondaryWidth: getSetting('CONFIG_HAND_MIN_SECONDARY_WIDTH', '6'),
    handMinColor: getSetting('CONFIG_HAND_MIN_COLOR', '0'),
    handMinOutlineEnabled: getSetting('CONFIG_HAND_MIN_OUTLINE_ENABLED', 'false'),
    handMinOutlineColor: getSetting('CONFIG_HAND_MIN_OUTLINE_COLOR', '0'),
    handMinTranslucent: getSetting('CONFIG_HAND_MIN_TRANSLUCENT', 'false'),
    handMinShadowEnabled: getSetting('CONFIG_HAND_MIN_SHADOW_ENABLED', 'false'),
    handMinShadowDistance: getSetting('CONFIG_HAND_MIN_SHADOW_DISTANCE', '2'),
    handMinHollow: getSetting('CONFIG_HAND_MIN_HOLLOW', 'false'),
    handMinHollowThickness: getSetting('CONFIG_HAND_MIN_HOLLOW_THICKNESS', '1'),
    handSecStyle: getSetting('CONFIG_HAND_SEC_STYLE', '0'),
    handSecWidth: getSetting('CONFIG_HAND_SEC_WIDTH', '2'),
    handSecLength: getSetting('CONFIG_HAND_SEC_LENGTH', '85'),
    handSecBackOffset: getSetting('CONFIG_HAND_SEC_BACK_OFFSET', '0'),
    handSecMiddleOffset: getSetting('CONFIG_HAND_SEC_MIDDLE_OFFSET', '0'),
    handSecSecondaryWidth: getSetting('CONFIG_HAND_SEC_SECONDARY_WIDTH', '6'),
    handSecColor: getSetting('CONFIG_HAND_SEC_COLOR', '1'),
    handSecOutlineEnabled: getSetting('CONFIG_HAND_SEC_OUTLINE_ENABLED', 'false'),
    handSecOutlineColor: getSetting('CONFIG_HAND_SEC_OUTLINE_COLOR', '0'),
    handSecTranslucent: getSetting('CONFIG_HAND_SEC_TRANSLUCENT', 'false'),
    handSecShadowEnabled: getSetting('CONFIG_HAND_SEC_SHADOW_ENABLED', 'false'),
    handSecShadowDistance: getSetting('CONFIG_HAND_SEC_SHADOW_DISTANCE', '2'),
    handSecHollow: getSetting('CONFIG_HAND_SEC_HOLLOW', 'false'),
    handSecHollowThickness: getSetting('CONFIG_HAND_SEC_HOLLOW_THICKNESS', '1'),
    centerCircleRadius: getSetting('CONFIG_CENTER_CIRCLE_RADIUS', '3'),
    centerCircleColor: getSetting('CONFIG_CENTER_CIRCLE_COLOR', '0'),
    centerCircleOutline: getSetting('CONFIG_CENTER_CIRCLE_OUTLINE', 'off'),
    upperMiddleLine1ContentAnalog: getSetting('CONFIG_UPPER_MIDDLE_LINE1_CONTENT_ANALOG', getSetting('CONFIG_UPPER_MIDDLE_LINE1_CONTENT', '0')),
    upperMiddleLine1ColorAnalog: getSetting('CONFIG_UPPER_MIDDLE_LINE1_COLOR_ANALOG', getSetting('CONFIG_UPPER_MIDDLE_LINE1_COLOR', '0')),
    upperMiddleLine2ContentAnalog: getSetting('CONFIG_UPPER_MIDDLE_LINE2_CONTENT_ANALOG', getSetting('CONFIG_UPPER_MIDDLE_LINE2_CONTENT', '0')),
    upperMiddleLine2ColorAnalog: getSetting('CONFIG_UPPER_MIDDLE_LINE2_COLOR_ANALOG', getSetting('CONFIG_UPPER_MIDDLE_LINE2_COLOR', '0')),
    bottomMiddleLine1ContentAnalog: getSetting('CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG', getSetting('CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT', '105')),
    bottomMiddleLine1ColorAnalog: getSetting('CONFIG_BOTTOM_MIDDLE_LINE1_COLOR_ANALOG', getSetting('CONFIG_BOTTOM_MIDDLE_LINE1_COLOR', '0')),
    bottomMiddleLine2Content: getSetting('CONFIG_BOTTOM_MIDDLE_LINE2_CONTENT', '0'),
    bottomMiddleLine2Color: getSetting('CONFIG_BOTTOM_MIDDLE_LINE2_COLOR', '0'),
    middleLeftLine1ContentAnalog: getSetting('CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG', getSetting('CONFIG_MIDDLE_LEFT_LINE1_CONTENT', '0')),
    middleLeftLine1ColorAnalog: getSetting('CONFIG_MIDDLE_LEFT_LINE1_COLOR_ANALOG', getSetting('CONFIG_MIDDLE_LEFT_LINE1_COLOR', '0')),
    middleLeftLine2ContentAnalog: getSetting('CONFIG_MIDDLE_LEFT_LINE2_CONTENT_ANALOG', getSetting('CONFIG_MIDDLE_LEFT_LINE2_CONTENT', '0')),
    middleLeftLine2ColorAnalog: getSetting('CONFIG_MIDDLE_LEFT_LINE2_COLOR_ANALOG', getSetting('CONFIG_MIDDLE_LEFT_LINE2_COLOR', '0')),
    middleRightLine1ContentAnalog: getSetting('CONFIG_MIDDLE_RIGHT_LINE1_CONTENT_ANALOG', getSetting('CONFIG_MIDDLE_RIGHT_LINE1_CONTENT', '0')),
    middleRightLine1ColorAnalog: getSetting('CONFIG_MIDDLE_RIGHT_LINE1_COLOR_ANALOG', getSetting('CONFIG_MIDDLE_RIGHT_LINE1_COLOR', '0')),
    middleRightLine2ContentAnalog: getSetting('CONFIG_MIDDLE_RIGHT_LINE2_CONTENT_ANALOG', getSetting('CONFIG_MIDDLE_RIGHT_LINE2_CONTENT', '0')),
    middleRightLine2ColorAnalog: getSetting('CONFIG_MIDDLE_RIGHT_LINE2_COLOR_ANALOG', getSetting('CONFIG_MIDDLE_RIGHT_LINE2_COLOR', '0')),
    upperMiddleLine1CustomPrimsAnalog: getSetting('CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG', ''),
    upperMiddleLine2CustomPrimsAnalog: getSetting('CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS_ANALOG', ''),
    bottomMiddleLine1CustomPrimsAnalog: getSetting('CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG', ''),
    middleLeftLine1CustomPrimsAnalog: getSetting('CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS_ANALOG', ''),
    middleLeftLine2CustomPrimsAnalog: getSetting('CONFIG_MIDDLE_LEFT_LINE2_CUSTOM_PRIMS_ANALOG', ''),
    middleRightLine1CustomPrimsAnalog: getSetting('CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS_ANALOG', ''),
    middleRightLine2CustomPrimsAnalog: getSetting('CONFIG_MIDDLE_RIGHT_LINE2_CUSTOM_PRIMS_ANALOG', ''),
    bottomMiddleLine2CustomPrims: getSetting('CONFIG_BOTTOM_MIDDLE_LINE2_CUSTOM_PRIMS', ''),
    cornerTL: getSetting('CONFIG_CORNER_TL', '0'),
    cornerTR: getSetting('CONFIG_CORNER_TR', '0'),
    cornerBL: getSetting('CONFIG_CORNER_BL', '0'),
    cornerBR: getSetting('CONFIG_CORNER_BR', '0'),
    cornerTLCustomPrims: getSetting('CONFIG_CORNER_TL_CUSTOM_PRIMS', ''),
    cornerTRCustomPrims: getSetting('CONFIG_CORNER_TR_CUSTOM_PRIMS', ''),
    cornerBLCustomPrims: getSetting('CONFIG_CORNER_BL_CUSTOM_PRIMS', ''),
    cornerBRCustomPrims: getSetting('CONFIG_CORNER_BR_CUSTOM_PRIMS', ''),
    cornerTLColor: getSetting('CONFIG_CORNER_TL_COLOR', '0'),
    cornerTRColor: getSetting('CONFIG_CORNER_TR_COLOR', '0'),
    cornerBLColor: getSetting('CONFIG_CORNER_BL_COLOR', '0'),
    cornerBRColor: getSetting('CONFIG_CORNER_BR_COLOR', '0'),
    stepGoal: getSetting('CONFIG_STEP_GOAL', '10000'),
    startupClockAnimMode: getSetting('CONFIG_STARTUP_CLOCK_ANIM_MODE', '1'),
    bgAnimMode: getSetting('CONFIG_BG_ANIM_MODE', '0'),
    shakeAnimMode: getSetting('CONFIG_SHAKE_ANIM_MODE', '0'),
    shakeHandsTranslucent: getSetting('CONFIG_SHAKE_HANDS_TRANSLUCENT', 'false') === 'true',
    outlineStyle: String(outlineEnabledCode()),
    batterySaverEnabled: getSetting('CONFIG_BATTERY_SAVER_ENABLED', 'false') === 'true',
    cornerFont: getSetting('CONFIG_CORNER_FONT', '27'),
    testMode: getSetting('CONFIG_TEST_MODE', 'false') === 'true',
    testDateTime: getSetting('CONFIG_TEST_DATETIME', ''),
    drawDebug: getSetting('CONFIG_DRAW_DEBUG', 'false') === 'true',
    hourlyVibeMode: getSetting('CONFIG_HOURLY_VIBE_MODE', '0'),
    hourlyVibeIntervalMin: getSetting('CONFIG_HOURLY_VIBE_INTERVAL_MIN', '30'),
    hourlyVibePattern: getSetting('CONFIG_HOURLY_VIBE_PATTERN', '0'),
    btLostVibe: getSetting('CONFIG_BT_LOST_VIBE', '0'),
    hourlyVibeStartTime: getSetting('CONFIG_HOURLY_VIBE_START_TIME', '00:00'),
    hourlyVibeEndTime: getSetting('CONFIG_HOURLY_VIBE_END_TIME', '00:00'),
    hourlyVibeDaysMask: getSetting('CONFIG_HOURLY_VIBE_DAYS_MASK', '127'),
    hourlyVibeOverrideQuiet: getSetting('CONFIG_HOURLY_VIBE_OVERRIDE_QUIET', 'true') === 'true',
    rawMessageLog: (function () {
      try {
        var raw = localStorage.getItem('RAW_MESSAGE_LOG');
        var parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    })(),
    debugOverrideEnabled: getSetting('CONFIG_DEBUG_OVERRIDE_ENABLED', 'false') === 'true',
    debugOverrideData: getSetting('CONFIG_DEBUG_OVERRIDE_DATA', ''),
    fullKeysetJson: JSON.stringify(buildFullKeysetDict(), null, 2),
    serviceLogs: servicelog.snapshotAll(),
    presetSlot1Name: getSetting('CONFIG_PRESET_1_NAME', ''),
    presetSlot1Json: getSetting('CONFIG_PRESET_1_JSON', ''),
    presetSlot1Image: getSetting('CONFIG_PRESET_1_IMAGE', ''),
    presetSlot2Name: getSetting('CONFIG_PRESET_2_NAME', ''),
    presetSlot2Json: getSetting('CONFIG_PRESET_2_JSON', ''),
    presetSlot2Image: getSetting('CONFIG_PRESET_2_IMAGE', ''),
    presetSlot3Name: getSetting('CONFIG_PRESET_3_NAME', ''),
    presetSlot3Json: getSetting('CONFIG_PRESET_3_JSON', ''),
    presetSlot3Image: getSetting('CONFIG_PRESET_3_IMAGE', ''),
    presetSlot4Name: getSetting('CONFIG_PRESET_4_NAME', ''),
    presetSlot4Json: getSetting('CONFIG_PRESET_4_JSON', ''),
    presetSlot4Image: getSetting('CONFIG_PRESET_4_IMAGE', ''),
    presetSlot5Name: getSetting('CONFIG_PRESET_5_NAME', ''),
    presetSlot5Json: getSetting('CONFIG_PRESET_5_JSON', ''),
    presetSlot5Image: getSetting('CONFIG_PRESET_5_IMAGE', ''),
    presetSlot6Name: getSetting('CONFIG_PRESET_6_NAME', ''),
    presetSlot6Json: getSetting('CONFIG_PRESET_6_JSON', ''),
    presetSlot6Image: getSetting('CONFIG_PRESET_6_IMAGE', ''),
    presetSlot1Schedule: getSetting('CONFIG_PRESET_1_SCHEDULE', ''),
    presetSlot2Schedule: getSetting('CONFIG_PRESET_2_SCHEDULE', ''),
    presetSlot3Schedule: getSetting('CONFIG_PRESET_3_SCHEDULE', ''),
    presetSlot4Schedule: getSetting('CONFIG_PRESET_4_SCHEDULE', ''),
    presetSlot5Schedule: getSetting('CONFIG_PRESET_5_SCHEDULE', ''),
    presetSlot6Schedule: getSetting('CONFIG_PRESET_6_SCHEDULE', ''),
    scheduleKnownIds: scheduledStyle.knownIds(),
    pluginCatalogue: pluginManager.readCatalogue(),
    preferences: preferences.snapshot(),
    pluginSlots: pluginManager.getSlots(),
    weatherSource: getSetting('CONFIG_WEATHER_SOURCE', 'plugin')
  };
}

Pebble.addEventListener('showConfiguration', function () {
  var html = configPage.buildConfigHtml(buildCurrent());
  Pebble.openURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});

Pebble.addEventListener('webviewclosed', function (e) {
  if (!e || !e.response) return;
  var raw = e.response;
  try {
    raw = decodeURIComponent(raw);
  } catch (err) {
  }

  var settings;
  try {
    settings = JSON.parse(raw);
  } catch (err) {
    console.log('modern: failed to parse settings response: ' + err.message);
    return;
  }
  applySettingsObject(settings);
});

function unitSettingsSignature() {
  return [getSetting('CONFIG_TEMP_UNIT', 'C'), getSetting('CONFIG_WIND_SPEED_UNIT', 'kmh'),
    getSetting('CONFIG_ALTITUDE_UNIT', '0'), getSetting('CONFIG_AQI_UNIT', '0')].join('|');
}

function applySettingsObject(settings) {

  if (settings.CONFIG_SEND_FULL_KEYSET) {
    try {
      var keyset = JSON.parse(settings.CONFIG_FULL_KEYSET_DATA);
      if (keyset && typeof keyset === 'object') {
        enqueueFlatDict(keyset);
        console.log('modern: full keyset debug send queued');
      } else {
        console.log('modern: full keyset debug send skipped -- not a JSON object');
      }
    } catch (err) {
      console.log('modern: full keyset debug send failed to parse: ' + err.message);
    }
    return;
  }

  if (settings.CONFIG_SEND_FAKE_WEATHER) {
    try {
      var fakeWeather = JSON.parse(settings.CONFIG_FAKE_WEATHER_DATA);
      if (fakeWeather && typeof fakeWeather === 'object') {
        messageEncoder.sendFakeWeather(fakeWeather);
        console.log('modern: fake weather debug send queued');
      } else {
        console.log('modern: fake weather debug send skipped -- not a JSON object');
      }
    } catch (err) {
      console.log('modern: fake weather debug send failed to parse: ' + err.message);
    }
    return;
  }

  firstRun.markDone();
  var unitsBefore = unitSettingsSignature();
  var weatherSourceBefore = getSetting('CONFIG_WEATHER_SOURCE', 'plugin');

  setSetting('CONFIG_AUTO_LOC', settings.CONFIG_AUTO_LOC ? 'true' : 'false');
  setSetting('CONFIG_LAT', settings.CONFIG_LAT || '');
  setSetting('CONFIG_LON', settings.CONFIG_LON || '');
  setSetting('CONFIG_LOCATION_NAME', settings.CONFIG_LOCATION_NAME || '');
  setSetting('CONFIG_OWM_KEY', settings.CONFIG_OWM_KEY || '');
  setSetting('CONFIG_UPDATE_MINS', settings.CONFIG_UPDATE_MINS || '20');
  setSetting('CONFIG_TEMP_UNIT', (settings.CONFIG_TEMP_UNIT === 'F' || settings.CONFIG_TEMP_UNIT === 'K') ? settings.CONFIG_TEMP_UNIT : 'C');
  setSetting('CONFIG_WIND_SPEED_UNIT', settings.CONFIG_WIND_SPEED_UNIT || 'kmh');
  setSetting('CONFIG_SHOW_SECONDS', settings.CONFIG_SHOW_SECONDS ? 'true' : 'false');
  setSetting('CONFIG_CUSTOM_BG', settings.CONFIG_CUSTOM_BG || '255');
  setSetting('CONFIG_CUSTOM_TEXT', settings.CONFIG_CUSTOM_TEXT || '192');
  setSetting('CONFIG_CUSTOM_ACCENT', settings.CONFIG_CUSTOM_ACCENT || '192');
  setSetting('CONFIG_NIGHT_ENABLED', settings.CONFIG_NIGHT_ENABLED ? 'true' : 'false');
  setSetting('CONFIG_NIGHT_CUSTOM_BG', settings.CONFIG_NIGHT_CUSTOM_BG || '192');
  setSetting('CONFIG_NIGHT_CUSTOM_TEXT', settings.CONFIG_NIGHT_CUSTOM_TEXT || '255');
  setSetting('CONFIG_NIGHT_CUSTOM_ACCENT', settings.CONFIG_NIGHT_CUSTOM_ACCENT || '255');
  setSetting('CONFIG_WEATHER_ICON_STYLE', settings.CONFIG_WEATHER_ICON_STYLE || '1');
  setSetting('CONFIG_AQI_UNIT', settings.CONFIG_AQI_UNIT || '0');
  setSetting('CONFIG_ALTITUDE_UNIT', settings.CONFIG_ALTITUDE_UNIT || '0');
  setSetting('CONFIG_SHAKE_LABEL_SECONDS', settings.CONFIG_SHAKE_LABEL_SECONDS || '3');
  setSetting('CONFIG_SHADOW_TRANSLUCENT', settings.CONFIG_SHADOW_TRANSLUCENT || 'true');
  setSetting('CONFIG_SHADOW_ANGLE', settings.CONFIG_SHADOW_ANGLE || '120');
  setSetting('CONFIG_BIG_ANALOG_MARKER_STYLE', settings.CONFIG_BIG_ANALOG_MARKER_STYLE || '3');
  setSetting('CONFIG_UPPER_MIDDLE_LINE1_SHAKE', settings.CONFIG_UPPER_MIDDLE_LINE1_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_UPPER_MIDDLE_LINE2_SHAKE', settings.CONFIG_UPPER_MIDDLE_LINE2_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE1_SHAKE', settings.CONFIG_BOTTOM_MIDDLE_LINE1_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE2_SHAKE', settings.CONFIG_BOTTOM_MIDDLE_LINE2_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_MIDDLE_LEFT_LINE1_SHAKE', settings.CONFIG_MIDDLE_LEFT_LINE1_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_MIDDLE_LEFT_LINE2_SHAKE', settings.CONFIG_MIDDLE_LEFT_LINE2_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE1_SHAKE', settings.CONFIG_MIDDLE_RIGHT_LINE1_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE2_SHAKE', settings.CONFIG_MIDDLE_RIGHT_LINE2_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_CORNER_TL_SHAKE', settings.CONFIG_CORNER_TL_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_CORNER_TR_SHAKE', settings.CONFIG_CORNER_TR_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_CORNER_BL_SHAKE', settings.CONFIG_CORNER_BL_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_CORNER_BR_SHAKE', settings.CONFIG_CORNER_BR_SHAKE === '1' ? '1' : '0');
  setSetting('CONFIG_USE_CUSTOM_BG', (settings.CONFIG_USE_CUSTOM_BG && !require('./platform').bw) ? 'true' : 'false');
  setSetting('CONFIG_BG_SOURCE', settings.CONFIG_BG_SOURCE || 'p:1');
  setSetting('CONFIG_USE_WEATHER_BG', (settings.CONFIG_USE_WEATHER_BG && !require('./platform').bw) ? 'true' : 'false'); // no weather backgrounds on B&W
  setSetting('CONFIG_WEATHER_BG_STYLE', settings.CONFIG_WEATHER_BG_STYLE || '');
  setSetting('CONFIG_BG_TRANSLUCENT', settings.CONFIG_BG_TRANSLUCENT ? 'true' : 'false');
  setSetting('CONFIG_BG_CYCLE', (settings.CONFIG_BG_CYCLE === '1' || settings.CONFIG_BG_CYCLE === '2') ? settings.CONFIG_BG_CYCLE : '0');
  setSetting('CONFIG_USE_PLUGIN_BG', (settings.CONFIG_USE_PLUGIN_BG && !require('./platform').bw) ? 'true' : 'false');
  setSetting('CONFIG_PLUGIN_BG_SOURCE', settings.CONFIG_PLUGIN_BG_SOURCE || '');
  setSetting('CONFIG_PLUGIN_BG_DITHER', ['none', 'fs', 'atkinson', 'bayer4', 'bayer8'].indexOf(settings.CONFIG_PLUGIN_BG_DITHER) >= 0 ? settings.CONFIG_PLUGIN_BG_DITHER : 'fs');
  setSetting('CONFIG_PLUGIN_BG_COLOR', ['neutral', 'vivid', 'bw', 'sepia'].indexOf(settings.CONFIG_PLUGIN_BG_COLOR) >= 0 ? settings.CONFIG_PLUGIN_BG_COLOR : 'neutral');
  setSetting('CONFIG_PLUGIN_BG_FIT', ['fill', 'full', '75', '50', 'center'].indexOf(settings.CONFIG_PLUGIN_BG_FIT) >= 0 ? settings.CONFIG_PLUGIN_BG_FIT : 'fill');
  setSetting('CONFIG_PLUGIN_BG_AUTO_SCHEME', settings.CONFIG_PLUGIN_BG_AUTO_SCHEME ? 'true' : 'false');
  setSetting('CONFIG_PLUGIN_BG_CACHE', settings.CONFIG_PLUGIN_BG_CACHE ? 'true' : 'false');
  // CONFIG_BORDER_SOURCE: 0 off, 1 weather, 2 calendar. CONFIG_BORDER_WEATHER_MODE keeps the weather style (1-4) either way.
  if (['1','2','3','4'].indexOf(String(settings.CONFIG_BORDER_WEATHER_MODE)) >= 0) setSetting('CONFIG_BORDER_WEATHER_MODE', String(settings.CONFIG_BORDER_WEATHER_MODE));
  else if (getSetting('CONFIG_BORDER_WEATHER_MODE', '0') === '0') setSetting('CONFIG_BORDER_WEATHER_MODE', '1'); // keep the last weather style while the ring shows something else
  setSetting('CONFIG_BORDER_SOURCE', (['0','1','2'].indexOf(String(settings.CONFIG_BORDER_SOURCE)) >= 0) ? String(settings.CONFIG_BORDER_SOURCE) : '0');
  setSetting('CONFIG_BORDER_CAL_MODE', (['1','2','3'].indexOf(String(settings.CONFIG_BORDER_CAL_MODE)) >= 0) ? String(settings.CONFIG_BORDER_CAL_MODE) : '1');
  setSetting('CONFIG_BORDER_CAL_SCHEME', (['0','1','2'].indexOf(String(settings.CONFIG_BORDER_CAL_SCHEME)) >= 0) ? String(settings.CONFIG_BORDER_CAL_SCHEME) : '0');
  setSetting('CONFIG_BORDER_CAL_COLOR', (['0','1','2','3','4'].indexOf(String(settings.CONFIG_BORDER_CAL_COLOR)) >= 0) ? String(settings.CONFIG_BORDER_CAL_COLOR) : '0');
  setSetting('CONFIG_BORDER_CAL_ALLDAY', settings.CONFIG_BORDER_CAL_ALLDAY ? 'true' : 'false');
  setSetting('CONFIG_BORDER_WEATHER_SCHEME', (settings.CONFIG_BORDER_WEATHER_SCHEME === '1' || settings.CONFIG_BORDER_WEATHER_SCHEME === '2') ? settings.CONFIG_BORDER_WEATHER_SCHEME : '0');
  setSetting('CONFIG_BORDER_WEATHER_SHAKE', settings.CONFIG_BORDER_WEATHER_SHAKE ? 'true' : 'false');
  setSetting('CONFIG_BORDER_WEATHER_SEMI', settings.CONFIG_BORDER_WEATHER_SEMI ? 'true' : 'false');
  setSetting('CONFIG_BORDER_WEATHER_PX', String(Math.max(2, Math.min(40, parseInt(settings.CONFIG_BORDER_WEATHER_PX, 10) || 8))));
  bgImageSync.applySlotUpdates(settings.CONFIG_BG_SLOT_UPDATES);
  setSetting('CONFIG_BITMAP_MARKER_TRANSPARENT', settings.CONFIG_BITMAP_MARKER_TRANSPARENT ? 'true' : 'false');
  setSetting('CONFIG_BITMAP_MARKER_INVERT', settings.CONFIG_BITMAP_MARKER_INVERT ? 'true' : 'false');
  setSetting('CONFIG_BITMAP_CORNER_OVERRIDE', settings.CONFIG_BITMAP_CORNER_OVERRIDE ? 'true' : 'false');
  setSetting('CONFIG_DRAW_FEATURES_BENEATH_HANDS', settings.CONFIG_DRAW_FEATURES_BENEATH_HANDS ? 'true' : 'false');
  setSetting('CONFIG_CUSTOM_HOUR_STYLE', settings.CONFIG_CUSTOM_HOUR_STYLE || '0');
  setSetting('CONFIG_CUSTOM_HOUR_THICKNESS', settings.CONFIG_CUSTOM_HOUR_THICKNESS || '3');
  setSetting('CONFIG_CUSTOM_HOUR_INNER_THICKNESS', settings.CONFIG_CUSTOM_HOUR_INNER_THICKNESS || '3');
  setSetting('CONFIG_CUSTOM_HOUR_INNER_ECC', settings.CONFIG_CUSTOM_HOUR_INNER_ECC || require('./platform').eccDefault);
  setSetting('CONFIG_CUSTOM_HOUR_OUTER_ECC', settings.CONFIG_CUSTOM_HOUR_OUTER_ECC || require('./platform').eccDefault);
  setSetting('CONFIG_CUSTOM_HOUR_INNER_BORDER', settings.CONFIG_CUSTOM_HOUR_INNER_BORDER || '20');
  setSetting('CONFIG_CUSTOM_HOUR_OUTER_BORDER', settings.CONFIG_CUSTOM_HOUR_OUTER_BORDER || '100');
  setSetting('CONFIG_CUSTOM_HOUR_TRANSLUCENT', settings.CONFIG_CUSTOM_HOUR_TRANSLUCENT ? 'true' : 'false');
  setSetting('CONFIG_CUSTOM_HOUR_COLOR', settings.CONFIG_CUSTOM_HOUR_COLOR || '0');
  setSetting('CONFIG_CUSTOM_SEC_STYLE', settings.CONFIG_CUSTOM_SEC_STYLE || '0');
  setSetting('CONFIG_CUSTOM_SEC_THICKNESS', settings.CONFIG_CUSTOM_SEC_THICKNESS || '1');
  setSetting('CONFIG_CUSTOM_SEC_INNER_THICKNESS', settings.CONFIG_CUSTOM_SEC_INNER_THICKNESS || '1');
  setSetting('CONFIG_CUSTOM_SEC_INNER_ECC', settings.CONFIG_CUSTOM_SEC_INNER_ECC || require('./platform').eccDefault);
  setSetting('CONFIG_CUSTOM_SEC_OUTER_ECC', settings.CONFIG_CUSTOM_SEC_OUTER_ECC || require('./platform').eccDefault);
  setSetting('CONFIG_CUSTOM_SEC_INNER_BORDER', settings.CONFIG_CUSTOM_SEC_INNER_BORDER || '70');
  setSetting('CONFIG_CUSTOM_SEC_OUTER_BORDER', settings.CONFIG_CUSTOM_SEC_OUTER_BORDER || '100');
  setSetting('CONFIG_CUSTOM_SEC_TRANSLUCENT', settings.CONFIG_CUSTOM_SEC_TRANSLUCENT ? 'true' : 'false');
  setSetting('CONFIG_CUSTOM_SEC_COLOR', settings.CONFIG_CUSTOM_SEC_COLOR || '0');
  setSetting('CONFIG_MARKER_TEXT_TARGET', settings.CONFIG_MARKER_TEXT_TARGET || '0');
  setSetting('CONFIG_MARKER_TEXT_FONT', settings.CONFIG_MARKER_TEXT_FONT || '0');
  setSetting('CONFIG_MARKER_TEXT_OFFSET', settings.CONFIG_MARKER_TEXT_OFFSET || '0');
  setSetting('CONFIG_MARKER_TEXT_HOUR_MASK', settings.CONFIG_MARKER_TEXT_HOUR_MASK || '4095');
  setSetting('CONFIG_MARKER_TEXT_SEC_MASK', settings.CONFIG_MARKER_TEXT_SEC_MASK || '4095');
  setSetting('CONFIG_MARKER_TEXT_ROMAN', settings.CONFIG_MARKER_TEXT_ROMAN ? 'true' : 'false');
  setSetting('CONFIG_HAND_HOUR_STYLE', settings.CONFIG_HAND_HOUR_STYLE || '1');
  setSetting('CONFIG_HAND_HOUR_WIDTH', settings.CONFIG_HAND_HOUR_WIDTH || '12');
  setSetting('CONFIG_HAND_HOUR_LENGTH', settings.CONFIG_HAND_HOUR_LENGTH || '51');
  setSetting('CONFIG_HAND_HOUR_BACK_OFFSET', settings.CONFIG_HAND_HOUR_BACK_OFFSET || '0');
  setSetting('CONFIG_HAND_HOUR_MIDDLE_OFFSET', settings.CONFIG_HAND_HOUR_MIDDLE_OFFSET || '0');
  setSetting('CONFIG_HAND_HOUR_SECONDARY_WIDTH', settings.CONFIG_HAND_HOUR_SECONDARY_WIDTH || '6');
  setSetting('CONFIG_HAND_HOUR_COLOR', settings.CONFIG_HAND_HOUR_COLOR || '0');
  setSetting('CONFIG_HAND_HOUR_OUTLINE_ENABLED', settings.CONFIG_HAND_HOUR_OUTLINE_ENABLED || 'false');
  setSetting('CONFIG_HAND_HOUR_OUTLINE_COLOR', settings.CONFIG_HAND_HOUR_OUTLINE_COLOR || '0');
  setSetting('CONFIG_HAND_HOUR_TRANSLUCENT', settings.CONFIG_HAND_HOUR_TRANSLUCENT || 'false');
  setSetting('CONFIG_HAND_HOUR_SHADOW_ENABLED', settings.CONFIG_HAND_HOUR_SHADOW_ENABLED || 'false');
  setSetting('CONFIG_HAND_HOUR_SHADOW_DISTANCE', settings.CONFIG_HAND_HOUR_SHADOW_DISTANCE || '2');
  setSetting('CONFIG_HAND_HOUR_HOLLOW', settings.CONFIG_HAND_HOUR_HOLLOW || 'false');
  setSetting('CONFIG_HAND_HOUR_HOLLOW_THICKNESS', settings.CONFIG_HAND_HOUR_HOLLOW_THICKNESS || '1');
  setSetting('CONFIG_HAND_MIN_STYLE', settings.CONFIG_HAND_MIN_STYLE || '1');
  setSetting('CONFIG_HAND_MIN_WIDTH', settings.CONFIG_HAND_MIN_WIDTH || '18');
  setSetting('CONFIG_HAND_MIN_LENGTH', settings.CONFIG_HAND_MIN_LENGTH || '78');
  setSetting('CONFIG_HAND_MIN_BACK_OFFSET', settings.CONFIG_HAND_MIN_BACK_OFFSET || '0');
  setSetting('CONFIG_HAND_MIN_MIDDLE_OFFSET', settings.CONFIG_HAND_MIN_MIDDLE_OFFSET || '0');
  setSetting('CONFIG_HAND_MIN_SECONDARY_WIDTH', settings.CONFIG_HAND_MIN_SECONDARY_WIDTH || '6');
  setSetting('CONFIG_HAND_MIN_COLOR', settings.CONFIG_HAND_MIN_COLOR || '0');
  setSetting('CONFIG_HAND_MIN_OUTLINE_ENABLED', settings.CONFIG_HAND_MIN_OUTLINE_ENABLED || 'false');
  setSetting('CONFIG_HAND_MIN_OUTLINE_COLOR', settings.CONFIG_HAND_MIN_OUTLINE_COLOR || '0');
  setSetting('CONFIG_HAND_MIN_TRANSLUCENT', settings.CONFIG_HAND_MIN_TRANSLUCENT || 'false');
  setSetting('CONFIG_HAND_MIN_SHADOW_ENABLED', settings.CONFIG_HAND_MIN_SHADOW_ENABLED || 'false');
  setSetting('CONFIG_HAND_MIN_SHADOW_DISTANCE', settings.CONFIG_HAND_MIN_SHADOW_DISTANCE || '2');
  setSetting('CONFIG_HAND_MIN_HOLLOW', settings.CONFIG_HAND_MIN_HOLLOW || 'false');
  setSetting('CONFIG_HAND_MIN_HOLLOW_THICKNESS', settings.CONFIG_HAND_MIN_HOLLOW_THICKNESS || '1');
  setSetting('CONFIG_HAND_SEC_STYLE', settings.CONFIG_HAND_SEC_STYLE || '0');
  setSetting('CONFIG_HAND_SEC_WIDTH', settings.CONFIG_HAND_SEC_WIDTH || '2');
  setSetting('CONFIG_HAND_SEC_LENGTH', settings.CONFIG_HAND_SEC_LENGTH || '85');
  setSetting('CONFIG_HAND_SEC_BACK_OFFSET', settings.CONFIG_HAND_SEC_BACK_OFFSET || '0');
  setSetting('CONFIG_HAND_SEC_MIDDLE_OFFSET', settings.CONFIG_HAND_SEC_MIDDLE_OFFSET || '0');
  setSetting('CONFIG_HAND_SEC_SECONDARY_WIDTH', settings.CONFIG_HAND_SEC_SECONDARY_WIDTH || '6');
  setSetting('CONFIG_HAND_SEC_COLOR', settings.CONFIG_HAND_SEC_COLOR || '1');
  setSetting('CONFIG_HAND_SEC_OUTLINE_ENABLED', settings.CONFIG_HAND_SEC_OUTLINE_ENABLED || 'false');
  setSetting('CONFIG_HAND_SEC_OUTLINE_COLOR', settings.CONFIG_HAND_SEC_OUTLINE_COLOR || '0');
  setSetting('CONFIG_HAND_SEC_TRANSLUCENT', settings.CONFIG_HAND_SEC_TRANSLUCENT || 'false');
  setSetting('CONFIG_HAND_SEC_SHADOW_ENABLED', settings.CONFIG_HAND_SEC_SHADOW_ENABLED || 'false');
  setSetting('CONFIG_HAND_SEC_SHADOW_DISTANCE', settings.CONFIG_HAND_SEC_SHADOW_DISTANCE || '2');
  setSetting('CONFIG_HAND_SEC_HOLLOW', settings.CONFIG_HAND_SEC_HOLLOW || 'false');
  setSetting('CONFIG_HAND_SEC_HOLLOW_THICKNESS', settings.CONFIG_HAND_SEC_HOLLOW_THICKNESS || '1');
  setSetting('CONFIG_CENTER_CIRCLE_RADIUS', settings.CONFIG_CENTER_CIRCLE_RADIUS || '3');
  setSetting('CONFIG_CENTER_CIRCLE_COLOR', settings.CONFIG_CENTER_CIRCLE_COLOR || '0');
  setSetting('CONFIG_CENTER_CIRCLE_OUTLINE', settings.CONFIG_CENTER_CIRCLE_OUTLINE || 'off');
  setSetting('CONFIG_UPPER_MIDDLE_LINE1_CONTENT_ANALOG', settings.CONFIG_UPPER_MIDDLE_LINE1_CONTENT_ANALOG || '0');
  setSetting('CONFIG_UPPER_MIDDLE_LINE1_COLOR_ANALOG', settings.CONFIG_UPPER_MIDDLE_LINE1_COLOR_ANALOG || '0');
  setSetting('CONFIG_UPPER_MIDDLE_LINE2_CONTENT_ANALOG', settings.CONFIG_UPPER_MIDDLE_LINE2_CONTENT_ANALOG || '0');
  setSetting('CONFIG_UPPER_MIDDLE_LINE2_COLOR_ANALOG', settings.CONFIG_UPPER_MIDDLE_LINE2_COLOR_ANALOG || '0');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG', settings.CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT_ANALOG || '105');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE1_COLOR_ANALOG', settings.CONFIG_BOTTOM_MIDDLE_LINE1_COLOR_ANALOG || '0');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE2_CONTENT', settings.CONFIG_BOTTOM_MIDDLE_LINE2_CONTENT || '0');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE2_COLOR', settings.CONFIG_BOTTOM_MIDDLE_LINE2_COLOR || '0');
  setSetting('CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG', settings.CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_LEFT_LINE1_COLOR_ANALOG', settings.CONFIG_MIDDLE_LEFT_LINE1_COLOR_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_LEFT_LINE2_CONTENT_ANALOG', settings.CONFIG_MIDDLE_LEFT_LINE2_CONTENT_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_LEFT_LINE2_COLOR_ANALOG', settings.CONFIG_MIDDLE_LEFT_LINE2_COLOR_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE1_CONTENT_ANALOG', settings.CONFIG_MIDDLE_RIGHT_LINE1_CONTENT_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE1_COLOR_ANALOG', settings.CONFIG_MIDDLE_RIGHT_LINE1_COLOR_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE2_CONTENT_ANALOG', settings.CONFIG_MIDDLE_RIGHT_LINE2_CONTENT_ANALOG || '0');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE2_COLOR_ANALOG', settings.CONFIG_MIDDLE_RIGHT_LINE2_COLOR_ANALOG || '0');
  setSetting('CONFIG_CORNER_TL', settings.CONFIG_CORNER_TL || '0');
  setSetting('CONFIG_CORNER_TR', settings.CONFIG_CORNER_TR || '0');
  setSetting('CONFIG_CORNER_BL', settings.CONFIG_CORNER_BL || '0');
  setSetting('CONFIG_CORNER_BR', settings.CONFIG_CORNER_BR || '0');
  setSetting('CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG', settings.CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS_ANALOG', settings.CONFIG_UPPER_MIDDLE_LINE2_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG', settings.CONFIG_BOTTOM_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS_ANALOG', settings.CONFIG_MIDDLE_LEFT_LINE1_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_MIDDLE_LEFT_LINE2_CUSTOM_PRIMS_ANALOG', settings.CONFIG_MIDDLE_LEFT_LINE2_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS_ANALOG', settings.CONFIG_MIDDLE_RIGHT_LINE1_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_MIDDLE_RIGHT_LINE2_CUSTOM_PRIMS_ANALOG', settings.CONFIG_MIDDLE_RIGHT_LINE2_CUSTOM_PRIMS_ANALOG || '');
  setSetting('CONFIG_BOTTOM_MIDDLE_LINE2_CUSTOM_PRIMS', settings.CONFIG_BOTTOM_MIDDLE_LINE2_CUSTOM_PRIMS || '');
  setSetting('CONFIG_CORNER_TL_CUSTOM_PRIMS', settings.CONFIG_CORNER_TL_CUSTOM_PRIMS || '');
  setSetting('CONFIG_CORNER_TR_CUSTOM_PRIMS', settings.CONFIG_CORNER_TR_CUSTOM_PRIMS || '');
  setSetting('CONFIG_CORNER_BL_CUSTOM_PRIMS', settings.CONFIG_CORNER_BL_CUSTOM_PRIMS || '');
  setSetting('CONFIG_CORNER_BR_CUSTOM_PRIMS', settings.CONFIG_CORNER_BR_CUSTOM_PRIMS || '');
  setSetting('CONFIG_CORNER_TL_COLOR', settings.CONFIG_CORNER_TL_COLOR || '0');
  setSetting('CONFIG_CORNER_TR_COLOR', settings.CONFIG_CORNER_TR_COLOR || '0');
  setSetting('CONFIG_CORNER_BL_COLOR', settings.CONFIG_CORNER_BL_COLOR || '0');
  setSetting('CONFIG_CORNER_BR_COLOR', settings.CONFIG_CORNER_BR_COLOR || '0');
  setSetting('CONFIG_STEP_GOAL', settings.CONFIG_STEP_GOAL || '10000');
  setSetting('CONFIG_STARTUP_CLOCK_ANIM_MODE', settings.CONFIG_STARTUP_CLOCK_ANIM_MODE || '1');
  setSetting('CONFIG_BG_ANIM_MODE', settings.CONFIG_BG_ANIM_MODE || '0');
  setSetting('CONFIG_SHAKE_ANIM_MODE', settings.CONFIG_SHAKE_ANIM_MODE || '0');
  setSetting('CONFIG_SHAKE_HANDS_TRANSLUCENT', settings.CONFIG_SHAKE_HANDS_TRANSLUCENT ? 'true' : 'false');
  setSetting('CONFIG_OUTLINE_ENABLED', settings.CONFIG_OUTLINE_ENABLED || '1');
  setSetting('CONFIG_BATTERY_SAVER_ENABLED', settings.CONFIG_BATTERY_SAVER_ENABLED ? 'true' : 'false');
  setSetting('CONFIG_CORNER_FONT', settings.CONFIG_CORNER_FONT || '27');
  setSetting('CONFIG_TEST_MODE', settings.CONFIG_TEST_MODE ? 'true' : 'false');
  setSetting('CONFIG_TEST_DATETIME', settings.CONFIG_TEST_DATETIME || '');
  setSetting('CONFIG_DEBUG_OVERRIDE_ENABLED', settings.CONFIG_DEBUG_OVERRIDE_ENABLED ? 'true' : 'false');
  setSetting('CONFIG_DEBUG_OVERRIDE_DATA', settings.CONFIG_DEBUG_OVERRIDE_DATA || '');
  setSetting('CONFIG_PRESET_1_NAME', settings.CONFIG_PRESET_1_NAME || '');
  setSetting('CONFIG_PRESET_1_JSON', settings.CONFIG_PRESET_1_JSON || '');
  setSetting('CONFIG_PRESET_1_IMAGE', settings.CONFIG_PRESET_1_IMAGE || '');
  setSetting('CONFIG_PRESET_2_NAME', settings.CONFIG_PRESET_2_NAME || '');
  setSetting('CONFIG_PRESET_2_JSON', settings.CONFIG_PRESET_2_JSON || '');
  setSetting('CONFIG_PRESET_2_IMAGE', settings.CONFIG_PRESET_2_IMAGE || '');
  setSetting('CONFIG_PRESET_3_NAME', settings.CONFIG_PRESET_3_NAME || '');
  setSetting('CONFIG_PRESET_3_JSON', settings.CONFIG_PRESET_3_JSON || '');
  setSetting('CONFIG_PRESET_3_IMAGE', settings.CONFIG_PRESET_3_IMAGE || '');
  setSetting('CONFIG_PRESET_4_NAME', settings.CONFIG_PRESET_4_NAME || '');
  setSetting('CONFIG_PRESET_4_JSON', settings.CONFIG_PRESET_4_JSON || '');
  setSetting('CONFIG_PRESET_4_IMAGE', settings.CONFIG_PRESET_4_IMAGE || '');
  setSetting('CONFIG_PRESET_5_NAME', settings.CONFIG_PRESET_5_NAME || '');
  setSetting('CONFIG_PRESET_5_JSON', settings.CONFIG_PRESET_5_JSON || '');
  setSetting('CONFIG_PRESET_5_IMAGE', settings.CONFIG_PRESET_5_IMAGE || '');
  setSetting('CONFIG_PRESET_6_NAME', settings.CONFIG_PRESET_6_NAME || '');
  setSetting('CONFIG_PRESET_6_JSON', settings.CONFIG_PRESET_6_JSON || '');
  setSetting('CONFIG_PRESET_6_IMAGE', settings.CONFIG_PRESET_6_IMAGE || '');
  (function () {
    var nowMs = Date.now();
    for (var n = 1; n <= scheduledStyle.SLOT_COUNT; n++) {
      scheduledStyle.persistSlotSchedule(n, settings['CONFIG_PRESET_' + n + '_SCHEDULE'], nowMs);
    }
  })();
  setSetting('CONFIG_DRAW_DEBUG', settings.CONFIG_DRAW_DEBUG ? 'true' : 'false');
  setSetting('CONFIG_HOURLY_VIBE_MODE', settings.CONFIG_HOURLY_VIBE_MODE || '0');
  setSetting('CONFIG_HOURLY_VIBE_INTERVAL_MIN', settings.CONFIG_HOURLY_VIBE_INTERVAL_MIN || '30');
  setSetting('CONFIG_HOURLY_VIBE_PATTERN', settings.CONFIG_HOURLY_VIBE_PATTERN || '0');
  setSetting('CONFIG_BT_LOST_VIBE', settings.CONFIG_BT_LOST_VIBE || '0');
  setSetting('CONFIG_HOURLY_VIBE_START_TIME', settings.CONFIG_HOURLY_VIBE_START_TIME || '00:00');
  setSetting('CONFIG_HOURLY_VIBE_END_TIME', settings.CONFIG_HOURLY_VIBE_END_TIME || '00:00');
  setSetting('CONFIG_HOURLY_VIBE_DAYS_MASK', settings.CONFIG_HOURLY_VIBE_DAYS_MASK || '127');
  setSetting('CONFIG_HOURLY_VIBE_OVERRIDE_QUIET', settings.CONFIG_HOURLY_VIBE_OVERRIDE_QUIET === false ? 'false' : 'true');
  if (settings.CONFIG_WEATHER_SOURCE) setSetting('CONFIG_WEATHER_SOURCE', settings.CONFIG_WEATHER_SOURCE === 'openmeteo' ? 'openmeteo' : (/^plugin:[^\s]+$/.test(settings.CONFIG_WEATHER_SOURCE) ? settings.CONFIG_WEATHER_SOURCE : 'plugin'));
  if (settings.CONFIG_PLUGIN_SLOTS !== undefined) pluginManager.setSlots(settings.CONFIG_PLUGIN_SLOTS);

  borderData.sync();
  sendFlatDict({});
  if (unitSettingsSignature() !== unitsBefore) messageEncoder.resendUnitDisplays();
  pluginBg.apply();
  bgImageSync.syncIfNeeded();

  scheduleRefresh();
  // Changing the weather source must show its data now, not after the next scheduled fetch: force
  // past the "fetched recently, location unchanged" shortcut.
  var sourceChanged = getSetting('CONFIG_WEATHER_SOURCE', 'plugin') !== weatherSourceBefore;
  refreshAndSend(!!settings.CONFIG_FORCE_REFRESH || sourceChanged, false);
}

configBridge.install(function () {
  var current = buildCurrent();
  current.liveMode = true;
  return configPage.buildConfigHtml(current);
}, applySettingsObject, pluginManager, preferences);
