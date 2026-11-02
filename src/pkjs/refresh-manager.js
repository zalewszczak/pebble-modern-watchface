// Data refresh coordination
var astro = require('./astro');
var weather = require('./weather/weather');
var weatherSource = require('./weather/weather-source');
var geocode = require('./geocode');
var iss = require('./iss');
var servicelog = require('./servicelog');
var settings = require('./settings/settings');
var getSetting = settings.getSetting;
var setSetting = settings.setSetting;
var messageEncoder = require('./comms/message-encoder');
var sendInvalid = messageEncoder.sendInvalid;
var sendWeatherData = messageEncoder.sendWeatherData;
var sendFlatDict = messageEncoder.sendFlatDict;

var refreshTimer = null;
var lastBatterySaverPhase = 0;
var lastHourlyRefreshHourKey = null;
var batterySaverHourlyTimer = null;
var s_refreshGeneration = 0;

function parseDateTimeLocal(str) {
  if (!str) return null;
  var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str);
  if (!m) return null;
  return new Date(
    parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10),
    parseInt(m[4], 10), parseInt(m[5], 10), 0, 0
  );
}

function getEffectiveNow() {
  var testMode = getSetting('CONFIG_TEST_MODE', 'false') === 'true';
  if (testMode) {
    var d = parseDateTimeLocal(getSetting('CONFIG_TEST_DATETIME', ''));
    if (d) {
      console.log('modern: TEST MODE active, using ' + d.toString());
      return d;
    }
    console.log('modern: test mode on but no valid test date set, using real time');
  }
  return new Date();
}

var GEOCODE_MOVE_THRESHOLD_DEG = 0.05;

function getLocationName(lat, lon, cb) {
  var cachedLat = parseFloat(getSetting('CACHE_GEOCODE_LAT', ''));
  var cachedLon = parseFloat(getSetting('CACHE_GEOCODE_LON', ''));
  var cachedName = getSetting('CACHE_GEOCODE_NAME', '');

  var moved = isNaN(cachedLat) || isNaN(cachedLon) ||
    Math.abs(cachedLat - lat) > GEOCODE_MOVE_THRESHOLD_DEG ||
    Math.abs(cachedLon - lon) > GEOCODE_MOVE_THRESHOLD_DEG;

  if (!moved && cachedName) {
    cb(cachedName);
    return;
  }

  geocode.reverseGeocode(lat, lon, function (err, name) {
    servicelog.recordAttempt('geocode', err);
    if (err) {
      console.log('modern: reverse geocode failed - ' + err.message);
      cb(cachedName || '');
      return;
    }
    setSetting('CACHE_GEOCODE_LAT', String(lat));
    setSetting('CACHE_GEOCODE_LON', String(lon));
    setSetting('CACHE_GEOCODE_NAME', name);
    cb(name);
  });
}

function getLocation(cb) {
  var autoLoc = getSetting('CONFIG_AUTO_LOC', 'true') !== 'false';

  if (!autoLoc) {
    var lat = parseFloat(getSetting('CONFIG_LAT', ''));
    var lon = parseFloat(getSetting('CONFIG_LON', ''));
    if (!isNaN(lat) && !isNaN(lon)) {
      cb(null, lat, lon, null);
      return;
    }
    console.log('modern: manual location selected but not set yet, falling back to GPS');
  }

  if (!navigator.geolocation) {
    cb(new Error('no geolocation available'));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (pos) {
      cb(null, pos.coords.latitude, pos.coords.longitude, pos.coords.altitude);
    },
    function (err) {
      var reason = 'unknown (' + err.code + ')';
      if (err.code === 1) reason = 'permission denied -- check the location permission for this app on your phone';
      else if (err.code === 2) reason = 'position unavailable -- no GPS/network fix';
      else if (err.code === 3) reason = 'timed out waiting for a GPS fix';
      cb(new Error('geolocation failed: ' + reason));
    },
    { timeout: 15000, maximumAge: 600000, enableHighAccuracy: false }
  );
}

function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLon = (lon2 - lon1) * Math.PI / 180;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function markRefreshDone(lat, lon) {
  setSetting('CACHE_LAST_FETCH_TS', String(Date.now()));
  setSetting('CACHE_LAST_FETCH_LAT', String(lat));
  setSetting('CACHE_LAST_FETCH_LON', String(lon));
}

function shouldSkipRefresh(lat, lon) {
  var lastTs = parseInt(getSetting('CACHE_LAST_FETCH_TS', '0'), 10);
  var lastLat = parseFloat(getSetting('CACHE_LAST_FETCH_LAT', ''));
  var lastLon = parseFloat(getSetting('CACHE_LAST_FETCH_LON', ''));
  if (!lastTs || isNaN(lastLat) || isNaN(lastLon)) return false;

  var mins = parseInt(getSetting('CONFIG_UPDATE_MINS', '20'), 10);
  if (isNaN(mins) || mins < 5) mins = 20;
  if (Date.now() - lastTs >= mins * 60000) return false;

  return haversineKm(lat, lon, lastLat, lastLon) < 10;
}

