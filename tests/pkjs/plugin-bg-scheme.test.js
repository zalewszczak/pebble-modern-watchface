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

test('custom picture brightness picks the scheme', () => {
  const codec = require('../../src/pkjs/bg-image/bg-image-codec.js');
  const mk = (v) => { // every pixel = v (6-bit), packed 4 pixels in 3 bytes, base64url
    const px = new Uint8Array(codec.BG_W * codec.BG_H).fill(v);
    const out = [];
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i], b = px[i + 1] || 0, c = px[i + 2] || 0, d = px[i + 3] || 0;
      out.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
    }
    const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let s = '', acc = 0, bits = 0;
    out.forEach((byte) => { acc = (acc << 8) | byte; bits += 8; while (bits >= 6) { bits -= 6; s += A[(acc >> bits) & 63]; } acc &= (1 << bits) - 1; });
    if (bits) s += A[(acc << (6 - bits)) & 63];
    return s;
  };
  assert.ok(codec.slotLuma(mk(63)) > 250, 'white is bright');
  assert.ok(codec.slotLuma(mk(0)) < 5, 'black is dark');
  assert.strictEqual(codec.slotLuma('nope'), null);
});
