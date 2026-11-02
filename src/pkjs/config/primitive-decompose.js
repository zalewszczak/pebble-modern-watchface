// Primitive-strip preview and phone-side feature compiler.
var presetsLookups = require('../presets-lookups');
var CORNER_CATEGORIES = presetsLookups.CORNER_CATEGORIES;
var PRIM = require('./primitive-ids-generated');

var CONTENT_ITEM_BY_ID = {};
CORNER_CATEGORIES.forEach(function (cat) {
  cat.items.forEach(function (item) { CONTENT_ITEM_BY_ID[item.id] = item; });
});

function label(text) { return { kind: 'label', text: text }; }
function value(text) { return { kind: 'value', text: text }; }
function space() { return { kind: 'space', text: ' ' }; }
function slash() { return { kind: 'slash', text: '/' }; }
function icon(text) { return { kind: 'icon', text: text }; }

var PRIMITIVE_TRANSPORT_SEQUENCES = {
  4: [PRIM.PRIM_LABEL_HIGH_PREFIX, PRIM.PRIM_TEMP_HIGH_TEXT, PRIM.PRIM_SPACE, PRIM.PRIM_LABEL_LOW_PREFIX, PRIM.PRIM_TEMP_LOW_TEXT],
  12: [PRIM.PRIM_WEEKDAY_SHORT_MIXED, PRIM.PRIM_SPACE, PRIM.PRIM_DAY_OF_MONTH],
  21: [PRIM.PRIM_MONTH_SHORT_UPPER, PRIM.PRIM_SPACE, PRIM.PRIM_DAY_OF_MONTH],
  27: [PRIM.PRIM_DAY_OF_MONTH, PRIM.PRIM_SLASH, PRIM.PRIM_MONTH_NUMBER],
  28: [PRIM.PRIM_MONTH_NUMBER, PRIM.PRIM_SLASH, PRIM.PRIM_DAY_OF_MONTH],
  29: [PRIM.PRIM_DAY_OF_MONTH, PRIM.PRIM_SLASH, PRIM.PRIM_MONTH_NUMBER, PRIM.PRIM_SLASH, PRIM.PRIM_YEAR_FULL],
  30: [PRIM.PRIM_MONTH_NUMBER, PRIM.PRIM_SLASH, PRIM.PRIM_DAY_OF_MONTH, PRIM.PRIM_SLASH, PRIM.PRIM_YEAR_SHORT],
  98: [PRIM.PRIM_WEEKDAY_SHORT_UPPER, PRIM.PRIM_SPACE, PRIM.PRIM_DAY_OF_MONTH, PRIM.PRIM_SLASH, PRIM.PRIM_MONTH_NUMBER],
  99: [PRIM.PRIM_WEEKDAY_SHORT_UPPER, PRIM.PRIM_SPACE, PRIM.PRIM_MONTH_NUMBER, PRIM.PRIM_SLASH, PRIM.PRIM_DAY_OF_MONTH],

  19: [PRIM.PRIM_LABEL_WK_PREFIX, PRIM.PRIM_SPACE, PRIM.PRIM_WEEK_NUMBER],
  22: [PRIM.PRIM_DAY_OF_MONTH],
  23: [PRIM.PRIM_WEEKDAY_SHORT_UPPER],
  24: [PRIM.PRIM_WEEKDAY_LONG],
  25: [PRIM.PRIM_MONTH_SHORT_UPPER],
  26: [PRIM.PRIM_MONTH_LONG],
  76: [PRIM.PRIM_WEATHER_CONDITION_ICON, PRIM.PRIM_CURRENT_TEMP_TEXT, PRIM.PRIM_SPACE,
       PRIM.PRIM_LABEL_HIGH_PREFIX, PRIM.PRIM_TEMP_HIGH_TEXT, PRIM.PRIM_SPACE,
       PRIM.PRIM_LABEL_LOW_PREFIX, PRIM.PRIM_TEMP_LOW_TEXT],
  106: [PRIM.PRIM_WEEKDAY_SHORT_MIXED, PRIM.PRIM_SPACE, PRIM.PRIM_DAY_OF_MONTH, PRIM.PRIM_SPACE,
        PRIM.PRIM_MONTH_SHORT_MIXED, PRIM.PRIM_SPACE, PRIM.PRIM_LABEL_WK_PREFIX, PRIM.PRIM_WEEK_NUMBER],

  1: [PRIM.PRIM_HEART_RATE_ICON, PRIM.PRIM_HEART_RATE_VALUE],
  2: [PRIM.PRIM_STEPS_ICON, PRIM.PRIM_STEPS_VALUE],
  3: [PRIM.PRIM_STEPS_ICON, PRIM.PRIM_STEP_GOAL_PCT],
  10: [PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_BATTERY_PCT_TEXT],
  17: [PRIM.PRIM_BATTERY_LOGO_ICON],
  20: [PRIM.PRIM_BLUETOOTH_ICON, PRIM.PRIM_BLUETOOTH_STATUS_TEXT],
  78: [PRIM.PRIM_BLUETOOTH_ICON],
  108: [PRIM.PRIM_QUIET_TIME_ICON],
  109: [PRIM.PRIM_QUIET_TIME_PLAIN_ICON, PRIM.PRIM_QUIET_TIME_STATUS_TEXT],
  39: [PRIM.PRIM_SLEEP_TOTAL_ICON, PRIM.PRIM_SLEEP_TOTAL_TEXT],
  40: [PRIM.PRIM_SLEEP_RESTFUL_ICON, PRIM.PRIM_SLEEP_RESTFUL_TEXT],
  41: [PRIM.PRIM_SLEEP_QUALITY_ICON, PRIM.PRIM_SLEEP_QUALITY_PCT],
  42: [PRIM.PRIM_BED_TIME_ICON, PRIM.PRIM_BED_TIME_TEXT],
  43: [PRIM.PRIM_WAKE_TIME_ICON, PRIM.PRIM_WAKE_TIME_TEXT],
  101: [PRIM.PRIM_BED_TIME_ICON, PRIM.PRIM_BED_TIME_TEXT, PRIM.PRIM_SLASH, PRIM.PRIM_WAKE_TIME_TEXT],
  104: [PRIM.PRIM_SLEEP_TOTAL_ICON, PRIM.PRIM_SLEEP_TOTAL_TEXT, PRIM.PRIM_SLEEP_RESTFUL_TEXT, PRIM.PRIM_SLEEP_QUALITY_PCT],

  73: [PRIM.PRIM_CURRENT_TEMP_ONLY_TEXT],
  74: [PRIM.PRIM_TEMP_HIGH_ONLY_TEXT],
  75: [PRIM.PRIM_TEMP_LOW_ONLY_TEXT],
  77: [PRIM.PRIM_FEELS_LIKE_TEXT],

  11: [PRIM.PRIM_MOON_PHASE_ICON, PRIM.PRIM_MOON_PHASE_NAME],
  13: [PRIM.PRIM_LOCATION_ICON, PRIM.PRIM_LOCATION_NAME],
  16: [PRIM.PRIM_SUN_EVENT_ICON, PRIM.PRIM_SUN_EVENT_TIME],
  79: [PRIM.PRIM_PLANETS_VISIBLE_ICON, PRIM.PRIM_PLANETS_VISIBLE_COUNT],
  80: [PRIM.PRIM_METEOR_SHOWER_NAME],
  81: [PRIM.PRIM_SATURN_RINGS_ICON, PRIM.PRIM_SATURN_RINGS_PCT],
  82: [PRIM.PRIM_NEXT_PLANET_RISE],
  83: [PRIM.PRIM_ISS_ICON, PRIM.PRIM_ISS_NEXT_PASS],
  84: [PRIM.PRIM_AURORA_ICON, PRIM.PRIM_AURORA_KP],
  85: [PRIM.PRIM_COMPASS_ICON, PRIM.PRIM_COMPASS_DIR_TEXT],

  18: [PRIM.PRIM_TIME_HM],
  63: [PRIM.PRIM_TIME_HMS],
  64: [PRIM.PRIM_HOUR_24_PAD],
  65: [PRIM.PRIM_HOUR_24],
  66: [PRIM.PRIM_HOUR_12],
  67: [PRIM.PRIM_MINUTE],
  68: [PRIM.PRIM_MINUTE_PAD],
  69: [PRIM.PRIM_SECOND],
  70: [PRIM.PRIM_SECOND_PAD],
  71: [PRIM.PRIM_SECOND_TENS],
  72: [PRIM.PRIM_SECOND_ONES],
  86: [PRIM.PRIM_AMPM],

  5: [PRIM.PRIM_CURRENT_CONDITIONS_TEXT],
  6: [PRIM.PRIM_UV_DAILY_TEXT],
  107: [PRIM.PRIM_UV_CURRENT_TEXT],
  7: [PRIM.PRIM_RAIN_CHANCE_ICON, PRIM.PRIM_RAIN_CHANCE_TEXT],
  8: [PRIM.PRIM_HUMIDITY_ICON, PRIM.PRIM_HUMIDITY_TEXT],
  9: [PRIM.PRIM_WIND_SPEED_ICON, PRIM.PRIM_WIND_SPEED_TEXT],
  14: [PRIM.PRIM_VISIBILITY_ICON, PRIM.PRIM_VISIBILITY_TEXT],
  15: [PRIM.PRIM_CLOUD_COVER_ICON, PRIM.PRIM_CLOUD_COVER_TEXT],
  31: [PRIM.PRIM_WEATHER_CONDITION_ICON],
  32: [PRIM.PRIM_WEATHER_CONDITION_ICON, PRIM.PRIM_CURRENT_TEMP_TEXT],
  34: [PRIM.PRIM_PRESSURE_TREND_ICON, PRIM.PRIM_PRESSURE_TEXT],
  35: [PRIM.PRIM_WIND_DIRECTION_ICON, PRIM.PRIM_WIND_DIRECTION_TEXT],
  36: [PRIM.PRIM_AQI_TEXT],
  37: [PRIM.PRIM_HUMIDITY_ICON, PRIM.PRIM_DEW_POINT_TEXT],
  38: [PRIM.PRIM_ALTITUDE_ICON, PRIM.PRIM_ALTITUDE_TEXT],
  76: [PRIM.PRIM_WEATHER_CONDITION_ICON, PRIM.PRIM_CURRENT_TEMP_TEXT, PRIM.PRIM_SPACE,
       PRIM.PRIM_LABEL_HIGH_PREFIX, PRIM.PRIM_TEMP_HIGH_TEXT, PRIM.PRIM_SPACE,
       PRIM.PRIM_LABEL_LOW_PREFIX, PRIM.PRIM_TEMP_LOW_TEXT],
  96: [PRIM.PRIM_WEATHER_LAST_UPDATE_LONG_TEXT],
  97: [PRIM.PRIM_WEATHER_REFRESH_ICON, PRIM.PRIM_WEATHER_LAST_UPDATE_SHORT_TEXT],
  87: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  88: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  89: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  90: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  91: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  92: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  93: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  94: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],
  95: [PRIM.PRIM_FORECAST_OFFSET_ICON, PRIM.PRIM_FORECAST_TEMP_TEXT],

  100: [PRIM.PRIM_HEART_RATE_ICON, PRIM.PRIM_HEART_RATE_VALUE, PRIM.PRIM_STEPS_ICON, PRIM.PRIM_STEPS_VALUE],
  102: [PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_BLUETOOTH_ICON],
  103: [PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_BATTERY_PCT_TEXT, PRIM.PRIM_BLUETOOTH_ICON],
  105: [PRIM.PRIM_WEEKDAY_SHORT_MIXED, PRIM.PRIM_SPACE, PRIM.PRIM_DAY_OF_MONTH, PRIM.PRIM_SPACE,
        PRIM.PRIM_MONTH_SHORT_MIXED, PRIM.PRIM_SUN_EVENT_ICON, PRIM.PRIM_SUN_EVENT_TIME],
  112: [PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_BLUETOOTH_ICON, PRIM.PRIM_QUIET_TIME_ICON],
  113: [PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_BATTERY_PCT_TEXT, PRIM.PRIM_QUIET_TIME_PLAIN_ICON,
        PRIM.PRIM_QUIET_TIME_STATUS_TEXT, PRIM.PRIM_BLUETOOTH_ICON, PRIM.PRIM_BLUETOOTH_ONOFF_TEXT],
  118: [PRIM.PRIM_BATTERY_ICON, PRIM.PRIM_BATTERY_PCT_TEXT, PRIM.PRIM_BLUETOOTH_ICON, PRIM.PRIM_QUIET_TIME_ICON]
};

