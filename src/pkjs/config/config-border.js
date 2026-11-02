// weather border: settings-page half
var esc = require('./config-template').esc;
var SEVEN_STOPS = require('../weather/weather-normalize').SEVEN_STOP_GRADIENT_STOPS;

function borderSectionHtml(current) {
  var mode = String(current.borderWeatherMode || '0');
  if (['1', '2', '3', '4'].indexOf(mode) < 0) mode = '0';
  var scheme = String(current.borderWeatherScheme || '0');
  if (scheme !== '1' && scheme !== '2') scheme = '0';
  var px = parseInt(current.borderWeatherPx, 10);
  if (isNaN(px)) px = 8;
  px = Math.max(2, Math.min(40, px));
  function sel(v, cur) { return v === cur ? ' selected' : ''; }
  var shown = mode !== '0' ? mode : '1';
  return '' +
'    <div class="help">Turns the edge of the screen into a 12-hour weather forecast. Like on the dial, the sector at each clock position shows the weather for the next time the hour hand will be there.</div>' +
'    <div class="checkbox-row" id="borderWeatherEnabledRow" style="margin-top:10px;">' +
'      <input type="checkbox" id="borderWeatherEnabled" ' + (mode !== '0' ? 'checked' : '') + ' onchange="onBorderWeatherChange()">' +
'      <label for="borderWeatherEnabled" style="margin:0;">Use border to show weather</label>' +
'    </div>' +
'    <input type="hidden" id="borderWeatherMode" value="' + mode + '">' +
'    <div id="borderWeatherPanel" style="' + (mode !== '0' ? '' : 'display:none;') + '">' +
'      <div class="field-label-row"><label for="borderWeatherModeSel">Show</label></div>' +
'      <select id="borderWeatherModeSel" onchange="onBorderWeatherChange()">' +
'        <option value="1"' + sel('1', shown) + '>Weather conditions</option>' +
'        <option value="2"' + sel('2', shown) + '>Temperature</option>' +
'        <option value="3"' + sel('3', shown) + '>Rain chance</option>' +
'        <option value="4"' + sel('4', shown) + '>All three (3 stripes)</option>' +
'      </select>' +
'      <div class="help" id="borderCombinedWarn" style="display:none;"></div>' +
'      <div class="field-label-row" style="margin-top:12px;"><label for="borderWeatherScheme">Colors</label></div>' +
'      <select id="borderWeatherScheme" onchange="onBorderWeatherChange()">' +
'        <option value="0"' + sel('0', scheme) + '></option>' +
'        <option value="1"' + sel('1', scheme) + '></option>' +
'        <option value="2"' + sel('2', scheme) + '></option>' +
'      </select>' +
'      <div class="field-label-row" style="margin-top:12px;"><label for="borderWeatherPx">Thickness <span class="val" id="borderWeatherPxVal">' + px + 'px</span></label></div>' +
'      <div class="slider-with-buttons">' +
'        <button type="button" class="slider-step-btn" onclick="stepSlider(\'borderWeatherPx\', -1); onBorderWeatherChange();">&minus;</button>' +
'        <input type="range" id="borderWeatherPx" min="2" max="40" step="1" value="' + px + '" oninput="onBorderWeatherChange()">' +
'        <button type="button" class="slider-step-btn" onclick="stepSlider(\'borderWeatherPx\', 1); onBorderWeatherChange();">+</button>' +
'      </div>' +
'      <div class="checkbox-row" style="margin-top:12px;">' +
'        <input type="checkbox" id="borderWeatherSemi" ' + (current.borderWeatherSemi ? 'checked' : '') + ' onchange="onBorderWeatherChange()">' +
'        <label for="borderWeatherSemi" style="margin:0;">Semi-transparent (every other pixel)</label>' +
'      </div>' +
'      <div class="checkbox-row">' +
'        <input type="checkbox" id="borderWeatherShake" ' + (current.borderWeatherShake ? 'checked' : '') + ' onchange="onBorderWeatherChange()">' +
'        <label for="borderWeatherShake" style="margin:0;">Only show when the watch is shaken</label>' +
'      </div>' +
'      <div class="help">Shown for the same time as the other show-on-shake features (the shake duration slider in Animation).</div>' +
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
'  .border-legend .sub { font-weight: 700; font-size: 11px; margin: 6px 0 3px; color: var(--text-strong); }\n' +
'  .border-legend .grad-row { display: flex; align-items: flex-start; gap: 8px; }\n' +
'  .border-legend .grad-col { flex: 1; min-width: 0; }\n' +
'  .border-legend .grad-unit { flex: 0 0 auto; font-size: 12px; font-weight: 700; line-height: 20px; margin-top: 0; color: var(--text-strong); }\n' +
'  .border-legend .scale { position: relative; height: 26px; font-size: 11px; }\n' +
'  .border-legend .scale .tick { position: absolute; top: 0; width: 1px; height: 4px; background: var(--text-muted); }\n' +
'  .border-legend .scale .tl { position: absolute; top: 5px; white-space: nowrap; transform: translateX(-50%); }\n' +
'  .border-legend .scale .tl.first { transform: none; }\n' +
'  .border-legend .scale .tl.last { transform: translateX(-100%); }\n';

function borderCss() { return CSS_TEXT; }

function borderScript() {
  return '' +
'var BORDER_STOPS = ' + JSON.stringify(SEVEN_STOPS) + ';\n' +
'var BORDER_WX_NAMES = ["Clear", "Partly cloudy", "Overcast", "Fog", "Drizzle", "Rain", "Heavy rain", "Snow", "Thunderstorm", "Sleet"];\n' +
'var BORDER_WX_DETAILED = [null, [170,170,170], null, [85,85,85], [170,255,255], [0,85,255], [0,0,170], [255,255,255], [255,255,0], [85,170,255]];\n' +
'var BORDER_WX_HAZARD = [null, [170,255,170], [0,255,0], [255,255,85], [255,255,0], [255,170,0], [255,0,0], [170,0,255], [255,0,255], [255,0,170]];\n' +
'var BORDER_TEMP_COLD_HOT = [[0,0,255], [85,170,255], [255,255,255], [255,170,0], [255,0,0]];\n' +
'var BORDER_TEMP_HEAT_MAP = [[0,0,170], [170,0,170], [255,0,0], [255,170,0], [255,255,255]];\n' +
'var BORDER_RAIN_BLUE = [[170,255,255], [0,170,255], [0,0,170]];\n' +
'var BORDER_SCHEME_NAMES = {\n' +
'  1: ["Classic (6 looks)", "Detailed (thunder, heavy rain, ...)", "Hazard (green to red)"],\n' +
'  2: ["Rainbow (like features)", "Cold to hot (blue, white, red)", "Heat map (blue to white)"],\n' +
'  3: ["White to turquoise", "Blue ramp", "Traffic light (steps)"],\n' +
'  4: ["Default colors of each", "Alternative 1 of each", "Alternative 2 of each"]\n' +
'};\n' +
'var BORDER_SAMPLE_WX = [0, 1, 2, 3, 4, 5, 6, 8, 7, 9, 1, 0];\n' +
'var BORDER_SAMPLE_RAIN = [0, 10, 20, 30, 45, 60, 85, 90, 70, 55, 15, 0];\n' +
'var BORDER_SAMPLE_TEMP = [-5, 0, 5, 10, 14, 18, 22, 26, 30, 24, 16, 8];\n' +
'function borderQ(v) { return Math.max(0, Math.min(3, v >> 6)) * 85; }\n' +
'function borderRgb(r, g, b) { return [borderQ(r), borderQ(g), borderQ(b)]; }\n' +
'function borderLerp(stops, value, minV, maxV) {\n' +
'  var n = stops.length, segs = n - 1;\n' +
'  if (value <= minV) return borderRgb(stops[0][0], stops[0][1], stops[0][2]);\n' +
'  if (value >= maxV) return borderRgb(stops[n - 1][0], stops[n - 1][1], stops[n - 1][2]);\n' +
'  var pos = Math.trunc(((value - minV) * 1000 * segs) / (maxV - minV));\n' +
'  var seg = Math.min(segs - 1, Math.trunc(pos / 1000)), fr = pos - seg * 1000;\n' +
'  var a = stops[seg], b = stops[seg + 1];\n' +
'  return borderRgb(a[0] + Math.trunc(((b[0] - a[0]) * fr) / 1000), a[1] + Math.trunc(((b[1] - a[1]) * fr) / 1000), a[2] + Math.trunc(((b[2] - a[2]) * fr) / 1000));\n' +
'}\n' +
'function borderTempRgb(t, scheme) {\n' +
'  if (scheme === 1) return borderLerp(BORDER_TEMP_COLD_HOT, t, -10, 40);\n' +
'  if (scheme === 2) return borderLerp(BORDER_TEMP_HEAT_MAP, t, -10, 40);\n' +
'  return borderLerp(BORDER_STOPS, t, -10, 40);\n' +
'}\n' +
'function borderTurquoise(p) {\n' +
'  var f = Math.trunc((Math.max(0, Math.min(100, p)) * 1000) / 100);\n' +
'  return borderRgb(255 - Math.trunc((191 * f) / 1000), 255 - Math.trunc((31 * f) / 1000), 255 - Math.trunc((47 * f) / 1000));\n' +
'}\n' +
'function borderFillConditions(wx, scheme) {\n' +
'  var G1 = [85, 85, 85], G2 = [170, 170, 170], none = [null, null];\n' +
'  if (wx === 0) return none;\n' +
'  if (scheme === 0) {\n' +
'    if (wx === 1) return [G2, G2];\n' +
'    if (wx === 2) return [G1, G2];\n' +
'    if (wx === 3) return [G1, G1];\n' +
'    if (wx === 7) return [[255, 255, 255], [255, 255, 255]];\n' +
'    var r = borderTurquoise(100); return [r, r];\n' +
'  }\n' +
'  if (scheme === 1 && wx === 2) return [G1, G2];\n' +
'  var c = (scheme === 1 ? BORDER_WX_DETAILED : BORDER_WX_HAZARD)[wx];\n' +
'  return c ? [c, c] : none;\n' +
'}\n' +
'function borderFillTemp(t, scheme) { var c = borderTempRgb(t, scheme); return [c, c]; }\n' +
'function borderFillRain(p, scheme) {\n' +
'  var c;\n' +
'  if (scheme === 0) { if (p < 5) return [null, null]; c = borderTurquoise(p); }\n' +
'  else if (scheme === 1) { if (p < 5) return [null, null]; c = borderLerp(BORDER_RAIN_BLUE, p, 0, 100); }\n' +
'  else { if (p < 20) return [null, null]; c = p < 50 ? [255, 255, 0] : (p < 80 ? [255, 170, 0] : [255, 0, 0]); }\n' +
'  return [c, c];\n' +
'}\n' +
'function borderSectorColors(mode, scheme, hour12) {\n' +
'  var nl = mode === 4 ? 3 : 1, layers = [], hours = [], l, s;\n' +
'  for (l = 0; l < nl; l++) { var row = []; for (s = 0; s < 12; s++) row.push([null, null]); layers.push(row); }\n' +
'  for (s = 0; s < 12; s++) hours.push(0);\n' +
'  for (var h = 1; h <= 12; h++) {\n' +
'    var sec = (hour12 + h) % 12, i = h - 1;\n' +
'    hours[sec] = h;\n' +
'    if (mode === 4) {\n' +
'      layers[0][sec] = borderFillTemp(BORDER_SAMPLE_TEMP[i], scheme);\n' +
'      layers[1][sec] = borderFillConditions(BORDER_SAMPLE_WX[i], scheme);\n' +
'      layers[2][sec] = borderFillRain(BORDER_SAMPLE_RAIN[i], scheme);\n' +
'    } else if (mode === 1) layers[0][sec] = borderFillConditions(BORDER_SAMPLE_WX[i], scheme);\n' +
'    else if (mode === 2) layers[0][sec] = borderFillTemp(BORDER_SAMPLE_TEMP[i], scheme);\n' +
'    else layers[0][sec] = borderFillRain(BORDER_SAMPLE_RAIN[i], scheme);\n' +
'  }\n' +
'  return { layers: layers, hours: hours };\n' +
'}\n' +
'function borderSectorOf(dx, dy) {\n' +
'  var ax = Math.abs(dx), ay = Math.abs(dy), band;\n' +
'  if (ax * 1000 < ay * 268) band = 0; else if (ax < ay) band = 1; else if (ax * 1000 < ay * 3732) band = 2; else band = 3;\n' +
'  if (dy < 0) return dx >= 0 ? band : (12 - band) % 12;\n' +
'  return dx >= 0 ? 6 - band : (6 + band) % 12;\n' +
'}\n' +
'function drawBorderBand(ctx, w, h, px, look, semi) {\n' +
'  var scale = w / 200, t = Math.max(1, Math.round(px * scale)), nl = look.layers.length;\n' +
'  var id = ctx.createImageData(w, h), d = id.data;\n' +
'  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {\n' +
'    var depth = Math.min(x, y, w - 1 - x, h - 1 - y);\n' +
'    if (depth >= t) continue;\n' +
'    if (semi && ((x + y) & 1)) continue;\n' +
'    var layer = Math.trunc((depth * nl) / t);\n' +
'    var e = look.layers[layer][borderSectorOf(2 * x + 1 - w, 2 * y + 1 - h)];\n' +
'    var c = (semi ? (y & 1) : ((x + y) & 1)) ? e[1] : e[0];\n' +
'    if (!c) continue;\n' +
'    var o = (y * w + x) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;\n' +
'  }\n' +
'  var tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;\n' +
'  tmp.getContext("2d").putImageData(id, 0, 0);\n' +
'  ctx.drawImage(tmp, 0, 0);\n' +
'}\n' +
'function borderMode() { var el = document.getElementById("borderWeatherMode"); var v = el ? parseInt(el.value, 10) : 0; return (v >= 1 && v <= 4) ? v : 0; }\n' +
'function borderScheme() { var el = document.getElementById("borderWeatherScheme"); var v = el ? parseInt(el.value, 10) : 0; return (v === 1 || v === 2) ? v : 0; }\n' +
'function borderSemi() { var el = document.getElementById("borderWeatherSemi"); return !!(el && el.checked); }\n' +
'function borderPx() { var el = document.getElementById("borderWeatherPx"); var v = el ? parseInt(el.value, 10) : 8; return isNaN(v) ? 8 : Math.max(2, Math.min(40, v)); }\n' +
'function drawWeatherBorderPreview(ctx, w, h) {\n' +
'  var mode = borderMode();\n' +
'  if (!mode) return;\n' +
'  drawBorderBand(ctx, w, h, borderPx(), borderSectorColors(mode, borderScheme(), new Date().getHours() % 12), borderSemi());\n' +
'}\n' +
'function borderCss3(c) { return c ? "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")" : "transparent"; }\n' +
'function borderTitle(mode) { return ["", "Weather conditions", "Temperature", "Rain chance", "All three"][mode]; }\n' +
'function borderGradientCss(fn, n) { var g = []; for (var i = 0; i <= n; i++) g.push(borderCss3(fn(i / n))); return "linear-gradient(90deg," + g.join(",") + ")"; }\n' +
'function borderScale(ticks) {\n' +
'  var html = \'<div class="scale">\';\n' +
'  ticks.forEach(function (t, i) {\n' +
'    var cls = i === 0 ? " first" : (i === ticks.length - 1 ? " last" : "");\n' +
'    html += \'<span class="tick" style="left:\' + t.pct + \'%"></span><span class="tl\' + cls + \'" style="left:\' + t.pct + \'%">\' + t.label + \'</span>\';\n' +
'  });\n' +
'  return html + \'</div>\';\n' +
'}\n' +
'function borderTempUnitSym() {\n' +
'  var el = document.getElementById("tempUnit"), unit = el ? el.value : "C";\n' +
'  return unit === "F" ? "&deg;F" : (unit === "K" ? "K" : "&deg;C");\n' +
'}\n' +
'function borderTempTicks() {\n' +
'  var el = document.getElementById("tempUnit"), unit = el ? el.value : "C";\n' +
'  var out = [];\n' +
'  for (var i = 0; i <= 4; i++) {\n' +
'    var c = -10 + i * 12.5, v = c;\n' +
'    if (unit === "F") v = c * 9 / 5 + 32;\n' +
'    else if (unit === "K") v = c + 273.15;\n' +
'    out.push({ pct: i * 25, label: String(Math.round(v)) });\n' +
'  }\n' +
'  return out;\n' +
'}\n' +
'function borderRow(css, name) { return \'<div class="row"><span class="sw" style="background:\' + css + \'"></span>\' + name + \'</div>\'; }\n' +
'function borderLegendFor(mode, scheme) {\n' +
'  var html = "", i;\n' +
'  if (mode === 1) {\n' +
'    var show = scheme === 0 ? [0, 1, 2, 3, 5, 7] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];\n' +
'    show.forEach(function (wx) {\n' +
'      var f = borderFillConditions(wx, scheme), name = BORDER_WX_NAMES[wx];\n' +
'      if (scheme === 0 && wx === 5) name = "Any rain, drizzle, thunder";\n' +
'      var css = wx === 2 ? "repeating-conic-gradient(rgb(85,85,85) 0 25%, rgb(170,170,170) 0 50%) 0 0 / 4px 4px" : borderCss3(f[0]);\n' +
'      html += borderRow(css, name);\n' +
'    });\n' +
'  } else if (mode === 2) {\n' +
'    html = \'<div class="grad-row"><div class="grad-col"><div class="grad" style="background:\' + borderGradientCss(function (f) { return borderTempRgb(-10 + f * 50, scheme); }, 12) + \'"></div>\' + borderScale(borderTempTicks()) + \'</div><span class="grad-unit">\' + borderTempUnitSym() + \'</span></div>\';\n' +
'  } else {\n' +
'    if (scheme === 2) {\n' +
'      html = borderRow("transparent", "Under 20 %") + borderRow("rgb(255,255,0)", "20 - 49 %") + borderRow("rgb(255,170,0)", "50 - 79 %") + borderRow("rgb(255,0,0)", "80 % or more");\n' +
'    } else {\n' +
'      html = \'<div class="grad" style="background:\' + borderGradientCss(function (f) { var p = f * 100; return scheme === 1 ? borderLerp(BORDER_RAIN_BLUE, p, 0, 100) : borderTurquoise(p); }, 12) + \'"></div>\' + borderScale([{ pct: 0, label: "5 %" }, { pct: 100, label: "100 %" }]);\n' +
'    }\n' +
'  }\n' +
'  return html;\n' +
'}\n' +
'function renderBorderDiagram() {\n' +
'  var cv = document.getElementById("borderDiagram");\n' +
'  if (!cv || !cv.getContext) return;\n' +
'  var mode = borderMode() || 1, scheme = borderScheme(), ctx = cv.getContext("2d"), w = cv.width, h = cv.height;\n' +
'  var col = (typeof dayColors === "function") ? dayColors() : { bg: "#000", text: "#fff" };\n' +
'  var hour12 = new Date().getHours() % 12;\n' +
'  ctx.clearRect(0, 0, w, h); ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);\n' +
'  var look = borderSectorColors(mode, scheme, hour12);\n' +
'  drawBorderBand(ctx, w, h, borderPx(), look, borderSemi());\n' +
'  ctx.fillStyle = col.text; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "bold 13px sans-serif";\n' +
'  var cx = w / 2, cy = h / 2, rx = w / 2 - 44, ry = h / 2 - 44;\n' +
'  for (var s = 0; s < 12; s++) {\n' +
'    var a = s * Math.PI / 6;\n' +
'    var tx = cx + Math.sin(a) * rx * 1.05, ty = cy - Math.cos(a) * ry * 1.05;\n' +
'    ctx.globalAlpha = look.hours[s] === 12 ? 0.55 : 1;\n' +
'    ctx.fillText("+" + look.hours[s] + "h", tx, ty);\n' +
'  }\n' +
'  ctx.globalAlpha = 1; ctx.font = "11px sans-serif";\n' +
'  ctx.fillText("now: " + (hour12 === 0 ? 12 : hour12) + " o\'clock", cx, cy - 8);\n' +
'  ctx.fillText("(+12h = same spot)", cx, cy + 8);\n' +
'  var lg = document.getElementById("borderLegend");\n' +
'  if (lg) {\n' +
'    if (mode === 4) {\n' +
'      lg.innerHTML = \'<div class="sub">Outer: temperature</div>\' + borderLegendFor(2, scheme) + \'<div class="sub">Middle: conditions</div>\' + borderLegendFor(1, scheme) + \'<div class="sub">Inner: rain chance</div>\' + borderLegendFor(3, scheme);\n' +
'    } else lg.innerHTML = borderLegendFor(mode, scheme);\n' +
'  }\n' +
'  var ht = document.getElementById("borderHelpText");\n' +
'}\n' +
'function refreshBorderSubsectionPreview() {\n' +
'  var mode = borderMode();\n' +
'  var html = "";\n' +
'  if (mode) {\n' +
'    var cv = document.createElement("canvas"); cv.width = 34; cv.height = 39;\n' +
'    var c2 = cv.getContext("2d");\n' +
'    c2.fillStyle = (typeof dayColors === "function") ? dayColors().bg : "#000"; c2.fillRect(0, 0, 34, 39);\n' +
'    drawBorderBand(c2, 34, 39, Math.max(mode === 4 ? 36 : 10, borderPx()), borderSectorColors(mode, borderScheme(), new Date().getHours() % 12), borderSemi());\n' +
'    try { html = \'<img src="\' + cv.toDataURL("image/png") + \'" alt="">\'; } catch (e) { html = ""; }\n' +
'  }\n' +
'  setPreviewThumbnail("subsecpreview-border", html);\n' +
'  var extra = "";\n' +
'  if (mode) { var sh = document.getElementById("borderWeatherShake"); extra = (sh && sh.checked ? ", on shake" : ""); }\n' +
'  setSubsubheaderText("border", mode ? borderTitle(mode) + ", " + borderPx() + "px" + extra : "Off");\n' +
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
'  var sc = document.getElementById("borderWeatherScheme");\n' +
'  if (sc) { var names = BORDER_SCHEME_NAMES[mode || 1]; for (var i = 0; i < 3; i++) sc.options[i].text = names[i]; }\n' +
'  var warn = document.getElementById("borderCombinedWarn");\n' +
'  if (warn) {\n' +
'    warn.style.display = mode === 4 ? "" : "none";\n' +
'    var per = Math.max(1, Math.floor(borderPx() / 3));\n' +
'    warn.style.color = borderPx() < 18 ? "#d93025" : "";\n' +
'    warn.textContent = "Note: this draws three stripes (outside: temperature, middle: conditions, inside: rain chance), each a third of the thickness, so the border has to be thicker to be readable - at least 18 px. Currently " + borderPx() + " px = " + per + " px per stripe." + (borderPx() < 18 ? " Increase the thickness." : "");\n' +
'  }\n' +
'}\n' +
'function onBorderWeatherChange() {\n' +
'  var box = document.getElementById("borderWeatherEnabled"), sel = document.getElementById("borderWeatherModeSel");\n' +
'  var on = box && box.checked;\n' +
'  document.getElementById("borderWeatherMode").value = on ? (sel ? sel.value : "1") : "0";\n' +
'  borderSyncFromHidden();\n' +
'  renderBorderDiagram();\n' +
'  try { refreshAllSectionSubheaders(); } catch (e) {}\n' +
'  updatePreview();\n' +
'}\n' +
'function borderAfterStyleApplied() {\n' +
'  borderSyncFromHidden();\n' +
'  renderBorderDiagram();\n' +
'}\n' +
'function onTempUnitChange(val) {\n' +
'  selectModeButton("tempUnitGroup", "tempUnit", val);\n' +
'  renderBorderDiagram();\n' +
'  updatePreview();\n' +
'}\n' +
'function borderInit() { borderSyncFromHidden(); renderBorderDiagram(); }\n';
}

module.exports = {
  borderSectionHtml: borderSectionHtml,
  borderCss: borderCss,
  borderScript: borderScript
};
