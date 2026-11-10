'use strict';
// Named data sets the phone would normally fetch (weather, air quality, forecast, ISS, aurora ...).
// A scenario picks one with  "dataset": "rain"  and can override single values with  "data": { "weather": { "tempC": -3 } }.
// All values are fixed so screenshots do not depend on the network.
var FORECAST_FLAT = function (base, step) { var a = []; for (var i = 0; i < 15; i++) a.push(Math.round(base + step * i)); return a; };

var BASE = {
  locationName: 'Vienna',
  weather: {
    condition: 0, tempC: 18, tempHighC: 22, tempLowC: 11, uvIndexMax: 4, uvIndexCurrent: 3, rainChancePct: 10,
    humidityPct: 55, windSpeedKmh: 12, currentCloudPct: 20, wxNow: 1
  },
  extra: {
    windDirDeg: 180, dewPointC: 9, pressureHpa: 1015, pressureTrend: 0, aqiUs: 30, aqiEu: 15, altitudeMeters: 190,
    auroraKpX10: 23, forecastTempC: FORECAST_FLAT(18, 0.4), forecastWx: [1, 1, 1, 2, 2, 3, 3, 1, 1, 2, 3, 1, 2, 1, 1],
    forecastRainPct: [0, 0, 5, 10, 20, 30, 10, 0, 0, 20, 40, 10, 5, 0, 0], forecastCondition: [0, 0, 0, 0, 2, 2, 0, 0, 0, 2, 2, 0, 0, 0, 0]
  },
  issInHours: 3
};

var SETS = {
  mild: {},
  rain: {
    weather: { condition: 2, tempC: 9, tempHighC: 11, tempLowC: 6, uvIndexMax: 1, uvIndexCurrent: 0.5, rainChancePct: 85, humidityPct: 92, windSpeedKmh: 27, currentCloudPct: 95, wxNow: 5 },
    extra: { windDirDeg: 250, dewPointC: 8, pressureHpa: 998, pressureTrend: -1, aqiUs: 12, aqiEu: 8, auroraKpX10: 10,
      forecastTempC: FORECAST_FLAT(9, 0.2), forecastWx: [5, 5, 5, 5, 4, 4, 3, 3, 3, 4, 5, 5, 4, 3, 3], forecastRainPct: [90, 85, 80, 70, 60, 50, 40, 30, 30, 50, 70, 80, 60, 40, 30], forecastCondition: [2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2, 2, 1, 1] }
  },
  snow: {
    weather: { condition: 3, tempC: -7, tempHighC: -3, tempLowC: -12, uvIndexMax: 1.5, uvIndexCurrent: 1, rainChancePct: 70, humidityPct: 80, windSpeedKmh: 8, currentCloudPct: 90, wxNow: 7 },
    extra: { windDirDeg: 20, dewPointC: -9, pressureHpa: 1032, pressureTrend: 1, aqiUs: 55, aqiEu: 40, auroraKpX10: 60, altitudeMeters: 1820,
      forecastTempC: FORECAST_FLAT(-7, -0.3), forecastWx: [7, 7, 7, 3, 3, 1, 1, 7, 7, 7, 3, 3, 1, 1, 1], forecastRainPct: [70, 70, 60, 40, 30, 10, 0, 60, 70, 70, 40, 20, 0, 0, 0], forecastCondition: [3, 3, 3, 1, 1, 0, 0, 3, 3, 3, 1, 1, 0, 0, 0] }
  },
  hot: {
    weather: { condition: 0, tempC: 39, tempHighC: 42, tempLowC: 27, uvIndexMax: 11.5, uvIndexCurrent: 9.5, rainChancePct: 0, humidityPct: 20, windSpeedKmh: 4, currentCloudPct: 0, wxNow: 0 },
    extra: { windDirDeg: 95, dewPointC: 6, pressureHpa: 1008, pressureTrend: 0, aqiUs: 160, aqiEu: 95, auroraKpX10: 0, altitudeMeters: 12,
      forecastTempC: FORECAST_FLAT(39, -0.4), forecastWx: [0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0], forecastRainPct: [0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 5, 0], forecastCondition: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }
  },
  storm: {
    weather: { condition: 4, tempC: 21, tempHighC: 26, tempLowC: 17, uvIndexMax: 6, uvIndexCurrent: 2, rainChancePct: 100, humidityPct: 99, windSpeedKmh: 74, currentCloudPct: 100, wxNow: 9 },
    extra: { windDirDeg: 315, dewPointC: 20, pressureHpa: 985, pressureTrend: -1, aqiUs: 5, aqiEu: 4, auroraKpX10: 90, altitudeMeters: 190,
      forecastTempC: FORECAST_FLAT(21, -0.3), forecastWx: [9, 9, 9, 5, 5, 5, 4, 4, 3, 3, 3, 5, 4, 3, 1], forecastRainPct: [100, 100, 90, 80, 70, 60, 50, 40, 30, 30, 30, 50, 40, 30, 20], forecastCondition: [4, 4, 4, 2, 2, 2, 2, 1, 1, 1, 1, 2, 1, 1, 0] }
  }
};

function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
function deepMerge(a, b) {
  var out = {};
  Object.keys(a || {}).forEach(function (k) { out[k] = a[k]; });
  Object.keys(b || {}).forEach(function (k) { out[k] = (isObj(out[k]) && isObj(b[k])) ? deepMerge(out[k], b[k]) : b[k]; });
  return out;
}

function resolve(name, overrides) {
  if (name && !SETS[name]) throw new Error('unknown dataset "' + name + '" (known: ' + Object.keys(SETS).join(', ') + ')');
  return deepMerge(deepMerge(BASE, SETS[name || 'mild']), overrides || {});
}

module.exports = { resolve: resolve, names: Object.keys(SETS), deepMerge: deepMerge };