for (var tzContentId = 44; tzContentId <= 62; tzContentId++) {
  PRIMITIVE_TRANSPORT_SEQUENCES[tzContentId] = [
    PRIM.PRIM_TIMEZONE_ABBR, PRIM.PRIM_SPACE, PRIM.PRIM_TIMEZONE_TIME, PRIM.PRIM_SPACE, PRIM.PRIM_TIMEZONE_AMPM
  ];
}

var PRIMITIVE_TRANSPORT_AUX = {};
for (var tzAuxContentId = 44; tzAuxContentId <= 62; tzAuxContentId++) {
  var zoneIdx = tzAuxContentId - 44;
  PRIMITIVE_TRANSPORT_AUX[tzAuxContentId] = [zoneIdx, 0, zoneIdx, 0, zoneIdx, 0, 0, 0, 0, 0];
}

for (var fcContentId = 87; fcContentId <= 95; fcContentId++) {
  var fcIdx = fcContentId - 87;
  PRIMITIVE_TRANSPORT_AUX[fcContentId] = [fcIdx, fcIdx, 0, 0, 0, 0, 0, 0, 0, 0];
}

var PLUGIN_CONTENT_FIRST = 200;
var PLUGIN_SLOT_COUNT = 12;
for (var plugSlot = 0; plugSlot < PLUGIN_SLOT_COUNT; plugSlot++) {
  PRIMITIVE_TRANSPORT_SEQUENCES[PLUGIN_CONTENT_FIRST + plugSlot] = [PRIM.PRIM_PLUGIN_TEXT];
  PRIMITIVE_TRANSPORT_AUX[PLUGIN_CONTENT_FIRST + plugSlot] = [plugSlot, 0, 0, 0, 0, 0, 0, 0, 0, 0];
}

