'use strict';
// Turns the dictionaries captured from the real PKJS code into pebble CLI argument lists.
var fs = require('fs');
var path = require('path');

// Name -> integer id. Prefers the file the SDK generated for the real build; falls back to the documented
// rule (ids count up from 10000 in package.json order), which is only right if no key is declared as an array.
function loadKeyIds(projectRoot) {
  var candidates = [];
  (function walk(dir, depth) {
    var names;
    try { names = fs.readdirSync(dir); } catch (e) { return; }
    names.forEach(function (n) {
      var p = path.join(dir, n), st;
      try { st = fs.statSync(p); } catch (e) { return; }
      if (st.isDirectory() && depth < 4) walk(p, depth + 1);
      else if (n === 'message_keys.auto.h') candidates.push(p);
    });
  })(path.join(projectRoot, 'build'), 0);
  for (var i = 0; i < candidates.length; i++) {
    if (fs.existsSync(candidates[i])) {
      var ids = {}, n = 0;
      fs.readFileSync(candidates[i], 'utf8').split('\n').forEach(function (line) {
        var m = /#define\s+MESSAGE_KEY_(\w+)\s+(?:\(\s*)?(\d+)/.exec(line);
        if (m) { ids[m[1]] = parseInt(m[2], 10); n++; }
      });
      if (n) return { ids: ids, source: path.relative(projectRoot, candidates[i]) };
    }
  }
  var pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  var keys = pkg.pebble.messageKeys;
  var fallback = {};
  keys.forEach(function (k, i) { fallback[k] = 10000 + i; });
  return { ids: fallback, source: 'package.json order (build/ not found - run a build to use the generated ids)' };
}

function expand(arg, vars) {
  return arg.replace(/\{(\w+)\}/g, function (_, k) {
    if (!(k in vars)) throw new Error('missing placeholder {' + k + '}');
    return String(vars[k]);
  });
}
function expandAll(list, vars) { return list.map(function (a) { return expand(a, vars); }); }

function hex(bytes) {
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// One message (a dict of NAME -> number | string | byte array) -> one pebble send-app-message argument list.
// The CLI takes one flag per value type followed by all its KEY=VALUE pairs:
//   send-app-message --int 1=5 2=7 --string 3=hi --bytes 4=DEADBEEF
function messageArgs(dict, keyIds, cli, platform, uuid) {
  var vars = { platform: platform, uuid: uuid };
  var groups = { int: [], string: [], bytes: [] };
  Object.keys(dict).forEach(function (name) {
    var id = keyIds[name];
    if (id === undefined) throw new Error('message key ' + name + ' is not in the message key table');
    var v = dict[name], type, pair;
    if (Array.isArray(v)) { type = 'bytes'; pair = expand(cli.sendAppMessage.bytes.pair, { key: id, hex: hex(v) }); }
    else if (typeof v === 'string') { type = 'string'; pair = expand(cli.sendAppMessage.string.pair, { key: id, value: v }); }
    else if (typeof v === 'number' || typeof v === 'boolean') { type = 'int'; pair = expand(cli.sendAppMessage.int.pair, { key: id, value: Math.trunc(Number(v)) }); }
    else throw new Error('message key ' + name + ' has an unsupported value type ' + typeof v);
    groups[type].push(pair);
  });
  var args = expandAll(cli.sendAppMessage.base, vars);
  ['int', 'string', 'bytes'].forEach(function (t) {
    if (groups[t].length) args = args.concat([cli.sendAppMessage[t].flag], groups[t]);
  });
  return args;
}

module.exports = { loadKeyIds: loadKeyIds, messageArgs: messageArgs, expandAll: expandAll, hex: hex };
