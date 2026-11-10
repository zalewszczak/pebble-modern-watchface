'use strict';
// Take screenshots until `count` consecutive ones are identical (so a golden is never made from a flaky frame).
//   take(i)      -> decoded image { width, height, data } for take number i (0-based)
//   same(a, b)   -> true when the two images count as the same
// Returns { ok, takes, image }. A frame that differs from the previous one restarts the streak with itself.
function takeAgreed(count, maxTakes, take, same) {
  var streak = 0, prev = null, takes = 0;
  while (takes < maxTakes) {
    var img = take(takes);
    takes++;
    streak = (prev && same(prev, img)) ? streak + 1 : 1;
    prev = img;
    if (streak >= count) return { ok: true, takes: takes, image: img };
  }
  return { ok: false, takes: takes, image: prev };
}
module.exports = { takeAgreed: takeAgreed };
