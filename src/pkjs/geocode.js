// geocode.js -- turns lat/lon into a short human-readable place name
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

function reverseGeocode(lat, lon, cb) {
  var url = 'https://nominatim.openstreetmap.org/reverse' +
            '?format=jsonv2' +
            '&lat=' + encodeURIComponent(lat) +
            '&lon=' + encodeURIComponent(lon) +
            '&zoom=10' +
            '&addressdetails=1';
  xhrGetJSON(url, 8000, function (err, json) {
    if (err) return cb(err, null);
    try {
      var addr = json.address || {};
      var place = addr.city || addr.town || addr.village || addr.hamlet ||
                   addr.municipality || addr.county || json.name;
      var region = addr.state || addr.country;
      var name;
      if (place && region && place !== region) {
        name = place + ', ' + region;
      } else {
        name = place || addr.country || null;
      }
      if (!name) return cb(new Error('no place name in response'), null);
      if (name.length > 28) name = name.substring(0, 25) + '...';
      cb(null, name);
    } catch (e) {
      cb(e, null);
    }
  });
}

module.exports = { reverseGeocode: reverseGeocode };
