// Release notes + the NEW! button state.
const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '../..');
const CHANGELOG = require(path.join(ROOT, 'src/pkjs/data/changelog.js'));
const { changelogNewCount: count, buttonHtml, script } = require(path.join(ROOT, 'src/pkjs/config/config-changelog.js'));

function ver(v) { return v.split('.').map(Number); }

test('changelog: newest first, unique versions, short non-empty bullets', () => {
  assert.ok(CHANGELOG.length > 0);
  const seen = new Set();
  CHANGELOG.forEach((e, i) => {
    assert.match(e.version, /^\d+\.\d+\.\d+$/);
    assert.ok(!seen.has(e.version), 'duplicate ' + e.version);
    seen.add(e.version);
    if (i > 0) {
      const a = ver(CHANGELOG[i - 1].version), b = ver(e.version);
      assert.ok(a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2]))), 'not descending at ' + e.version);
    }
    assert.ok(e.items.length > 0, e.version + ' has no bullets');
    e.items.forEach((t) => { assert.ok(t.trim() && t.length <= 60, 'bad bullet: ' + t); });
  });
});

test('changelog: newest entry matches package.json version', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.strictEqual(CHANGELOG[0].version, pkg.version, 'add a changelog entry for the new package.json version');
});

test('new count: versions above the last seen one are new', () => {
  const e = [{ version: '3' }, { version: '2' }, { version: '1' }];
  assert.strictEqual(count(e, '3'), 0);
  assert.strictEqual(count(e, '2'), 1);
  assert.strictEqual(count(e, '1'), 2);
  assert.strictEqual(count(e, ''), 1, 'unknown: only the newest');
  assert.strictEqual(count(e, '9'), 1);
  assert.strictEqual(count([], '1'), 0);
});

test('button pulses only when something is new', () => {
  assert.ok(buttonHtml(1).includes('pulse'));
  assert.ok(!buttonHtml(0).includes('pulse'));
  assert.ok(buttonHtml(1).includes('>NEW!<') && buttonHtml(0).includes('>NEWS<'));
});

test('page script is valid JavaScript and marks seen on open', () => {
  const code = script(CHANGELOG, '', true);
  new Function(code); // syntax check
  const sent = [];
  const els = {};
  const el = (id) => els[id] || (els[id] = { id, className: id === 'newButton' ? 'new-btn pulse' : '', style: {}, innerHTML: '' });
  const g = new Function('document', 'Pebble', 'esc', code + '; openChangelogModal(); return { CL_NEW: CL_NEW };');
  const r = g({ getElementById: el }, { sendMessage: (t, m) => { sent.push(m); return { then() {} }; } }, (x) => x);
  assert.strictEqual(r.CL_NEW, 1);
  assert.deepStrictEqual(sent, [{ type: 'changelog', version: CHANGELOG[0].version }]);
  assert.ok(!els.newButton.className.includes('pulse'));
  assert.strictEqual(els.newButton.textContent, 'NEWS');
  assert.ok(els.clBody.innerHTML.includes('is-new'));
  assert.strictEqual((els.clBody.innerHTML.match(/is-new/g) || []).length, 1);
});

test('state: fresh install starts up to date, existing install gets newest highlighted', () => {
  const store = {};
  global.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  delete require.cache[require.resolve(path.join(ROOT, 'src/pkjs/settings/changelog-state.js'))];
  const st = require(path.join(ROOT, 'src/pkjs/settings/changelog-state.js'));
  assert.strictEqual(st.seenForPage('4.0.8', false), '');
  assert.strictEqual(st.seenForPage('4.0.8', true), '4.0.8');
  assert.strictEqual(st.getSeen(), '4.0.8');
  st.markSeen('4.0.9');
  assert.strictEqual(st.seenForPage('4.0.9', false), '4.0.9');
  delete global.localStorage;
});