function resendLastFullData() {
  try {
    var raw = localStorage.getItem('LAST_FULL_COMPUTED_DICT');
    if (!raw) return false;
    var dict = JSON.parse(raw);
    if (!dict || typeof dict !== 'object') return false;
    sendFlatDict(dict);
    return true;
  } catch (e) {
    return false;
  }
}

function fetchIssIfEnabled(lat, lon, cb) {
  var nextPassInUse = AQI_SLOT_CONTENT_KEYS.some(function (key) { return getSetting(key, '0') === '83'; });
  if (!nextPassInUse) {
    return cb(null, 0);
  }
  iss.getIssPosition(lat, lon, function (err, pos) {
    var cls = servicelog.recordAttempt('iss', err);
    if (err) {
      console.log('modern: ISS fetch failed - ' + err.message);
      return cb(null, cls.code);
    }
    cb(pos, 0);
  });
}

var AQI_SLOT_CONTENT_KEYS = ['CONFIG_CORNER_TL', 'CONFIG_CORNER_TR',
  'CONFIG_CORNER_BL', 'CONFIG_CORNER_BR',
  'CONFIG_UPPER_MIDDLE_LINE1_CONTENT', 'CONFIG_UPPER_MIDDLE_LINE2_CONTENT',
  'CONFIG_BOTTOM_MIDDLE_LINE1_CONTENT', 'CONFIG_BOTTOM_MIDDLE_LINE2_CONTENT',
  'CONFIG_MIDDLE_LEFT_LINE1_CONTENT', 'CONFIG_MIDDLE_LEFT_LINE2_CONTENT',
  'CONFIG_MIDDLE_RIGHT_LINE1_CONTENT', 'CONFIG_MIDDLE_RIGHT_LINE2_CONTENT'];
function fetchAirQualityIfEnabled(lat, lon, cb) {
  var inUse = AQI_SLOT_CONTENT_KEYS.some(function (key) { return getSetting(key, '0') === '36'; });
  if (!inUse) return cb({ aqiUs: null, aqiEu: null });
  weather.fetchAirQuality(lat, lon, function (err, aqi) {
    servicelog.recordAttempt('airquality', err);
    if (err) {
      console.log('modern: air quality fetch failed - ' + err.message);
      return cb({ aqiUs: null, aqiEu: null });
    }
    cb(aqi);
  });
}

function fetchAuroraIfEnabled(lat, lon, cb) {
  var inUse = AQI_SLOT_CONTENT_KEYS.some(function (key) { return getSetting(key, '0') === '84'; });
  if (!inUse) return cb({ kp: null }, 0);
  weather.fetchAuroraKp(function (err, kp) {
    var cls = servicelog.recordAttempt('aurora', err || (typeof kp !== 'number' ? new Error('no data') : null));
    if (err || typeof kp !== 'number') {
      console.log('modern: aurora Kp fetch failed - ' + (err ? err.message : 'no data'));
      return cb({ kp: null }, cls.code);
    }
    cb({ kp: kp }, 0);
  });
}

