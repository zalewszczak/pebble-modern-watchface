// Lets the settings page read the watchface's GitHub folder through the phone app when the page itself cannot
// (the page's web view may block cross-origin requests). Only GitHub hosts are fetched.
var ALLOWED = /^https:\/\/(api\.github\.com|raw\.githubusercontent\.com)\//;
var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes) {
  var out = '', i;
  for (i = 0; i + 2 < bytes.length; i += 3) {
    var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64.charAt(n >> 18) + B64.charAt((n >> 12) & 63) + B64.charAt((n >> 6) & 63) + B64.charAt(n & 63);
  }
  var rest = bytes.length - i;
  if (rest === 1) { var a = bytes[i] << 16; out += B64.charAt(a >> 18) + B64.charAt((a >> 12) & 63) + '=='; }
  else if (rest === 2) { var b = (bytes[i] << 16) | (bytes[i + 1] << 8); out += B64.charAt(b >> 18) + B64.charAt((b >> 12) & 63) + B64.charAt((b >> 6) & 63) + '='; }
  return out;
}

// reply({ status, text } | { status, b64 } | { error })
function fetchUrl(url, binary, reply) {
  if (typeof url !== 'string' || !ALLOWED.test(url)) { reply({ error: 'url not allowed' }); return; }
  var xhr = new XMLHttpRequest();
  var done = false;
  function finish(obj) { if (!done) { done = true; reply(obj); } }
  xhr.timeout = 15000;
  if (binary) xhr.responseType = 'arraybuffer';
  xhr.onload = function () {
    if (xhr.status < 200 || xhr.status >= 300) {
      var body = '';
      try { body = binary ? '' : String(xhr.responseText).slice(0, 300); } catch (e) { }
      finish({ status: xhr.status, error: 'HTTP ' + xhr.status, text: body });
      return;
    }
    try {
      if (binary) finish({ status: xhr.status, b64: toBase64(new Uint8Array(xhr.response)) });
      else finish({ status: xhr.status, text: xhr.responseText });
    } catch (e) { finish({ error: 'read failed: ' + e.message }); }
  };
  xhr.onerror = function () { finish({ error: 'network error (phone app)' }); };
  xhr.ontimeout = function () { finish({ error: 'timeout (phone app)' }); };
  try {
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Accept', binary ? 'image/png' : 'application/vnd.github+json');
    xhr.send();
  } catch (e) { finish({ error: e.message }); }
}

module.exports = { fetchUrl: fetchUrl, toBase64: toBase64 };
