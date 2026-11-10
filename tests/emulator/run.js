#!/usr/bin/env node
'use strict';
// Emulator screenshot test runner.
//
//   node tests/emulator/run.js                      run every scenario on flint, emery, gabbro
//   node tests/emulator/run.js --platform emery     one platform (repeatable)
//   node tests/emulator/run.js --scenario style-1   scenario name contains this (repeatable)
//   node tests/emulator/run.js --group indices      scenario group: styles, env, complications, indices, backgrounds (repeatable)
//   node tests/emulator/run.js --update             write the screenshots taken as the new golden images
//   node tests/emulator/run.js --list               list the scenarios that would run, per platform
//   node tests/emulator/run.js --dry-run            no emulator: build and check the messages, print the commands
//   node tests/emulator/run.js --probe              print the pebble CLI help texts (to confirm cli.json)
//   --no-build  skip `pebble build`   --fresh  wipe+reinstall before every scenario   -v  print every command
//   --double-time  always set the clock twice (a minute earlier first) before the screenshot; without it that only
//                  happens on a retake after a failed first try (or for scenarios with "doubleSetTime": true)
//   --resend-all  send every message for every scenario (by default messages identical to the last sent are skipped)
var fs = require('fs');
var path = require('path');
var cp = require('child_process');
var Pebble = require('./lib/pebble');
var messages = require('./lib/messages');
var png = require('./lib/png');
var compareLib = require('./lib/compare');
var scenarioLib = require('./lib/scenario');
var projectInfo = require('./lib/projectinfo');
var cli = require('./cli.json');

var HERE = __dirname;
var PROJECT = path.resolve(HERE, '..', '..');
var SCEN_DIR = path.join(HERE, 'scenarios');
var GOLDEN = path.join(HERE, 'golden');
var OUT = path.join(HERE, 'out');

function parseArgs(argv) {
  var o = { platforms: [], scenarios: [], groups: [], update: false, dry: false, probe: false, list: false, build: true, fresh: false,
    verbose: false, doubleTime: false, resendAll: false };
  for (var i = 0; i < argv.length; i++) {
    var a = argv[i];
    if (a === '--platform') o.platforms.push(argv[++i]);
    else if (a === '--scenario') o.scenarios.push(argv[++i]);
    else if (a === '--group') o.groups.push(argv[++i]);
    else if (a === '--update') o.update = true;
    else if (a === '--dry-run') o.dry = true;
    else if (a === '--probe') o.probe = true;
    else if (a === '--list') o.list = true;
    else if (a === '--no-build') o.build = false;
    else if (a === '--fresh') o.fresh = true;
    else if (a === '--double-time') o.doubleTime = true;
    else if (a === '--resend-all') o.resendAll = true;
    else if (a === '-v' || a === '--verbose') o.verbose = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else throw new Error('unknown argument ' + a);
  }
  return o;
}

function loadStatic() {
  return fs.readdirSync(SCEN_DIR).filter(function (f) { return /\.json$/.test(f) && f[0] !== '_'; }).sort().map(function (f) {
    var s = JSON.parse(fs.readFileSync(path.join(SCEN_DIR, f), 'utf8'));
    if (!s.name) s.name = f.replace(/\.json$/, '');
    if (s.name !== f.replace(/\.json$/, '')) throw new Error(f + ': "name" must equal the file name (' + s.name + ')');
    if (!s.group) s.group = 'styles';
    return s;
  });
}

function scenariosFor(platform, args, staticList) {
  var list = staticList.filter(function (s) { return !s.platforms || s.platforms.indexOf(platform) >= 0; });
  list = list.concat(require('./scenarios/_families')(platform, projectInfo.info(platform)));
  var seen = {};
  list.forEach(function (s) { if (seen[s.name]) throw new Error('duplicate scenario name ' + s.name + ' on ' + platform); seen[s.name] = 1; });
  if (args.groups.length) list = list.filter(function (s) { return args.groups.indexOf(s.group) >= 0; });
  if (args.scenarios.length) list = list.filter(function (s) { return args.scenarios.some(function (f) { return s.name.indexOf(f) >= 0; }); });
  return list;
}

function capture(effPath, platform) {
  var env = Object.assign({}, process.env);
  if (cli.clockTimezone === 'utc') env.TZ = 'UTC';
  var r = cp.spawnSync(process.execPath, [path.join(HERE, 'lib', 'capture.js'), effPath], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: env });
  if (r.status !== 0) throw new Error('message capture failed on ' + platform + ':\n' + (r.stderr || r.stdout));
  return JSON.parse(r.stdout);
}

function fmt(ms) { return ms >= 60000 ? Math.floor(ms / 60000) + 'm' + ('0' + Math.round((ms % 60000) / 1000)).slice(-2) + 's' : (ms / 1000).toFixed(1) + 's'; }

