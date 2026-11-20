// config-battery.js -- the battery usage estimate in the settings page: the button next to "About" (a battery with
// five segments), and the popup that explains the ranking. The scoring itself lives in settings/battery-estimate.js.
var batteryEstimate = require('../settings/battery-estimate');
var primitiveIds = require('./primitive-ids-generated');

// Level colours: lime-green, green, yellow, orange, punch red (5 lit segments ... 1 lit segment) and their pale
// pastel versions for the button background (light mode; dark mode uses the same colour at low opacity).
var LEVELS = {
  5: { color: '#8bd400', pale: '#f0facf', dark: 'rgba(139,212,0,.22)' },
  4: { color: '#2fb344', pale: '#dcf4e1', dark: 'rgba(47,179,68,.22)' },
  3: { color: '#f2c200', pale: '#fff5c4', dark: 'rgba(242,194,0,.22)' },
  2: { color: '#ff8a00', pale: '#ffe6c9', dark: 'rgba(255,138,0,.22)' },
  1: { color: '#f01e3c', pale: '#ffd8de', dark: 'rgba(240,30,60,.24)' }
};

function css(previewShown) {
  var out = '';
  var lv, l;
  for (lv = 1; lv <= 5; lv++) {
    l = LEVELS[lv];
    out += '  .batt-lvl-' + lv + ' { --batt-c: ' + l.color + '; --batt-bg: ' + l.pale + '; }' + '\n';
  }
  out += '  @media (prefers-color-scheme: dark) {\n';
  for (lv = 1; lv <= 5; lv++) out += '    .batt-lvl-' + lv + ' { --batt-bg: ' + LEVELS[lv].dark + '; }\n';
  out += '  }\n';
  return out +
'  .batt-btn { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 5px; box-sizing: border-box; border: 1px solid var(--batt-c, var(--border)); border-radius: 6px; background: var(--batt-bg, var(--card-bg)); color: var(--text-strong); font-size: 12px; font-weight: 700; white-space: nowrap; box-shadow: 0 1px 3px rgba(0,0,0,.18); -webkit-appearance: none; cursor: pointer; }\n' +
'  .batt-btn:active { transform: scale(0.96); }\n' +
'  .batt-btn-text { display: none; }\n' +
'  .batt-btn.with-text .batt-btn-text { display: inline; }\n' +
'  .batt-icon { display: block; width: 30px; height: 15px; flex: 0 0 auto; }\n' +
'  .batt-icon .batt-shell { fill: none; stroke: var(--text-strong); stroke-width: 1.4; }\n' +
'  .batt-icon .batt-nub { fill: var(--text-strong); }\n' +
'  .batt-icon .batt-seg { fill: var(--batt-c); }\n' +
'  .batt-icon .batt-seg.off { fill: var(--text-strong); opacity: .13; }\n' +
'  .top-bar-actions { flex-wrap: wrap; row-gap: 6px; }\n' +
(previewShown ? '  #topBar .top-bar-left { flex-basis: 76%; } #topBar .top-bar-preview { flex-basis: 24%; }\n' : '') +
'  #batteryModal { align-items: center; }\n' +
'  #batteryModal .batt-modal-box { width: calc(100% - 32px); max-width: 360px; max-height: 84vh; border-radius: 14px; padding: 16px; box-shadow: 0 14px 42px rgba(0,0,0,.28); }\n' +
'  .batt-head { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border: 1px solid var(--batt-c); border-radius: 10px; background: var(--batt-bg); }\n' +
'  .batt-head .batt-icon { width: 52px; height: 26px; }\n' +
'  .batt-head-title { font-size: 16px; font-weight: 800; color: var(--text-strong); line-height: 1.15; }\n' +
'  .batt-head-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }\n' +
'  .batt-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; margin-top: 10px; }\n' +
'  .batt-row { padding: 7px 0; border-bottom: 1px solid var(--border-light); }\n' +
'  .batt-row:last-child { border-bottom: none; }\n' +
'  .batt-row-top { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; font-weight: 700; color: var(--text-strong); }\n' +
'  .batt-row-pct { flex: 0 0 auto; font-variant-numeric: tabular-nums; }\n' +
'  .batt-bar { height: 4px; border-radius: 2px; background: var(--border-light); margin: 4px 0 3px; overflow: hidden; }\n' +
'  .batt-bar > span { display: block; height: 100%; background: var(--batt-c); border-radius: 2px; }\n' +
'  .batt-row-why { font-size: 11px; line-height: 1.35; color: var(--text-muted); }\n' +
'  .batt-foot { margin-top: 8px; font-size: 11px; line-height: 1.4; color: var(--text-faint); }\n' +
'  .batt-foot p { margin: 3px 0; }\n' +
'  .batt-ok-btn { width: 100%; padding: 11px; font-size: 14px; font-weight: 700; color: var(--text-strong); background: var(--border-light); border: none; border-radius: 8px; margin-top: 10px; flex: 0 0 auto; }\n' +
'  .batt-ok-btn:active { background: var(--border); }\n' +
'  body.retro-easter-egg .batt-btn { border-radius: 0; box-shadow: 2px 2px 0 var(--retro-shadow); }\n' +
'  body.retro-easter-egg .batt-modal-box { border: 2px solid var(--retro-accent); }\n';
}

