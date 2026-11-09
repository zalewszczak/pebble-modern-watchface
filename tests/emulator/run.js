#!/usr/bin/env node
'use strict';
// Emulator screenshot test runner.
//
//   node tests/emulator/run.js                      run every scenario on flint, emery, gabbro
//   node tests/emulator/run.js --platform emery     one platform
//   node tests/emulator/run.js --scenario style-1   one scenario (substring match, repeatable)
//   node tests/emulator/run.js --update             write the screenshots taken as the new golden images
//   node tests/emulator/run.js --dry-run            no emulator: build and check the messages, print the commands
//   node tests/emulator/run.js --probe              print the pebble CLI help texts (to confirm cli.json)
//   --no-build  skip `pebble build`   --fresh  wipe+reinstall before every scenario   -v  print every command
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var Pebble = require('./lib/pebble');
var messages = require('./lib/messages');
var png = require('./lib/png');
var compareLib = require('./lib/compare');
var cli = require('./cli.json');
var clockLib = require('./lib/clock');

var HERE = __dirname;
var PROJECT = path.resolve(HERE, '..', '..');
var SCEN_DIR = path.join(HERE, 'scenarios');
var GOLDEN = path.join(HERE, 'golden');
var OUT = path.join(HERE, 'out');

function parseArgs(argv) {
  var o = { platforms: [], scenarios: [], update: false, dry: false, probe: false, build: true, fresh: false, verbose: false };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--platform') o.platforms.push(argv[++i]);
    else if (a === '--scenario') o.scenarios.push(argv[++i]);
    else if (a === '--update') o.update = true;
    else if (a === '--dry-run') o.dry = true;
    else if (a === '--probe') o.probe = true;
    else if (a === '--no-build') o.build = false;
    else if (a === '--fresh') o.fresh = true;
    else if (a === '-v' || a === '--verbose') o.verbose = true;
    else if (a === '-h' || a === '--help') { o.help = true; }
    else throw new Error('unknown argument ' + a);
  }
  return o;
}

function loadScenarios(filters) {
  var defaults = JSON.parse(fs.readFileSync(path.join(SCEN_DIR, '_defaults.json'), 'utf8'));
  var list = fs.readdirSync(SCEN_DIR).filter(function (f) { return /\.json$/.test(f) && f[0] !== '_'; }).sort().map(function (f) {
    var s = JSON.parse(fs.readFileSync(path.join(SCEN_DIR, f), 'utf8'));
    s.file = path.join(SCEN_DIR, f);
    if (!s.name) s.name = f.replace(/\.json$/, '');
    if (s.name !== f.replace(/\.json$/, '')) throw new Error(f + ': "name" must equal the file name (' + s.name + ')');
    return s;
  });
  if (filters.length) list = list.filter(function (s) { return filters.some(function (f) { return s.name.indexOf(f) >= 0; }); });
  return { defaults: defaults, scenarios: list };
}