// Commands that only change the world when the value differs from what the platform's emulator already has.
function applyEnvironment(pb, state, rs, platform) {
  var v = { platform: platform };
  if (state.format !== rs.clock.format) { pb.run(messages.expandAll(cli.commands.timeFormat, Object.assign({ format: rs.clock.format }, v))); state.format = rs.clock.format; }
  var bkey = rs.battery.percent + '/' + !!rs.battery.charging;
  if (state.battery !== bkey) {
    pb.run(messages.expandAll(rs.battery.charging ? cli.commands.batteryCharging : cli.commands.battery, Object.assign({ percent: rs.battery.percent }, v)));
    state.battery = bkey;
  }
  if (state.bt !== !!rs.bluetooth) { pb.run(messages.expandAll(cli.commands.bluetooth, Object.assign({ connected: rs.bluetooth ? 'yes' : 'no' }, v))); state.bt = !!rs.bluetooth; }
}

// The clock is pinned LAST, right before the screenshot, because the emulator clock keeps running and a hand is
// drawn at the time of the last redraw. With `double` it is first set one minute earlier, so that setting the target
// time is a minute change (which makes the watch redraw).
function pinClockAndShoot(pb, rs, platform, shot, double) {
  var v = { platform: platform };
  if (double) {
    pb.run(messages.expandAll(cli.commands.setTime, Object.assign({ unix: rs.clock.unix - 60, time: rs.clock.time }, v)));
    pb.sleep(cli.timing.afterPreTimeMs);
  }
  pb.run(messages.expandAll(cli.commands.setTime, Object.assign({ unix: rs.clock.unix, time: rs.clock.time }, v)));
  pb.sleep(cli.timing.afterTimeMs);
  pb.run(messages.expandAll(cli.commands.screenshot, Object.assign({ file: shot }, v)));
}

function installFresh(pb, state, platform) {
  pb.run(cli.commands.kill, { allowFail: true });
  pb.run(cli.commands.wipe, { allowFail: true });
  pb.run(messages.expandAll(cli.commands.install, { platform: platform }));
  pb.sleep(cli.timing.afterInstallMs); // let the app's own phone-side startup traffic finish first
  state.format = state.battery = state.bt = undefined; state.sent = {};
}

