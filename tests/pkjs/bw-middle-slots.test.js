// B&W: the middle left/right lines must reach the watch (they were once blanked by the encoder).
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ENC = path.join(__dirname, '../../src/pkjs/comms/message-encoder.js');

function ids(platformName, store) {
  const code = `
    const store = ${JSON.stringify(store)};
    global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }, get length() { return Object.keys(store).length; }, key: i => Object.keys(store)[i] };
    global.Pebble = { getActiveWatchInfo: () => ({ platform: ${JSON.stringify(platformName)} }), addEventListener() {}, sendAppMessage() {} };
    const d = require(${JSON.stringify(ENC)}).buildFullKeysetDict();
    console.log(JSON.stringify({ ids: Array.from(d.EDGE_LINE_PRIMITIVE_IDS || []), modes: Array.from(d.EDGE_LINE_COLOR_MODE || []) }));`;
  return JSON.parse(execFileSync(process.execPath, ['-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
}

test('flint sends middle-left content (not an empty slot)', () => {
  const store = { CONFIG_MIDDLE_LEFT_LINE1_CONTENT: '1', CONFIG_MIDDLE_RIGHT_LINE1_CONTENT: '1', CONFIG_MARKER_STYLE: '3' };
  const empty = ids('flint', {});
  const withLeft = ids('flint', store);
  assert.notDeepStrictEqual(withLeft.ids, empty.ids);
});