var PRIMITIVE_SEQUENCE_SLOT_COUNT = 10;
var PRIMITIVE_TRANSPORT_CONTENT_IDS = Object.keys(PRIMITIVE_TRANSPORT_SEQUENCES).map(Number);

function primitiveIdSequenceForContent(contentId) {
  var seq = PRIMITIVE_TRANSPORT_SEQUENCES[parseInt(contentId, 10)] || [];
  var out = seq.slice(0, PRIMITIVE_SEQUENCE_SLOT_COUNT);
  while (out.length < PRIMITIVE_SEQUENCE_SLOT_COUNT) out.push(0);
  return out;
}

function primitiveAuxSequenceForContent(contentId) {
  var aux = PRIMITIVE_TRANSPORT_AUX[parseInt(contentId, 10)] || [];
  var out = aux.slice(0, PRIMITIVE_SEQUENCE_SLOT_COUNT);
  while (out.length < PRIMITIVE_SEQUENCE_SLOT_COUNT) out.push(0);
  return out;
}

function normalizePrimitiveSequence(ids) {
  var out = (ids || []).slice(0, PRIMITIVE_SEQUENCE_SLOT_COUNT);
  while (out.length < PRIMITIVE_SEQUENCE_SLOT_COUNT) out.push(0);
  return out;
}

