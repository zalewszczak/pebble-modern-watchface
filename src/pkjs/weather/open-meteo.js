// ---- Open-Meteo provider ---------------------------------------------
//
// Primary
// weather source: free, no API key, global hourly forecast. Used
// unconditionally, unlike OpenWeatherMap (opt-in, needs a user-supplied
// key) -- see weather.js's getCloudOutlook() for how the two combine.

var xhrGetJSON = require('./http').xhrGetJSON;
var conditionFromWmoCode = require('./weather-normalize').conditionFromWmoCode;
var weatherDetailClass = require('./weather-normalize').weatherDetailClass;

// Average hourly cloud-cover (%) across the hours spanning
// [fromDate, toDate], from Open-Meteo's hourly forecast.
function fetchOpenMeteo(lat, lon, fromDate, toDate, cb) {
  var url = 'https://api.open-meteo.com/v1/forecast' +
            '?latitude=' + encodeURIComponent(lat) +
            '&longitude=' + encodeURIComponent(lon) +
            '&hourly=cloudcover' +
            '&timezone=auto' +
            '&forecast_days=2';
  xhrGetJSON(url, 8000, function (err, json) {
    if (err) return cb(err);
    try {
      var times = json.hourly.time;
      var clouds = json.hourly.cloudcover;
      var sum = 0, n = 0;
      for (var i = 0; i < times.length; i++) {
        var t = new Date(times[i]).getTime();
        if (t >= fromDate.getTime() - 3600000 && t <= toDate.getTime() + 3600000) {
          sum += clouds[i];
          n++;
        }
      }
      if (n === 0) return cb(new Error('no matching hours'));
      cb(null, Math.round(sum / n));
    } catch (e) {
      cb(e);
    }
  });
}

/**
 * Current-conditions snapshot from Open-Meteo (one request, hourly +
 * daily + current_weather): condition, temperatures, UV, rain chance,
 * humidity, wind, dew point, pressure and trend, cloud cover and the
 * 1-6 hour / 1-3 day forecast arrays.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {Date} nowDate  which hour counts as "current"
 * @param {function(Error|null, object)} cb  extras object (empty
 *   defaults on error); see emptyExtras below for the field list.
 */
