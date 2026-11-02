// weather condition normalization
function conditionFromWmoCode(code) {
  if (code === 45 || code === 48) return 1;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 2;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 3;
  if (code === 95 || code === 96 || code === 99) return 4;
  return 0;
}

function weatherDetailClass(code, cloudPct) {
  if (code === 45 || code === 48) return 3;
  if (code === 51 || code === 53 || code === 55) return 4;
  if (code === 56 || code === 57 || code === 66 || code === 67) return 9;
  if (code === 65 || code === 82) return 6;
  if (code === 61 || code === 63 || code === 80 || code === 81) return 5;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 7;
  if (code === 95 || code === 96 || code === 99) return 8;
  var c = (typeof cloudPct === 'number' && !isNaN(cloudPct)) ? cloudPct : 0;
  if (c < 20) return 0;
  if (c < 60) return 1;
  return 2;
}

function formatTempDisplay(tempCRaw, tempUnitCode) {
  if (typeof tempCRaw !== 'number' || isNaN(tempCRaw)) return '';
  var c = Math.round(tempCRaw);
  var shown;
  if (tempUnitCode === 1) {
    shown = Math.trunc((c * 9) / 5) + 32;
  } else if (tempUnitCode === 2) {
    shown = c + 273;
  } else {
    shown = c;
  }
  return String(shown);
}

function apparentTempC(tempCRaw, windKmhRaw, humidityPctRaw) {
  if (typeof tempCRaw !== 'number' || isNaN(tempCRaw)) return tempCRaw;
  var tempC = Math.round(tempCRaw);
  var windKmh = (typeof windKmhRaw === 'number') ? Math.round(windKmhRaw) : 0;
  var humidityPct = (typeof humidityPctRaw === 'number') ? Math.round(humidityPctRaw) : 0;
  if (tempC <= 10 && windKmh > 4) {
    var chill = Math.trunc((windKmh - 4) / 5);
    if (chill > 12) chill = 12;
    return tempC - chill;
  }
  if (tempC >= 27 && humidityPct > 40) {
    var bump = Math.trunc(((humidityPct - 40) * 3) / 20);
    if (bump > 8) bump = 8;
    return tempC + bump;
  }
  return tempC;
}

var packGColorByte = require('../comms/gcolor').packGColorByte;

var SEVEN_STOP_GRADIENT_STOPS = [
  [64, 224, 208],
  [173, 216, 230],
  [0, 200, 0],
  [255, 220, 0],
  [255, 140, 0],
  [220, 20, 20],
  [148, 0, 211]
];

function sevenStopGradientRGB(value, minV, maxV) {
  var stops = SEVEN_STOP_GRADIENT_STOPS;
  if (maxV <= minV || value <= minV) return stops[0].slice();
  if (value >= maxV) return stops[6].slice();
  var posX6000 = Math.trunc(((value - minV) * 6000) / (maxV - minV));
  var seg = Math.trunc(posX6000 / 1000);
  if (seg > 5) seg = 5;
  var segFrac = posX6000 - seg * 1000;
  var from = stops[seg], to = stops[seg + 1];
  var r = from[0] + Math.trunc(((to[0] - from[0]) * segFrac) / 1000);
  var g = from[1] + Math.trunc(((to[1] - from[1]) * segFrac) / 1000);
  var b = from[2] + Math.trunc(((to[2] - from[2]) * segFrac) / 1000);
  return [r, g, b];
}

