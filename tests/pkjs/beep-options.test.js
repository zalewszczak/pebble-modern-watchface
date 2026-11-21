const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const opts = require('../../src/pkjs/config/beep-options');

function enumFromHeader() {
  const h = fs.readFileSync(path.join(__dirname, '../../src/c/timing/beep.h'), 'utf8');
  const body = h.match(/typedef enum \{([\s\S]*?)\} BeepKind;/)[1].replace(/\/\/.*$/gm, '');
  const names = body.split(',').map((x) => x.trim()).filter((x) => /^BEEP_[A-Z_]+/.test(x)).map((x) => x.replace(/\s*=.*/, ''));
  return names; // index = value
}

test('sound options use the ids of BeepKind in beep.h', () => {
  const names = enumFromHeader();
  assert.strictEqual(names[names.length - 1], 'BEEP_KIND_COUNT');
  [opts.HOURLY, opts.DISCONNECT].forEach((list) => {
    list.filter((o) => !o.group).forEach((o) => assert.strictEqual(names[o.value], 'BEEP_' + o.name, o.label));
  });
});

test('every sound can be picked somewhere and values are unique per list', () => {
  const names = enumFromHeader();
  const all = new Set(opts.HOURLY.concat(opts.DISCONNECT).filter((o) => !o.group).map((o) => o.value));
  for (let i = 0; i < names.length - 1; i++) assert.ok(all.has(i), names[i] + ' is not offered');
  [opts.HOURLY, opts.DISCONNECT].forEach((list) => {
    const v = list.filter((o) => !o.group).map((o) => o.value);
    assert.strictEqual(new Set(v).size, v.length);
  });
});

test('beep.c sound table follows the enum order and every sound starts after a lead rest and stays short', () => {
  const c = fs.readFileSync(path.join(__dirname, '../../src/c/timing/beep.c'), 'utf8');
  const names = enumFromHeader();
  const table = c.match(/SOUNDS\[\] = \{([\s\S]*?)\};/)[1];
  const order = [...table.matchAll(/SND\((\w+)\)|\{ NULL, 0 \}/g)].map((m) => m[1] || 'MORSE_HOUR');
  const expected = names.slice(1, -1).map((n) => n.replace('BEEP_', ''));
  const norm = (x) => x.replace('MORSE_HOUR', 'MORSE');
  assert.deepStrictEqual(order.map(norm), expected.map(norm));
  assert.ok(/LEAD_REST_MS 250/.test(c));
  // total length of each table below 2.5 s including the 250 ms lead rest
  for (const m of c.matchAll(/static const uint8_t S_(\w+)\[\] = \{([^}]*)\}/g)) {
    const ms = [...m[2].matchAll(/N\((\d+), (\d+)\)/g)].reduce((a, n) => a + Number(n[2]), 0);
    assert.ok(ms + 250 <= 2500, m[1] + ' ' + ms);
  }
});

test('beep volume code is 10-100 in steps of 10, default 50', () => {
  const store = {};
  global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, key: () => null, length: 0 };
  const codecs = require('../../src/pkjs/settings/settings-codecs');
  assert.strictEqual(codecs.beepVolumeCode(), 50);
  store.CONFIG_BEEP_VOLUME = '73'; assert.strictEqual(codecs.beepVolumeCode(), 70);
  store.CONFIG_BEEP_VOLUME = '3'; assert.strictEqual(codecs.beepVolumeCode(), 10);
  store.CONFIG_BEEP_VOLUME = '500'; assert.strictEqual(codecs.beepVolumeCode(), 100);
  store.CONFIG_HOURLY_VIBE_SOUND = '4'; assert.strictEqual(codecs.hourlyVibeSoundCode(), 4);
  store.CONFIG_HOURLY_VIBE_SOUND = '35'; assert.strictEqual(codecs.hourlyVibeSoundCode(), 0); // a disconnect-only sound
  delete global.localStorage;
});
