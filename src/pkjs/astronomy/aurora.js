// Aurora visibility estimate based on geomagnetic activity.
var angles = require('./angles');
var sind = angles.sind;
var cosd = angles.cosd;
var asind = angles.asind;

var GEOMAG_POLE_LAT = 80.7;
var GEOMAG_POLE_LON = -72.7;

function geomagneticLatitudeDeg(latDeg, lonDeg) {
  var dLon = lonDeg - GEOMAG_POLE_LON;
  return asind(sind(latDeg) * sind(GEOMAG_POLE_LAT) +
               cosd(latDeg) * cosd(GEOMAG_POLE_LAT) * cosd(dLon));
}

function auroraVisibilityScore(kp, geomagLatAbsDeg) {
  var boundary = 65.5 - 2.2 * kp;
  var margin = geomagLatAbsDeg - boundary;
  if (margin >= 3) return 100;
  if (margin <= -12) return 0;
  return Math.round(((margin + 12) / 15) * 100);
}

module.exports = {
  geomagneticLatitudeDeg: geomagneticLatitudeDeg,
  auroraVisibilityScore: auroraVisibilityScore
};
