// Shared XHR JSON request helper
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

module.exports = {
  xhrGetJSON: xhrGetJSON
};