function refreshAndSend(force, resendOnSkip) {
  console.log('modern: refresh starting' + (force ? ' (forced)' : ''));
  s_refreshGeneration++;
  var myGeneration = s_refreshGeneration;
  function isStale() { return myGeneration !== s_refreshGeneration; }

  getLocation(function (err, lat, lon, altitudeMeters) {
    if (isStale()) { console.log('modern: refresh superseded, discarding (location step)'); return; }
    if (err) {
      console.log('modern: LOCATION FAILED - ' + err.message);
      sendInvalid(1);
      return;
    }
    console.log('modern: location = ' + lat + ', ' + lon +
      (altitudeMeters ? (', altitude ' + Math.round(altitudeMeters) + 'm') : ''));

    if (!force && shouldSkipRefresh(lat, lon)) {
      if (!resendOnSkip) {
        console.log('modern: fetched recently and location unchanged (<10km) - nothing to do');
        return;
      }
      if (resendLastFullData()) {
        console.log('modern: fetched recently and location unchanged (<10km) - resent last known data to the watch instead of refetching');
        return;
      }
      console.log('modern: fetched recently and location unchanged (<10km), but nothing cached to resend - fetching after all');
    }

    var now = getEffectiveNow();
    var dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    if (getSetting('CONFIG_TEST_MODE', 'false') === 'true') {
      console.log('modern: *** TEST MODE IS ON *** using simulated time ' + now.toString() +
        ' instead of the real current time (it only overrides what the PHONE calculates; ' +
        'the watch\'s own clock is separate).');
    }

    var astroData;
    try {
      var riseSetFor = function (start, getter) { return astro.findRiseSet(start, lat, lon, getter); };
      var nextDayStart = new Date(dayStart.getTime() + 86400000);
      astroData = {
        moonPhase: astro.computeMoonPhase(now),
        riseSet: {
          sun: riseSetFor(dayStart, function (g) { return g.sunAlt; }),
          mercury: riseSetFor(dayStart, function (g) { return g.mercuryAlt; }),
          venus: riseSetFor(dayStart, function (g) { return g.venusAlt; }),
          mars: riseSetFor(dayStart, function (g) { return g.marsAlt; }),
          jupiter: riseSetFor(dayStart, function (g) { return g.jupiterAlt; }),
          saturn: riseSetFor(dayStart, function (g) { return g.saturnAlt; })
        },
        sunRiseTomorrow: riseSetFor(nextDayStart, function (g) { return g.sunAlt; }).rise,
        saturnRingOpenPct: astro.saturnRingOpenPct(now, lat, lon),
        meteorShower: astro.activeMeteorShower(now)
      };
    } catch (e) {
      console.log('modern: CALC FAILED - ' + e.message);
      if (!isStale()) sendInvalid(2);
      return;
    }
    console.log('modern: moon ' + astroData.moonPhase.illuminatedPct + '% lit, ' +
      (astroData.moonPhase.waxing ? 'waxing' : 'waning') +
      (astroData.meteorShower ? ('; ' + astroData.meteorShower.name + ' intensity ' + astroData.meteorShower.intensity) : ''));

    var outlookTo = new Date(now.getTime() + 3 * 3600000);
    var owmKey = getSetting('CONFIG_OWM_KEY', '');

    getLocationName(lat, lon, function (locationName) {
      weatherSource.getSnapshot(lat, lon, now, function (snapErr, snapshot) {
        var weatherCls = servicelog.recordAttempt('weather', snapErr);
        if (snapErr) console.log('modern: weather fetch failed - ' + snapErr.message);

        weather.getCloudOutlook(lat, lon, owmKey || null, now, outlookTo, function (w) {
          var headlineCloud = (w.cloudCoverPct === 255) ? 0 : w.cloudCoverPct;

          fetchIssIfEnabled(lat, lon, function (issPos, issErrorCode) {
            fetchAirQualityIfEnabled(lat, lon, function (aqi) {
              fetchAuroraIfEnabled(lat, lon, function (aurora, auroraErrorCode) {
                if (isStale()) { console.log('modern: refresh superseded, discarding (final step)'); return; }
                sendWeatherData({
                  locationName: locationName,
                  astro: astroData,
                  issPos: issPos, issErrorCode: issErrorCode,
                  headlineCloud: headlineCloud, headlineSources: w.sourceCount,
                  weather: snapshot,
                  weatherOk: !snapErr, weatherErrorCode: weatherCls.code,
                  extraWeather: {
                    windDirDeg: snapshot.windDirDeg, dewPointC: snapshot.dewPointC,
                    pressureHpa: snapshot.pressureHpa, pressureTrend: snapshot.pressureTrend,
                    aqiUs: aqi.aqiUs, aqiEu: aqi.aqiEu, altitudeMeters: altitudeMeters,
                    auroraKpX10: (typeof aurora.kp === 'number') ? Math.round(aurora.kp * 10) : null,
                    auroraErrorCode: auroraErrorCode,
                    forecastTempC: snapshot.forecastTempC, forecastCondition: snapshot.forecastCondition,
                    forecastWx: snapshot.forecastWx, forecastRainPct: snapshot.forecastRainPct
                  }
                });
                markRefreshDone(lat, lon);
              });
            });
          });
        }, function (source, srcErr) { servicelog.recordAttempt(source, srcErr); });
      });
    });
  });
}

function scheduleRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  var mins = parseInt(getSetting('CONFIG_UPDATE_MINS', '20'), 10);
  if (isNaN(mins) || mins < 5) mins = 20;
  refreshTimer = setInterval(function () {
    if (lastBatterySaverPhase !== 0) return;
    refreshAndSend(false, false);
  }, mins * 60000);
}

function startBatterySaverHourlyCheck() {
  if (batterySaverHourlyTimer) clearInterval(batterySaverHourlyTimer);
  batterySaverHourlyTimer = setInterval(function () {
    if (lastBatterySaverPhase === 0) return;
    var now = new Date();
    if (now.getMinutes() !== 0) return;
    var hourKey = now.getFullYear() + '-' + now.getMonth() + '-' + now.getDate() + '-' + now.getHours();
    if (hourKey === lastHourlyRefreshHourKey) return;
    lastHourlyRefreshHourKey = hourKey;
    refreshAndSend(false, false);
  }, 60000);
}

function setBatterySaverPhase(phase) {
  lastBatterySaverPhase = phase;
}

module.exports = {
  refreshAndSend: refreshAndSend,
  scheduleRefresh: scheduleRefresh,
  startBatterySaverHourlyCheck: startBatterySaverHourlyCheck,
  setBatterySaverPhase: setBatterySaverPhase,
  getLocation: getLocation
};
