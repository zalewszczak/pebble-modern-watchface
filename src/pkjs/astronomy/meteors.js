// meteor showers
var METEOR_SHOWERS = [
  { name: 'Quadrantids', startMonth: 11, startDay: 28, peakMonth: 0, peakDay: 3, endMonth: 0, endDay: 12 },
  { name: 'Lyrids', startMonth: 3, startDay: 16, peakMonth: 3, peakDay: 22, endMonth: 3, endDay: 25 },
  { name: 'Eta Aquariids', startMonth: 3, startDay: 19, peakMonth: 4, peakDay: 5, endMonth: 4, endDay: 28 },
  { name: 'Delta Aquariids', startMonth: 6, startDay: 12, peakMonth: 6, peakDay: 30, endMonth: 7, endDay: 23 },
  { name: 'Perseids', startMonth: 6, startDay: 17, peakMonth: 7, peakDay: 12, endMonth: 7, endDay: 24 },
  { name: 'Orionids', startMonth: 9, startDay: 2, peakMonth: 9, peakDay: 21, endMonth: 10, endDay: 7 },
  { name: 'Leonids', startMonth: 10, startDay: 6, peakMonth: 10, peakDay: 17, endMonth: 10, endDay: 30 },
  { name: 'Geminids', startMonth: 11, startDay: 4, peakMonth: 11, peakDay: 14, endMonth: 11, endDay: 17 },
  { name: 'Ursids', startMonth: 11, startDay: 17, peakMonth: 11, peakDay: 22, endMonth: 11, endDay: 26 }
];

function showerWindowForYear(shower, baseYear) {
  var wraps = shower.startMonth > shower.endMonth;
  var peakYear = (wraps && shower.peakMonth < shower.startMonth) ? baseYear + 1 : baseYear;
  var endYear = wraps ? baseYear + 1 : baseYear;
  return {
    start: new Date(baseYear, shower.startMonth, shower.startDay),
    peak: new Date(peakYear, shower.peakMonth, shower.peakDay),
    end: new Date(endYear, shower.endMonth, shower.endDay)
  };
}

function windowIntensity(window, date) {
  if (date < window.start || date > window.end) return 0;
  var daysFromPeak = Math.abs(date.getTime() - window.peak.getTime()) / 86400000;
  var halfWidthMs = date < window.peak ? (window.peak.getTime() - window.start.getTime()) : (window.end.getTime() - window.peak.getTime());
  var halfWidthDays = halfWidthMs / 86400000;
  if (halfWidthDays <= 0) return 100;
  return Math.max(0, Math.round(100 * (1 - daysFromPeak / halfWidthDays)));
}

function activeMeteorShower(date) {
  var year = date.getFullYear();
  var best = null, bestIntensity = 0;
  for (var i = 0; i < METEOR_SHOWERS.length; i++) {
    var shower = METEOR_SHOWERS[i];
    for (var yOffset = -1; yOffset <= 0; yOffset++) {
      var win = showerWindowForYear(shower, year + yOffset);
      var intensity = windowIntensity(win, date);
      if (intensity > bestIntensity) {
        bestIntensity = intensity;
        best = shower.name;
      }
    }
  }
  return best ? { name: best, intensity: bestIntensity } : null;
}

module.exports = {
  activeMeteorShower: activeMeteorShower
};
