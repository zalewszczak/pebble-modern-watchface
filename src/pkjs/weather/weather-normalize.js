// ---- weather condition normalization -------------------------------------
//
// Converts provider weather codes and values into the formats used by the watch.

// Maps an Open-Meteo/WMO weather code to our simplified on-watch
// condition enum. Plain clear/cloudy states need no special effect
// beyond the cloud-cover puffs already driven by CLOUD_SAMPLES, so
// they (and anything unrecognized) fall through to 0.
function conditionFromWmoCode(code) {
  if (code === 45 || code === 48) return 1; // fog
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 2; // drizzle/rain/showers
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 3; // snow
  if (code === 95 || code === 96 || code === 99) return 4; // thunderstorm
  return 0;
}

// Detailed per-hour weather class for the watch's weather border:
// 0 clear, 1 partly cloudy, 2 overcast, 3 fog, 4 drizzle, 5 rain, 6 heavy
// rain, 7 snow, 8 thunderstorm, 9 sleet / freezing rain. Clear / partly /
// overcast come from the cloud cover when the WMO code itself says nothing
// about precipitation or fog.
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

// Formats weather values for display using the configured temperature unit.
// The integer arithmetic matches the watch-side conversion so values remain
// consistent regardless of where formatting occurs.
function formatTempDisplay(tempCRaw, tempUnitCode) {
  if (typeof tempCRaw !== 'number' || isNaN(tempCRaw)) return '';
  var c = Math.round(tempCRaw); // WEATHER_TEMP_C itself is sent Math.round()ed -- match it
  var shown;
  if (tempUnitCode === 1) { // Fahrenheit
    shown = Math.trunc((c * 9) / 5) + 32;
  } else if (tempUnitCode === 2) { // Kelvin
    shown = c + 273;
  } else { // Celsius
    shown = c;
  }
  return String(shown);
}

// Estimates apparent temperature using a simple wind-chill/heat-index
// approximation. Inputs and output are whole-degree Celsius values.
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

// Computes gradient colors alongside phone-formatted values and sends each
// color as a packed GColor8 byte. The interpolation matches the watch-side
// gradient functions so the displayed colors remain consistent.
var packGColorByte = require('../comms/gcolor').packGColorByte;

var SEVEN_STOP_GRADIENT_STOPS = [
  [64, 224, 208],  // turquoise
  [173, 216, 230], // light blue
  [0, 200, 0],     // green
  [255, 220, 0],   // yellow
  [255, 140, 0],   // orange
  [220, 20, 20],   // red
  [148, 0, 211]    // violet
];

function sevenStopGradientRGB(value, minV, maxV) {
  var stops = SEVEN_STOP_GRADIENT_STOPS;
  if (maxV <= minV || value <= minV) return stops[0].slice();
  if (value >= maxV) return stops[6].slice();
  var posX6000 = Math.trunc(((value - minV) * 6000) / (maxV - minV)); // 0..6000 across 6 segments
  var seg = Math.trunc(posX6000 / 1000);
  if (seg > 5) seg = 5;
  var segFrac = posX6000 - seg * 1000; // 0..1000 within the segment
  var from = stops[seg], to = stops[seg + 1];
  var r = from[0] + Math.trunc(((to[0] - from[0]) * segFrac) / 1000);
  var g = from[1] + Math.trunc(((to[1] - from[1]) * segFrac) / 1000);
  var b = from[2] + Math.trunc(((to[2] - from[2]) * segFrac) / 1000);
  return [r, g, b];
}

// Color packing is shared through comms/gcolor.js.

