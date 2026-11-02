// servicelog.js -- shared error classification plus a small persisted
var LOG_MAX_ENTRIES = 10;

var ERR_NETWORK = 1;
var ERR_TIMEOUT = 2;
var ERR_PARSE = 3;
var ERR_DATA = 4;

function classifyError(err) {
  if (!err) return { code: 0, label: 'OK' };
  var msg = err.message || String(err);
  var m = /^HTTP (\d+)(?:\s+-\s+(.+))?$/.exec(msg);
  if (m) {
    var status = parseInt(m[1], 10);
    return { code: status, label: m[2] || ('HTTP ' + status) };
  }
  if (msg === 'network error') return { code: ERR_NETWORK, label: 'Network error' };
  if (msg === 'timeout') return { code: ERR_TIMEOUT, label: 'Timeout' };
  if (err instanceof SyntaxError || /JSON/i.test(msg)) return { code: ERR_PARSE, label: 'Bad response: ' + msg };
  return { code: ERR_DATA, label: msg };
}

function logKey(service) { return 'SVCLOG_' + service; }

function loadLog(service) {
  try {
    var raw = localStorage.getItem(logKey(service));
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveLog(service, entries) {
  try { localStorage.setItem(logKey(service), JSON.stringify(entries)); } catch (e) { }
}

function recordAttempt(service, err) {
  var cls = classifyError(err);
  var entries = loadLog(service);
  entries.push({ t: Date.now(), ok: cls.code === 0, code: cls.code, label: cls.label });
  if (entries.length > LOG_MAX_ENTRIES) entries = entries.slice(entries.length - LOG_MAX_ENTRIES);
  saveLog(service, entries);
  return cls;
}

function serviceStatus(service) {
  var entries = loadLog(service);
  if (entries.length === 0) return 'gray';
  var last = entries[entries.length - 1];
  if (last.ok) return 'green';
  var allFailed = entries.every(function (e) { return !e.ok; });
  return allFailed ? 'red' : 'yellow';
}

var SERVICES = ['weather', 'openweathermap', 'airquality', 'aurora', 'iss', 'geocode'];
var SERVICE_LABELS = {
  weather: 'Weather',
  openweathermap: 'OpenWeatherMap',
  airquality: 'Air quality',
  aurora: 'Aurora',
  iss: 'ISS',
  geocode: 'Geocoding'
};

function snapshotAll() {
  var out = {};
  SERVICES.forEach(function (service) {
    out[service] = { status: serviceStatus(service), log: loadLog(service) };
  });
  return out;
}

module.exports = {
  classifyError: classifyError,
  recordAttempt: recordAttempt,
  loadLog: loadLog,
  serviceStatus: serviceStatus,
  snapshotAll: snapshotAll,
  SERVICES: SERVICES,
  SERVICE_LABELS: SERVICE_LABELS
};
