const test = require('node:test');
const assert = require('node:assert');

global.localStorage = (() => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; } }; })();
global.Pebble = { getActiveWatchInfo: () => ({ platform: 'gabbro' }), addEventListener() {} };

test('downloaded-index sync stores, validates and clears an image', () => {
  const sync = require('../../src/pkjs/bg-image/marker-image-sync');
  const w = 40, h = 3, stride = 8; // ((40+31)>>5)<<2
  const bytes = new Array(stride * h).fill(0).map((_, i) => i & 0xFF);
  const b64 = Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  sync.applyUpdate({ name: 'a_b.png', w, h, data: b64 });
  assert.deepStrictEqual(sync.current(), { name: 'a_b.png', w, h, data: b64, meta: null });
  sync.applyUpdate({ name: 'bad.png', w, h, data: b64.slice(2) }); // wrong size: ignored
  assert.strictEqual(sync.current().name, 'a_b.png');
  sync.applyUpdate({ clear: true });
  assert.strictEqual(sync.current(), null);
});

test('settings page script with the Downloaded popup is valid JavaScript', () => {
  const m = require('../../src/pkjs/config/config-downloaded');
  assert.doesNotThrow(() => new Function(m.downloadedScript({ dlIndex: null })));
  assert.match(m.moreViewHtml(), /dlGrid/);
  assert.match(m.uploadViewHtml(), /dlLibGrid/);
  const pop = require('../../src/pkjs/config/config-marker-popup');
  assert.doesNotThrow(() => new Function(pop.popupScript({ userMarkerPresets: [], markerApplyTick: '3' })));
  ['none', 'bitmaps', 'procedural', 'edit', 'more', 'upload'].forEach((t) => assert.match(pop.popupHtml({}), new RegExp('msTabClick\\(\'' + t)));
  assert.match(pop.popupHtml({}), /REQUIREMENTS/);
});

test('uploaded indices library: add, replace, remove, validate', () => {
  const sync = require('../../src/pkjs/bg-image/marker-image-sync');
  const mk = (n) => ({ name: n, w: 8, h: 1, data: Buffer.alloc(4).toString('base64').replace(/=+$/, '') });
  sync.applyLibraryOps({ add: [mk('a'), mk('b'), { name: 'bad', w: 8, h: 1, data: 'AA' }], remove: [] });
  assert.deepStrictEqual(sync.library().map((e) => e.name), ['a', 'b']);
  sync.applyLibraryOps({ add: [mk('a')], remove: ['b'] });
  assert.deepStrictEqual(sync.library().map((e) => e.name), ['a']);
});
