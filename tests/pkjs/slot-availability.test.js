const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { computeSlotAvailability: avail } = require(path.join(__dirname, '../../src/pkjs/settings/slot-availability.js'));

const BW = { bw: true, round: false }, COLOR = { bw: false, round: false }, ROUND = { bw: false, round: true };
// bigAnalogMarkerStyle ids on the B&W watches
const NAMES = { 3: 'Modern', 4: 'Shadow', 5: 'Tally', 6: 'Bell', 7: 'Fancy', 8: 'custom', 11: 'Rays', 12: 'Heavy', 13: 'Classy',
  14: 'Modern P', 15: 'Squared', 16: 'Maurice', 17: 'Quickie', 18: 'Speed', 19: 'Roman' };

test('B&W: middle-left / middle-right lines are free by default for the listed indices', () => {
  [3, 4, 5, 8, 11, 14, 15, 17, 18, 19].forEach((id) => {
    const a = avail(id, false, BW);
    assert.ok(a.left && a.right, NAMES[id] + ' should allow the middle lines');
  });
});

test('B&W: other bitmap indices need the "Incompatible complications" switch for the middle lines', () => {
  [6, 7, 12, 13, 16].forEach((id) => {
    assert.deepStrictEqual([avail(id, false, BW).left, avail(id, false, BW).right], [false, false], NAMES[id]);
    assert.deepStrictEqual([avail(id, true, BW).left, avail(id, true, BW).right], [true, true], NAMES[id] + ' + override');
  });
});

test('B&W: corners are free for Tally, Rays, Speed and custom indices, blocked behind the switch elsewhere', () => {
  [5, 8, 11, 18].forEach((id) => assert.strictEqual(avail(id, false, BW).cornersGrayed, false, NAMES[id]));
  [3, 4, 6, 7, 12, 13, 14, 15, 16, 17, 19].forEach((id) => {
    assert.strictEqual(avail(id, false, BW).cornersGrayed, true, NAMES[id]);
    assert.strictEqual(avail(id, true, BW).cornersGrayed, false, NAMES[id] + ' + override');
  });
});

test('B&W: designs without bitmap indices have no restriction', () => {
  [0, 1, 2, 9, 10].forEach((id) => assert.deepStrictEqual(avail(id, false, BW), { upper: true, bottom: true, left: true, right: true, cornersGrayed: false }));
});

test('colour watches keep their rules; round shows every edge line and no corners', () => {
  assert.deepStrictEqual(avail(3, false, COLOR), { upper: true, bottom: true, left: false, right: false, cornersGrayed: true });
  assert.deepStrictEqual(avail(3, true, COLOR), { upper: true, bottom: true, left: true, right: true, cornersGrayed: false });
  assert.deepStrictEqual(avail(5, false, COLOR), { upper: true, bottom: true, left: true, right: true, cornersGrayed: false });
  assert.deepStrictEqual(avail(12, false, COLOR), { upper: true, bottom: true, left: true, right: true, cornersGrayed: true });
  assert.deepStrictEqual(avail(3, false, ROUND), { upper: true, bottom: true, left: true, right: true, cornersGrayed: true });
});

test('the settings page gets the same function', () => {
  const src = avail.toString();
  const injected = new Function('return (' + src + ')')();
  assert.deepStrictEqual(injected(11, false, BW), avail(11, false, BW));
});