// The button. showText: the live preview is not shown (B&W watch or live mode), so there is room for the words.
function buttonHtml(showText) {
  return '<button type="button" class="batt-btn batt-lvl-5' + (showText ? ' with-text' : '') + '" id="battButton" onclick="openBatteryModal()" ' +
    'aria-label="Battery usage estimate" title="Battery usage estimate">' +
    '<span id="battButtonIcon"></span><span class="batt-btn-text" id="battButtonText">Battery usage: very low</span></button>';
}

function modalHtml() {
  return '<div class="modal-overlay" id="batteryModal" onclick="if (event.target === this) closeBatteryModal();">' +
    '<div class="modal-box batt-modal-box batt-lvl-5" id="batteryModalBox">' +
    '<div class="batt-head"><span id="battHeadIcon"></span><div><div class="batt-head-title" id="battHeadTitle"></div><div class="batt-head-sub" id="battHeadSub"></div></div></div>' +
    '<div class="batt-scroll"><div id="battRows"></div><div class="batt-foot" id="battFoot"></div></div>' +
    '<button type="button" class="batt-ok-btn" onclick="closeBatteryModal()">OK</button>' +
    '</div></div>';
}

// Client script. env pieces that do not change while the page is open are embedded here; the estimate itself is
// recomputed from collectSettings() whenever something is clicked, changed or typed.
function script(platform, primitiveSequences) {
  var env = {
    round: !!platform.round,
    bw: !!platform.bw,
    primSeq: primitiveSequences,
    primKind: batteryEstimate.primitiveKinds(primitiveIds),
    aqiPrims: batteryEstimate.downloadPrimitives(primitiveIds).aqi,
    issPrims: batteryEstimate.downloadPrimitives(primitiveIds).iss,
    auroraPrims: batteryEstimate.downloadPrimitives(primitiveIds).aurora
  };
  return '' +
'var estimateBatteryUsage = ' + batteryEstimate.estimateBatteryUsage.toString() + ';\n' +
'var BATT_ENV = ' + JSON.stringify(env) + ';\n' +
'var BATT_LAST = null, BATT_TIMER = 0;\n' +
'function battIconSvg(segments) {\n' +
'  var svg = \'<svg class="batt-icon" viewBox="0 0 36 18" aria-hidden="true" focusable="false"><rect class="batt-shell" x="0.9" y="0.9" width="31.2" height="16.2" rx="3.2"/><rect class="batt-nub" x="33" y="6" width="2.4" height="6" rx="1"/>\';\n' +
'  for (var i = 0; i < 5; i++) svg += \'<rect class="batt-seg\' + (i < segments ? "" : " off") + \'" x="\' + (3.2 + i * 5.7).toFixed(1) + \'" y="3.4" width="4.6" height="11.2" rx="1"/>\';\n' +
'  return svg + "</svg>";\n' +
'}\n' +
'function battPct(v) { return v >= 10 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1); }\n' +
'function renderBatteryEstimate(est) {\n' +
'  BATT_LAST = est;\n' +
'  var btn = document.getElementById("battButton");\n' +
'  if (!btn) return;\n' +
'  btn.className = btn.className.replace(/ ?batt-lvl-\\d/, "") + " batt-lvl-" + est.segments;\n' +
'  document.getElementById("battButtonIcon").innerHTML = battIconSvg(est.segments);\n' +
'  document.getElementById("battButtonText").textContent = "Battery usage: " + est.label;\n' +
'  btn.title = "Battery usage: " + est.label;\n' +
'  btn.setAttribute("aria-label", "Battery usage: " + est.label + ". Tap for details.");\n' +
'  if (typeof adjustTopBarSpacing === "function") adjustTopBarSpacing();\n' +
'}\n' +
'function refreshBatteryEstimate() {\n' +
'  try {\n' +
'    var env = {};\n' +
'    for (var k in BATT_ENV) env[k] = BATT_ENV[k];\n' +
'    env.avail = computeSlotAvailability();\n' +
'    renderBatteryEstimate(estimateBatteryUsage(collectSettings(false), env));\n' +
'  } catch (e) { }\n' +
'}\n' +
'function scheduleBatteryEstimate() {\n' +
'  if (BATT_TIMER) return;\n' +
'  BATT_TIMER = window.setTimeout(function () { BATT_TIMER = 0; refreshBatteryEstimate(); }, 250);\n' +
'}\n' +
'function openBatteryModal() {\n' +
'  refreshBatteryEstimate();\n' +
'  var est = BATT_LAST;\n' +
'  if (!est) return;\n' +
'  var box = document.getElementById("batteryModalBox");\n' +
'  box.className = box.className.replace(/ ?batt-lvl-\\d/, "") + " batt-lvl-" + est.segments;\n' +
'  document.getElementById("battHeadIcon").innerHTML = battIconSvg(est.segments);\n' +
'  document.getElementById("battHeadTitle").textContent = "Battery usage: " + est.label;\n' +
'  document.getElementById("battHeadSub").textContent = "Estimated reduction of battery life: " + Math.round(est.reduction) + "%" + (est.saver ? " (battery saver on)" : "");\n' +
'  var stars = [], html = "";\n' +
'  est.rows.forEach(function (r) {\n' +
'    if (r.cut < 0.05) return;\n' +
'    var mark = "";\n' +
'    if (r.star) { var idx = stars.indexOf(r.star); if (idx < 0) { stars.push(r.star); idx = stars.length - 1; } mark = " " + new Array(idx + 2).join("*"); }\n' +
'    html += \'<div class="batt-row"><div class="batt-row-top"><span>\' + esc(r.label) + mark + \'</span><span class="batt-row-pct">\' + \'&minus;\' + battPct(r.cut) + \'%</span></div>\' +\n' +
'      \'<div class="batt-bar"><span style="width:\' + Math.max(2, Math.min(100, r.pct)) + \'%"></span></div>\' +\n' +
'      \'<div class="batt-row-why">\' + esc(r.why) + \'</div></div>\';\n' +
'  });\n' +
'  if (!html) html = \'<div class="batt-row-why">Nothing noticeable is enabled.</div>\';\n' +
'  document.getElementById("battRows").innerHTML = html;\n' +
'  var foot = "";\n' +
'  stars.forEach(function (t, i) { foot += "<p>" + new Array(i + 2).join("*") + " " + esc(t) + "</p>"; });\n' +
'  foot += "<p>A relative estimate from your settings, not a measurement. " + (est.scale < 1 ? "" : "") + "The percentages show how much shorter the battery lasts than without that item, and add up to the total above. Items are listed from the most to the least demanding.</p>";\n' +
'  document.getElementById("battFoot").innerHTML = foot;\n' +
'  document.getElementById("batteryModal").className = "modal-overlay open";\n' +
'}\n' +
'function closeBatteryModal() { document.getElementById("batteryModal").className = "modal-overlay"; }\n' +
'document.addEventListener("click", scheduleBatteryEstimate);\n' +
'document.addEventListener("change", scheduleBatteryEstimate);\n' +
'document.addEventListener("input", scheduleBatteryEstimate);\n' +
'window.addEventListener("load", function () { refreshBatteryEstimate(); window.setTimeout(refreshBatteryEstimate, 1200); });\n';
}

module.exports = { css: css, buttonHtml: buttonHtml, modalHtml: modalHtml, script: script, LEVELS: LEVELS };