function capture(platform, scenario) {
  var r = cp.spawnSync(process.execPath, [path.join(HERE, 'lib', 'capture.js'), platform, scenario.file], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('message capture failed for ' + scenario.name + ' on ' + platform + ':\n' + (r.stderr || r.stdout));
  return JSON.parse(r.stdout);
}

// Everything that makes the watch redraw (format, battery, Bluetooth, messages) is done BEFORE the clock is pinned,
// because the emulator clock keeps running: a hand is drawn at the time of the last redraw, so the clock must be
// set last, right before the screenshot.
function applyEnvironment(pb, d, sc, platform) {
  var battery = Object.assign({}, d.battery, sc.battery);
  var bt = sc.bluetooth !== undefined ? sc.bluetooth : d.bluetooth;
  var clock = Object.assign({}, d.clock, sc.clock);
  var v = { platform: platform };
  pb.run(messages.expandAll(cli.commands.timeFormat, Object.assign({ format: clock.format }, v)));
  pb.run(messages.expandAll(battery.charging ? cli.commands.batteryCharging : cli.commands.battery, Object.assign({ percent: battery.percent }, v)));
  pb.run(messages.expandAll(cli.commands.bluetooth, Object.assign({ connected: bt ? 'yes' : 'no' }, v)));
}

// Pin the clock and take the screenshot as close together as possible. The clock is first set one minute earlier
// so that setting the target time is a minute change (which makes the watch redraw), then set to the target.
function pinClockAndShoot(pb, d, sc, platform, shot) {
  var clock = Object.assign({}, d.clock, sc.clock);
  var v = { platform: platform };
  pb.run(messages.expandAll(cli.commands.setTime, Object.assign({ time: clockLib.minusMinutes(clock.time, 1) }, v)));
  pb.sleep(cli.timing.afterPreTimeMs);
  pb.run(messages.expandAll(cli.commands.setTime, Object.assign({ time: clock.time }, v)));
  pb.sleep(cli.timing.afterTimeMs);
  pb.run(messages.expandAll(cli.commands.screenshot, Object.assign({ file: shot }, v)));
}

function installFresh(pb, platform) {
  pb.run(cli.commands.kill, { allowFail: true });
  pb.run(cli.commands.wipe, { allowFail: true });
  pb.run(messages.expandAll(cli.commands.install, { platform: platform }));
  pb.sleep(cli.timing.afterInstallMs); // let the app's own phone-side startup traffic finish first
}

function tolerance(d, sc, platform) {
  return Object.assign({ channelTolerance: 0, maxDiffPixels: 0 }, d.tolerance, sc.tolerance, (sc.toleranceByPlatform || {})[platform]);
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 12).map(function (l) { return l.replace(/^\/\/ ?/, ''); }).join('\n')); return 0; }
  var pb = new Pebble({ dryRun: args.dry, cwd: PROJECT, verbose: args.verbose || args.dry });

  if (args.probe) {
    var probe = new Pebble({ cwd: PROJECT });
    cli.probe.forEach(function (c) {
      console.log('\n$ pebble ' + c.join(' '));
      var r = probe.run(c, { allowFail: true });
      console.log((r.stdout || '') + (r.stderr || ''));
    });
    return 0;
  }

  var uuid = JSON.parse(fs.readFileSync(path.join(PROJECT, 'package.json'), 'utf8')).pebble.uuid;
  var platforms = args.platforms.length ? args.platforms : cli.platformsDefault;
  var loaded = loadScenarios(args.scenarios);
  var d = loaded.defaults;
  if (!loaded.scenarios.length) { console.error('no scenarios match'); return 2; }

  if (args.build) {
    console.log(args.dry ? 'dry run: skipping build' : 'building...');
    pb.run(cli.commands.build, { timeoutMs: 600000 });
  }
  var keys = messages.loadKeyIds(PROJECT);
  console.log('message key ids from: ' + keys.source);

  var results = [];
  platforms.forEach(function (platform) {
    var todo = loaded.scenarios.filter(function (s) { return !s.platforms || s.platforms.indexOf(platform) >= 0; });
    if (!todo.length) return;
    console.log('\n== ' + platform + ' (' + todo.length + ' scenarios)');
    if (!args.fresh) installFresh(pb, platform);
    fs.mkdirSync(path.join(OUT, platform), { recursive: true });
    todo.forEach(function (sc) {
      var res = { platform: platform, scenario: sc.name, status: 'pass', detail: '' };
      results.push(res);
      try {
        if (args.fresh) installFresh(pb, platform);
        var cap = capture(platform, sc);
        var cmds = cap.messages.map(function (m) { return messages.messageArgs(m, keys.ids, cli, platform, uuid); });
        applyEnvironment(pb, d, sc, platform);
        cmds.forEach(function (c) { pb.run(c); pb.sleep(cli.timing.betweenMessagesMs); });
        pb.sleep(sc.settleMs || d.settleMs || 3000);
        var shot = path.join(OUT, platform, sc.name + '.png');
        pinClockAndShoot(pb, d, sc, platform, shot);
        var golden = path.join(GOLDEN, platform, sc.name + '.png');
        res.shot = shot; res.golden = golden;
        if (args.dry) { res.status = 'dry'; res.detail = cmds.length + ' messages, ' + cmds.reduce(function (n, c) { return n + c.length; }, 0) + ' CLI args'; }
        else if (args.update) {
          fs.mkdirSync(path.dirname(golden), { recursive: true });
          fs.copyFileSync(shot, golden);
          res.status = 'updated'; res.detail = 'golden written';
        } else if (!fs.existsSync(golden)) {
          res.status = 'fail'; res.detail = 'no golden image yet (run with --update after checking the screenshot by eye)';
        } else {
          var goldenImg = png.decode(fs.readFileSync(golden)), tol = tolerance(d, sc, platform);
          var cmp = compareLib.compare(goldenImg, png.decode(fs.readFileSync(shot)), tol);
          // The clock runs between pinning it and the screenshot, so a hand can land a pixel off: retake a few times.
          for (var attempt = 1; !cmp.ok && attempt <= (sc.retries !== undefined ? sc.retries : (d.retries || 0)); attempt++) {
            pinClockAndShoot(pb, d, sc, platform, shot);
            cmp = compareLib.compare(goldenImg, png.decode(fs.readFileSync(shot)), tol);
            if (cmp.ok) cmp.message = 'identical after ' + attempt + ' retake(s)';
          }
          res.detail = cmp.message;
          if (!cmp.ok) {
            res.status = 'fail';
            if (cmp.diffImage) {
              res.diff = path.join(OUT, platform, sc.name + '.diff.png');
              fs.writeFileSync(res.diff, png.encode(cmp.diffImage));
            }
          }
        }
      } catch (e) {
        res.status = 'error'; res.detail = e.message.split('\n')[0];
        if (args.verbose) console.error(e.stack);
      }
      console.log('  ' + res.status.toUpperCase().padEnd(8) + sc.name + (res.detail ? '  - ' + res.detail : ''));
    });
  });

  writeReport(results);
  var bad = results.filter(function (r) { return r.status === 'fail' || r.status === 'error'; }).length;
  console.log('\n' + results.length + ' checks, ' + bad + ' failing. Report: ' + path.relative(process.cwd(), path.join(OUT, 'report.html')));
  if (args.dry) fs.writeFileSync(path.join(OUT, 'dry-run-commands.txt'), pb.log.join('\n') + '\n');
  return bad ? 1 : 0;
}