function tempGradientColorByte(tempCRaw) {
  var c = (typeof tempCRaw === 'number' && !isNaN(tempCRaw)) ? Math.round(tempCRaw) : 0;
  var rgb = sevenStopGradientRGB(c, -10, 40);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function whiteToTurquoiseGradientRGB(value, minV, maxV) {
  if (maxV <= minV) return [255, 255, 255];
  var clamped = value < minV ? minV : (value > maxV ? maxV : value);
  var frac1000 = Math.trunc(((clamped - minV) * 1000) / (maxV - minV));
  var r = 255 - Math.trunc(((255 - 64) * frac1000) / 1000);
  var g = 255 - Math.trunc(((255 - 224) * frac1000) / 1000);
  var b = 255 - Math.trunc(((255 - 208) * frac1000) / 1000);
  return [r, g, b];
}

function overcastGrayGradientRGB(cloudPct) {
  var THRESHOLD = 40;
  var clamped = cloudPct < THRESHOLD ? THRESHOLD : cloudPct;
  var frac1000 = Math.trunc(((clamped - THRESHOLD) * 1000) / (100 - THRESHOLD));
  var v = 200 - Math.trunc((115 * frac1000) / 1000);
  return [v, v, v];
}

function formatUvDisplay(uvIndexRaw) {
  if (typeof uvIndexRaw !== 'number' || isNaN(uvIndexRaw)) return '';
  var uvX10 = Math.round(Math.max(0, Math.min(25.5, uvIndexRaw)) * 10);
  return 'UV' + Math.trunc(uvX10 / 10);
}
function uvGradientColorByte(uvIndexRaw) {
  var uvX10 = (typeof uvIndexRaw === 'number' && !isNaN(uvIndexRaw))
    ? Math.round(Math.max(0, Math.min(25.5, uvIndexRaw)) * 10) : 0;
  var rgb = sevenStopGradientRGB(Math.trunc(uvX10 / 10), 1, 13);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function formatPercentDisplay(pctRaw) {
  if (typeof pctRaw !== 'number' || isNaN(pctRaw)) return '';
  return Math.round(pctRaw) + '%';
}
function percentGradientColorByte(pctRaw) {
  var pct = (typeof pctRaw === 'number' && !isNaN(pctRaw)) ? Math.round(pctRaw) : 0;
  var rgb = whiteToTurquoiseGradientRGB(pct, 0, 100);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function overcastGrayColorByte(cloudPctRaw) {
  var pct = (typeof cloudPctRaw === 'number' && !isNaN(cloudPctRaw)) ? Math.round(cloudPctRaw) : 0;
  var rgb = overcastGrayGradientRGB(pct);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function formatWindSpeedDisplay(kmhRaw, windSpeedUnitCode) {
  if (typeof kmhRaw !== 'number' || isNaN(kmhRaw)) return '';
  var kmh = Math.round(kmhRaw);
  var shown;
  if (windSpeedUnitCode === 1) shown = Math.trunc((kmh * 621) / 1000);
  else if (windSpeedUnitCode === 2) shown = Math.trunc((kmh * 1000) / 3600);
  else if (windSpeedUnitCode === 3) shown = Math.trunc((kmh * 540) / 1000);
  else shown = kmh;
  return String(shown);
}
function windSpeedGradientColorByte(kmhRaw) {
  var kmh = (typeof kmhRaw === 'number' && !isNaN(kmhRaw)) ? Math.round(kmhRaw) : 0;
  var rgb = whiteToTurquoiseGradientRGB(kmh, 0, 60);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function formatPressureDisplay(pressureHpaRaw) {
  if (typeof pressureHpaRaw !== 'number' || isNaN(pressureHpaRaw)) return '';
  return Math.round(pressureHpaRaw) + ' hPa';
}
function pressureGradientColorByte(pressureHpaRaw) {
  var hpa = (typeof pressureHpaRaw === 'number' && !isNaN(pressureHpaRaw)) ? Math.round(pressureHpaRaw) : 0;
  var rgb = sevenStopGradientRGB(hpa, 970, 1050);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function formatAqiDisplay(aqiValueRaw) {
  if (typeof aqiValueRaw !== 'number' || isNaN(aqiValueRaw)) return '';
  return 'AQI ' + Math.round(aqiValueRaw);
}
function aqiGradientColorByte(aqiValueRaw, aqiUnitCode) {
  var aqi = (typeof aqiValueRaw === 'number' && !isNaN(aqiValueRaw)) ? Math.round(aqiValueRaw) : 0;
  var maxV = (aqiUnitCode === 1) ? 100 : 300;
  var rgb = sevenStopGradientRGB(aqi, 0, maxV);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function formatAltitudeDisplay(altitudeMRaw, altitudeUnitCode) {
  if (typeof altitudeMRaw !== 'number' || isNaN(altitudeMRaw)) return '';
  var m = Math.round(altitudeMRaw);
  if (altitudeUnitCode === 1) {
    return Math.trunc((m * 328) / 100) + 'ft';
  }
  return m + 'm';
}
function altitudeGradientColorByte(altitudeMRaw) {
  var m = (typeof altitudeMRaw === 'number' && !isNaN(altitudeMRaw)) ? Math.round(altitudeMRaw) : 0;
  var rgb = whiteToTurquoiseGradientRGB(m, 0, 4000);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

function weatherIconCategory(conditionCode, cloudPct) {
  switch (conditionCode) {
    case 1: return 3;
    case 2: return 4;
    case 3: return 5;
    case 4: return 6;
    default:
      if (cloudPct < 20) return 0;
      if (cloudPct < 60) return 1;
      return 2;
  }
}

function sunnyYellowWhiteGradientRGB(cloudPct) {
  var OVERCAST_THRESHOLD = 40;
  var clamped = cloudPct > OVERCAST_THRESHOLD ? OVERCAST_THRESHOLD : cloudPct;
  var frac1000 = Math.trunc(((OVERCAST_THRESHOLD - clamped) * 1000) / OVERCAST_THRESHOLD);
  var b = 255 - Math.trunc((85 * frac1000) / 1000);
  return [255, 255, b];
}
function snowWhiteGradientRGB(cloudPct) {
  var frac1000 = Math.trunc((cloudPct * 1000) / 100);
  var rg = 255 - Math.trunc((85 * frac1000) / 1000);
  return [rg, rg, 255];
}
function weatherConditionColorByte(conditionCode, cloudPct, rainChancePct) {
  var rgb;
  var rain = (typeof rainChancePct === 'number' && !isNaN(rainChancePct)) ? rainChancePct : 0;
  if (conditionCode === 4) rgb = [255, 0, 0];
  else if (conditionCode === 3) rgb = snowWhiteGradientRGB(cloudPct);
  else if (conditionCode === 2) rgb = whiteToTurquoiseGradientRGB(rain, 0, 100);
  else if (conditionCode === 1) rgb = overcastGrayGradientRGB(cloudPct);
  else rgb = (cloudPct < 40) ? sunnyYellowWhiteGradientRGB(cloudPct) : overcastGrayGradientRGB(cloudPct);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

module.exports = {
  SEVEN_STOP_GRADIENT_STOPS: SEVEN_STOP_GRADIENT_STOPS,
  weatherDetailClass: weatherDetailClass,
  conditionFromWmoCode: conditionFromWmoCode,
  formatTempDisplay: formatTempDisplay,
  apparentTempC: apparentTempC,
  tempGradientColorByte: tempGradientColorByte,
  formatUvDisplay: formatUvDisplay,
  uvGradientColorByte: uvGradientColorByte,
  formatPercentDisplay: formatPercentDisplay,
  percentGradientColorByte: percentGradientColorByte,
  overcastGrayColorByte: overcastGrayColorByte,
  formatWindSpeedDisplay: formatWindSpeedDisplay,
  windSpeedGradientColorByte: windSpeedGradientColorByte,
  formatPressureDisplay: formatPressureDisplay,
  pressureGradientColorByte: pressureGradientColorByte,
  formatAqiDisplay: formatAqiDisplay,
  aqiGradientColorByte: aqiGradientColorByte,
  formatAltitudeDisplay: formatAltitudeDisplay,
  altitudeGradientColorByte: altitudeGradientColorByte,
  weatherIconCategory: weatherIconCategory,
  weatherConditionColorByte: weatherConditionColorByte
};