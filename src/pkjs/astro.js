/**
 * astro.js -- phone-side (PKJS) astronomy facade.
 *
 * Low-precision Meeus series for the Sun, Moon and planets, used by
 * the watch features (moon phase, sun event, planets visible, next
 * planet rise, Saturn rings, meteor showers, ISS passes, aurora).
 * Domain modules live under astronomy/: angles.js, sun.js, moon.js,
 * planets.js, geometry.js (alt/az + rise/set), meteors.js, aurora.js,
 * iss-orbit.js. This file re-exports the public API.
 */

var geometry = require('./astronomy/geometry');
var moon = require('./astronomy/moon');
var meteors = require('./astronomy/meteors');
var aurora = require('./astronomy/aurora');
var issOrbit = require('./astronomy/iss-orbit');

module.exports = {
  computeGeometry: geometry.computeGeometry,
  findRiseSet: geometry.findRiseSet,
  saturnRingOpenPct: geometry.saturnRingOpenPct,
  computeMoonPhase: moon.computeMoonPhase,
  activeMeteorShower: meteors.activeMeteorShower,
  issLookAngle: issOrbit.issLookAngle,
  findNextIssPass: issOrbit.findNextIssPass,
  geomagneticLatitudeDeg: aurora.geomagneticLatitudeDeg,
  auroraVisibilityScore: aurora.auroraVisibilityScore
};
