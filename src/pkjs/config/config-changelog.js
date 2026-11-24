// config-changelog.js -- the "NEW!" button in the settings top bar (between About and Battery usage) and the
// release notes popup. Data: data/changelog.js; "last opened" state: settings/changelog-state.js.

// How many entries (from the top, newest first) are new for a reader who last opened the notes at `seen`.
// Unknown/empty `seen` counts only the newest entry as new. Stringified into the page, so it must stay
// self-contained.
function changelogNewCount(entries, seen) {
  if (!entries || !entries.length) return 0;
  for (var i = 0; i < entries.length; i++) if (entries[i].version === seen) return i;
  return 1;
}

function css() {
  return '' +
'  .new-btn { height: 30px; padding: 0 9px; box-sizing: border-box; font-size: 12px; font-weight: 800; letter-spacing: .03em; color: var(--text-strong); background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); }\n' +
'  .new-btn:active { background: var(--border-light); transform: scale(0.96); }\n' +
'  .new-btn.pulse { color: #fff; background: #ff9200; border-color: #e08300; }\n' +
'  .new-btn.pulse:active { background: #e08300; }\n' +
'  .new-btn.pulse { animation: newBtnPulse 1.6s ease-in-out infinite; }\n' +
'  @keyframes newBtnPulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,146,0,.65); } 50% { transform: scale(1.08); box-shadow: 0 0 0 7px rgba(255,146,0,0); } 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,146,0,0); } }\n' +
'  @media (prefers-reduced-motion: reduce) { .new-btn.pulse { animation: none; box-shadow: 0 0 0 3px rgba(255,146,0,.45); } }\n' +
'  #changelogModal { align-items: center; }\n' +
'  #changelogModal .cl-modal-box { width: calc(100% - 32px); max-width: 360px; max-height: 84vh; border-radius: 14px; padding: 16px; box-shadow: 0 14px 42px rgba(0,0,0,.28); }\n' +
'  .cl-title { font-size: 17px; font-weight: 800; color: var(--text-strong); }\n' +
'  .cl-legend { font-size: 11px; color: var(--text-faint); margin-top: 3px; }\n' +
'  .cl-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; margin-top: 8px; }\n' +
'  .cl-version { padding: 8px 0 6px; border-bottom: 1px solid var(--border-light); }\n' +
'  .cl-version:last-child { border-bottom: none; }\n' +
'  .cl-version-head { display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 800; color: var(--text-strong); }\n' +
'  .cl-dot { flex: 0 0 9px; width: 9px; height: 9px; border-radius: 50%; background: transparent; }\n' +
'  .cl-version.is-new .cl-dot { background: #ff9200; box-shadow: 0 0 0 3px rgba(255,146,0,.25); }\n' +
'  .cl-version ul { margin: 5px 0 0; padding-left: 36px; }\n' +
'  .cl-version li { font-size: 12px; line-height: 1.4; color: var(--text-muted); padding: 1px 0; }\n' +
'  .cl-ok-btn { width: 100%; padding: 11px; font-size: 14px; font-weight: 700; color: var(--text-strong); background: var(--border-light); border: none; border-radius: 8px; margin-top: 10px; flex: 0 0 auto; }\n' +
'  .cl-ok-btn:active { background: var(--border); }\n' +
'  body.retro-easter-egg .new-btn { border-radius: 0; box-shadow: 2px 2px 0 var(--retro-shadow); }\n' +
'  body.retro-easter-egg .cl-modal-box { border: 2px solid var(--retro-accent); }\n';
}

// Pulsing orange "NEW!" while something is unseen, afterwards a plain grey "NEWS".
// newCount: how many versions are new right now, decides whether the button starts out pulsing.
function buttonHtml(newCount) {
  return '<button type="button" class="new-btn' + (newCount > 0 ? ' pulse' : '') + '" id="newButton" onclick="openChangelogModal()" ' +
    'aria-label="What is new" title="What is new">' + (newCount > 0 ? 'NEW!' : 'NEWS') + '</button>';
}

function modalHtml() {
  return '<div class="modal-overlay" id="changelogModal" onclick="if (event.target === this) closeChangelogModal();">' +
    '<div class="modal-box cl-modal-box">' +
    '<div class="cl-title">What&rsquo;s new</div>' +
    '<div class="cl-legend" id="clLegend" style="display:none;"><span class="cl-dot" style="display:inline-block;vertical-align:middle;background:#ff9200;width:7px;height:7px;"></span> new since you last looked</div>' +
    '<div class="cl-scroll" id="clBody"></div>' +
    '<button type="button" class="cl-ok-btn" onclick="closeChangelogModal()">OK</button>' +
    '</div></div>';
}

// Client script. liveMode: the page can message the phone app; otherwise "seen" travels with the next Save.
function script(entries, seen, liveMode) {
  return '' +
'var CHANGELOG = ' + JSON.stringify(entries).replace(/<\//g, '<\\/') + ';\n' +
'var changelogNewCount = ' + changelogNewCount.toString() + ';\n' +
'var CL_NEW = changelogNewCount(CHANGELOG, ' + JSON.stringify(seen || '') + ');\n' +
'var CL_LIVE = ' + (liveMode ? 'true' : 'false') + ';\n' +
'var CL_SEEN_PENDING = "";\n' +
'function changelogMarkSeen() {\n' +
'  var btn = document.getElementById("newButton");\n' +
'  if (btn) { btn.className = btn.className.replace(/ ?pulse/, ""); btn.textContent = "NEWS"; }\n' +
'  if (!CHANGELOG.length || CL_PERSISTED) return;\n' +
'  var v = CHANGELOG[0].version;\n' +
'  if (CL_LIVE && typeof Pebble !== "undefined" && typeof Pebble.sendMessage === "function") {\n' +
'    try { Pebble.sendMessage("pkjs", { type: "changelog", version: v }).then(function () { CL_PERSISTED = true; }, function () { }); } catch (e) { }\n' +
'  } else {\n' +
'    CL_SEEN_PENDING = v; CL_PERSISTED = true;\n' +
'  }\n' +
'}\n' +
'var CL_PERSISTED = false;\n' +
'function openChangelogModal() {\n' +
'  var html = "";\n' +
'  CHANGELOG.forEach(function (e, i) {\n' +
'    html += \'<div class="cl-version\' + (i < CL_NEW ? " is-new" : "") + \'"><div class="cl-version-head"><span class="cl-dot"></span><span>\' + esc(e.version) + \'</span></div><ul>\';\n' +
'    e.items.forEach(function (t) { html += "<li>" + esc(t) + "</li>"; });\n' +
'    html += "</ul></div>";\n' +
'  });\n' +
'  document.getElementById("clBody").innerHTML = html;\n' +
'  document.getElementById("clLegend").style.display = CL_NEW > 0 ? "" : "none";\n' +
'  document.getElementById("clBody").scrollTop = 0;\n' +
'  document.getElementById("changelogModal").className = "modal-overlay open";\n' +
'  changelogMarkSeen();\n' +
'}\n' +
'function closeChangelogModal() { document.getElementById("changelogModal").className = "modal-overlay"; }\n';
}

module.exports = { css: css, buttonHtml: buttonHtml, modalHtml: modalHtml, script: script, changelogNewCount: changelogNewCount };