var PRIMITIVE_PALETTE = [
  { group: 'Spacers', items: [
    { id: PRIM.PRIM_SPACE, label: 'Space' },
    { id: PRIM.PRIM_SLASH, label: 'Slash (/)' },
    { id: PRIM.PRIM_DASH, label: 'Dash (-)' },
    { id: PRIM.PRIM_PAREN_OPEN, label: 'Parenthesis open "("' },
    { id: PRIM.PRIM_PAREN_CLOSE, label: 'Parenthesis close ")"' },
    { id: PRIM.PRIM_DOT, label: 'Dot (.)' },
    { id: PRIM.PRIM_COMMA, label: 'Comma (,)' }
  ]},
  { group: 'Date & time', items: [
    { id: PRIM.PRIM_WEEKDAY_SHORT_MIXED, label: 'Weekday (Mon)' },
    { id: PRIM.PRIM_WEEKDAY_SHORT_UPPER, label: 'Weekday (MON)' },
    { id: PRIM.PRIM_WEEKDAY_LONG, label: 'Weekday (Monday)' },
    { id: PRIM.PRIM_MONTH_SHORT_UPPER, label: 'Month (SEP)' },
    { id: PRIM.PRIM_MONTH_SHORT_MIXED, label: 'Month (Sep)' },
    { id: PRIM.PRIM_MONTH_LONG, label: 'Month (September)' },
    { id: PRIM.PRIM_DAY_OF_MONTH, label: 'Day of month' },
    { id: PRIM.PRIM_MONTH_NUMBER, label: 'Month number' },
    { id: PRIM.PRIM_YEAR_FULL, label: 'Year (2026)' },
    { id: PRIM.PRIM_YEAR_SHORT, label: 'Year (26)' },
    { id: PRIM.PRIM_LABEL_WK_PREFIX, label: '"WK" label' },
    { id: PRIM.PRIM_WEEK_NUMBER, label: 'Week number' }
  ]},
  { group: 'Time zone', items: [
    { id: PRIM.PRIM_TIMEZONE_ABBR, label: 'Zone name (LON)', param: 'timezone' },
    { id: PRIM.PRIM_TIMEZONE_TIME, label: 'Zone time', param: 'timezone' },
    { id: PRIM.PRIM_TIMEZONE_AMPM, label: 'Zone AM/PM', param: 'timezone' }
  ]},
  { group: 'Clock', items: [
    { id: PRIM.PRIM_TIME_HM, label: 'Time (H:MM)' },
    { id: PRIM.PRIM_TIME_HMS, label: 'Time with seconds' },
    { id: PRIM.PRIM_HOUR_24_PAD, label: 'Hour (24h, padded)' },
    { id: PRIM.PRIM_HOUR_24, label: 'Hour (24h)' },
    { id: PRIM.PRIM_HOUR_12, label: 'Hour (12h)' },
    { id: PRIM.PRIM_MINUTE, label: 'Minute' },
    { id: PRIM.PRIM_MINUTE_PAD, label: 'Minute (padded)' },
    { id: PRIM.PRIM_SECOND, label: 'Second' },
    { id: PRIM.PRIM_SECOND_PAD, label: 'Second (padded)' },
    { id: PRIM.PRIM_SECOND_TENS, label: 'Second, tens digit' },
    { id: PRIM.PRIM_SECOND_ONES, label: 'Second, ones digit' },
    { id: PRIM.PRIM_AMPM, label: 'AM/PM' }
  ]},
  { group: 'Weather', items: [
    { id: PRIM.PRIM_WEATHER_CONDITION_ICON, label: 'Weather icon' },
    { id: PRIM.PRIM_CURRENT_TEMP_TEXT, label: 'Current temp' },
    { id: PRIM.PRIM_TEMP_HIGH_TEXT, label: 'Daily high temp' },
    { id: PRIM.PRIM_TEMP_LOW_TEXT, label: 'Daily low temp' },
    { id: PRIM.PRIM_FEELS_LIKE_VALUE, label: 'Feels-like temp' },
    { id: PRIM.PRIM_DEW_POINT_TEXT, label: 'Dew point' },
    { id: PRIM.PRIM_TEMP_UNIT_TEXT, label: 'Temp unit (C/F/K)' },
    { id: PRIM.PRIM_CURRENT_CONDITIONS_TEXT, label: 'Condition text' },
    { id: PRIM.PRIM_UV_DAILY_VALUE, label: 'UV index (daily max)' },
    { id: PRIM.PRIM_UV_CURRENT_VALUE, label: 'UV index (current)' },
    { id: PRIM.PRIM_RAIN_CHANCE_ICON, label: 'Rain chance icon' },
    { id: PRIM.PRIM_RAIN_CHANCE_TEXT, label: 'Rain chance %' },
    { id: PRIM.PRIM_HUMIDITY_ICON, label: 'Humidity icon' },
    { id: PRIM.PRIM_HUMIDITY_TEXT, label: 'Humidity %' },
    { id: PRIM.PRIM_WIND_SPEED_ICON, label: 'Wind speed icon' },
    { id: PRIM.PRIM_WIND_SPEED_TEXT, label: 'Wind speed' },
    { id: PRIM.PRIM_WIND_UNIT_TEXT, label: 'Wind unit (km/h, mph...)' },
    { id: PRIM.PRIM_WIND_DIRECTION_ICON, label: 'Wind direction icon' },
    { id: PRIM.PRIM_WIND_DIRECTION_TEXT, label: 'Wind direction' },
    { id: PRIM.PRIM_VISIBILITY_ICON, label: 'Visibility icon' },
    { id: PRIM.PRIM_VISIBILITY_TEXT, label: 'Visibility %' },
    { id: PRIM.PRIM_CLOUD_COVER_ICON, label: 'Cloud cover icon' },
    { id: PRIM.PRIM_CLOUD_COVER_TEXT, label: 'Cloud cover %' },
    { id: PRIM.PRIM_PRESSURE_TREND_ICON, label: 'Pressure trend icon' },
    { id: PRIM.PRIM_PRESSURE_VALUE, label: 'Pressure' },
    { id: PRIM.PRIM_PRESSURE_UNIT_TEXT, label: 'Pressure unit (hPa)' },
    { id: PRIM.PRIM_AQI_VALUE, label: 'Air quality index' },
    { id: PRIM.PRIM_ALTITUDE_ICON, label: 'Altitude icon' },
    { id: PRIM.PRIM_ALTITUDE_VALUE, label: 'Altitude' },
    { id: PRIM.PRIM_ALTITUDE_UNIT_TEXT, label: 'Altitude unit (m/ft)' },
    { id: PRIM.PRIM_WEATHER_REFRESH_ICON, label: 'Weather refresh icon' },
    { id: PRIM.PRIM_WEATHER_LAST_UPDATE_SHORT_TEXT, label: 'Weather updated (time)' }
  ]},
  { group: 'Forecast', items: [
    { id: PRIM.PRIM_FORECAST_OFFSET_ICON, label: 'Forecast offset icon', param: 'forecast' },
    { id: PRIM.PRIM_FORECAST_TEMP_TEXT, label: 'Forecast temp', param: 'forecast' }
  ]},
  { group: 'Health & status', items: [
    { id: PRIM.PRIM_HEART_RATE_ICON, label: 'Heart rate icon' },
    { id: PRIM.PRIM_HEART_RATE_VALUE, label: 'Heart rate BPM' },
    { id: PRIM.PRIM_STEPS_ICON, label: 'Steps icon' },
    { id: PRIM.PRIM_STEPS_VALUE, label: 'Steps count' },
    { id: PRIM.PRIM_STEP_GOAL_PCT, label: 'Step goal %' },
    { id: PRIM.PRIM_BATTERY_ICON, label: 'Battery icon' },
    { id: PRIM.PRIM_BATTERY_PCT_TEXT, label: 'Battery %' },
    { id: PRIM.PRIM_BATTERY_LOGO_ICON, label: 'Pebble battery logo' },
    { id: PRIM.PRIM_BLUETOOTH_ICON, label: 'Bluetooth icon' },
    { id: PRIM.PRIM_BLUETOOTH_STATUS_TEXT, label: 'Bluetooth status' },
    { id: PRIM.PRIM_BLUETOOTH_ONOFF_TEXT, label: 'Bluetooth ON/OFF' },
    { id: PRIM.PRIM_QUIET_TIME_ICON, label: 'Quiet Time icon (shows state)' },
    { id: PRIM.PRIM_QUIET_TIME_PLAIN_ICON, label: 'Quiet Time icon (plain)' },
    { id: PRIM.PRIM_QUIET_TIME_STATUS_TEXT, label: 'Quiet Time ON/OFF' },
    { id: PRIM.PRIM_SLEEP_TOTAL_ICON, label: 'Sleep icon' },
    { id: PRIM.PRIM_SLEEP_TOTAL_TEXT, label: 'Sleep duration' },
    { id: PRIM.PRIM_SLEEP_RESTFUL_ICON, label: 'Restful sleep icon' },
    { id: PRIM.PRIM_SLEEP_RESTFUL_TEXT, label: 'Restful sleep duration' },
    { id: PRIM.PRIM_SLEEP_QUALITY_ICON, label: 'Sleep quality icon' },
    { id: PRIM.PRIM_SLEEP_QUALITY_PCT, label: 'Sleep quality %' },
    { id: PRIM.PRIM_BED_TIME_ICON, label: 'Bed time icon' },
    { id: PRIM.PRIM_BED_TIME_TEXT, label: 'Bed time' },
    { id: PRIM.PRIM_WAKE_TIME_ICON, label: 'Wake time icon' },
    { id: PRIM.PRIM_WAKE_TIME_TEXT, label: 'Wake time' }
  ]},
  { group: 'Astronomy', items: [
    { id: PRIM.PRIM_MOON_PHASE_ICON, label: 'Moon phase icon' },
    { id: PRIM.PRIM_MOON_PHASE_NAME, label: 'Moon phase name' },
    { id: PRIM.PRIM_SUN_EVENT_ICON, label: 'Sunrise/sunset icon' },
    { id: PRIM.PRIM_SUN_EVENT_TIME, label: 'Next sunrise/sunset time' },
    { id: PRIM.PRIM_PLANETS_VISIBLE_ICON, label: 'Planets icon' },
    { id: PRIM.PRIM_PLANETS_VISIBLE_VALUE, label: 'Planets visible (count)' },
    { id: PRIM.PRIM_NEXT_PLANET_NAME, label: 'Next planet rising (name)' },
    { id: PRIM.PRIM_NEXT_PLANET_TIME, label: 'Next planet rising (time)' },
    { id: PRIM.PRIM_METEOR_SHOWER_NAME, label: 'Meteor shower' },
    { id: PRIM.PRIM_SATURN_RINGS_ICON, label: 'Saturn icon' },
    { id: PRIM.PRIM_SATURN_RINGS_VALUE, label: 'Saturn ring angle %' },
    { id: PRIM.PRIM_ISS_ICON, label: 'ISS icon' },
    { id: PRIM.PRIM_ISS_NEXT_PASS, label: 'Next ISS pass' },
    { id: PRIM.PRIM_AURORA_ICON, label: 'Aurora icon' },
    { id: PRIM.PRIM_AURORA_KP_VALUE, label: 'Aurora Kp index' },
    { id: PRIM.PRIM_COMPASS_ICON, label: 'Compass icon' },
    { id: PRIM.PRIM_COMPASS_DIR_TEXT, label: 'Compass direction' },
    { id: PRIM.PRIM_LOCATION_ICON, label: 'Location icon' },
    { id: PRIM.PRIM_LOCATION_NAME, label: 'Location name' }
  ]},
  { group: 'Text', items: [
    { id: PRIM.PRIM_PLUGIN_TEXT, key: 'customtext', label: 'Custom text', customText: true }
  ]},
  { group: 'Plugins', items: [
    { id: PRIM.PRIM_PLUGIN_TEXT, label: 'Plugin data', param: 'plugin' }
  ]}
];
var PRIMITIVE_LABEL_BY_ID = {};
PRIMITIVE_PALETTE.forEach(function (g) {
  g.items.forEach(function (it) { PRIMITIVE_LABEL_BY_ID[it.id] = it.label; });
});

