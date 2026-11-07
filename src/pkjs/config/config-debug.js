// Service-status and raw-message debug controls
var esc = require('./config-template').esc;
var servicelog = require('../servicelog.js');

function serviceStatusRowsHtml(current) {
  var logs = (current && current.serviceLogs) || {};
  return servicelog.SERVICES.map(function (service) {
    var label = servicelog.SERVICE_LABELS[service] || service;
    var status = (logs[service] && logs[service].status) || 'gray';
    var infoBtn = (status === 'yellow' || status === 'red')
      ? '<button type="button" class="service-info-btn" onclick="openServiceLog(\'' + service + '\', \'' + esc(label) + '\')" title="Last 10 results">i</button>'
      : '';
    return (
'    <div class="service-status-row">' +
'      <span class="service-dot service-dot-' + status + '"></span>' +
'      <span class="service-name">' + esc(label) + '</span>' +
      infoBtn +
'    </div>'
    );
  }).join('');
}

function rawMessageLogButtonsHtml(current) {
  var entries = (current && current.rawMessageLog) || [];
  if (entries.length === 0) {
    return '<div class="help">Nothing sent yet this session -- send/save something first.</div>';
  }
  var buttons = entries.map(function (e, i) {
    var d = new Date(e.t);
    function pad(n, len) { var s = String(n); while (s.length < (len || 2)) s = '0' + s; return s; }
    var label = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '.' + pad(d.getMilliseconds(), 3) +
      ' chunk ' + e.batchIndex + '/' + e.batchTotal;
    return { i: i, label: label };
  }).reverse();
  return '<div class="raw-log-btn-grid" id="rawLogBtnGrid">' +
    buttons.map(function (b) {
      return '<button type="button" class="raw-log-btn" id="rawLogBtn' + b.i + '" onclick="loadRawMessage(' + b.i + ')">' + esc(b.label) + '</button>';
    }).join('') +
    '</div>';
}

function fakeWeatherDefaults(current) {
  var seed = {};
  try {
    var parsed = JSON.parse(current && current.fullKeysetJson ? current.fullKeysetJson : '{}');
    if (parsed && typeof parsed === 'object') seed = parsed;
  } catch (e) {
  }
  function num(key, fallback) {
    return (typeof seed[key] === 'number' && !isNaN(seed[key])) ? seed[key] : fallback;
  }
  return {
    condition: num('WEATHER_CONDITION', 0),
    cloudCover: num('CLOUD_COVER', 20),
    visScore: num('VIS_SCORE', 80),
    cloudAltitude: num('CLOUD_ALTITUDE_PCT', 50),
    tempC: num('WEATHER_TEMP_C', 15),
    tempHighC: num('WEATHER_TEMP_HIGH_C', 20),
    tempLowC: num('WEATHER_TEMP_LOW_C', 10),
    uvMaxX10: num('UV_INDEX_X10', 30),
    uvCurrentX10: num('UV_INDEX_CURRENT_X10', 20),
    rainChance: num('RAIN_CHANCE_PCT', 10),
    humidity: num('HUMIDITY_PCT', 50),
    windSpeed: num('WIND_SPEED_KMH', 10),
    windDir: num('WIND_DIR_DEG', 180),
    dewPoint: num('DEW_POINT_C', 8),
    pressure: num('PRESSURE_HPA', 1013),
    pressureTrend: num('PRESSURE_TREND', 0),
    aqiUs: num('AQI_US', 30),
    aqiEu: num('AQI_EU', 15)
  };
}

function wxSlider(id, label, min, max, value, format, extraOninput) {
  return (
'      <div class="slider-row">' +
'        <label for="' + id + '">' + esc(label) + ' <span class="val" id="' + id + 'Val">' + esc(String(value)) + '</span></label>' +
'        <input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="1" value="' + esc(String(value)) + '" ' +
          'oninput="document.getElementById(\'' + id + 'Val\').textContent = ' + format + ';' + (extraOninput || '') + '">' +
'      </div>'
  );
}

