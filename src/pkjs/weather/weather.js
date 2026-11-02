// weather.js -- cloud cover lookup, and the
var xhrGetJSON = require('./http').xhrGetJSON;
var openMeteo = require('./open-meteo');
var fetchOpenMeteo = openMeteo.fetchOpenMeteo;
var getWeatherSnapshot = openMeteo.getWeatherSnapshot;
var fetchOpenWeatherMap = require('./openweathermap').fetchOpenWeatherMap;
var fetchAirQuality = require('./air-quality').fetchAirQuality;

function getCloudOutlook(lat, lon, owmApiKey, fromDate, toDate, cb, onSourceResult) {
  var results = [];
  var pending = owmApiKey ? 2 : 1;

  function finish() {
    pending--;
    if (pending > 0) return;
    if (results.length === 0) {
      cb({ cloudCoverPct: 255, visScorePct: 255, sourceCount: 0 });
      return;
    }
    var sum = 0;
    for (var i = 0; i < results.length; i++) sum += results[i];
    var avg = Math.round(sum / results.length);
    cb({ cloudCoverPct: avg, visScorePct: 100 - avg, sourceCount: results.length });
  }

  fetchOpenMeteo(lat, lon, fromDate, toDate, function (err, pct) {
    if (onSourceResult) onSourceResult('openmeteo', err);
    if (!err) results.push(pct);
    finish();
  });

  if (owmApiKey) {
    fetchOpenWeatherMap(lat, lon, owmApiKey, fromDate, toDate, function (err, pct) {
      if (onSourceResult) onSourceResult('openweathermap', err);
      if (!err) results.push(pct);
      finish();
    });
  }
}

function fetchAuroraKp(cb) {
  var url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
  xhrGetJSON(url, 8000, function (err, json) {
    if (err || !Array.isArray(json) || json.length < 2) return cb(err || new Error('empty Kp response'), null);
    var last = json[json.length - 1];
    var kp;
    if (last && typeof last === 'object' && !Array.isArray(last)) {
      kp = parseFloat(last.Kp);
    } else if (Array.isArray(last) && last.length >= 2) {
      kp = parseFloat(last[1]);
    } else {
      return cb(new Error('malformed Kp row'), null);
    }
    if (isNaN(kp)) return cb(new Error('bad Kp value'), null);
    cb(null, kp);
  });
}

module.exports = {
  getCloudOutlook: getCloudOutlook,
  getWeatherSnapshot: getWeatherSnapshot,
  fetchAirQuality: fetchAirQuality,
  fetchAuroraKp: fetchAuroraKp
};