// The specific gradient every temperature display above uses: 7-stop
// rainbow across -10C..40C (matches feature_colors_seven_stop_gradient()'s
// callers in feature_value_weather.c's content 4/73/74/75/77 cases). Takes
// whole-degree Celsius, same as formatTempDisplay()/apparentTempC() above.
function tempGradientColorByte(tempCRaw) {
  var c = (typeof tempCRaw === 'number' && !isNaN(tempCRaw)) ? Math.round(tempCRaw) : 0;
  var rgb = sevenStopGradientRGB(c, -10, 40);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

// ---- Additional weather display values (UV, humidity, wind, rain,
//      visibility, cloud cover, pressure, AQI, dew point, altitude) --------
//
// Same shape as the temperature cluster above: a display-text function and,
// where the watch used a *dynamic* (color_mode 3) gradient rather than a
// flat color, a matching *_COLOR byte function. Dew point has no gradient
// (feature_value_weather.c's case 37 always used a flat color, never
// feature_colors_*), so it gets a display function only.

// White (low) -> turquoise (high); verbatim port of
// feature_colors_white_to_turquoise_gradient() (feature_colors.c). Used by
// rain chance, humidity, wind speed, and altitude's gradients below.
function whiteToTurquoiseGradientRGB(value, minV, maxV) {
  if (maxV <= minV) return [255, 255, 255];
  var clamped = value < minV ? minV : (value > maxV ? maxV : value);
  var frac1000 = Math.trunc(((clamped - minV) * 1000) / (maxV - minV));
  var r = 255 - Math.trunc(((255 - 64) * frac1000) / 1000);
  var g = 255 - Math.trunc(((255 - 224) * frac1000) / 1000);
  var b = 255 - Math.trunc(((255 - 208) * frac1000) / 1000);
  return [r, g, b];
}

// Verbatim port of feature_colors_overcast_gray_gradient() (feature_colors.c),
// including its own internal 40% clamp (OVERCAST_CLOUD_THRESHOLD).
function overcastGrayGradientRGB(cloudPct) {
  var THRESHOLD = 40;
  var clamped = cloudPct < THRESHOLD ? THRESHOLD : cloudPct;
  var frac1000 = Math.trunc(((clamped - THRESHOLD) * 1000) / (100 - THRESHOLD));
  var v = 200 - Math.trunc((115 * frac1000) / 1000);
  return [v, v, v];
}

// UV index: PKJS already sends UV_INDEX_X10/UV_INDEX_CURRENT_X10 rounded
// the same way (see sendWeatherData); mirror that exact
// rounding here so the truncated whole-number UV this derives matches
// bit-for-bit rather than re-rounding the raw value on a different path.
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

// Rain chance / humidity: plain "N%" text, white-to-turquoise 0-100 color.
function formatPercentDisplay(pctRaw) {
  if (typeof pctRaw !== 'number' || isNaN(pctRaw)) return '';
  return Math.round(pctRaw) + '%';
}
function percentGradientColorByte(pctRaw) {
  var pct = (typeof pctRaw === 'number' && !isNaN(pctRaw)) ? Math.round(pctRaw) : 0;
  var rgb = whiteToTurquoiseGradientRGB(pct, 0, 100);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

// Visibility / cloud cover: "N%" text, overcast-gray color.
function overcastGrayColorByte(cloudPctRaw) {
  var pct = (typeof cloudPctRaw === 'number' && !isNaN(cloudPctRaw)) ? Math.round(cloudPctRaw) : 0;
  var rgb = overcastGrayGradientRGB(pct);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

// Wind speed: verbatim port of feature_rules_convert_wind() (feature_rules.c)
// for the display text; gradient color uses the raw km/h value (0-60),
// matching feature_value_weather_compute()'s case 9, which grades on the
// unconverted speed regardless of which unit is displayed.
function formatWindSpeedDisplay(kmhRaw, windSpeedUnitCode) {
  if (typeof kmhRaw !== 'number' || isNaN(kmhRaw)) return '';
  var kmh = Math.round(kmhRaw);
  var shown;
  if (windSpeedUnitCode === 1) shown = Math.trunc((kmh * 621) / 1000);       // mph
  else if (windSpeedUnitCode === 2) shown = Math.trunc((kmh * 1000) / 3600); // m/s
  else if (windSpeedUnitCode === 3) shown = Math.trunc((kmh * 540) / 1000);  // knots
  else shown = kmh;                                                          // km/h
  return String(shown);
}
function windSpeedGradientColorByte(kmhRaw) {
  var kmh = (typeof kmhRaw === 'number' && !isNaN(kmhRaw)) ? Math.round(kmhRaw) : 0;
  var rgb = whiteToTurquoiseGradientRGB(kmh, 0, 60);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

// Pressure: "N hPa" text, 7-stop gradient 970-1050 hPa. (The rising/
// falling/flat trend arrow drawn alongside this is a separate icon
// primitive, already PKJS-sourced via the existing PRESSURE_TREND field --
// nothing to migrate there.)
function formatPressureDisplay(pressureHpaRaw) {
  if (typeof pressureHpaRaw !== 'number' || isNaN(pressureHpaRaw)) return '';
  return Math.round(pressureHpaRaw) + ' hPa';
}
function pressureGradientColorByte(pressureHpaRaw) {
  var hpa = (typeof pressureHpaRaw === 'number' && !isNaN(pressureHpaRaw)) ? Math.round(pressureHpaRaw) : 0;
  var rgb = sevenStopGradientRGB(hpa, 970, 1050);
  return packGColorByte(rgb[0], rgb[1], rgb[2]);
}

// AQI: "AQI N" text using whichever scale the user selected (aqiUnitCode:
// 0=US/0-300, 1=EU/0-100, matching feature_value_weather_compute()'s case
// 36), 7-stop gradient over that same scale's range.
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

// Dew point: same unit conversion as temperature, so it reuses
// formatTempDisplay() directly -- no separate function needed. No color:
// case 37 never used a dynamic gradient (always the flat color_mode color).

// Altitude: "Nm"/"Nft" text (feature_rules_convert_temp-style integer
// conversion, verbatim port), white-to-turquoise 0-4000m color. Deliberately
// has NO "N/A" handling here -- unlike every other value on this page,
// ALTITUDE_M's -32000 "unavailable" sentinel is a stable fact rather than a
// transient fetch failure (see extraWeatherFieldsDict()'s own comment), and
// the watch's existing GColorLightGray/"N/A" special case for it is kept
// as-is on the watch rather than guessed at here -- see
// the watch-side altitude resolver.
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

// Selects the icon category for current conditions and forecast periods.
// The returned category is sent to the watch with the corresponding weather data.
function weatherIconCategory(conditionCode, cloudPct) {
  switch (conditionCode) {
    case 1: return 3; // fog
    case 2: return 4; // rain
    case 3: return 5; // snow
    case 4: return 6; // storm
    default:
      if (cloudPct < 20) return 0; // sunny
      if (cloudPct < 60) return 1; // partly cloudy
      return 2; // cloudy/overcast
  }
}

// ---- Weather-condition icon colors --------------------------------------
//
// Verbatim port of feature_colors_weather_condition_color()
// (feature_colors.c) and the two gradients private to it.
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