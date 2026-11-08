'use strict';
// Thin wrapper around the pebble CLI. In dry-run mode nothing is executed, commands are only recorded.
var cp = require('child_process');
var cliCfg = require('../cli.json');

function Pebble(opts) {
  opts = opts || {};
  this.dry = !!opts.dryRun;
  this.cwd = opts.cwd;
  this.verbose = !!opts.verbose;
  this.log = [];
  this.bin = opts.bin || cliCfg.pebble;
}

Pebble.prototype.run = function (args, runOpts) {
  runOpts = runOpts || {};
  var line = this.bin + ' ' + args.map(function (a) { return /[\s"']/.test(a) ? JSON.stringify(a) : a; }).join(' ');
  this.log.push(line);
  if (this.dry) { if (this.verbose) console.log('  [dry] ' + line); return { status: 0, stdout: '', stderr: '' }; }
  if (this.verbose) console.log('  $ ' + line);
  var r = cp.spawnSync(this.bin, args, { cwd: this.cwd, encoding: 'utf8', timeout: runOpts.timeoutMs || 180000 });
  if (r.error) throw new Error('could not run "' + this.bin + '": ' + r.error.message + ' (is the pebble CLI installed and on PATH?)');
  if (r.status !== 0 && !runOpts.allowFail) {
    throw new Error('command failed (' + r.status + '): ' + line + '\n' + (r.stderr || r.stdout || '').trim());
  }
  return r;
};

Pebble.prototype.sleep = function (ms) {
  if (this.dry || !ms) return;
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

module.exports = Pebble;