function img(p) {
  try { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); } catch (e) { return ''; }
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function writeReport(results) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  var rows = results.map(function (r) {
    var cells = ['golden', 'shot', 'diff'].map(function (k) {
      return '<td>' + (r[k] && fs.existsSync(r[k]) ? '<img src="' + img(r[k]) + '"><div>' + k + '</div>' : '') + '</td>';
    }).join('');
    return '<tr class="' + r.status + '"><td><b>' + esc(r.scenario) + '</b><br>' + esc(r.platform) + '<br>' + r.status + '<br><small>' + esc(r.detail) + '</small></td>' + cells + '</tr>';
  }).join('\n');
  fs.writeFileSync(path.join(OUT, 'report.html'),
    '<!doctype html><meta charset="utf-8"><title>Emulator test report</title><style>body{font:14px sans-serif;background:#222;color:#eee}' +
    'table{border-collapse:collapse}td{padding:6px;vertical-align:top;border-bottom:1px solid #444}img{background:#555;image-rendering:pixelated;max-width:320px}' +
    'tr.fail td:first-child,tr.error td:first-child{color:#f77}tr.pass td:first-child{color:#7f7}</style><table>' + rows + '</table>');
}

try { process.exitCode = main(); } catch (e) { console.error(e.message); process.exitCode = 2; }
