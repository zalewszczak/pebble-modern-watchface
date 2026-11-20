const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const store = {
  CONFIG_CORNER_TL: '203',            // emery: plugin slot 3
  CONFIG_CORNER_TR_CUSTOM_PRIMS: '143:5,10', // emery: plugin text in slot 5
  CONFIG_UPPER_MIDDLE_LINE1_CONTENT_R: '207', // round
  CONFIG_CORNER_BL_BW: '211',         // b&w
  CONFIG_CORNER_BR_BW: '100'          // not a plugin
};
global.localStorage = {
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i],
  getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }
};
const { otherPlatformSlotsInUse: other } = require(path.join(__dirname, '../../src/pkjs/config/config-plugins.js'));
const idx = (a) => a.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);

test('slots used by the other platforms are reported (emery is the current platform)', () => {
  assert.deepStrictEqual(idx(other('')), [7, 11]);
});
test('round current: emery and b&w slots are reported', () => {
  assert.deepStrictEqual(idx(other('_R')), [3, 5, 11]);
});
test('b&w current: emery and round slots are reported', () => {
  assert.deepStrictEqual(idx(other('_BW')), [3, 5, 7]);
});
