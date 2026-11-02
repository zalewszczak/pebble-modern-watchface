// ISS (or any other near-Earth satellite given fresh elements)
var angles = require('./angles');
var sind = angles.sind;
var cosd = angles.cosd;
var asind = angles.asind;
var atan2d = angles.atan2d;
var norm360 = angles.norm360;
var julianDay = angles.julianDay;
var julianCenturies = angles.julianCenturies;
var greenwichSiderealDeg = angles.greenwichSiderealDeg;
var sun = require('./sun');
var sunPosition = sun.sunPosition;
var sunAltitude = sun.sunAltitude;

var EARTH_MU = 398600.4418;
var EARTH_RADIUS_KM = 6378.137;
var CIVIL_TWILIGHT_ALT_DEG = -6;
var MIN_VISIBLE_ISS_ALT_DEG = 10;

function issEciPosition(omm, now) {
  var elapsedDays = (now.getTime() - omm.epoch.getTime()) / 86400000;
  var meanAnomalyNow = norm360(omm.meanAnomalyDeg + omm.meanMotionRevPerDay * 360 * elapsedDays);
  var argLat = norm360(omm.argPerigeeDeg + meanAnomalyNow);

  var nRadPerSec = (omm.meanMotionRevPerDay * 2 * Math.PI) / 86400;
  var r = Math.pow(EARTH_MU / (nRadPerSec * nRadPerSec), 1 / 3);

  var i = omm.inclinationDeg, raan = omm.raanDeg;
  return {
    x: r * (cosd(raan) * cosd(argLat) - sind(raan) * sind(argLat) * cosd(i)),
    y: r * (sind(raan) * cosd(argLat) + cosd(raan) * sind(argLat) * cosd(i)),
    z: r * sind(argLat) * sind(i)
  };
}

function eciToLookAngle(eciPos, now, latDeg, lonDeg) {
  var jd = julianDay(now);
  var T = julianCenturies(jd);
  var gstDeg = greenwichSiderealDeg(jd, T);
  var xEcef = eciPos.x * cosd(gstDeg) + eciPos.y * sind(gstDeg);
  var yEcef = -eciPos.x * sind(gstDeg) + eciPos.y * cosd(gstDeg);
  var zEcef = eciPos.z;

  var obsX = EARTH_RADIUS_KM * cosd(latDeg) * cosd(lonDeg);
  var obsY = EARTH_RADIUS_KM * cosd(latDeg) * sind(lonDeg);
  var obsZ = EARTH_RADIUS_KM * sind(latDeg);

  var dx = xEcef - obsX, dy = yEcef - obsY, dz = zEcef - obsZ;

  var south = sind(latDeg) * cosd(lonDeg) * dx + sind(latDeg) * sind(lonDeg) * dy - cosd(latDeg) * dz;
  var east = -sind(lonDeg) * dx + cosd(lonDeg) * dy;
  var up = cosd(latDeg) * cosd(lonDeg) * dx + cosd(latDeg) * sind(lonDeg) * dy + sind(latDeg) * dz;

  var range = Math.sqrt(south * south + east * east + up * up);
  return {
    alt: asind(up / range),
    az: norm360(atan2d(east, -south)),
    distanceKm: range
  };
}

function issLookAngle(omm, now, latDeg, lonDeg) {
  return eciToLookAngle(issEciPosition(omm, now), now, latDeg, lonDeg);
}

function issIsSunlit(eciPos, sun) {
  var sx = cosd(sun.dec) * cosd(sun.ra);
  var sy = cosd(sun.dec) * sind(sun.ra);
  var sz = sind(sun.dec);

  var dot = eciPos.x * sx + eciPos.y * sy + eciPos.z * sz;
  if (dot > 0) return true;

  var perpX = eciPos.x - dot * sx, perpY = eciPos.y - dot * sy, perpZ = eciPos.z - dot * sz;
  var perpDist = Math.sqrt(perpX * perpX + perpY * perpY + perpZ * perpZ);
  return perpDist > EARTH_RADIUS_KM;
}

function findNextIssPass(omm, now, latDeg, lonDeg, windowHours) {
  var stepMs = 60000;
  var steps = Math.floor(((windowHours || 20) * 3600000) / stepMs);

  for (var i = 0; i <= steps; i++) {
    var t = new Date(now.getTime() + i * stepMs);
    var jd = julianDay(t);
    var T = julianCenturies(jd);
    var sun = sunPosition(T);
    var lstDeg = norm360(greenwichSiderealDeg(jd, T) + lonDeg);
    if (sunAltitude(sun, latDeg, lstDeg) > CIVIL_TWILIGHT_ALT_DEG) continue;

    var eci = issEciPosition(omm, t);
    var look = eciToLookAngle(eci, t, latDeg, lonDeg);
    if (look.alt < MIN_VISIBLE_ISS_ALT_DEG) continue;

    if (!issIsSunlit(eci, sun)) continue;

    return t;
  }
  return null;
}

module.exports = {
  issLookAngle: issLookAngle,
  findNextIssPass: findNextIssPass
};
