// Which complication positions the current dial design leaves room for.
// One pure function, used by the phone (settings-codecs, config-state) and, via toString(), by the
// settings page itself, so the three can never disagree. It takes everything as arguments.
//
//   markerStyle  stored bigAnalogMarkerStyle id (0-19)
//   override     the "Incompatible complications" checkbox
//   env          { round: bool, bw: bool }
//
// Returns { upper, bottom, left, right, cornersGrayed }; left / right are the middle-left / middle-right
// lines, and cornersGrayed means the four corner complications are not allowed.
function computeSlotAvailability(markerStyle, override, env) {
  var style = markerStyle;
  var bitmap = (style >= 3 && style <= 7) || (style >= 11 && style <= 20);
  var avail;
  if (env.round) return { upper: true, bottom: true, left: true, right: true, cornersGrayed: true };
  if (env.bw) {
    // Legacy black-and-white watches. The designs listed here leave the middle-left / middle-right lines
    // free by default (Modern 3, Shadow 4, Tally 5, Rays 11, Modern P 14, Squared 15, Quickie 17,
    // Speed 18, Roman 19, and custom indices 8); the others need the "Incompatible" checkbox. Corners
    // need it too, except for Tally, Rays, Speed and custom indices, whose art leaves the corners free.
    var sideFree = !bitmap || [3, 4, 5, 11, 14, 15, 17, 18, 19].indexOf(style) >= 0;
    var cornersFree = !bitmap || style === 5 || style === 11 || style === 18;
    return {
      upper: true, bottom: true,
      left: sideFree || override, right: sideFree || override,
      cornersGrayed: !(cornersFree || override)
    };
  }
  if (style >= 11) style = 7;
  if (!bitmap && style !== 7) {
    avail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: false };
  } else if (style === 3 || style === 4 || style === 6) {
    avail = { upper: true, bottom: true, left: override, right: override, cornersGrayed: !override };
  } else if (style === 5) {
    avail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: false };
  } else if (style === 7) {
    avail = { upper: true, bottom: true, left: true, right: true, cornersGrayed: !override };
  } else {
    avail = { upper: true, bottom: override, left: override, right: override, cornersGrayed: !override };
  }
  return avail;
}

module.exports = { computeSlotAvailability: computeSlotAvailability };