var TIMEZONE_ZONES = [];
(function () {
  for (var cid = 44; cid <= 62; cid++) {
    var item = CONTENT_ITEM_BY_ID[cid];
    var abbr = item && item.preview ? String(item.preview).split(' ')[0] : ('Z' + (cid - 44));
    TIMEZONE_ZONES.push({ index: cid - 44, label: item ? item.label : ('Zone ' + (cid - 44)), abbr: abbr });
  }
})();

function parseCustomPrimsSetting(raw) {
  var ids = [];
  var aux = [];
  if (!raw) return { ids: ids, aux: aux };
  String(raw).split(',').forEach(function (entry) {
    var parts = entry.split(':');
    var id = parseInt(parts[0], 10);
    if (isNaN(id) || id <= 0 || id > 255) return;
    var a = parts.length > 1 ? parseInt(parts[1], 10) : 0;
    if (isNaN(a) || a < 0 || a > 255) a = 0;
    ids.push(id);
    aux.push(a);
  });
  return { ids: ids, aux: aux };
}

function normalizePrimitiveAux(aux) {
  return normalizePrimitiveSequence(aux);
}

var PRIMITIVE_PREVIEW_TEXT = {};
(function () {
  var t = PRIMITIVE_PREVIEW_TEXT;
  t[PRIM.PRIM_SPACE] = ' ';
  t[PRIM.PRIM_SLASH] = '/';
  t[PRIM.PRIM_DASH] = '-';
  t[PRIM.PRIM_WEEKDAY_SHORT_MIXED] = 'Mon';
  t[PRIM.PRIM_WEEKDAY_SHORT_UPPER] = 'MON';
  t[PRIM.PRIM_WEEKDAY_LONG] = 'Monday';
  t[PRIM.PRIM_MONTH_SHORT_UPPER] = 'SEP';
  t[PRIM.PRIM_MONTH_SHORT_MIXED] = 'Sep';
  t[PRIM.PRIM_MONTH_LONG] = 'September';
  t[PRIM.PRIM_DAY_OF_MONTH] = '15';
  t[PRIM.PRIM_MONTH_NUMBER] = '9';
  t[PRIM.PRIM_YEAR_FULL] = '2026';
  t[PRIM.PRIM_YEAR_SHORT] = '26';
  t[PRIM.PRIM_LABEL_WK_PREFIX] = 'WK';
  t[PRIM.PRIM_WEEK_NUMBER] = '34';
  t[PRIM.PRIM_WEATHER_CONDITION_ICON] = '(weather)';
  t[PRIM.PRIM_CURRENT_TEMP_TEXT] = '22';
  t[PRIM.PRIM_LABEL_HIGH_PREFIX] = 'H';
  t[PRIM.PRIM_TEMP_HIGH_TEXT] = '72';
  t[PRIM.PRIM_LABEL_LOW_PREFIX] = 'L';
  t[PRIM.PRIM_TEMP_LOW_TEXT] = '58';
  t[PRIM.PRIM_CURRENT_TEMP_ONLY_TEXT] = '22C';
  t[PRIM.PRIM_TEMP_HIGH_ONLY_TEXT] = 'H 28C';
  t[PRIM.PRIM_TEMP_LOW_ONLY_TEXT] = 'L 11C';
  t[PRIM.PRIM_FEELS_LIKE_TEXT] = 'FL 20C';
  t[PRIM.PRIM_HEART_RATE_ICON] = '(hr)';
  t[PRIM.PRIM_HEART_RATE_VALUE] = '72';
  t[PRIM.PRIM_STEPS_ICON] = '(steps)';
  t[PRIM.PRIM_STEPS_VALUE] = '8421';
  t[PRIM.PRIM_STEP_GOAL_PCT] = '84%';
  t[PRIM.PRIM_BATTERY_ICON] = '(batt)';
  t[PRIM.PRIM_BATTERY_PCT_TEXT] = '80%';
  t[PRIM.PRIM_BATTERY_LOGO_ICON] = 'LOGO';
  t[PRIM.PRIM_BLUETOOTH_ICON] = '(bt)';
  t[PRIM.PRIM_BLUETOOTH_STATUS_TEXT] = 'BT';
  t[PRIM.PRIM_QUIET_TIME_ICON] = '(quiet)';
  t[PRIM.PRIM_QUIET_TIME_STATUS_TEXT] = 'OFF';
  t[PRIM.PRIM_SLEEP_TOTAL_ICON] = '(sleep)';
  t[PRIM.PRIM_SLEEP_TOTAL_TEXT] = '7h30';
  t[PRIM.PRIM_SLEEP_RESTFUL_ICON] = '(rest)';
  t[PRIM.PRIM_SLEEP_RESTFUL_TEXT] = '2h10';
  t[PRIM.PRIM_SLEEP_QUALITY_ICON] = '(qual)';
  t[PRIM.PRIM_SLEEP_QUALITY_PCT] = '85%';
  t[PRIM.PRIM_BED_TIME_ICON] = '(bed)';
  t[PRIM.PRIM_BED_TIME_TEXT] = '23:10';
  t[PRIM.PRIM_WAKE_TIME_ICON] = '(wake)';
  t[PRIM.PRIM_WAKE_TIME_TEXT] = '06:45';
  t[PRIM.PRIM_QUIET_TIME_PLAIN_ICON] = '(quiet)';
  t[PRIM.PRIM_BLUETOOTH_ONOFF_TEXT] = 'ON';
  t[PRIM.PRIM_MOON_PHASE_ICON] = '(moon)';
  t[PRIM.PRIM_MOON_PHASE_NAME] = 'Full';
  t[PRIM.PRIM_SUN_EVENT_ICON] = '(sun)';
  t[PRIM.PRIM_SUN_EVENT_TIME] = '19:42';
  t[PRIM.PRIM_PLANETS_VISIBLE_ICON] = '(planets)';
  t[PRIM.PRIM_PLANETS_VISIBLE_COUNT] = '3 planets';
  t[PRIM.PRIM_NEXT_PLANET_RISE] = 'VEN 18:32';
  t[PRIM.PRIM_METEOR_SHOWER_NAME] = 'Perseids';
  t[PRIM.PRIM_SATURN_RINGS_ICON] = '(saturn)';
  t[PRIM.PRIM_SATURN_RINGS_PCT] = 'Rings 12%';
  t[PRIM.PRIM_ISS_ICON] = '(iss)';
  t[PRIM.PRIM_ISS_NEXT_PASS] = '22:47';
  t[PRIM.PRIM_AURORA_ICON] = '(aurora)';
  t[PRIM.PRIM_AURORA_KP] = 'Kp 4.3';
  t[PRIM.PRIM_COMPASS_ICON] = '(compass)';
  t[PRIM.PRIM_COMPASS_DIR_TEXT] = 'NNW';
  t[PRIM.PRIM_LOCATION_ICON] = '(pin)';
  t[PRIM.PRIM_LOCATION_NAME] = 'Innsbruck';
  t[PRIM.PRIM_TIME_HM] = '9:41';
  t[PRIM.PRIM_TIME_HMS] = '9:41:07';
  t[PRIM.PRIM_HOUR_24_PAD] = '09';
  t[PRIM.PRIM_HOUR_24] = '9';
  t[PRIM.PRIM_HOUR_12] = '9';
  t[PRIM.PRIM_MINUTE] = '41';
  t[PRIM.PRIM_MINUTE_PAD] = '41';
  t[PRIM.PRIM_SECOND] = '7';
  t[PRIM.PRIM_SECOND_PAD] = '07';
  t[PRIM.PRIM_SECOND_TENS] = '0';
  t[PRIM.PRIM_SECOND_ONES] = '7';
  t[PRIM.PRIM_AMPM] = 'AM';
  t[PRIM.PRIM_CURRENT_CONDITIONS_TEXT] = 'Partly Cloudy';
  t[PRIM.PRIM_UV_DAILY_TEXT] = 'UV6';
  t[PRIM.PRIM_UV_CURRENT_TEXT] = 'UV4';
  t[PRIM.PRIM_RAIN_CHANCE_ICON] = '(rain)';
  t[PRIM.PRIM_RAIN_CHANCE_TEXT] = '20%';
  t[PRIM.PRIM_HUMIDITY_ICON] = '(humid)';
  t[PRIM.PRIM_HUMIDITY_TEXT] = '55%';
  t[PRIM.PRIM_WIND_SPEED_ICON] = '(wind)';
  t[PRIM.PRIM_WIND_SPEED_TEXT] = '12';
  t[PRIM.PRIM_VISIBILITY_ICON] = '(vis)';
  t[PRIM.PRIM_VISIBILITY_TEXT] = '90%';
  t[PRIM.PRIM_CLOUD_COVER_ICON] = '(cloud)';
  t[PRIM.PRIM_CLOUD_COVER_TEXT] = '35%';
  t[PRIM.PRIM_PRESSURE_TREND_ICON] = '(pressure)';
  t[PRIM.PRIM_PRESSURE_TEXT] = '1013 hPa';
  t[PRIM.PRIM_WIND_DIRECTION_ICON] = '(compass)';
  t[PRIM.PRIM_WIND_DIRECTION_TEXT] = 'NW';
  t[PRIM.PRIM_AQI_TEXT] = 'AQI 42';
  t[PRIM.PRIM_DEW_POINT_TEXT] = '14';
  t[PRIM.PRIM_ALTITUDE_ICON] = '(altitude)';
  t[PRIM.PRIM_ALTITUDE_TEXT] = '120m';
  t[PRIM.PRIM_WEATHER_REFRESH_ICON] = '(refresh)';
  t[PRIM.PRIM_WEATHER_LAST_UPDATE_LONG_TEXT] = 'Last updated 09:30';
  t[PRIM.PRIM_WEATHER_LAST_UPDATE_SHORT_TEXT] = '09:30';
  t[PRIM.PRIM_FORECAST_OFFSET_ICON] = '(+Nh)';
  t[PRIM.PRIM_FORECAST_TEMP_TEXT] = '19';
  t[PRIM.PRIM_PAREN_OPEN] = '(';
  t[PRIM.PRIM_PAREN_CLOSE] = ')';
  t[PRIM.PRIM_DOT] = '.';
  t[PRIM.PRIM_COMMA] = ',';
  t[PRIM.PRIM_FEELS_LIKE_VALUE] = '20';
  t[PRIM.PRIM_UV_DAILY_VALUE] = '6';
  t[PRIM.PRIM_UV_CURRENT_VALUE] = '4';
  t[PRIM.PRIM_PRESSURE_VALUE] = '1013';
  t[PRIM.PRIM_AQI_VALUE] = '42';
  t[PRIM.PRIM_ALTITUDE_VALUE] = '120';
  t[PRIM.PRIM_PLANETS_VISIBLE_VALUE] = '3';
  t[PRIM.PRIM_SATURN_RINGS_VALUE] = '12%';
  t[PRIM.PRIM_AURORA_KP_VALUE] = '4.3';
  t[PRIM.PRIM_NEXT_PLANET_NAME] = 'VEN';
  t[PRIM.PRIM_NEXT_PLANET_TIME] = '18:32';
  t[PRIM.PRIM_TEMP_UNIT_TEXT] = 'C';
  t[PRIM.PRIM_WIND_UNIT_TEXT] = 'km/h';
  t[PRIM.PRIM_PRESSURE_UNIT_TEXT] = 'hPa';
  t[PRIM.PRIM_ALTITUDE_UNIT_TEXT] = 'm';
  t[PRIM.PRIM_PLUGIN_TEXT] = 'PLG';
})();

