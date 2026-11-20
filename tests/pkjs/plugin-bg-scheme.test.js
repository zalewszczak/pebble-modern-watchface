const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
const settings = require(path.join(__dirname, '../../src/pkjs/settings/settings.js'));
const bg = require(path.join(__dirname, '../../src/pkjs/bg-image/plugin-bg.js'));

test('plugin background brightness verdict survives a moment without a picture', () => {
  settings.setSetting('CONFIG_USE_PLUGIN_BG', 'true');
  settings.setSetting('CONFIG_PLUGIN_BG_AUTO_SCHEME', 'true');
  assert.strictEqual(bg.schemeOverride(), 0, 'nothing measured yet');
  store.PLUGIN_BG_LAST_NIGHT = '1';           // verdict saved by an earlier run
  assert.strictEqual(bg.schemeOverride(), 2, 'no picture right now: keep the saved verdict');
  settings.setSetting('CONFIG_PLUGIN_BG_AUTO_SCHEME', 'false');
  assert.strictEqual(bg.schemeOverride(), 0, 'option off: sunrise/sunset again');
  assert.strictEqual(store.PLUGIN_BG_LAST_NIGHT, undefined);
});
