const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const store = {};
global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
global.Pebble = { getActiveWatchInfo: () => ({ platform: 'emery' }), addEventListener() {} };

test('JS margin tables mirror BITMAP_STYLE_MARGINS in feature_layout.c', () => {
  const c = fs.readFileSync(path.join(__dirname, '../../src/c/features/feature_layout.c'), 'utf8');
  const blocks = [...c.matchAll(/static const BitmapMarginRecord BITMAP_STYLE_MARGINS\[\] = \{\n([\s\S]*?)\n  \};/g)].map((m) => m[1]);
  assert.strictEqual(blocks.length, 3);
  const tables = require('../../src/pkjs/data/index-margins').TABLES;
  ['bw', 'round', 'square'].forEach((name, i) => {
    const fromC = {};
    for (const m of blocks[i].matchAll(/\{\s*(\d+), \{ (\d+), (\d+), (\d+), (\d+) \} \}/g)) fromC[m[1]] = [+m[2], +m[3], +m[4], +m[5]];
    assert.deepStrictEqual(tables[name], fromC, name);
  });
});

test('indexMarginsBytes: automatic, manual, downloaded metadata', () => {
  const codecs = require('../../src/pkjs/settings/settings-codecs');
  const settings = require('../../src/pkjs/settings/settings');
  const sync = require('../../src/pkjs/bg-image/marker-image-sync');
  settings.setSetting('CONFIG_INDEX_MARGIN_AUTO', 'true');
  settings.setSetting('CONFIG_BIG_ANALOG_MARKER_STYLE', '3');
  assert.deepStrictEqual(codecs.indexMarginsBytes(), [0, 0, 0, 0, 0]);

  settings.setSetting('CONFIG_INDEX_MARGIN_AUTO', 'false');
  ['TOP', 'BOTTOM', 'LEFT', 'RIGHT'].forEach((k, i) => settings.setSetting('CONFIG_INDEX_MARGIN_' + k, String([10, 20, 30, 40][i])));
  assert.deepStrictEqual(codecs.indexMarginsBytes(), [1, 10, 20, 30, 40]);

  settings.setSetting('CONFIG_INDEX_MARGIN_AUTO', 'true');
  settings.setSetting('CONFIG_BIG_ANALOG_MARKER_STYLE', '20');
  settings.setSetting('CONFIG_LAST_INDEX_STYLE', '7');
  const last = require('../../src/pkjs/data/index-margins').forStyle(7);
  assert.deepStrictEqual(codecs.indexMarginsBytes(), [1].concat(last)); // no metadata: the last indices style's values

  const w = 8, h = 2, bytes = Buffer.alloc(4 * h);
  const b64 = bytes.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  sync.applyUpdate({ name: 'x.png', w, h, data: b64, meta: { name: 'X', author: 'me', margins: { top: 1, bottom: 2, left: 3, right: 4 }, junk: 1 } });
  assert.deepStrictEqual(codecs.indexMarginsBytes(), [1, 1, 2, 3, 4]);
  assert.strictEqual(sync.current().meta.author, 'me');
  assert.strictEqual(sync.current().meta.junk, undefined);
  sync.applyUpdate({ clear: true });
});

test('cleanMeta rejects bad margins and long text', () => {
  const sync = require('../../src/pkjs/bg-image/marker-image-sync');
  assert.strictEqual(sync.cleanMeta({ margins: [1, 2, 3, 999] }).margins, null);
  assert.strictEqual(sync.cleanMeta({ description: 'x'.repeat(1000) }).description.length, 300);
  assert.strictEqual(sync.cleanMeta('nope'), null);
});