var FORECAST_SLOTS = [
  { index: 0, label: '1 hour ahead' }, { index: 1, label: '2 hours ahead' },
  { index: 2, label: '3 hours ahead' }, { index: 3, label: '4 hours ahead' },
  { index: 4, label: '5 hours ahead' }, { index: 5, label: '6 hours ahead' },
  { index: 9, label: '7 hours ahead' }, { index: 10, label: '8 hours ahead' },
  { index: 11, label: '9 hours ahead' }, { index: 12, label: '10 hours ahead' },
  { index: 13, label: '11 hours ahead' }, { index: 14, label: '12 hours ahead' },
  { index: 6, label: '1 day ahead' }, { index: 7, label: '2 days ahead' },
  { index: 8, label: '3 days ahead' }
];

var PRIM_NAME_BY_ID = {};
Object.keys(PRIM).forEach(function (name) { PRIM_NAME_BY_ID[PRIM[name]] = name; });
var PRIM_PARAM_BY_ID = {};
PRIMITIVE_PALETTE.forEach(function (g) { g.items.forEach(function (it) { if (it.param) PRIM_PARAM_BY_ID[it.id] = it.param; }); });

function primitiveKindForId(id) {
  if (id === PRIM.PRIM_SPACE) return 'space';
  if (id === PRIM.PRIM_SLASH || id === PRIM.PRIM_DASH) return 'slash';
  var name = PRIM_NAME_BY_ID[id] || '';
  if (name.indexOf('PRIM_LABEL_') === 0) return 'label';
  if (name.slice(-5) === '_ICON') return 'icon';
  return 'value';
}

