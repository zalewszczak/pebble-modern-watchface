// ---- sun/moon/planet geometry and rise/set search ----------------------
//
// computeGeometry() resolves a moment down to topocentric altitude/azimuth
// for the Sun, Moon and planets (plus Saturn's ring tilt); findRiseSet()
// scans a day for a body's horizon crossings. Everything the features need
// (sun event, planets visible, next planet rise, moon, Saturn rings).

var angles = require('./angles');
var cosd = angles.cosd;
var atan2d = angles.atan2d;
var norm360 = angles.norm360;
var julianDay = angles.julianDay;
var julianCenturies = angles.julianCenturies;
var greenwichSiderealDeg = angles.greenwichSiderealDeg;
var angularSeparation = angles.angularSeparation;
var altAz = angles.altAz;
var sun = require('./sun');
var sunPosition = sun.sunPosition;
var sunAltitude = sun.sunAltitude;
var moon = require('./moon');
var moonPosition = moon.moonPosition;
var topocentricMoon = moon.topocentricMoon;
var planets = require('./planets');
var MERCURY_ELEMENTS = planets.MERCURY_ELEMENTS;
var VENUS_ELEMENTS = planets.VENUS_ELEMENTS;
var MARS_ELEMENTS = planets.MARS_ELEMENTS;
var JUPITER_ELEMENTS = planets.JUPITER_ELEMENTS;
var SATURN_ELEMENTS = planets.SATURN_ELEMENTS;
var planetPosition = planets.planetPosition;
var saturnRingAngle = planets.saturnRingAngle;

/**
 * Computes the full picture for a given moment: geocentric Sun,
 * topocentric Moon, their separation and each one's apparent radius.
 */
function computeGeometry(date, latDeg, lonDeg) {
  var jd = julianDay(date);
  var T = julianCenturies(jd);
  var sun = sunPosition(T);
  var moonGeo = moonPosition(T);
  var lst = norm360(greenwichSiderealDeg(jd, T) + lonDeg);
  var moon = topocentricMoon(moonGeo, latDeg, lonDeg, lst);

  var sep = angularSeparation(sun.ra, sun.dec, moon.ra, moon.dec);
  var sunAlt = sunAltitude(sun, latDeg, lst);
  // sunAltitude() above only ever returns altitude (it's the simpler,
  // slightly cheaper of the two -- fine for the many places that only
  // ever needed alt), so azimuth needs this project's own general
  // altAz() instead, same as the Moon/planets already use just below.
  var sunAz = altAz(sun.ra, sun.dec, latDeg, lst).az;
  var moonAltAz = altAz(moon.ra, moon.dec, latDeg, lst);
  var moonAlt = moonAltAz.alt;
  var moonAz = moonAltAz.az;

  var mercury = planetPosition(MERCURY_ELEMENTS, T, sun);
  var venus = planetPosition(VENUS_ELEMENTS, T, sun);
  var mars = planetPosition(MARS_ELEMENTS, T, sun);
  var jupiter = planetPosition(JUPITER_ELEMENTS, T, sun);
  var saturn = planetPosition(SATURN_ELEMENTS, T, sun);

  var mercuryAltAz = altAz(mercury.ra, mercury.dec, latDeg, lst);
  var venusAltAz = altAz(venus.ra, venus.dec, latDeg, lst);
  var marsAltAz = altAz(mars.ra, mars.dec, latDeg, lst);
  var jupiterAltAz = altAz(jupiter.ra, jupiter.dec, latDeg, lst);
  var saturnAltAz = altAz(saturn.ra, saturn.dec, latDeg, lst);
  var saturnRingB = saturnRingAngle(T, saturn.eclipticLon, saturn.eclipticLat);

  return {
    sep: sep,
    sunRadius: sun.semidiameterDeg,
    moonRadius: moon.semidiameterDeg,
    sunAlt: sunAlt,
    sunAz: sunAz,
    moonAlt: moonAlt,
    moonAz: moonAz,
    mercuryAlt: mercuryAltAz.alt,
    mercuryAz: mercuryAltAz.az,
    venusAlt: venusAltAz.alt,
    venusAz: venusAltAz.az,
    marsAlt: marsAltAz.alt,
    marsAz: marsAltAz.az,
    jupiterAlt: jupiterAltAz.alt,
    jupiterAz: jupiterAltAz.az,
    saturnAlt: saturnAltAz.alt,
    saturnAz: saturnAltAz.az,
    saturnRingB: saturnRingB,
    sun: sun,
    moon: moon,
    lst: lst
  };
}

/**
 * Finds the (first) rise and set time of a body within a calendar
 * day, by scanning at fine resolution and linearly interpolating the
 * altitude-zero crossing. Used for the watchface's rise/set
 * animation rather than the coarse hourly grid, since a 3-minute
 * transition window needs better than hourly precision to land in
 * the right place.
 *
 * @param {Date} dayStart
 * @param {function(object):number} altGetter  pulls the body's
 *   altitude (degrees) out of a computeGeometry() result
 * @returns {object} { rise: Date|null, set: Date|null } -- null for
 *   either means the body doesn't cross the horizon that day (up or
 *   down the whole time, e.g. near the poles)
 */
function findRiseSet(dayStart, latDeg, lonDeg, altGetter) {
  var stepMs = 5 * 60000; // 5 minutes
  var steps = Math.floor((24 * 3600000) / stepMs);
  var prevT = dayStart, prevAlt = altGetter(computeGeometry(dayStart, latDeg, lonDeg));
  var rise = null, set = null;

  for (var i = 1; i <= steps; i++) {
    var t = new Date(dayStart.getTime() + i * stepMs);
    var alt = altGetter(computeGeometry(t, latDeg, lonDeg));

    if (prevAlt < 0 && alt >= 0 && !rise) {
      var fracR = -prevAlt / (alt - prevAlt);
      rise = new Date(prevT.getTime() + fracR * (t.getTime() - prevT.getTime()));
    }
    if (prevAlt >= 0 && alt < 0 && rise && !set) {
      var fracS = prevAlt / (prevAlt - alt);
      set = new Date(prevT.getTime() + fracS * (t.getTime() - prevT.getTime()));
      break;
    }

    prevT = t;
    prevAlt = alt;
  }

  return { rise: rise, set: set };
}

/**
 * Saturn ring opening as 0-100 % of its maximum tilt, sampled at `date`.
 */
function saturnRingOpenPct(date, latDeg, lonDeg) {
  var geo = computeGeometry(date, latDeg, lonDeg);
  return Math.max(0, Math.min(100, Math.round((Math.abs(geo.saturnRingB) / 26.7) * 100)));
}

module.exports = {
  computeGeometry: computeGeometry,
  findRiseSet: findRiseSet,
  saturnRingOpenPct: saturnRingOpenPct
};