function getWeatherSnapshot(lat, lon, nowDate, cb) {
  var url = 'https://api.open-meteo.com/v1/forecast' +
            '?latitude=' + encodeURIComponent(lat) +
            '&longitude=' + encodeURIComponent(lon) +
            '&hourly=cloudcover,weathercode,cloudcover_low,cloudcover_mid,cloudcover_high,precipitation_probability,relativehumidity_2m,dewpoint_2m,surface_pressure,temperature_2m,uv_index' +
            '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,weathercode' +
            '&current_weather=true' +
            '&timezone=auto' +
            '&forecast_days=4';
  var emptyExtras = {
    sunrise: null, sunset: null, condition: 0, tempC: null, tempHighC: null, tempLowC: null,
    cloudAltitudePct: 50, uvIndexMax: null, uvIndexCurrent: null, rainChancePct: null, humidityPct: null, windSpeedKmh: null,
    currentCloudPct: null, windDirDeg: null, dewPointC: null, pressureHpa: null, pressureTrend: 0,
    forecastTempC: [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    forecastCondition: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    forecastWx: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    wxNow: 0,
    forecastRainPct: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  };
  xhrGetJSON(url, 8000, function (err, json) {
    if (err) return cb(err, emptyExtras);
    try {
      var hourlyTimes = json.hourly.time.map(function (s) { return new Date(s).getTime(); });
      var hourlyClouds = json.hourly.cloudcover;
      var hourlyCodes = json.hourly.weathercode || [];

      function nearestIdx(target) {
        var bestIdx = 0, bestDiff = Infinity;
        for (var i = 0; i < hourlyTimes.length; i++) {
          var diff = Math.abs(hourlyTimes[i] - target);
          if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
        }
        return bestIdx;
      }

      var nowIdx = nearestIdx(nowDate.getTime());
      // Same source and same "now" index the CLOUD_SAMPLES grid itself
      // interpolates from -- keeping this consistent with what's
      // actually drawn matters more here than an OWM-blended headline
      // figure would, since that one covers a different time window
      // (the next 3 hours) and can legitimately
      // disagree with the current-hour reading.
      var currentCloudPct = (typeof hourlyClouds[nowIdx] === 'number') ? Math.round(hourlyClouds[nowIdx]) : null;

      var wxNow = weatherDetailClass((hourlyCodes.length > nowIdx && typeof hourlyCodes[nowIdx] === 'number') ? hourlyCodes[nowIdx] : -1,
        (typeof currentCloudPct === 'number') ? currentCloudPct : 0);
      var condition = 0;
      if (hourlyCodes.length > 0) {
        condition = conditionFromWmoCode(hourlyCodes[nowIdx]);
      }

      var tempC = null, windSpeedKmh = null, windDirDeg = null;
      if (json.current_weather) {
        if (typeof json.current_weather.temperature === 'number') tempC = json.current_weather.temperature;
        if (typeof json.current_weather.windspeed === 'number') windSpeedKmh = json.current_weather.windspeed;
        if (typeof json.current_weather.winddirection === 'number') windDirDeg = json.current_weather.winddirection;
      }

      var humidityPct = null;
      if (json.hourly.relativehumidity_2m && typeof json.hourly.relativehumidity_2m[nowIdx] === 'number') {
        humidityPct = json.hourly.relativehumidity_2m[nowIdx];
      }

      var dewPointC = null;
      if (json.hourly.dewpoint_2m && typeof json.hourly.dewpoint_2m[nowIdx] === 'number') {
        dewPointC = json.hourly.dewpoint_2m[nowIdx];
      }

      // This-hour UV index, as opposed to uv_index_max below (today's
      // whole-day peak) -- same nowIdx the rest of the hourly block
      // already uses for "right now".
      var uvIndexCurrent = null;
      if (json.hourly.uv_index && typeof json.hourly.uv_index[nowIdx] === 'number') {
        uvIndexCurrent = json.hourly.uv_index[nowIdx];
      }

      // Pressure trend: compare now vs. 3 hours ago (a standard
      // meteorological window) -- clamped to the start of the array so
      // this doesn't go negative in the first few hours of the day.
      var pressureHpa = null, pressureTrend = 0;
      if (json.hourly.surface_pressure && typeof json.hourly.surface_pressure[nowIdx] === 'number') {
        pressureHpa = json.hourly.surface_pressure[nowIdx];
        var pastIdx = Math.max(0, nowIdx - 3);
        var pastPressure = json.hourly.surface_pressure[pastIdx];
        if (typeof pastPressure === 'number') {
          var delta = pressureHpa - pastPressure;
          if (delta > 1) pressureTrend = 1; // rising
          else if (delta < -1) pressureTrend = 2; // falling
          else pressureTrend = 0; // flat
        }
      }

      var cloudAltitudePct = 50;
      if (json.hourly.cloudcover_low && json.hourly.cloudcover_mid && json.hourly.cloudcover_high) {
        var low = json.hourly.cloudcover_low[nowIdx] || 0;
        var mid = json.hourly.cloudcover_mid[nowIdx] || 0;
        var high = json.hourly.cloudcover_high[nowIdx] || 0;
        var total = low + mid + high;
        if (total > 0) {
          cloudAltitudePct = Math.round((mid * 50 + high * 100) / total);
        }
      }

      // "Weather in 1-6 hours" content (features_layer.c ids 87-92) --
      // temperature_2m/weathercode at nowIdx+1..nowIdx+12 (indices 0-5 and 9-14).
      // forecast_days=4 gives 96 hourly points starting at hour 0 of
      // today, comfortably covering nowIdx+6 even late in the day --
      // guarded per-index below anyway rather than assumed safe.
      // Slots: 0-5 = 1-6 h ahead, 6-8 = 1-3 days ahead, 9-14 = 7-12 h ahead
      // (the hour slots past six were added later, so they come after the
      // day slots to keep the original indices stable).
      var forecastTempC = [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null];
      var forecastCondition = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var forecastWx = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var forecastRainPct = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var hourlyRain = json.hourly.precipitation_probability;
      var hourlyCloud = json.hourly.cloudcover;
      var hourlyTemps = json.hourly.temperature_2m;
      for (var fh = 0; fh < 12; fh++) {
        var fIdx = nowIdx + 1 + fh;
        var slot = fh < 6 ? fh : 9 + (fh - 6);
        if (hourlyTemps && typeof hourlyTemps[fIdx] === 'number') {
          forecastTempC[slot] = Math.round(hourlyTemps[fIdx]);
        }
        var fCloud = (hourlyCloud && typeof hourlyCloud[fIdx] === 'number') ? hourlyCloud[fIdx] : 0;
        if (hourlyCodes && hourlyCodes.length > fIdx) forecastWx[slot] = weatherDetailClass(hourlyCodes[fIdx], fCloud);
        else forecastWx[slot] = weatherDetailClass(-1, fCloud);
        if (hourlyRain && typeof hourlyRain[fIdx] === 'number') forecastRainPct[slot] = Math.max(0, Math.min(100, Math.round(hourlyRain[fIdx])));
        if (hourlyCodes && hourlyCodes.length > fIdx) {
          forecastCondition[slot] = conditionFromWmoCode(hourlyCodes[fIdx]);
        }
      }

      var sunrise = null, sunset = null, tempHighC = null, tempLowC = null, uvIndexMax = null, rainChancePct = null;
      if (json.daily) {
        if (json.daily.sunrise && json.daily.sunrise[0]) sunrise = new Date(json.daily.sunrise[0]);
        if (json.daily.sunset && json.daily.sunset[0]) sunset = new Date(json.daily.sunset[0]);
        if (json.daily.temperature_2m_max && typeof json.daily.temperature_2m_max[0] === 'number') {
          tempHighC = json.daily.temperature_2m_max[0];
        }
        if (json.daily.temperature_2m_min && typeof json.daily.temperature_2m_min[0] === 'number') {
          tempLowC = json.daily.temperature_2m_min[0];
        }
        if (json.daily.uv_index_max && typeof json.daily.uv_index_max[0] === 'number') {
          uvIndexMax = json.daily.uv_index_max[0];
        }
        if (json.daily.precipitation_probability_max && typeof json.daily.precipitation_probability_max[0] === 'number') {
          rainChancePct = json.daily.precipitation_probability_max[0];
        }

        // "Weather in 1-3 days" content (features_layer.c ids 93-95) --
        // same forecastTempC/forecastCondition arrays as the hours above,
        // just continuing on at indices 6-8 (content id - 87 either way),
        // rather than a second pair of arrays and a second wire message
        // for what's structurally identical data. Daily max temp/weathercode
        // at daily index 1..3 (index 0 is today, already used above for
        // tempHighC/tempLowC).
        for (var fd = 0; fd < 3; fd++) {
          var dIdx = fd + 1;
          if (json.daily.temperature_2m_max && typeof json.daily.temperature_2m_max[dIdx] === 'number') {
            forecastTempC[6 + fd] = Math.round(json.daily.temperature_2m_max[dIdx]);
          }
          if (json.daily.weathercode && typeof json.daily.weathercode[dIdx] === 'number') {
            forecastCondition[6 + fd] = conditionFromWmoCode(json.daily.weathercode[dIdx]);
          }
        }
      }

      cb(null, {
        sunrise: sunrise, sunset: sunset, condition: condition,
        tempC: tempC, tempHighC: tempHighC, tempLowC: tempLowC,
        cloudAltitudePct: cloudAltitudePct, uvIndexMax: uvIndexMax, uvIndexCurrent: uvIndexCurrent,
        rainChancePct: rainChancePct, humidityPct: humidityPct, windSpeedKmh: windSpeedKmh,
        currentCloudPct: currentCloudPct, windDirDeg: windDirDeg, dewPointC: dewPointC,
        pressureHpa: pressureHpa, pressureTrend: pressureTrend,
        forecastTempC: forecastTempC, forecastCondition: forecastCondition,
        forecastWx: forecastWx, forecastRainPct: forecastRainPct, wxNow: wxNow
      });
    } catch (e) {
      cb(e, emptyExtras);
    }
  });
}

module.exports = {
  fetchOpenMeteo: fetchOpenMeteo,
  getWeatherSnapshot: getWeatherSnapshot
};
