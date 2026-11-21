const test = require('node:test');
const assert = require('node:assert');
const { remapPresetPluginSlots } = require('../../src/pkjs/settings/plugin-slot-remap');
const PT = 77;
const none = new Array(12).fill(false);

test('a preset keeps working when its slots are already in the table at other positions', () => {
  const cur = ['', 'a|b|c', '', '', '', '', '', '', '', '', '', ''];
  const preset = { cornerTL: '200', cornerTLCustomPrims: PT + ',1:1,' + PT + ':0', __pluginSlots: ['a|b|c', '', '', '', '', '', '', '', '', '', '', ''] };
  const r = remapPresetPluginSlots(preset, cur, none, PT);
  assert.strictEqual(r.slots[1], 'a|b|c');
  assert.strictEqual(r.preset.cornerTL, '201');
  assert.strictEqual(r.preset.cornerTLCustomPrims, PT + ':1,1:1,' + PT + ':1');
});

test('slots used by another platform are never overwritten by a loaded style', () => {
  const cur = ['keep|me|x', '', '', '', '', '', '', '', '', '', '', ''];
  const other = none.slice(); other[0] = true;
  const preset = { cornerTR: '200', __pluginSlots: ['new|src|y', '', '', '', '', '', '', '', '', '', '', ''] };
  const r = remapPresetPluginSlots(preset, cur, other, PT);
  assert.strictEqual(r.slots[0], 'keep|me|x');
  assert.strictEqual(r.slots[1], 'new|src|y');
  assert.strictEqual(r.preset.cornerTR, '201');
});

test('calendar virtual slots (aux 12-15) and non-plugin ids are left alone', () => {
  const preset = { cornerBLCustomPrims: PT + ':12,5:3', cornerBL: '237', __pluginSlots: ['s|t|u', '', '', '', '', '', '', '', '', '', '', ''] };
  const r = remapPresetPluginSlots(preset, new Array(12).fill(''), none, PT);
  assert.strictEqual(r.preset.cornerBLCustomPrims, PT + ':12,5:3');
  assert.strictEqual(r.preset.cornerBL, '237');
});

test('a style without a slot table changes nothing', () => {
  const r = remapPresetPluginSlots({ cornerTL: '5' }, ['x', '', '', '', '', '', '', '', '', '', '', ''], none, PT);
  assert.strictEqual(r.slots[0], 'x');
  assert.strictEqual(r.preset.cornerTL, '5');
});

test('other-platform scan sees analog-context keys', () => {
  const store = { CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG_R: '77:4', CONFIG_MIDDLE_LEFT_LINE1_CONTENT_ANALOG_R: '203', CONFIG_CORNER_TL_SHAKE_R: '205' };
  global.localStorage = { get length() { return Object.keys(store).length; }, key: (i) => Object.keys(store)[i], getItem: (k) => store[k] };
  const ids = require('../../src/pkjs/config/primitive-ids-generated');
  store.CONFIG_UPPER_MIDDLE_LINE1_CUSTOM_PRIMS_ANALOG_R = ids.PRIM_PLUGIN_TEXT + ':4';
  const used = require('../../src/pkjs/config/config-plugins').otherPlatformSlotsInUse('');
  assert.ok(used[4] && used[3] && used[5]);
  delete global.localStorage;
});
