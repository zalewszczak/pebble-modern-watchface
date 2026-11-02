// iss.js -- fetches the ISS's current orbital elements from
var astro = require('./astro.js');

var ISS_CATALOG_NUMBER = 25544;

function xhrGetJSON(url, timeoutMs, cb) {
  var xhr = new XMLHttpRequest();
  var done = false;
  xhr.timeout = timeoutMs || 8000;
  xhr.onload = function () {
    if (done) return;
    done = true;
    if (xhr.status >= 200 && xhr.status < 300) {
      try {
        cb(null, JSON.parse(xhr.responseText));
      } catch (e) {
        cb(e);
      }
    } else {
      cb(new Error('HTTP ' + xhr.status));
    }
  };
  xhr.onerror = function () {
    if (done) return;
    done = true;
    cb(new Error('network error'));
  };
  xhr.ontimeout = function () {
    if (done) return;
    done = true;
    cb(new Error('timeout'));
  };
  xhr.open('GET', url, true);
  xhr.send();
}

function getIssPosition(lat, lon, cb) {
  var url = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=' + ISS_CATALOG_NUMBER + '&FORMAT=json';
  xhrGetJSON(url, 8000, function (err, json) {
    if (err) return cb(err, null);
    try {
      var rec = Array.isArray(json) ? json[0] : json;
      if (!rec || typeof rec.MEAN_MOTION !== 'number') {
        return cb(new Error('unexpected Celestrak response shape'), null);
      }
      var omm = {
        epoch: new Date(rec.EPOCH + 'Z'),
        meanMotionRevPerDay: rec.MEAN_MOTION,
        eccentricity: rec.ECCENTRICITY,
        inclinationDeg: rec.INCLINATION,
        raanDeg: rec.RA_OF_ASC_NODE,
        argPerigeeDeg: rec.ARG_OF_PERICENTER,
        meanAnomalyDeg: rec.MEAN_ANOMALY
      };
      var now = new Date();
      var look = astro.issLookAngle(omm, now, lat, lon);
      var nextPass = astro.findNextIssPass(omm, now, lat, lon);
      cb(null, { alt: look.alt, az: look.az, distanceKm: look.distanceKm, epoch: omm.epoch, nextPass: nextPass });
    } catch (e) {
      cb(e, null);
    }
  });
}

module.exports = { getIssPosition: getIssPosition };
