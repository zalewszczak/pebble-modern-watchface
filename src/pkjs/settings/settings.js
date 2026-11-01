// ---- Local settings storage ----------------------------------------------
// Reads and writes raw localStorage values. settings-codecs.js validates
// and converts these values for the watch protocol.

function getSetting(key, fallback) {
  var v = localStorage.getItem(key);
  return (v === null || v === undefined || v === '') ? fallback : v;
}

function setSetting(key, value) {
  if (value === null || value === undefined) return;
  localStorage.setItem(key, value);
}

module.exports = {
  getSetting: getSetting,
  setSetting: setSetting
};
