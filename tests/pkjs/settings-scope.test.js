// Per-platform settings storage (src/pkjs/settings/settings.js), run in a child process per platform
// because the platform is detected once at load time.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const SETTINGS = path.join(__dirname, '../../src/pkjs/settings/settings.js');
function run(platformName, script) {
  const code = `
    const store = JSON.parse(process.env.STORE || '{}');
    global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }, get length() { return Object.keys(store).length; }, key: i => Object.keys(store)[i] };
    global.Pebble = { getActiveWatchInfo: () => ({ platform: ${JSON.stringify(platformName)} }) };
    const s = require(${JSON.stringify(SETTINGS)});
    ${script}
    console.log(JSON.stringify(store));`;
  return JSON.parse(execFileSync(process.execPath, ['-e', code], { env: Object.assign({}, process.env, { STORE: process.env.STORE_IN || '{}' }), encoding: 'utf8' }).trim().split('\n').pop());
}
function withStore(obj, fn) { process.env.STORE_IN = JSON.stringify(obj); try { return fn(); } finally { delete process.env.STORE_IN; } }

test('emery keeps the plain key names', () => {
  const st = run('emery', "s.setSetting('CONFIG_CORNER_TL', '5'); s.setSetting('CONFIG_UPDATE_MINS', '30');");
  assert.strictEqual(st.CONFIG_CORNER_TL, '5');
  assert.strictEqual(st.CONFIG_UPDATE_MINS, '30');
});

test('gabbro and B&W write visual settings under their own suffix and share the rest', () => {
  const g = run('gabbro', "s.setSetting('CONFIG_CORNER_TL', '5'); s.setSetting('CONFIG_UPDATE_MINS', '30'); s.setSetting('CONFIG_TEMP_UNIT', '1');");
  assert.strictEqual(g.CONFIG_CORNER_TL_R, '5');
  assert.strictEqual(g.CONFIG_CORNER_TL, undefined);
  assert.strictEqual(g.CONFIG_UPDATE_MINS, '30');
  assert.strictEqual(g.CONFIG_TEMP_UNIT, '1');
  const b = run('diorite', "s.setSetting('CONFIG_HAND_HOUR_WIDTH', '4'); s.setSetting('CONFIG_LOC_TRIGGER_KM', '50');");
  assert.strictEqual(b.CONFIG_HAND_HOUR_WIDTH_BW, '4');
  assert.strictEqual(b.CONFIG_LOC_TRIGGER_KM, '50');
  const f = run('flint', "s.setSetting('CONFIG_HAND_HOUR_WIDTH', '4');");
  assert.strictEqual(f.CONFIG_HAND_HOUR_WIDTH_BW, '4'); // flint and diorite share a screen, so they share a look
});

test('a platform first takes over a copy of the old shared settings, then the two diverge', () => {
  const st = withStore({ CONFIG_CORNER_TL: '7', CONFIG_BG_SLOT_1: 'emery-picture', CONFIG_TEMP_UNIT: '2' }, () =>
    run('gabbro', "s.setSetting('CONFIG_CORNER_TL', '9'); console.error('');"));
  assert.strictEqual(st.CONFIG_CORNER_TL, '7');        // emery's value untouched
  assert.strictEqual(st.CONFIG_CORNER_TL_R, '9');      // gabbro's own
  assert.strictEqual(st.CONFIG_BG_SLOT_1_R, undefined); // pictures are screen sized, not copied
  const inherited = withStore({ CONFIG_CORNER_TL: '7' }, () => run('diorite', "if (s.getSetting('CONFIG_CORNER_TL', 'x') !== '7') throw new Error('not adopted');"));
  assert.strictEqual(inherited.CONFIG_CORNER_TL_BW, '7');
});
