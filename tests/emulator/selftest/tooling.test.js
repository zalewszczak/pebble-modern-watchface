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
  assert.deepStrictEqual(args.slice(-6), ['--int', '10001=5', '--string', '10002=hi', '--bytes', '10003=01ff']);
  assert.ok(args.indexOf('uuid-1') > 0);
  assert.throws(function () { messages.messageArgs({ NOPE: 1 }, {}, cli, 'emery', 'u'); }, /not in the message key table/);
});

function effFor(name, platform) {
  var scenarioLib = require('../lib/scenario');
  var defaults = JSON.parse(fs.readFileSync(path.join(EMU, 'scenarios', '_defaults.json'), 'utf8'));
  var sc = JSON.parse(fs.readFileSync(path.join(EMU, 'scenarios', name + '.json'), 'utf8'));
  var rs = scenarioLib.resolve(sc, defaults, platform, cli);
  var dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'eff-'));
  var p = path.join(dir, name + '.json');
  fs.writeFileSync(p, JSON.stringify(rs.eff));
  return { path: p, rs: rs };
}
function captureFor(name, platform) {
  var e = effFor(name, platform);
  var r = cp.spawnSync(process.execPath, [path.join(EMU, 'lib', 'capture.js'), e.path], { encoding: 'utf8', maxBuffer: 1 << 26 });
  assert.strictEqual(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
}

test('every key the real PKJS encoder sends exists in the message key table', function () {
  var ids = messages.loadKeyIds(PROJECT).ids;
  ['flint', 'emery', 'gabbro'].forEach(function (platform) {
    var cap = captureFor('style-1', platform);
    assert.ok(cap.messages.length >= 5, 'expected settings and data chunks');
    assert.ok(cap.presetFieldsApplied > 50, 'example style should apply many fields');
    cap.messages.forEach(function (m) {
      Object.keys(m).forEach(function (k) { assert.ok(ids[k] !== undefined, platform + ': key ' + k + ' has no id'); });
      messages.messageArgs(m, ids, cli, platform, 'u');
    });
  });
});

test('the fixed date makes the phone data identical on every run (sunrise, moon, last update)', function () {
  var a = captureFor('style-1', 'emery'), b = captureFor('style-1', 'emery');
  assert.strictEqual(JSON.stringify(a.messages), JSON.stringify(b.messages));
  var all = Object.assign.apply(null, [{}].concat(a.messages));
  assert.strictEqual(all.WEATHER_LAST_UPDATE, effFor('style-1', 'emery').rs.clock.unix);
  assert.ok(all.SUN_RISE > 0 && all.SUN_SET > all.SUN_RISE);
});

test('datasets change the data sent', function () {
  var rain = Object.assign.apply(null, [{}].concat(captureFor('env-charging-rain', 'emery').messages));
  var mild = Object.assign.apply(null, [{}].concat(captureFor('style-1', 'emery').messages));
  assert.notStrictEqual(rain.WEATHER_TEMP_C, mild.WEATHER_TEMP_C);
  assert.throws(function () { require('../lib/datasets').resolve('nope'); }, /unknown dataset/);
});

test('flint gets the clean white-on-black scheme, other platforms keep the example style', function () {
  assert.strictEqual(effFor('style-2', 'flint').rs.eff.preset.customBgValue, '192');
  assert.strictEqual(effFor('style-2', 'emery').rs.eff.preset.customBgValue, undefined);
});

test('backgrounds: a preset that does not exist on the platform is replaced or switched off', function () {
  var fix = require('../lib/capture').fixBackground;
  var imgs = { numbers: [1, 2, 3], imagesRound: { '2': 'x' }, imagesBw: {} };
  assert.strictEqual(fix({ useCustomBg: true, bgSource: 'p:3' }, 'emery', imgs).bgSource, 'p:3');
  assert.strictEqual(fix({ useCustomBg: true, bgSource: 'p:3' }, 'gabbro', imgs).bgSource, 'p:2');
  assert.strictEqual(fix({ useCustomBg: true, bgSource: 'p:3' }, 'flint', imgs).useCustomBg, false);
  assert.strictEqual(fix({ useCustomBg: false, bgSource: 'p:3' }, 'gabbro', imgs).bgSource, 'p:3');
});

test('indices: a bitmap style missing on the platform is replaced by an available one', function () {
  var fix = require('../lib/capture').fixMarkerStyle, pi = require('../lib/projectinfo');
  var first = pi.info('flint').bitmapIndices[0];
  assert.strictEqual(fix({ bigAnalogMarkerStyle: '9' }, 'flint').bigAnalogMarkerStyle, '9'); // drawn by code everywhere
  assert.strictEqual(fix({ bigAnalogMarkerStyle: first }, 'flint').bigAnalogMarkerStyle, first);
  assert.strictEqual(fix({ useCustomBg: false }, 'flint').bigAnalogMarkerStyle, undefined);
});

test('clock: the instant is built from a date and time', function () {
  var sl = require('../lib/scenario');
  var u = sl.clockInstant({ date: '2026-09-24', time: '10:08:00' }, 'utc');
  assert.strictEqual(u.unix, Date.UTC(2026, 8, 24, 10, 8, 0) / 1000);
  assert.throws(function () { sl.clockInstant({ date: '24.09.2026', time: '10:08:00' }, 'utc'); }, /YYYY-MM-DD/);
});

test('tour: few scenarios, but every complication, indices style and background of the platform is covered', function () {
  var fam = require('../scenarios/_families'), pi = require('../lib/projectinfo');
  ['flint', 'emery', 'gabbro'].forEach(function (p) {
    var info = pi.info(p), list = fam(p, info), names = {};
    list.forEach(function (s) { assert.ok(!names[s.name], 'duplicate ' + s.name); names[s.name] = 1; assert.strictEqual(s.group, 'tour'); });
    assert.ok(list.length <= 24, p + ': ' + list.length + ' tour scenarios is too many');
    var shown = {};
    list.forEach(function (s) { Object.keys(s.preset).forEach(function (k) { if (/^(corner|.*Line\d)/.test(k) && s.preset[k] !== '0') shown[s.preset[k]] = 1; }); });
    info.categories.forEach(function (c) {
      if (c.id === 'none' || c.id === 'plugins') return;
      c.items.forEach(function (it) { assert.ok(shown[String(it.id)], p + ': complication ' + it.id + ' (' + it.label + ') is in no tour scenario'); });
    });
    info.bitmapIndices.forEach(function (id) { assert.ok(list.some(function (s) { return s.preset.bigAnalogMarkerStyle === id; }), p + ': indices ' + id + ' not shown'); });
    info.backgrounds.forEach(function (n) { assert.ok(list.some(function (s) { return s.preset.bgSource === 'p:' + n; }), p + ': background ' + n + ' not shown'); });
    assert.ok(new Set(list.map(function (s) { return s.preset.cornerFont; })).size >= 10, 'fonts should vary');
    assert.ok(new Set(list.map(function (s) { return s.preset.weatherIconStyle; })).size === 3, 'icon styles should vary');
    if (p === 'gabbro') list.forEach(function (s) { assert.ok(!('cornerTL' in s.preset) || s.preset.cornerTL === '0', 'round has no corner slots'); });
    if (p === 'flint') assert.ok(list.some(function (s) { return s.preset.customBgValue === '255'; }) && list.some(function (s) { return s.preset.customBgValue === '192'; }));
  });
});

test('tour: every weather complication is shown with at least two different data sets', function () {
  var fam = require('../scenarios/_families'), pi = require('../lib/projectinfo');
  var info = pi.info('emery'), list = fam('emery', info), seen = {};
  list.forEach(function (s) { Object.keys(s.preset).forEach(function (k) { var v = s.preset[k]; if (/^(corner|.*Line\d)/.test(k) && v !== '0') (seen[v] = seen[v] || {})[s.dataset] = 1; }); });
  info.categories.filter(function (c) { return c.id === 'weather'; })[0].items.forEach(function (it) {
    assert.ok(Object.keys(seen[String(it.id)]).length >= 2, 'weather ' + it.id + ' only with ' + Object.keys(seen[String(it.id)]));
  });
});

test('agree: needs N identical takes in a row, a differing take restarts the streak', function () {
  var agree = require('../lib/agree');
  var frames = ['a', 'b', 'b', 'b'], same = function (x, y) { return x === y; };
  var r = agree.takeAgreed(3, 9, function (i) { return frames[i]; }, same);
  assert.strictEqual(r.ok, true); assert.strictEqual(r.takes, 4);
  var one = agree.takeAgreed(1, 3, function () { return 'x'; }, same);
  assert.strictEqual(one.ok, true); assert.strictEqual(one.takes, 1);
  var two = agree.takeAgreed(2, 9, function (i) { return ['a', 'b', 'a', 'a'][i]; }, same);
  assert.strictEqual(two.ok, true); assert.strictEqual(two.takes, 4);
  var never = agree.takeAgreed(2, 6, function (i) { return i; }, same);
  assert.strictEqual(never.ok, false); assert.strictEqual(never.takes, 6);
});

test('report server: serves the report and copies a screenshot over the golden, rejecting bad requests', function (t, done) {
  var os = require('os'), http = require('http'), serverLib = require('../lib/server');
  var root = fs.mkdtempSync(path.join(os.tmpdir(), 'srv-')), out = path.join(root, 'out'), gold = path.join(root, 'golden');
  fs.mkdirSync(path.join(out, 'emery'), { recursive: true });
  fs.writeFileSync(path.join(out, 'report.html'), '<p>report</p>');
  fs.writeFileSync(path.join(out, 'emery', 'x.png'), 'NEW');
  var srv = serverLib.createServer({ outDir: out, goldenDir: gold });
  srv.listen(0, '127.0.0.1', function () {
    var port = srv.address().port;
    function req(method, url, body, headers, cb) {
      var r = http.request({ host: '127.0.0.1', port: port, path: url, method: method, headers: headers || {} }, function (res) {
        var d = ''; res.on('data', function (c) { d += c; }); res.on('end', function () { cb(res.statusCode, d); });
      });
      if (body) r.write(body); r.end();
    }
    var good = { 'X-Test-Report': '1' };
    req('GET', '/', null, null, function (c1, b1) {
      assert.strictEqual(c1, 200); assert.match(b1, /report/);
      req('POST', '/update', JSON.stringify({ platform: 'emery', scenario: 'x' }), null, function (c2) {
        assert.strictEqual(c2, 403, 'missing header');
        req('POST', '/update', JSON.stringify({ platform: '../etc', scenario: 'x' }), good, function (c3) {
          assert.strictEqual(c3, 400, 'path traversal');
          req('POST', '/update', JSON.stringify({ platform: 'emery', scenario: 'nope' }), good, function (c4) {
            assert.strictEqual(c4, 404);
            req('POST', '/update', JSON.stringify({ platform: 'emery', scenario: 'x' }), good, function (c5) {
              assert.strictEqual(c5, 200);
              assert.strictEqual(fs.readFileSync(path.join(gold, 'emery', 'x.png'), 'utf8'), 'NEW');
              srv.close(); done();
            });
          });
        });
      });
    });
  });
});

test('report: failing rows get an accept button with a confirmation popup', function () {
  var src = fs.readFileSync(path.join(EMU, 'run.js'), 'utf8');
  assert.match(src, /Accept new screenshot as golden/);
  assert.match(src, /confirm\(/);
  assert.match(src, /X-Test-Report/);
});

test('scenarios: file names match, example styles exist', function () {
  var dir = path.join(EMU, 'scenarios');
  var presets = require(path.join(PROJECT, 'src', 'pkjs', 'example-style-presets'));
  fs.readdirSync(dir).filter(function (f) { return /\.json$/.test(f) && f[0] !== '_'; }).forEach(function (f) {
    var s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    assert.strictEqual(s.name, f.replace(/\.json$/, ''), f + ' name must equal file name');
    assert.ok(s.exampleStyle || s.preset || s.settings, f + ' defines nothing to show');
    if (s.exampleStyle) assert.ok(presets[String(s.exampleStyle)] && presets[String(s.exampleStyle)].preset, f + ': unknown example style');
    (s.platforms || []).forEach(function (p) { assert.ok(cli.platformsDefault.indexOf(p) >= 0, f + ': unknown platform ' + p); });
  });
});

test('different example styles produce different settings messages', function () {
  assert.notStrictEqual(JSON.stringify(captureFor('style-1', 'emery').messages.slice(0, 3)), JSON.stringify(captureFor('style-2', 'emery').messages.slice(0, 3)));
});

function dry(extra) {
  var r = cp.spawnSync(process.execPath, [path.join(EMU, 'run.js'), '--dry-run', '--no-build'].concat(extra), { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  return { out: r.stdout, cmds: fs.readFileSync(path.join(EMU, 'out', 'dry-run-commands.txt'), 'utf8').split('\n') };
}

test('dry run: timers are printed per scenario, per platform and in total', function () {
  var r = dry(['--platform', 'emery', '--scenario', 'style-2']);
  assert.match(r.out, /DRY\s+style-2\s+\d/);
  assert.match(r.out, /-- emery: .* for 1 scenarios/);
  assert.match(r.out, /Total .*emery /);
});

test('dry run: the clock is set once and last by default, twice with --double-time', function () {
  var one = dry(['--platform', 'flint', '--scenario', 'style-2']).cmds;
  var shot = one.findIndex(function (l) { return /pebble screenshot/.test(l); });
  assert.strictEqual(one.filter(function (l) { return /emu-set-time/.test(l); }).length, 1);
  assert.ok(/emu-set-time/.test(one[shot - 1]));
  var lastMsg = one.map(function (l, i) { return /send-app-message/.test(l) ? i : -1; }).pop();
  assert.ok(lastMsg < shot - 1, 'clock must be pinned after the last message');
  var two = dry(['--platform', 'flint', '--scenario', 'style-2', '--double-time']).cmds;
  var times = two.filter(function (l) { return /emu-set-time/.test(l); });
  assert.strictEqual(times.length, 2);
  var u = function (l) { return +/emu-set-time (\d+)/.exec(l)[1]; };
  assert.strictEqual(u(times[1]) - u(times[0]), 60);
});

test('dry run: messages identical to the last scenario are not sent again, unless --resend-all', function () {
  var skip = dry(['--platform', 'emery', '--scenario', 'env-alert', '--scenario', 'env-charging-rain']).cmds.filter(function (l) { return /send-app-message/.test(l); }).length;
  var all = dry(['--platform', 'emery', '--scenario', 'env-alert', '--scenario', 'env-charging-rain', '--resend-all']).cmds.filter(function (l) { return /send-app-message/.test(l); }).length;
  assert.ok(skip < all, skip + ' should be fewer than ' + all);
});

test('dry run: --list works for groups', function () {
  var r = cp.spawnSync(process.execPath, [path.join(EMU, 'run.js'), '--list', '--group', 'tour', '--platform', 'gabbro'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /tour \(\d+\)/);
  assert.ok(!/styles/.test(r.stdout));
});

test('clock: minusMinutes wraps over midnight and keeps seconds', function () {
  var clock = require('../lib/clock');
  assert.strictEqual(clock.minusMinutes('10:08:30', 1), '10:07:30');
  assert.strictEqual(clock.minusMinutes('00:00:00', 1), '23:59:00');
  assert.strictEqual(clock.minusMinutes('12:00:05', 1), '11:59:05');
  assert.throws(function () { clock.parse('10:08'); }, /HH:MM:SS/);
});


// ---- whole runner against a fake `pebble` executable (no emulator): update, compare, retake, report ----
function fakeWorld() {
  var os = require('os');
  var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-'));
  var bin = path.join(dir, 'pebble');
  fs.writeFileSync(bin, '#!/bin/sh\nif [ "$1" = "screenshot" ]; then\n  n=$(cat "$FAKE_DIR/count" 2>/dev/null || echo 0); n=$((n+1)); echo $n > "$FAKE_DIR/count"\n' +
    '  if [ -f "$FAKE_DIR/seq" ]; then f=$(sed -n "${n}p" "$FAKE_DIR/seq"); else f=""; fi\n  [ -z "$f" ] && f="$FAKE_DIR/a.png"\n  cp "$f" "$2"\nfi\nexit 0\n');
  fs.chmodSync(bin, 493);
  function img(r) { var d = Buffer.alloc(4 * 4 * 4); for (var i = 0; i < 16; i++) { d[i * 4] = r; d[i * 4 + 3] = 255; } return png.encode({ width: 4, height: 4, data: d }); }
  fs.writeFileSync(path.join(dir, 'a.png'), img(10));
  fs.writeFileSync(path.join(dir, 'b.png'), img(200));
  return { dir: dir, env: Object.assign({}, process.env, { PEBBLE_BIN: bin, FAKE_DIR: dir, MODERN_TEST_NO_SLEEP: '1' }) };
}
function runner(world, extra) {
  return cp.spawnSync(process.execPath, [path.join(EMU, 'run.js'), '--no-build', '--platform', 'flint', '--scenario', 'style-2'].concat(extra), { encoding: 'utf8', env: world.env });
}
var GOLD = path.join(EMU, 'golden', 'flint', 'style-2.png');

test('runner with a fake pebble: --update3 needs three identical screenshots, then a changed screenshot fails and offers the accept button', function () {
  var w = fakeWorld();
  try {
    // disagreeing frames: a, b, a, b, a, b, a, b, a -> never 3 in a row -> no golden
    fs.writeFileSync(path.join(w.dir, 'seq'), ['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a'].map(function (x) { return path.join(w.dir, x + '.png'); }).join('\n') + '\n');
    var bad = runner(w, ['--update3']);
    assert.match(bad.stdout, /ERROR\s+style-2.*did not agree/);
    assert.ok(!fs.existsSync(GOLD), 'no golden from disagreeing frames');
    // a, b, b, b -> agree from take 2 on
    fs.writeFileSync(path.join(w.dir, 'count'), '0');
    fs.writeFileSync(path.join(w.dir, 'seq'), ['a', 'b', 'b', 'b'].map(function (x) { return path.join(w.dir, x + '.png'); }).join('\n') + '\n');
    var ok = runner(w, ['--update3']);
    assert.match(ok.stdout, /UPDATED\s+style-2.*3 identical screenshots in 4 takes/);
    assert.ok(fs.existsSync(GOLD));
    // compare: same frame passes
    fs.writeFileSync(path.join(w.dir, 'seq'), path.join(w.dir, 'b.png') + '\n'); fs.writeFileSync(path.join(w.dir, 'count'), '0');
    assert.match(runner(w, []).stdout, /PASS\s+style-2/);
    // a changed frame fails (after retakes) and the report has the button
    fs.writeFileSync(path.join(w.dir, 'seq'), path.join(w.dir, 'a.png') + '\n'); fs.writeFileSync(path.join(w.dir, 'count'), '0');
    fs.writeFileSync(path.join(w.dir, 'seq'), Array(5).fill(path.join(w.dir, 'a.png')).join('\n') + '\n');
    var fail = runner(w, []);
    assert.strictEqual(fail.status, 1);
    assert.match(fail.stdout, /FAIL\s+style-2.*pixels differ/);
    assert.match(fail.stdout, /--serve/);
    var html = fs.readFileSync(path.join(EMU, 'out', 'report.html'), 'utf8');
    assert.match(html, /class="accept" data-platform="flint" data-scenario="style-2"/);
    assert.match(html, /Total /);
    var rep = JSON.parse(fs.readFileSync(path.join(EMU, 'out', 'report.json'), 'utf8'));
    assert.ok(rep.timing.totalMs >= 0 && rep.results[0].ms >= 0);
  } finally {
    if (fs.existsSync(GOLD)) fs.unlinkSync(GOLD);
  }
});
