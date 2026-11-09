'use strict';
// "HH:MM:SS" helpers for pinning the emulator clock.
function parse(t) {
  var m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(t);
  if (!m) throw new Error('clock time must be HH:MM:SS, got "' + t + '"');
  return { h: +m[1], m: +m[2], s: +m[3] };
}
function pad(n) { return ('0' + n).slice(-2); }
// The same time of day `minutes` earlier (wraps over midnight), seconds kept.
function minusMinutes(t, minutes) {
  var p = parse(t);
  var total = ((p.h * 60 + p.m - minutes) % 1440 + 1440) % 1440;
  return pad(Math.floor(total / 60)) + ':' + pad(total % 60) + ':' + pad(p.s);
}
module.exports = { parse: parse, minusMinutes: minusMinutes };
