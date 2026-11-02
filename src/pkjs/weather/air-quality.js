// air quality provider
var xhrGetJSON = require('./http').xhrGetJSON;

function fetchAirQuality(lat, lon, cb) {
  var url = 'https://air-quality-api.open-meteo.com/v1/air-quality' +
            '?latitude=' + encodeURIComponent(lat) +
            '&longitude=' + encodeURIComponent(lon) +
            '&current=us_aqi,european_aqi' +
            '&timezone=auto';
  xhrGetJSON(url, 8000, function (err, json) {
    if (err || !json || !json.current) return cb(err, { aqiUs: null, aqiEu: null });
    var aqiUs = (typeof json.current.us_aqi === 'number') ? Math.round(json.current.us_aqi) : null;
    var aqiEu = (typeof json.current.european_aqi === 'number') ? Math.round(json.current.european_aqi) : null;
    cb(null, { aqiUs: aqiUs, aqiEu: aqiEu });
  });
}

module.exports = {
  fetchAirQuality: fetchAirQuality
};
