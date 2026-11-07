// Which data permissions the phone / Pebble app has refused. Recorded when a request fails with a
// "permission denied" answer and cleared when the same request later succeeds, so the settings page
// can warn next to the options that depend on the data. Persisted because the settings page is opened
// in a separate run of the phone code than the one that made the request.
//
// Kinds: location (phone GPS), calendar, music, phone (phone plugin), weather (weather plugin),
//        plugin:<key> (a generic plugin text slot).
var KEY = 'PERMISSIONS_DENIED';

function load() {
  try { var o = JSON.parse(localStorage.getItem(KEY) || '{}'); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; }
}
function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { } }

function mark(kind, denied) {
  var o = load();
  if (denied) { if (o[kind]) return; o[kind] = Date.now(); }
  else { if (!o[kind]) return; delete o[kind]; }
  save(o);
}
function get() { return load(); }
module.exports = { mark: mark, get: get };
