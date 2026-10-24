// ---- weather border: settings-page half ----------------------------------------
//
// "Border style" subsection of the Style section. The watch draws a band
// (2-40 px) along the screen edge into the cached background, below the
// indices; each clock-position sector shows the weather for the hour that
// will next be at that position (see src/c/rendering/dial/weather_border.c,
// which this page's drawing mirrors).
//
// Page <-> phone contract: hidden input #borderWeatherMode ("0" off,
// "1" conditions, "2" temperature) and range #borderWeatherPx (2-40).
// The checkbox #borderWeatherEnabled and select #borderWeatherModeSel only
// drive the hidden input.

var esc = require('./config-template').esc;
var SEVEN_STOPS = require('../weather/weather-normalize').SEVEN_STOP_GRADIENT_STOPS;

function borderSectionHtml(current) {
  var mode = String(current.borderWeatherMode || '0');
  if (mode !== '1' && mode !== '2') mode = '0';
  var px = parseInt(current.borderWeatherPx, 10);
  if (isNaN(px)) px = 8;
  px = Math.max(2, Math.min(40, px));
  return '' +
'    <div class="help">Turns the edge of the screen into a 12-hour weather forecast. Like on the dial, the sector at each clock position shows the weather for the next time the hour hand will be there: at 2:20 the 3 o\'clock edge is the weather at 3:00 (+1 h) and the 2 o\'clock edge is +12 h. It is drawn into the background (below the indices) and only refreshed when the weather updates.</div>' +
'    <div class="checkbox-row" id="borderWeatherEnabledRow" style="margin-top:10px;">' +
'      <input type="checkbox" id="borderWeatherEnabled" ' + (mode !== '0' ? 'checked' : '') + ' onchange="onBorderWeatherChange()">' +
'      <label for="borderWeatherEnabled" style="margin:0;">Use border to show weather</label>' +
'    </div>' +
'    <input type="hidden" id="borderWeatherMode" value="' + mode + '">' +
'    <div id="borderWeatherPanel" style="' + (mode !== '0' ? '' : 'display:none;') + '">' +
'      <div class="field-label-row"><label for="borderWeatherModeSel">Show</label></div>' +
'      <select id="borderWeatherModeSel" onchange="onBorderWeatherChange()">' +
'        <option value="1"' + (mode !== '2' ? ' selected' : '') + '>Weather conditions</option>' +
'        <option value="2"' + (mode === '2' ? ' selected' : '') + '>Temperature</option>' +
'      </select>' +
'      <div class="field-label-row" style="margin-top:12px;"><label for="borderWeatherPx">Thickness <span class="val" id="borderWeatherPxVal">' + px + 'px</span></label></div>' +
'      <div class="slider-with-buttons">' +
'        <button type="button" class="slider-step-btn" onclick="stepSlider(\'borderWeatherPx\', -1); onBorderWeatherChange();">&minus;</button>' +
'        <input type="range" id="borderWeatherPx" min="2" max="40" step="1" value="' + px + '" oninput="onBorderWeatherChange()">' +
'        <button type="button" class="slider-step-btn" onclick="stepSlider(\'borderWeatherPx\', 1); onBorderWeatherChange();">+</button>' +
'      </div>' +
'      <div class="border-diagram-row">' +
'        <canvas id="borderDiagram" width="200" height="228"></canvas>' +
'        <div class="border-legend" id="borderLegend"></div>' +
'      </div>' +
'      <div class="help" id="borderHelpText"></div>' +
'    </div>';
}

var CSS_TEXT =
'  .border-diagram-row { display: flex; gap: 12px; align-items: flex-start; margin-top: 12px; }\n' +
'  #borderDiagram { width: 120px; height: 137px; flex: 0 0 auto; border: 1px solid var(--border); border-radius: 6px; }\n' +
'  .border-legend { flex: 1 1 auto; min-width: 0; font-size: 12px; color: var(--text-muted); }\n' +
'  .border-legend .row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }\n' +
'  .border-legend .sw { width: 18px; height: 12px; border-radius: 3px; border: 1px solid var(--border); flex: 0 0 auto; }\n' +
'  .border-legend .grad { height: 12px; border-radius: 3px; border: 1px solid var(--border); margin: 4px 0; }\n' +
'  .border-legend .scale { display: flex; justify-content: space-between; font-size: 11px; }\n';