function paramPrimitiveLabel(id, aux) {
  var param = PRIM_PARAM_BY_ID[id];
  if (!param) return undefined;
  if (param === 'timezone') {
    var zone = TIMEZONE_ZONES[aux];
    var zoneText = zone ? (zone.abbr || zone.label.split(' ')[0]) : ('zone ' + aux);
    if (id === PRIM.PRIM_TIMEZONE_TIME) return '12:00';
    if (id === PRIM.PRIM_TIMEZONE_AMPM) return 'PM';
    return zoneText;
  }
  if (param === 'forecast') return PRIMITIVE_PREVIEW_TEXT[id];
  return undefined;
}

function chipsFromSequence(ids, aux) {
  var chips = [];
  for (var i = 0; i < ids.length && ids[i] !== 0; i++) {
    var text = paramPrimitiveLabel(ids[i], aux[i]);
    if (text === undefined) text = PRIMITIVE_PREVIEW_TEXT[ids[i]];
    if (text === undefined) text = '?';
    chips.push({ kind: primitiveKindForId(ids[i]), text: text });
  }
  return chips;
}

function primitiveChipsForContent(contentId) {
  var id = parseInt(contentId, 10);
  if (id === 0) return [];
  if (PRIMITIVE_TRANSPORT_SEQUENCES[id]) {
    return chipsFromSequence(primitiveIdSequenceForContent(id), primitiveAuxSequenceForContent(id));
  }
  var item = CONTENT_ITEM_BY_ID[id];
  if (!item) return [];
  return [value(item.preview || item.label)];
}

