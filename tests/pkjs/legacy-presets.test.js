// The B&W example styles start from the square table with hand sizes scaled to 2/3.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const MOD = path.join(__dirname, '../../src/pkjs/example-style-presets.js');
function load(platformName) {
  const code = `global.Pebble = { getActiveWatchInfo: () => ({ platform: ${JSON.stringify(platformName)} }) };
    global.localStorage = { getItem: () => null, setItem() {} };
    console.log(JSON.stringify(require(${JSON.stringify(MOD)})));`;
  return JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
}
test('legacy hand sizes are 2/3 of the square ones', () => {
  const sq = load('emery'), lg = load('flint');
  let checked = 0;
  Object.keys(sq).forEach((k) => {
    ['Hour', 'Min', 'Sec'].forEach((h) => ['Length', 'Width', 'BackOffset'].forEach((f) => {
      const a = parseInt(sq[k].preset['hand' + h + f], 10), b = parseInt(lg[k].preset['hand' + h + f], 10);
      if (a > 0) { assert.strictEqual(b, Math.max(1, Math.round(a * 2 / 3)), k + h + f); checked++; }
      else assert.strictEqual(b, a);
    }));
    assert.strictEqual(lg[k].preset.handMinStyle, sq[k].preset.handMinStyle);
  });
  assert.ok(checked > 40);
});

test('hand presets: B&W table is about 2/3 of the colour one and only the B&W page uses it', () => {
  const code = `global.Pebble = { getActiveWatchInfo: () => ({ platform: 'flint' }) };
    global.localStorage = { getItem: () => null, setItem() {} };
    const l = require(${JSON.stringify(path.join(__dirname, '../../src/pkjs/presets-lookups.js'))});
    console.log(JSON.stringify({ c: l.HAND_PRESETS, b: l.HAND_PRESETS_LEGACY }));`;
  const { c, b } = JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
  assert.deepStrictEqual(Object.keys(b), Object.keys(c));
  Object.keys(c).forEach((k) => ['hour', 'min', 'sec'].forEach((h) => {
    const a = parseInt(c[k][h].Length, 10), x = parseInt(b[k][h].Length, 10);
    assert.strictEqual(x, Math.max(1, Math.round(a * 2 / 3)), k + h);
    assert.strictEqual(b[k][h].Style, c[k][h].Style);
  }));
  assert.ok(parseInt(b['1'].min.Length, 10) < parseInt(c['1'].min.Length, 10));
});
