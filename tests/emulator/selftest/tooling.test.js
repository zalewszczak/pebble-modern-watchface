'use strict';
// Self-tests for the emulator test tooling itself (no emulator needed): npm test / node --test emulator/selftest
var test = require('node:test');
var assert = require('node:assert');
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var png = require('../lib/png');
var compare = require('../lib/compare').compare;
var messages = require('../lib/messages');
var cli = require('../cli.json');

var EMU = path.resolve(__dirname, '..');
var PROJECT = path.resolve(EMU, '..', '..');

function solid(w, h, rgba) {
  var d = Buffer.alloc(w * h * 4);
  for (var i = 0; i < w * h; i++) { d[i * 4] = rgba[0]; d[i * 4 + 1] = rgba[1]; d[i * 4 + 2] = rgba[2]; d[i * 4 + 3] = rgba[3]; }
  return { width: w, height: h, data: d };
}

test('png encode/decode round trip', function () {
  var img = solid(5, 3, [10, 20, 30, 255]);
  img.data[7] = 0; img.data[0] = 99;
  var back = png.decode(png.encode(img));
  assert.strictEqual(back.width, 5); assert.strictEqual(back.height, 3);
  assert.ok(back.data.equals(img.data));
});

test('png decoder rejects garbage', function () {
  assert.throws(function () { png.decode(Buffer.from('nope')); }, /not a PNG/);
});

test('compare: identical images pass', function () {
  var a = solid(4, 4, [1, 2, 3, 255]);
  assert.strictEqual(compare(a, solid(4, 4, [1, 2, 3, 255])).ok, true);
});

test('compare: one changed pixel fails, tolerance allows it', function () {
  var a = solid(4, 4, [1, 2, 3, 255]), b = solid(4, 4, [1, 2, 3, 255]);
  b.data[0] = 200;
  var r = compare(a, b);
  assert.strictEqual(r.ok, false); assert.strictEqual(r.diffPixels, 1);
  assert.deepStrictEqual(r.bbox, { x0: 0, y0: 0, x1: 0, y1: 0 });
  assert.strictEqual(compare(a, b, { maxDiffPixels: 1 }).ok, true);
  assert.strictEqual(compare(a, b, { channelTolerance: 255 }).ok, true);
});

test('compare: transparent pixels are ignored whatever their RGB, but transparent vs opaque differs', function () {
  var a = solid(2, 1, [0, 0, 0, 255]), b = solid(2, 1, [0, 0, 0, 255]);
  a.data[7] = 0; b.data[7] = 0; b.data[4] = 255; // second pixel transparent in both, different RGB
  assert.strictEqual(compare(a, b).ok, true);
  b.data[7] = 255; // now opaque in b only
  assert.strictEqual(compare(a, b).ok, false);
});

test('compare: size mismatch fails with a message', function () {
  var r = compare(solid(2, 2, [0, 0, 0, 255]), solid(3, 2, [0, 0, 0, 255]));
  assert.strictEqual(r.ok, false); assert.match(r.message, /size differs/);
});

test('messages: int, string and byte values become CLI arguments', function () {
  var args = messages.messageArgs({ A: 5, B: 'hi', C: [1, 255] }, { A: 10001, B: 10002, C: 10003 }, cli, 'emery', 'uuid-1');
  assert.deepStrictEqual(args.slice(-9), ['--int', '10001', '5', '--string', '10002', 'hi', '--bytes', '10003', '01ff']);
  assert.ok(args.indexOf('uuid-1') > 0);
  assert.throws(function () { messages.messageArgs({ NOPE: 1 }, {}, cli, 'emery', 'u'); }, /not in the message key table/);
});

test('every key the real PKJS encoder sends exists in package.json messageKeys', function () {
  var ids = messages.loadKeyIds(PROJECT).ids;
  ['flint', 'emery', 'gabbro'].forEach(function (platform) {
    var r = cp.spawnSync(process.execPath, [path.join(EMU, 'lib', 'capture.js'), platform, path.join(EMU, 'scenarios', 'style-1.json')], { encoding: 'utf8', maxBuffer: 1 << 26 });
    assert.strictEqual(r.status, 0, r.stderr);
    var cap = JSON.parse(r.stdout);
    assert.ok(cap.messages.length >= 3, 'expected several message chunks');
    assert.ok(cap.presetFieldsApplied > 50, 'example style should apply many fields');
    cap.messages.forEach(function (m) {
      Object.keys(m).forEach(function (k) { assert.ok(ids[k] !== undefined, platform + ': key ' + k + ' has no id'); });
      messages.messageArgs(m, ids, cli, platform, 'u');
    });
  });
});

test('scenarios: file names match, example styles exist, platforms are known', function () {
  var dir = path.join(EMU, 'scenarios');
  var presets = require(path.join(PROJECT, 'src', 'pkjs', 'example-style-presets'));
  fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f); }).forEach(function (f) {
    var s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (f[0] === '_') return;
    assert.strictEqual(s.name, f.replace(/\.json$/, ''), f + ' name must equal file name');
    assert.ok(s.exampleStyle || s.preset || s.settings, f + ' defines nothing to show');
    if (s.exampleStyle) assert.ok(presets[String(s.exampleStyle)] && presets[String(s.exampleStyle)].preset, f + ': unknown example style');
    (s.platforms || []).forEach(function (p) { assert.ok(cli.platformsDefault.indexOf(p) >= 0, f + ': unknown platform ' + p); });
  });
});

test('different example styles produce different settings messages', function () {
  function run(n) {
    var r = cp.spawnSync(process.execPath, [path.join(EMU, 'lib', 'capture.js'), 'emery', path.join(EMU, 'scenarios', 'style-' + n + '.json')], { encoding: 'utf8', maxBuffer: 1 << 26 });
    return JSON.stringify(JSON.parse(r.stdout).messages.slice(0, 3));
  }
  assert.notStrictEqual(run(1), run(2));
});

test('dry run end to end writes a report and exits 0', function () {
  var r = cp.spawnSync(process.execPath, [path.join(EMU, 'run.js'), '--dry-run', '--platform', 'emery', '--scenario', 'style-2'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /DRY\s+style-2/);
});