module.exports = {
  PRIMITIVE_PREVIEW_TEXT: PRIMITIVE_PREVIEW_TEXT,
  FORECAST_SLOTS: FORECAST_SLOTS,
  TIMEZONE_ZONES: TIMEZONE_ZONES,
  parseCustomPrimsSetting: parseCustomPrimsSetting,
  normalizePrimitiveAux: normalizePrimitiveAux,
  primitiveChipsForContent: primitiveChipsForContent,
  chipsFromSequence: chipsFromSequence,
  primitiveKindForId: primitiveKindForId,
  paramPrimitiveLabel: paramPrimitiveLabel,
  PRIMITIVE_TRANSPORT_CONTENT_IDS: PRIMITIVE_TRANSPORT_CONTENT_IDS,
  PRIMITIVE_TRANSPORT_SEQUENCES: PRIMITIVE_TRANSPORT_SEQUENCES,
  PRIMITIVE_TRANSPORT_AUX: PRIMITIVE_TRANSPORT_AUX,
  primitiveIdSequenceForContent: primitiveIdSequenceForContent,
  primitiveAuxSequenceForContent: primitiveAuxSequenceForContent,
  normalizePrimitiveSequence: normalizePrimitiveSequence,
  PRIMITIVE_PALETTE: PRIMITIVE_PALETTE,
  PRIMITIVE_LABEL_BY_ID: PRIMITIVE_LABEL_BY_ID
};