function borderCss() { return CSS_TEXT; }

function borderScript() {
  return '' +
'var BORDER_STOPS = ' + JSON.stringify(SEVEN_STOPS) + ';\n' +
// Sample 12 h outlook used for the diagram and the preview (the settings page
// has no live forecast). Index 0 = +1 h. cond: 0 clear, 1 partly, 2 overcast,
// 3 fog, 4 rain, 5 snow.
'var BORDER_SAMPLE_COND = [0, 1, 2, 3, 4, 4, 5, 2, 1, 0, 0, 1];\n' +
'var BORDER_SAMPLE_TEMP = [8, 9, 10, 12, 14, 16, 18, 20, 18, 15, 12, 10];\n' +
// GColorFromRGB keeps the top 2 bits of each channel (0/85/170/255).
'function borderQ(v) { return Math.max(0, Math.min(3, v >> 6)) * 85; }\n' +
'function borderRgb(r, g, b) { return [borderQ(r), borderQ(g), borderQ(b)]; }\n' +
'function borderTempRgb(t) {\n' +
'  var minV = -10, maxV = 40, s = BORDER_STOPS;\n' +
'  if (t <= minV) return borderRgb(s[0][0], s[0][1], s[0][2]);\n' +
'  if (t >= maxV) return borderRgb(s[6][0], s[6][1], s[6][2]);\n' +
'  var pos = Math.trunc(((t - minV) * 6000) / (maxV - minV));\n' +
'  var seg = Math.min(5, Math.trunc(pos / 1000)), fr = pos - seg * 1000;\n' +
'  var a = s[seg], b = s[seg + 1];\n' +
'  return borderRgb(a[0] + Math.trunc(((b[0] - a[0]) * fr) / 1000), a[1] + Math.trunc(((b[1] - a[1]) * fr) / 1000), a[2] + Math.trunc(((b[2] - a[2]) * fr) / 1000));\n' +
'}\n' +
// -> 12 entries indexed by clock sector: {c0:[r,g,b]|null, c1:[r,g,b]|null, h: hours ahead}
'function borderSectorColors(mode, hour12) {\n' +
'  var out = [];\n' +
'  for (var s = 0; s < 12; s++) out.push({ c0: null, c1: null, h: 0 });\n' +
'  var RAIN = borderRgb(64, 224, 208);\n' +
'  for (var h = 1; h <= 12; h++) {\n' +
'    var sec = (hour12 + h) % 12, e = out[sec];\n' +
'    e.h = h;\n' +
'    if (mode === 2) { e.c0 = e.c1 = borderTempRgb(BORDER_SAMPLE_TEMP[h - 1]); continue; }\n' +
'    switch (BORDER_SAMPLE_COND[h - 1]) {\n' +
'      case 4: e.c0 = e.c1 = RAIN; break;\n' +
'      case 5: e.c0 = e.c1 = [255, 255, 255]; break;\n' +
'      case 3: e.c0 = e.c1 = [85, 85, 85]; break;\n' +
'      case 2: e.c0 = [85, 85, 85]; e.c1 = [170, 170, 170]; break;\n' +
'      case 1: e.c0 = e.c1 = [170, 170, 170]; break;\n' +
'      default: break;\n' +
'    }\n' +
'  }\n' +
'  return out;\n' +
'}\n' +
// Same integer sector math as weather_border.c's sector_of().
'function borderSectorOf(dx, dy) {\n' +
'  var ax = Math.abs(dx), ay = Math.abs(dy), band;\n' +
'  if (ax * 1000 < ay * 268) band = 0; else if (ax < ay) band = 1; else if (ax * 1000 < ay * 3732) band = 2; else band = 3;\n' +
'  if (dy < 0) return dx >= 0 ? band : (12 - band) % 12;\n' +
'  return dx >= 0 ? 6 - band : (6 + band) % 12;\n' +
'}\n' +
// Draws the border band onto ctx (size w x h, thickness px in 200-px watch units).
'function drawBorderBand(ctx, w, h, px, colors) {\n' +
'  var scale = w / 200, t = Math.max(1, Math.round(px * scale));\n' +
'  var id = ctx.createImageData(w, h), d = id.data;\n' +
'  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {\n' +
'    if (!(x < t || y < t || x >= w - t || y >= h - t)) continue;\n' +
'    var e = colors[borderSectorOf(2 * x + 1 - w, 2 * y + 1 - h)];\n' +
'    var c = ((x + y) & 1) ? e.c1 : e.c0;\n' +
'    if (!c) continue;\n' +
'    var o = (y * w + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;\n' +
'  }\n' +
'  var tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;\n' +
'  tmp.getContext("2d").putImageData(id, 0, 0);\n' +
'  ctx.drawImage(tmp, 0, 0);\n' +
'}\n' +
'function borderMode() { var el = document.getElementById("borderWeatherMode"); var v = el ? parseInt(el.value, 10) : 0; return (v === 1 || v === 2) ? v : 0; }\n' +
'function borderPx() { var el = document.getElementById("borderWeatherPx"); var v = el ? parseInt(el.value, 10) : 8; return isNaN(v) ? 8 : Math.max(2, Math.min(40, v)); }\n' +
// Main preview hook (called from updatePreview(), between background and indices).
'function drawWeatherBorderPreview(ctx, w, h) {\n' +
'  var mode = borderMode();\n' +
'  if (!mode) return;\n' +
'  drawBorderBand(ctx, w, h, borderPx(), borderSectorColors(mode, new Date().getHours() % 12));\n' +
'}\n' +
'function borderCss3(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }\n' +
'function borderTitle(mode) { return mode === 2 ? "Temperature" : "Weather conditions"; }\n' +
// The labelled diagram inside the expanded section: a mini watch whose edge
// carries the border, with the "+N h" label of every sector at its clock position.
'function renderBorderDiagram() {\n' +
'  var cv = document.getElementById("borderDiagram");\n' +
'  if (!cv || !cv.getContext) return;\n' +
'  var mode = borderMode() || 1, ctx = cv.getContext("2d"), w = cv.width, h = cv.height;\n' +
'  var col = (typeof dayColors === "function") ? dayColors() : { bg: "#000", text: "#fff" };\n' +
'  var hour12 = new Date().getHours() % 12;\n' +
'  ctx.clearRect(0, 0, w, h); ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);\n' +
'  var colors = borderSectorColors(mode, hour12);\n' +
'  drawBorderBand(ctx, w, h, borderPx(), colors);\n' +
'  ctx.fillStyle = col.text; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 13px sans-serif";\n' +
'  var cx = w / 2, cy = h / 2, rx = w / 2 - 36, ry = h / 2 - 36;\n' +
'  for (var s = 0; s < 12; s++) {\n' +
'    var a = s * Math.PI / 6;\n' +
'    var tx = cx + Math.sin(a) * rx * 1.05, ty = cy - Math.cos(a) * ry * 1.05;\n' +
'    var hh = colors[s].h;\n' +
'    ctx.globalAlpha = hh === 12 ? 0.55 : 1;\n' +
'    ctx.fillText("+" + hh + "h", tx, ty);\n' +
'  }\n' +
'  ctx.globalAlpha = 1; ctx.font = "11px sans-serif";\n' +
'  ctx.fillText("now: " + (hour12 === 0 ? 12 : hour12) + " o\'clock", cx, cy - 8);\n' +
'  ctx.fillText("(+12h = same spot)", cx, cy + 8);\n' +
'  var lg = document.getElementById("borderLegend");\n' +
'  if (lg) {\n' +
'    var html = "";\n' +
'    if (mode === 2) {\n' +
'      var g = []; for (var i = 0; i <= 6; i++) g.push(borderCss3(borderTempRgb(-10 + i * 50 / 6)));\n' +
'      html = \'<div class="row">Color = temperature</div><div class="grad" style="background:linear-gradient(90deg,\' + g.join(",") + \')"></div><div class="scale"><span>-10&deg;C</span><span>40&deg;C</span></div>\';\n' +
'    } else {\n' +
'      var items = [["transparent", null, "Clear"], ["Partly cloudy", [170,170,170]], ["Overcast", [128,128,128]], ["Fog", [85,85,85]], ["Rain", borderRgb(64,224,208)], ["Snow", [255,255,255]]];\n' +
'      items.forEach(function (it) {\n' +
'        var name = it[2] || it[0], css = it[1] ? borderCss3(it[1]) : "transparent";\n' +
'        html += \'<div class="row"><span class="sw" style="background:\' + css + \'"></span>\' + name + \'</div>\';\n' +
'      });\n' +
'    }\n' +
'    lg.innerHTML = html;\n' +
'  }\n' +
'  var ht = document.getElementById("borderHelpText");\n' +
'  if (ht) ht.textContent = "Example: the edge next to a label shows the " + (mode === 2 ? "temperature" : "weather") + " at that many hours from now. The diagram uses sample data; the watch uses your real forecast.";\n' +
'}\n' +
'function refreshBorderSubsectionPreview() {\n' +
'  var mode = borderMode();\n' +
'  var html = "";\n' +
'  if (mode) {\n' +
'    var cv = document.createElement("canvas"); cv.width = 34; cv.height = 39;\n' +
'    var c2 = cv.getContext("2d");\n' +
'    c2.fillStyle = (typeof dayColors === "function") ? dayColors().bg : "#000"; c2.fillRect(0, 0, 34, 39);\n' +
'    drawBorderBand(c2, 34, 39, Math.max(10, borderPx()), borderSectorColors(mode, new Date().getHours() % 12));\n' +
'    try { html = \'<img src="\' + cv.toDataURL("image/png") + \'" alt="">\'; } catch (e) { html = ""; }\n' +
'  }\n' +
'  setPreviewThumbnail("subsecpreview-border", html);\n' +
'  setSubsubheaderText("border", mode ? borderTitle(mode) + ", " + borderPx() + "px" : "Off");\n' +
'}\n' +
'function borderSyncFromHidden() {\n' +
'  var mode = borderMode();\n' +
'  var box = document.getElementById("borderWeatherEnabled"), sel = document.getElementById("borderWeatherModeSel");\n' +
'  if (box) box.checked = mode !== 0;\n' +
'  if (sel && mode) sel.value = String(mode);\n' +
'  var panel = document.getElementById("borderWeatherPanel");\n' +
'  if (panel) panel.style.display = mode ? "" : "none";\n' +
'  var pv = document.getElementById("borderWeatherPxVal");\n' +
'  if (pv) pv.textContent = borderPx() + "px";\n' +
'}\n' +
'function onBorderWeatherChange() {\n' +
'  var box = document.getElementById("borderWeatherEnabled"), sel = document.getElementById("borderWeatherModeSel");\n' +
'  var on = box && box.checked;\n' +
'  document.getElementById("borderWeatherMode").value = on ? (sel && sel.value === "2" ? "2" : "1") : "0";\n' +
'  borderSyncFromHidden();\n' +
'  renderBorderDiagram();\n' +
'  try { refreshAllSectionSubheaders(); } catch (e) {}\n' +
'  updatePreview();\n' +
'}\n' +
'function borderAfterStyleApplied() {\n' +
'  borderSyncFromHidden();\n' +
'  renderBorderDiagram();\n' +
'}\n' +
'function borderInit() { borderSyncFromHidden(); renderBorderDiagram(); }\n';
}

module.exports = {
  borderSectionHtml: borderSectionHtml,
  borderCss: borderCss,
  borderScript: borderScript
};
