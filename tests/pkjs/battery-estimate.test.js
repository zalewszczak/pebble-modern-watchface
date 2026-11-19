const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { estimateBatteryUsage: est, primitiveKinds } = require(path.join(__dirname, '../../src/pkjs/settings/battery-estimate.js'));

const ENV = { round: false, bw: false, avail: {}, primSeq: {}, primKind: {}, aqiPrims: [], issPrims: [], auroraPrims: [] };
const run = (s) => est(s || {}, ENV);
const row = (r, id) => r.rows.find((x) => x.id === id);

test('defaults: light config, 5 segments, "very low"', () => {
  const r = run();
  assert.strictEqual(r.segments, 5);
  assert.strictEqual(r.label, 'very low');
  assert.ok(r.total < 20);
});

test('second hand dominates and pushes the estimate to 1 segment', () => {
  const r = run({ CONFIG_SHOW_SECONDS: 'true' });
  assert.strictEqual(r.segments, 1);
  assert.strictEqual(r.rows[0].id, 'seconds');
  assert.ok(r.raw > 100);
  assert.ok(Math.abs(r.rows.reduce((a, x) => a + x.pct, 0) - 100) < 1e-6, 'scaled to 100%');
});

test('rows are sorted from the most taxing', () => {
  const r = run({ CONFIG_SHOW_SECONDS: 'true', CONFIG_HAND_HOUR_OUTLINE_ENABLED: 'true' });
  for (let i = 1; i < r.rows.length; i++) assert.ok(r.rows[i - 1].raw >= r.rows[i].raw);
});

test('battery saver reduces the seconds cost', () => {
  const a = run({ CONFIG_SHOW_SECONDS: 'true' });
  const b = run({ CONFIG_SHOW_SECONDS: 'true', CONFIG_BATTERY_SAVER_ENABLED: 'true' });
  assert.ok(b.raw < a.raw);
});

test('thick outline costs more than thin', () => {
  const thin = run({ CONFIG_HAND_HOUR_OUTLINE_ENABLED: 'true', CONFIG_OUTLINE_ENABLED: '1' });
  const thick = run({ CONFIG_HAND_HOUR_OUTLINE_ENABLED: 'true', CONFIG_OUTLINE_ENABLED: '2' });
  assert.ok(row(thick, 'hand_outline').raw > row(thin, 'hand_outline').raw);
});

test('shorter refresh interval costs more', () => {
  const slow = run({ CONFIG_UPDATE_MINS: '180' });
  const fast = run({ CONFIG_UPDATE_MINS: '15' });
  assert.ok(fast.raw > slow.raw);
});

test('hourly vibration adds a row', () => {
  const r = run({ CONFIG_HOURLY_VIBE_MODE: '1', CONFIG_HOURLY_VIBE_START_TIME: '08:00', CONFIG_HOURLY_VIBE_END_TIME: '20:00' });
  assert.ok(r.rows.some((x) => /vib/i.test(x.id)));
});

test('segment thresholds', () => {
  const f = (t) => (t < 20 ? 5 : t < 40 ? 4 : t < 60 ? 3 : t < 80 ? 2 : 1);
  assert.strictEqual(f(19.9), 5);
  assert.strictEqual(f(20), 4);
  assert.strictEqual(f(79.9), 2);
  assert.strictEqual(f(80), 1);
  const r = run({ CONFIG_SHOW_SECONDS: 'true' });
  assert.strictEqual(r.segments, f(r.total));
});

test('primitiveKinds classifies primitives', () => {
  const k = primitiveKinds({});
  assert.ok(k && typeof k === "object");
});

test('seconds always carry at least 60% of the total', () => {
  const heavy = { CONFIG_SHOW_SECONDS: 'true', CONFIG_HAND_HOUR_OUTLINE_ENABLED: 'true', CONFIG_HAND_MIN_OUTLINE_ENABLED: 'true',
    CONFIG_HAND_HOUR_TRANSLUCENT: 'true', CONFIG_UPDATE_MINS: '15', CONFIG_OUTLINE_ENABLED: '2', CONFIG_USE_CUSTOM_BG: 'true', CONFIG_BG_TRANSLUCENT: 'true' };
  const r = run(heavy);
  assert.ok(row(r, 'seconds').pct >= 59.99, String(row(r, 'seconds').pct));
  const c = run({ CONFIG_SHOW_SECONDS: 'true' });
  assert.ok(row(c, 'seconds').pct >= 59.99);
});

test('smooth second hand on shake costs nothing while the second hand is off', () => {
  const off = run({ CONFIG_SHAKE_ANIM_MODE: '1' });
  assert.ok(!row(off, 'shake_smooth'));
  const on = run({ CONFIG_SHAKE_ANIM_MODE: '1', CONFIG_SHOW_SECONDS: 'true' });
  assert.ok(row(on, 'shake_smooth'));
});