function fakeWeatherPanelHtml(current) {
  var d = fakeWeatherDefaults(current);
  return (
'    <div class="subsection">' +
'      <div class="field-label-row"><label>Fake weather</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-fakeWeather\')">?</button></div>' +
'      <div class="help" id="help-fakeWeather" style="display:none;">Spoofs the current weather reading to preview how conditions draw (background effects, weather icons, complication slots), independent of the FAQ/keyset checks a real fetch goes through. \"Send fake weather now\" closes this page and sends only these fields to the watch immediately -- nothing here is saved, and no other data is affected.</div>' +

'      <label for="fakeWxCondition">Condition</label>' +
'      <select id="fakeWxCondition" style="width:100%;">' +
'        <option value="0"' + (d.condition === 0 ? ' selected' : '') + '>Clear / cloudy (by cloud cover below)</option>' +
'        <option value="1"' + (d.condition === 1 ? ' selected' : '') + '>Fog</option>' +
'        <option value="2"' + (d.condition === 2 ? ' selected' : '') + '>Rain / drizzle</option>' +
'        <option value="3"' + (d.condition === 3 ? ' selected' : '') + '>Snow</option>' +
'        <option value="4"' + (d.condition === 4 ? ' selected' : '') + '>Thunderstorm</option>' +
'      </select>' +
'      <div class="help">Fog/rain/snow/storm always draw their own icon and background effect regardless of cloud cover; leave on \"Clear / cloudy\" to let cloud cover below pick sunny/partly-cloudy/overcast instead.</div>' +

      wxSlider('fakeWxCloudCover', 'Cloud cover', 0, 100, d.cloudCover, "this.value + '%'") +
      wxSlider('fakeWxCloudAltitude', 'Cloud altitude', 0, 100, d.cloudAltitude, "this.value + '%'") +
      wxSlider('fakeWxVisScore', 'Visibility score', 0, 100, d.visScore, "this.value + '%'") +

      wxSlider('fakeWxTempC', 'Temperature', -40, 50, d.tempC, "this.value + '\\u00b0C'") +
      wxSlider('fakeWxTempHighC', 'High temperature', -40, 50, d.tempHighC, "this.value + '\\u00b0C'") +
      wxSlider('fakeWxTempLowC', 'Low temperature', -40, 50, d.tempLowC, "this.value + '\\u00b0C'") +
      wxSlider('fakeWxDewPoint', 'Dew point', -40, 50, d.dewPoint, "this.value + '\\u00b0C'") +

      wxSlider('fakeWxUvMax', "Today's max UV index", 0, 150, d.uvMaxX10, "(this.value / 10).toFixed(1)") +
      wxSlider('fakeWxUvCurrent', 'Current UV index', 0, 150, d.uvCurrentX10, "(this.value / 10).toFixed(1)") +
      wxSlider('fakeWxRainChance', 'Rain chance', 0, 100, d.rainChance, "this.value + '%'") +
      wxSlider('fakeWxHumidity', 'Humidity', 0, 100, d.humidity, "this.value + '%'") +

      wxSlider('fakeWxWindSpeed', 'Wind speed', 0, 200, d.windSpeed, "this.value + ' km/h'") +
      wxSlider('fakeWxWindDir', 'Wind direction', 0, 359, d.windDir,
        "this.value + '\\u00b0 (' + compassLabelForDeg(this.value) + ')'") +

      wxSlider('fakeWxPressure', 'Pressure', 870, 1085, d.pressure, "this.value + ' hPa'") +
'      <label for="fakeWxPressureTrend">Pressure trend</label>' +
'      <select id="fakeWxPressureTrend" style="width:100%;">' +
'        <option value="0"' + (d.pressureTrend === 0 ? ' selected' : '') + '>Flat</option>' +
'        <option value="1"' + (d.pressureTrend === 1 ? ' selected' : '') + '>Rising</option>' +
'        <option value="2"' + (d.pressureTrend === 2 ? ' selected' : '') + '>Falling</option>' +
'      </select>' +

      wxSlider('fakeWxAqiUs', 'AQI (US)', 0, 500, d.aqiUs, "this.value") +
      wxSlider('fakeWxAqiEu', 'AQI (EU)', 0, 150, d.aqiEu, "this.value") +

'      <button type="button" class="secondary-btn" style="width:100%; margin-top:10px;" onclick="sendFakeWeatherToWatch()">Send fake weather now</button>' +
'    </div>'
  );
}

module.exports = {
  serviceStatusRowsHtml: serviceStatusRowsHtml,
  rawMessageLogButtonsHtml: rawMessageLogButtonsHtml,
  fakeWeatherPanelHtml: fakeWeatherPanelHtml
};
