// Long plugin text is cut into lines (15 characters) at word boundaries; slots whose key ends in ~2 / ~3 show
// the 2nd / 3rd line, so one text can be spread over several complications (phone side only).
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const MGR = path.join(__dirname, '../../src/pkjs/plugins/plugin-manager.js');

function run(script) {
  const code = `
    const store = {};
    global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }, get length() { return Object.keys(store).length; }, key: i => Object.keys(store)[i] };
    global.Pebble = { getActiveWatchInfo: () => ({ platform: 'emery' }) };
    const m = require(${JSON.stringify(MGR)});
    ${script}`;
  return JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
}

test('wrapLines breaks at spaces and hard-splits over-long words', () => {
  const out = run("console.log(JSON.stringify([m.wrapLines('The quick brown fox jumps over the lazy dog', 15), m.wrapLines('Supercalifragilisticexpialidocious', 15), m.wrapLines('', 15)]))");
  assert.deepStrictEqual(out[0], ['The quick brown', 'fox jumps over', 'the lazy dog']);
  assert.deepStrictEqual(out[1], ['Supercalifragil', 'isticexpialidoc', 'ious']);
  assert.deepStrictEqual(out[2], []);
});

test('partOfKey reads the ~N suffix', () => {
  const out = run("console.log(JSON.stringify([m.partOfKey('a|b|c|d'), m.partOfKey('a|b|c|d~2'), m.partOfKey('a|b|c|d#1~3')]))");
  assert.deepStrictEqual(out, [1, 2, 3]);
});