function main() {
  var args = parseArgs(process.argv.slice(2));
  if (args.help) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(2, 18).map(function (l) { return l.replace(/^\/\/ ?/, ''); }).join('\n')); return 0; }
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

  var platforms = args.platforms.length ? args.platforms : cli.platformsDefault;
  var staticList = loadStatic();
  var defaults = JSON.parse(fs.readFileSync(path.join(SCEN_DIR, '_defaults.json'), 'utf8'));

  if (args.list) {
    platforms.forEach(function (p) {
      var l = scenariosFor(p, args, staticList);
      console.log('\n== ' + p + ' (' + l.length + ')');
      var by = {};
      l.forEach(function (s) { (by[s.group] = by[s.group] || []).push(s.name); });
      Object.keys(by).forEach(function (g) { console.log('  ' + g + ' (' + by[g].length + '): ' + by[g].join(', ')); });
    });
    return 0;
  }

  var uuid = JSON.parse(fs.readFileSync(path.join(PROJECT, 'package.json'), 'utf8')).pebble.uuid;
  var t0 = Date.now();
  if (args.build) {
    console.log(args.dry ? 'dry run: skipping build' : 'building...');
    var tb = Date.now();
    pb.run(cli.commands.build, { timeoutMs: 600000 });
    if (!args.dry) console.log('build took ' + fmt(Date.now() - tb));
  }
  var keys = messages.loadKeyIds(PROJECT);
  console.log('message key ids from: ' + keys.source);

  var results = [], platformTimes = {};
  platforms.forEach(function (platform) {
    var todo = scenariosFor(platform, args, staticList);
    if (!todo.length) return;
    var tp = Date.now();
    console.log('\n== ' + platform + ' (' + todo.length + ' scenarios)');
    var state = { sent: {} };
    if (!args.fresh) installFresh(pb, state, platform);
    fs.mkdirSync(path.join(OUT, platform), { recursive: true });
    var genDir = path.join(OUT, 'generated', platform);
    fs.mkdirSync(genDir, { recursive: true });
    todo.forEach(function (sc) {
      var ts = Date.now();
      var res = { platform: platform, scenario: sc.name, group: sc.group, status: 'pass', detail: '', ms: 0 };
      results.push(res);
      try {
        if (args.fresh) installFresh(pb, state, platform);
        var rs = scenarioLib.resolve(sc, defaults, platform, cli);
        var effPath = path.join(genDir, sc.name + '.json');
        fs.writeFileSync(effPath, JSON.stringify(rs.eff, null, 1));
        var cap = capture(effPath, platform);
        // messages: skip those identical to what this emulator already received
        var seenType = {};
        var toSend = cap.messages.filter(function (m) {
          var type = String(m.MESSAGE_TYPE), slot = type + '#' + (seenType[type] = (seenType[type] || 0) + 1), sig = JSON.stringify(m);
          if (!args.resendAll && state.sent[slot] === sig) return false;
          state.sent[slot] = sig;
          return true;
        });
        applyEnvironment(pb, state, rs, platform);
        toSend.forEach(function (m) { pb.run(messages.messageArgs(m, keys.ids, cli, platform, uuid)); pb.sleep(cli.timing.betweenMessagesMs); });
        pb.sleep(toSend.length ? rs.settleMs : Math.min(rs.settleMs, 500));
        var shot = path.join(OUT, platform, sc.name + '.png');
        pinClockAndShoot(pb, rs, platform, shot, args.doubleTime || rs.doubleSetTime);
        var golden = path.join(GOLDEN, platform, sc.name + '.png');
        res.shot = shot; res.golden = golden;
        if (args.dry) { res.status = 'dry'; res.detail = toSend.length + ' of ' + cap.messages.length + ' messages sent'; }
        else if (args.update) {
          fs.mkdirSync(path.dirname(golden), { recursive: true });
          fs.copyFileSync(shot, golden);
          res.status = 'updated'; res.detail = 'golden written';
        } else if (!fs.existsSync(golden)) {
          res.status = 'fail'; res.detail = 'no golden image yet (run with --update after checking the screenshot by eye)';
        } else {
          var goldenImg = png.decode(fs.readFileSync(golden));
          var cmp = compareLib.compare(goldenImg, png.decode(fs.readFileSync(shot)), rs.tolerance);
          // A failed first try is retaken with the clock set twice (see pinClockAndShoot).
          for (var attempt = 1; !cmp.ok && attempt <= rs.retries; attempt++) {
            pinClockAndShoot(pb, rs, platform, shot, true);
            cmp = compareLib.compare(goldenImg, png.decode(fs.readFileSync(shot)), rs.tolerance);
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
      res.ms = Date.now() - ts;
      console.log('  ' + res.status.toUpperCase().padEnd(8) + sc.name.padEnd(34) + fmt(res.ms).padStart(7) + (res.detail && res.status !== 'pass' ? '  - ' + res.detail : ''));
    });
    platformTimes[platform] = Date.now() - tp;
    console.log('  -- ' + platform + ': ' + fmt(platformTimes[platform]) + ' for ' + todo.length + ' scenarios (' + fmt(platformTimes[platform] / todo.length) + ' each)');
  });

  var total = Date.now() - t0;
  writeReport(results, { platformTimes: platformTimes, totalMs: total });
  var bad = results.filter(function (r) { return r.status === 'fail' || r.status === 'error'; }).length;
  var parts = Object.keys(platformTimes).map(function (p) { return p + ' ' + fmt(platformTimes[p]); }).join(', ');
  console.log('\n' + results.length + ' checks, ' + bad + ' failing. Total ' + fmt(total) + (parts ? ' (' + parts + ')' : '') + '. Report: ' + path.relative(process.cwd(), path.join(OUT, 'report.html')));
  var slow = results.slice().sort(function (a, b) { return b.ms - a.ms; }).slice(0, 3).map(function (r) { return r.platform + '/' + r.scenario + ' ' + fmt(r.ms); });
  if (slow.length && !args.dry) console.log('slowest: ' + slow.join(', '));
  if (args.dry) fs.writeFileSync(path.join(OUT, 'dry-run-commands.txt'), pb.log.join('\n') + '\n');
  return bad ? 1 : 0;
}

function img(p) {
  try { return 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'); } catch (e) { return ''; }
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function writeReport(results, timing) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ timing: timing, results: results }, null, 2));
  // failing rows first, and only the images that matter (passing rows show just the new screenshot)
  var order = { error: 0, fail: 1, updated: 2, dry: 3, pass: 4 };
  var sorted = results.slice().sort(function (a, b) { return (order[a.status] - order[b.status]); });
  var rows = sorted.map(function (r) {
    var kinds = (r.status === 'pass' || r.status === 'updated' || r.status === 'dry') ? ['shot'] : ['golden', 'shot', 'diff'];
    var cells = kinds.map(function (k) {
      return '<td>' + (r[k] && fs.existsSync(r[k]) ? '<img src="' + img(r[k]) + '"><div>' + k + '</div>' : '') + '</td>';
    }).join('');
    return '<tr class="' + r.status + '"><td><b>' + esc(r.scenario) + '</b><br>' + esc(r.platform) + ' &middot; ' + esc(r.group || '') + '<br>' + r.status + ' &middot; ' + (r.ms / 1000).toFixed(1) + 's<br><small>' + esc(r.detail) + '</small></td>' + cells + '</tr>';
  }).join('\n');
  fs.writeFileSync(path.join(OUT, 'report.html'),
    '<!doctype html><meta charset="utf-8"><title>Emulator test report</title><style>body{font:14px sans-serif;background:#222;color:#eee}' +
    'table{border-collapse:collapse}td{padding:6px;vertical-align:top;border-bottom:1px solid #444}img{background:#555;image-rendering:pixelated;max-width:320px}' +
    'tr.fail td:first-child,tr.error td:first-child{color:#f77}tr.pass td:first-child{color:#7f7}</style>' +
    '<p>Total ' + (timing.totalMs / 1000).toFixed(1) + 's. ' + Object.keys(timing.platformTimes).map(function (p) { return esc(p) + ' ' + (timing.platformTimes[p] / 1000).toFixed(1) + 's'; }).join(', ') + '</p><table>' + rows + '</table>');
}

try { process.exitCode = main(); } catch (e) { console.error(e.message); process.exitCode = 2; }
