// astro.js -- phone-side (PKJS) astronomy facade.
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
