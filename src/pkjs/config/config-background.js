// custom background: settings-page half
var esc = require('./config-template').esc;
var platform = require('../platform');
var bgImages = require('../data/generated/background-images');
var bgImagesRound = bgImages.imagesRound || {};
var weatherBgs = require('../data/generated/weather-backgrounds');

var BG_W = platform.w;
var BG_H = platform.h;
var BG_SLOT_COUNT = 9;
var BG_PACKED_B64_LENGTH = 45600;

function parseSource(current) {
  var m = /^([pu]):([0-9]+)$/.exec(String((current && current.bgSource) || ''));
  var numbers = bgImages.numbers || [];
  if (!m) return 'p:' + (numbers.length ? numbers[0] : 1);
  return m[1] + ':' + parseInt(m[2], 10);
}

function validSlots(current) {
  var out = {};
  var raw = (current && current.bgSlots) || {};
  for (var k = 1; k <= BG_SLOT_COUNT; k++) {
    var s = raw[String(k)];
    if (typeof s === 'string' && s.length === BG_PACKED_B64_LENGTH && /^[A-Za-z0-9_-]+$/.test(s)) out[String(k)] = s;
  }
  return out;
}

function isWeatherOn(current) {
  return !!current && (current.useWeatherBg === true || current.useWeatherBg === 'true') && !isOn(current);
}

function weatherStyleId(current) {
  var styles = weatherBgs.styles || [];
  var want = String((current && current.weatherBgStyle) || '');
  for (var i = 0; i < styles.length; i++) if (styles[i].id === want) return want;
  return styles.length ? styles[0].id : '';
}

function isOn(current) {
  return !!current && (current.useCustomBg === true || current.useCustomBg === 'true');
}

function isPluginOn(current) {
  return !!current && (current.usePluginBg === true || current.usePluginBg === 'true') && !isOn(current) && !isWeatherOn(current);
}

var PLUGIN_DITHERS = [['none', 'None (nearest color)'], ['fs', 'Floyd&ndash;Steinberg'], ['atkinson', 'Atkinson'],
  ['bayer4', 'Ordered 4x4 (Bayer)'], ['bayer8', 'Ordered 8x8 (Bayer)']];
var PLUGIN_COLORS = [['neutral', 'Normal'], ['vivid', 'Vivid colors'], ['bw', 'Black &amp; white'], ['sepia', 'Sepia']];
var PLUGIN_FITS = [['fill', 'Scale to fill the screen'], ['full', 'Scale to show the full image'],
  ['75', 'Scale to 75% of the screen'], ['50', 'Scale to 50% of the screen'], ['center', 'Original size, centered']];

function optionList(list, selected, fallback) {
  var known = list.some(function (e) { return e[0] === selected; });
  var sel = known ? selected : fallback;
  return list.map(function (e) {
    return '<option value="' + e[0] + '"' + (e[0] === sel ? ' selected' : '') + '>' + e[1] + '</option>';
  }).join('');
}

function pluginSourceLabel(src) {
  return String(src.pluginName || 'Plugin') + ' - ' + src.category + ' / ' + src.item + ': ' + src.label;
}

function pluginSourceOptions(current) {
  var cat = current && current.pluginCatalogue;
  var list = (cat && cat.status === 'ok' && Array.isArray(cat.imageSources)) ? cat.imageSources : [];
  var stored = String((current && current.pluginBgSource) || '');
  var opts = '', found = false;
  list.forEach(function (src) {
    var sel = src.key === stored || (!stored && !found && src === list[0]);
    if (src.key === stored) found = true;
    opts += '<option value="' + esc(src.key) + '"' + (sel ? ' selected' : '') + '>' + esc(pluginSourceLabel(src)) + '</option>';
  });
  if (stored && !found) opts += '<option value="' + esc(stored) + '" selected>Selected source (not available now)</option>';
  if (!opts) opts = '<option value="">No plugin provides images</option>';
  return { html: opts, any: list.length > 0 || !!stored,
    message: !cat || cat.status !== 'ok' ? ((cat && cat.message) || 'Plugins are not enabled.') : (list.length ? '' : 'No plugin offers an image right now.') };
}

function weatherThumbImgs() {
  return '<div style="display:none;">' + (weatherBgs.styles || []).map(function (st) {
    return '<img id="weatherBgThumb-' + esc(st.id) + '" src="' + ((platform.round && st.thumbRound) || st.thumb) + '" alt="">';
  }).join('') + '</div>';
}

function weatherStyleOptions(current) {
  var sel = weatherStyleId(current);
  return (weatherBgs.styles || []).map(function (st) {
    return '<option value="' + esc(st.id) + '"' + (st.id === sel ? ' selected' : '') + '>' + esc(st.label) + '</option>';
  }).join('');
}

function backgroundSectionHtml(current) {
  var numbers = bgImages.numbers || [];
  var pluginSrc = pluginSourceOptions(current);
  var presetHtml = '';
  if (numbers.length) {
    presetHtml = '<div class="example-style-grid">';
    numbers.forEach(function (n) {
      presetHtml += '<button type="button" class="example-style-btn" id="bgPresetBtn-' + n + '" onclick="bgSelectPreset(' + n + ')">' +
        '<img id="bgPresetImg-' + n + '" src="' + ((platform.round && bgImagesRound[String(n)]) || bgImages.images[String(n)]) + '" alt="Background ' + n + '"></button>';
    });
    presetHtml += '</div>';
  } else {
    presetHtml = '<div class="help">No predefined backgrounds yet.</div>';
  }
  return '' +
'    <div class="mode-btn-group" id="bgModeGroup" style="margin-top:2px;">' +
'      <button type="button" class="mode-btn' + (!isOn(current) && !isWeatherOn(current) && !isPluginOn(current) ? ' active' : '') + '" onclick="bgSetMode(0)">OFF</button>' +
'      <button type="button" class="mode-btn' + (isOn(current) ? ' active' : '') + '" onclick="bgSetMode(1)">IMAGE</button>' +
'      <button type="button" class="mode-btn' + (isWeatherOn(current) ? ' active' : '') + '" onclick="bgSetMode(2)">WEATHER</button>' +
'      <button type="button" class="mode-btn' + (isPluginOn(current) ? ' active' : '') + '" onclick="bgSetMode(3)">PLUGIN</button>' +
'    </div>' +
'    <div class="help"><b>IMAGE</b> = a predefined image or your own photo, <b>WEATHER</b> = a graphic matching the current weather, automatic night mode is used together with the night colors, <b>PLUGIN</b> = a picture supplied by a Pebble plugin.</div>' +
'    <div style="display:none;">' +
'      <input type="checkbox" id="useCustomBg" ' + (isOn(current) ? 'checked' : '') + '>' +
'      <input type="checkbox" id="useWeatherBg" ' + (isWeatherOn(current) ? 'checked' : '') + '>' +
'      <input type="checkbox" id="usePluginBg" ' + (isPluginOn(current) ? 'checked' : '') + '>' +
'    </div>' +
'    <div class="checkbox-row" id="bgTranslucentRow" style="margin-top:10px;' + (isOn(current) || isWeatherOn(current) || isPluginOn(current) ? '' : 'display:none;') + '">' +
'      <input type="checkbox" id="bgTranslucent" ' + (current && (current.bgTranslucent === true || current.bgTranslucent === 'true') ? 'checked' : '') + ' onchange="bgRefresh()">' +
'      <label for="bgTranslucent" style="margin:0;">Translucent background image</label>' +
'      <button type="button" class="help-btn" onclick="toggleHelp(\'help-bgTranslucent\')">?</button>' +
'    </div>' +
'    <div class="help" id="help-bgTranslucent" style="display:none;">Draws only every other pixel of the image (a checkerboard) and fills the rest with the background color, so the picture looks faded and the indices and features stay easy to read.</div>' +
'    <div id="weatherBgPanel" style="' + (isWeatherOn(current) ? '' : 'display:none;') + '">' +
'      <div class="bg-mem-warning" style="color:#e07a00;font-size:12px;line-height:1.4;margin:8px 0;">&#9888; Backgrounds need extra memory on the watch, which may run short if many other features are enabled. If that happens you will just see a blank background and flash red BG Image ERR. Restarting the watchface sometimes clears it; otherwise disable some options until it works again.</div>' +
'      <label for="weatherBgStyle">Style</label>' +
'      <select id="weatherBgStyle" onchange="bgRefresh()">' + weatherStyleOptions(current) + '</select>' +
'      ' + weatherThumbImgs() +
'    </div>' +
'    <div id="pluginBgPanel" style="' + (isPluginOn(current) ? '' : 'display:none;') + '">' +
'      <div class="bg-mem-warning" style="color:#e07a00;font-size:12px;line-height:1.4;margin:8px 0;">&#9888; Backgrounds need extra memory on the watch, which may run short if many other features are enabled. If that happens you will just see a blank background and flash red BG Image ERR. Restarting the watchface sometimes clears it; otherwise disable some options until it works again.</div>' +
'      <label for="pluginBgSource">Image source</label>' +
'      <select id="pluginBgSource" onchange="bgRefresh()"' + (pluginSrc.any ? '' : ' disabled') + '>' + pluginSrc.html + '</select>' +
(pluginSrc.message ? '      <div class="help" style="color:#d9822b;">' + esc(pluginSrc.message) + '</div>' : '') +
'      <label for="pluginBgDither">Dithering</label>' +
'      <select id="pluginBgDither" onchange="bgRefresh()">' + optionList(PLUGIN_DITHERS, String((current && current.pluginBgDither) || ''), 'fs') + '</select>' +
'      <label for="pluginBgColor">Color processing</label>' +
'      <select id="pluginBgColor" onchange="bgRefresh()">' + optionList(PLUGIN_COLORS, String((current && current.pluginBgColor) || ''), 'neutral') + '</select>' +
'      <label for="pluginBgFit">Screen filling</label>' +
'      <select id="pluginBgFit" onchange="bgRefresh()">' + optionList(PLUGIN_FITS, String((current && current.pluginBgFit) || ''), 'fill') + '</select>' +
(current && current.pluginBgStatus ? '      <div class="help" style="margin-top:8px;"><b>Status:</b> ' + esc(current.pluginBgStatus) + '</div>' : '') +
'      <div class="help" style="margin-top:8px;">The phone converts the plugin\'s picture to 64 colors with these settings and sends it to the watch. It is kept in the watch\'s memory only, so it is sent again whenever the watchface restarts, and removed when the plugin reports no image. Space around a smaller picture shows the background color.</div>' +
'    </div>' +
'    <div id="bgPanel" style="' + (isOn(current) ? '' : 'display:none;') + '">' +
'      <div class="bg-mem-warning" style="color:#e07a00;font-size:12px;line-height:1.4;margin:8px 0;">&#9888; Backgrounds need extra memory on the watch, which may run short if many other features are enabled. If that happens you will just see a blank background and flash red BG Image ERR. Restarting the watchface sometimes clears it; otherwise disable some options until it works again.</div>' +
'      <input type="hidden" id="bgSource" value="' + esc(parseSource(current)) + '">' +
'      <div class="bg-subtitle">Predefined</div>' +
'      ' + presetHtml +
'      <div class="bg-subtitle">My images</div>' +
'      <div class="example-style-grid" id="bgSlotGrid"></div>' +
'      <div class="help" style="margin-top:8px;">Tap a slot to add a photo. Images are converted to 64 colors and sent to the watch on Save.</div>' +
'    </div>';
}

function backgroundModalHtml() {
  return '' +
'<div class="modal-overlay" id="bgEditorModal">' +
'  <div class="modal-box">' +
'    <div class="modal-title">Custom background</div>' +
'    <div class="modal-scroll-body">' +
'      <div id="bgEdStage"><canvas id="bgEdCanvas" width="' + BG_W + '" height="' + BG_H + '"></canvas>' +
'        <div id="bgEdPlaceholder">Choose an image to start</div></div>' +
'      <div class="bg-ed-row">' +
'        <button type="button" class="marker-edit-btn" onclick="bgEdChooseFile()">Choose image</button>' +
'        <button type="button" class="marker-edit-btn" onclick="bgEdReset()">Reset</button>' +
'      </div>' +
'      <input type="file" id="bgEdFile" accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,.jpg,.jpeg,.png,.webp,.gif,.bmp" style="display:none;" onchange="bgEdFileChosen(this)">' +
'      <div class="help" id="bgEdMsg"></div>' +
'      <div class="bg-ed-row">' +
'        <input type="url" id="bgEdUrl" placeholder="...or paste an image web address" autocapitalize="off" autocorrect="off" spellcheck="false" style="flex:1; min-width:0;">' +
'        <button type="button" class="marker-edit-btn" style="flex:0 0 auto;" onclick="bgEdLoadUrl()">Load</button>' +
'      </div>' +
'      <div class="help">If the photo picker misbehaves (for example with "Take photo"), pick from your library only, or load a picture from a web address (the site has to allow it; an image you can open in the browser usually works). You can also paste an image.</div>' +
'      <label for="bgEdZoom">Zoom <span class="val" id="bgEdZoomVal">100%</span></label>' +
'      <input type="range" id="bgEdZoom" min="100" max="400" step="1" value="100" disabled oninput="bgEdZoomSlider(this.value)">' +
'      <div class="help">Drag to move the image, pinch or scroll to zoom.</div>' +
'      <label for="bgEdDither">Dithering</label>' +
'      <select id="bgEdDither" onchange="bgEdOptionsChanged()">' +
'        <option value="none">None (nearest color)</option>' +
'        <option value="fs" selected>Floyd&ndash;Steinberg</option>' +
'        <option value="atkinson">Atkinson</option>' +
'        <option value="bayer4">Ordered 4x4 (Bayer)</option>' +
'        <option value="bayer8">Ordered 8x8 (Bayer)</option>' +
'      </select>' +
'      <label for="bgEdStyle">Image style</label>' +
'      <select id="bgEdStyle" onchange="bgEdOptionsChanged()">' +
'        <option value="neutral" selected>Neutral</option>' +
'        <option value="bw">Black &amp; white</option>' +
'        <option value="sepia">Sepia</option>' +
'        <option value="vivid">Vivid colors</option>' +
'      </select>' +
'      <label>Save to slot</label>' +
'      <div class="bg-ed-slots" id="bgEdSlotRow"></div>' +
'      <div class="help" id="bgEdSlotNote"></div>' +
'    </div>' +
'    <button type="button" class="modal-confirm-btn" id="bgEdApplyBtn" disabled onclick="bgEdApply()">Use this image</button>' +
'    <button type="button" class="modal-cancel-btn" onclick="bgEdCancel()">Cancel</button>' +
'  </div>' +
'</div>';
}

var CLIENT_BODY =
'var BG_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";\n' +
'var BG_B64_REV = null;\n' +
'function bgB64urlEncode(bytes) {\n' +
'  var out = [];\n' +
'  var n = bytes.length;\n' +
'  for (var i = 0; i < n; i += 3) {\n' +
'    var b0 = bytes[i];\n' +
'    var b1 = i + 1 < n ? bytes[i + 1] : 0;\n' +
'    var b2 = i + 2 < n ? bytes[i + 2] : 0;\n' +
'    var s = BG_B64.charAt(b0 >> 2) + BG_B64.charAt(((b0 & 3) << 4) | (b1 >> 4));\n' +
'    if (i + 1 < n) s += BG_B64.charAt(((b1 & 15) << 2) | (b2 >> 6));\n' +
'    if (i + 2 < n) s += BG_B64.charAt(b2 & 63);\n' +
'    out.push(s);\n' +
'  }\n' +
'  return out.join("");\n' +
'}\n' +
'function bgB64urlDecode(str) {\n' +
'  if (!BG_B64_REV) {\n' +
'    BG_B64_REV = {};\n' +
'    for (var k = 0; k < 64; k++) BG_B64_REV[BG_B64.charAt(k)] = k;\n' +
'  }\n' +
'  var n = str.length;\n' +
'  var outLen = Math.floor(n * 3 / 4);\n' +
'  var out = new Uint8Array(outLen);\n' +
'  var o = 0;\n' +
'  for (var i = 0; i < n; i += 4) {\n' +
'    var c0 = BG_B64_REV[str.charAt(i)];\n' +
'    var c1 = BG_B64_REV[str.charAt(i + 1)];\n' +
'    var c2 = i + 2 < n ? BG_B64_REV[str.charAt(i + 2)] : 0;\n' +
'    var c3 = i + 3 < n ? BG_B64_REV[str.charAt(i + 3)] : 0;\n' +
'    if (o < outLen) out[o++] = (c0 << 2) | (c1 >> 4);\n' +
'    if (o < outLen) out[o++] = ((c1 & 15) << 4) | (c2 >> 2);\n' +
'    if (o < outLen) out[o++] = ((c2 & 3) << 6) | c3;\n' +
'  }\n' +
'  return out;\n' +
'}\n' +
'function bgPackPixels(vals) {\n' +
'  var n = vals.length;\n' +
'  var out = new Uint8Array(Math.ceil(n / 4) * 3);\n' +
'  for (var i = 0, o = 0; i < n; i += 4, o += 3) {\n' +
'    var v0 = vals[i];\n' +
'    var v1 = i + 1 < n ? vals[i + 1] : 0;\n' +
'    var v2 = i + 2 < n ? vals[i + 2] : 0;\n' +
'    var v3 = i + 3 < n ? vals[i + 3] : 0;\n' +
'    out[o] = (v0 << 2) | (v1 >> 4);\n' +
'    out[o + 1] = ((v1 & 15) << 4) | (v2 >> 2);\n' +
'    out[o + 2] = ((v2 & 3) << 6) | v3;\n' +
'  }\n' +
'  return out;\n' +
'}\n' +
'function bgUnpackPixels(bytes, n) {\n' +
'  var vals = new Uint8Array(n);\n' +
'  for (var i = 0, o = 0; i < n; i += 4, o += 3) {\n' +
'    var b0 = bytes[o] || 0;\n' +
'    var b1 = bytes[o + 1] || 0;\n' +
'    var b2 = bytes[o + 2] || 0;\n' +
'    vals[i] = b0 >> 2;\n' +
'    if (i + 1 < n) vals[i + 1] = ((b0 & 3) << 4) | (b1 >> 4);\n' +
'    if (i + 2 < n) vals[i + 2] = ((b1 & 15) << 2) | (b2 >> 6);\n' +
'    if (i + 3 < n) vals[i + 3] = b2 & 63;\n' +
'  }\n' +
'  return vals;\n' +
'}\n' +
'function bgValsToRgba(vals, rgba) {\n' +
'  for (var i = 0, n = vals.length; i < n; i++) {\n' +
'    var v = vals[i];\n' +
'    var p = i * 4;\n' +
'    rgba[p] = ((v >> 4) & 3) * 85;\n' +
'    rgba[p + 1] = ((v >> 2) & 3) * 85;\n' +
'    rgba[p + 2] = (v & 3) * 85;\n' +
'    rgba[p + 3] = 255;\n' +
'  }\n' +
'}\n' +
'function bgClamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }\n' +
'function bgStyleRgb(rgba, n, style) {\n' +
'  var f = new Float32Array(n * 3);\n' +
'  for (var i = 0; i < n; i++) {\n' +
'    var p = i * 4;\n' +
'    var a = rgba[p + 3] / 255;\n' +
'    var r = rgba[p] * a, g = rgba[p + 1] * a, b = rgba[p + 2] * a;\n' +
'    if (style === "bw") {\n' +
'      r = g = b = 0.299 * r + 0.587 * g + 0.114 * b;\n' +
'    } else if (style === "sepia") {\n' +
'      var r2 = 0.393 * r + 0.769 * g + 0.189 * b;\n' +
'      var g2 = 0.349 * r + 0.686 * g + 0.168 * b;\n' +
'      var b2 = 0.272 * r + 0.534 * g + 0.131 * b;\n' +
'      r = r2; g = g2; b = b2;\n' +
'    } else if (style === "vivid") {\n' +
'      var y = 0.299 * r + 0.587 * g + 0.114 * b;\n' +
'      r = (y + (r - y) * 1.5 - 128) * 1.1 + 128;\n' +
'      g = (y + (g - y) * 1.5 - 128) * 1.1 + 128;\n' +
'      b = (y + (b - y) * 1.5 - 128) * 1.1 + 128;\n' +
'    }\n' +
'    var q = i * 3;\n' +
'    f[q] = bgClamp255(r);\n' +
'    f[q + 1] = bgClamp255(g);\n' +
'    f[q + 2] = bgClamp255(b);\n' +
'  }\n' +
'  return f;\n' +
'}\n' +
'function bgBayerMatrix(n) {\n' +
'  if (n === 2) return [0, 2, 3, 1];\n' +
'  var h = n / 2;\n' +
'  var s = bgBayerMatrix(h);\n' +
'  var m = new Array(n * n);\n' +
'  for (var y = 0; y < n; y++) {\n' +
'    for (var x = 0; x < n; x++) {\n' +
'      m[y * n + x] = 4 * s[(y % h) * h + (x % h)] + [0, 2, 3, 1][(y >= h ? 2 : 0) + (x >= h ? 1 : 0)];\n' +
'    }\n' +
'  }\n' +
'  return m;\n' +
'}\n' +
'function bgLevel(v) {\n' +
'  var l = Math.floor(v / 85 + 0.5);\n' +
'  return l < 0 ? 0 : (l > 3 ? 3 : l);\n' +
'}\n' +
'function bgQuantize(f, w, h, mode) {\n' +
'  var n = w * h;\n' +
'  var vals = new Uint8Array(n);\n' +
'  var i, c, x, y;\n' +
'  if (mode === "fs" || mode === "atkinson") {\n' +
'    var wk = new Float32Array(f);\n' +
'    var fs = mode === "fs";\n' +
'    for (y = 0; y < h; y++) {\n' +
'      for (x = 0; x < w; x++) {\n' +
'        i = y * w + x;\n' +
'        var lv = [0, 0, 0];\n' +
'        for (c = 0; c < 3; c++) {\n' +
'          var old = wk[i * 3 + c];\n' +
'          var l = bgLevel(old);\n' +
'          lv[c] = l;\n' +
'          var err = old - l * 85;\n' +
'          if (fs) {\n' +
'            if (x + 1 < w) wk[(i + 1) * 3 + c] += err * 7 / 16;\n' +
'            if (y + 1 < h) {\n' +
'              if (x > 0) wk[(i + w - 1) * 3 + c] += err * 3 / 16;\n' +
'              wk[(i + w) * 3 + c] += err * 5 / 16;\n' +
'              if (x + 1 < w) wk[(i + w + 1) * 3 + c] += err / 16;\n' +
'            }\n' +
'          } else {\n' +
'            var e8 = err / 8;\n' +
'            if (x + 1 < w) wk[(i + 1) * 3 + c] += e8;\n' +
'            if (x + 2 < w) wk[(i + 2) * 3 + c] += e8;\n' +
'            if (y + 1 < h) {\n' +
'              if (x > 0) wk[(i + w - 1) * 3 + c] += e8;\n' +
'              wk[(i + w) * 3 + c] += e8;\n' +
'              if (x + 1 < w) wk[(i + w + 1) * 3 + c] += e8;\n' +
'            }\n' +
'            if (y + 2 < h) wk[(i + 2 * w) * 3 + c] += e8;\n' +
'          }\n' +
'        }\n' +
'        vals[i] = (lv[0] << 4) | (lv[1] << 2) | lv[2];\n' +
'      }\n' +
'    }\n' +
'    return vals;\n' +
'  }\n' +
'  var bn = mode === "bayer8" ? 8 : (mode === "bayer4" ? 4 : 0);\n' +
'  var bm = bn ? bgBayerMatrix(bn) : null;\n' +
'  for (y = 0; y < h; y++) {\n' +
'    for (x = 0; x < w; x++) {\n' +
'      i = y * w + x;\n' +
'      var t = bm ? ((bm[(y % bn) * bn + (x % bn)] + 0.5) / (bn * bn) - 0.5) * 85 : 0;\n' +
'      vals[i] = (bgLevel(f[i * 3] + t) << 4) | (bgLevel(f[i * 3 + 1] + t) << 2) | bgLevel(f[i * 3 + 2] + t);\n' +
'    }\n' +
'  }\n' +
'  return vals;\n' +
'}\n' +
'function bgCoverScale(sw, sh) { return Math.max(BG_W / sw, BG_H / sh); }\n' +
'function bgClampOff(off, size, view) {\n' +
'  var min = view - size;\n' +
'  if (off > 0) off = 0;\n' +
'  if (off < min) off = min;\n' +
'  return off;\n' +
'}\n' +
'\n' +
'var bgSlotUpdates = {};\n' +
'var bgSlotCanvas = {};\n' +
'var bgSlotThumb = {};\n' +
'var bgEd = { open: false, slot: 1, src: null, mips: null, sw: 0, sh: 0, scale: 1, minScale: 1, zoom: 1,\n' +
'  offX: 0, offY: 0, raw: null, out: null, vals: null, raf: 0, ptrs: {}, lastDist: 0, lastMidX: 0, lastMidY: 0 };\n' +
'\n' +
'function bgEl(id) { return document.getElementById(id); }\n' +
'function bgSlotHas(k) { return !!BG_USER_SLOTS[String(k)]; }\n' +
'function bgSlotsDirtyCount() { return Object.keys(bgSlotUpdates).length; }\n' +
'function bgDefaultSource() { return "p:" + (BG_PRESET_NUMBERS.length ? BG_PRESET_NUMBERS[0] : 1); }\n' +
'function bgParseSource() {\n' +
'  var el = bgEl("bgSource");\n' +
'  var m = /^([pu]):([0-9]+)$/.exec(el ? el.value : "");\n' +
'  if (!m) return { kind: "p", n: BG_PRESET_NUMBERS.length ? BG_PRESET_NUMBERS[0] : 1 };\n' +
'  return { kind: m[1], n: parseInt(m[2], 10) };\n' +
'}\n' +
'function bgDecodePacked(str) {\n' +
'  var vals = bgUnpackPixels(bgB64urlDecode(str), BG_W * BG_H);\n' +
'  var c = document.createElement("canvas");\n' +
'  c.width = BG_W; c.height = BG_H;\n' +
'  var cx = c.getContext("2d");\n' +
'  var id = cx.createImageData(BG_W, BG_H);\n' +
'  bgValsToRgba(vals, id.data);\n' +
'  cx.putImageData(id, 0, 0);\n' +
'  return c;\n' +
'}\n' +
'function bgSlotDecoded(k) {\n' +
'  if (!bgSlotHas(k)) return null;\n' +
'  if (!bgSlotCanvas[k]) {\n' +
'    try { bgSlotCanvas[k] = bgDecodePacked(BG_USER_SLOTS[String(k)]); } catch (e) { return null; }\n' +
'  }\n' +
'  return bgSlotCanvas[k];\n' +
'}\n' +
'function bgSlotThumbUrl(k) {\n' +
'  if (!bgSlotThumb[k]) {\n' +
'    var c = bgSlotDecoded(k);\n' +
'    if (!c) return "";\n' +
'    try { bgSlotThumb[k] = c.toDataURL("image/png"); } catch (e) { return ""; }\n' +
'  }\n' +
'  return bgSlotThumb[k];\n' +
'}\n' +
'\n' +
'function bgActiveSource() {\n' +
'  if (bgEd.open) return bgEd.src ? bgEl("bgEdCanvas") : null;\n' +
'  var wbox = bgEl("useWeatherBg");\n' +
'  if (wbox && wbox.checked) {\n' +
'    var wimg = bgEl("weatherBgThumb-" + bgEl("weatherBgStyle").value);\n' +
'    if (wimg && (!wimg.complete || !wimg.naturalWidth)) {\n' +
'      if (!wimg.getAttribute("data-bg-hooked")) {\n' +
'        wimg.setAttribute("data-bg-hooked", "1");\n' +
'        wimg.addEventListener("load", function () { updatePreview(); });\n' +
'      }\n' +
'      return null;\n' +
'    }\n' +
'    return wimg || null;\n' +
'  }\n' +
'  var box = bgEl("useCustomBg");\n' +
'  if (!box || !box.checked) return null;\n' +
'  var s = bgParseSource();\n' +
'  if (s.kind === "u") return bgSlotDecoded(s.n);\n' +
'  var img = bgEl("bgPresetImg-" + s.n);\n' +
'  if (!img) return null;\n' +
'  if (!img.complete || !img.naturalWidth) {\n' +
'    if (!img.getAttribute("data-bg-hooked")) {\n' +
'      img.setAttribute("data-bg-hooked", "1");\n' +
'      img.addEventListener("load", function () { updatePreview(); });\n' +
'    }\n' +
'    return null;\n' +
'  }\n' +
'  return img;\n' +
'}\n' +
'function drawCustomBackgroundPreview(ctx, w, h) {\n' +
'  var s = bgActiveSource();\n' +
'  if (!s) return false;\n' +
'  var nw = s.naturalWidth || s.width, nh = s.naturalHeight || s.height;\n' +
'  if (!nw || !nh) return false;\n' +
'  var dw = nw * w / BG_W, dh = nh * h / BG_H;\n' +
'  var trans = bgEl("bgTranslucent");\n' +
'  if (trans && trans.checked) {\n' +
'    try {\n' +
'      var tmp = document.createElement("canvas"); tmp.width = w; tmp.height = h;\n' +
'      var tctx = tmp.getContext("2d");\n' +
'      tctx.drawImage(s, (w - dw) / 2, (h - dh) / 2, dw, dh);\n' +
'      var id = tctx.getImageData(0, 0, w, h), px = id.data;\n' +
'      for (var y = 0; y < h; y++) for (var x = ((y & 1) ? 0 : 1); x < w; x += 2) px[(y * w + x) * 4 + 3] = 0;\n' +
'      tctx.putImageData(id, 0, 0);\n' +
'      ctx.drawImage(tmp, 0, 0);\n' +
'    } catch (e) { return false; }\n' +
'    return true;\n' +
'  }\n' +
'  try { ctx.drawImage(s, (w - dw) / 2, (h - dh) / 2, dw, dh); } catch (e) { return false; }\n' +
'  return true;\n' +
'}\n' +
'function bgSubheaderPart() {\n' +
'  var wbox = bgEl("useWeatherBg");\n' +
'  if (wbox && wbox.checked) return " + weather background";\n' +
'  var pbox = bgEl("usePluginBg");\n' +
'  if (pbox && pbox.checked) return " + plugin background";\n' +
'  var box = bgEl("useCustomBg");\n' +
'  if (!box || !box.checked) return "";\n' +
'  var s = bgParseSource();\n' +
'  if (s.kind === "u") return bgSlotHas(s.n) ? " + my image " + s.n : "";\n' +
'  return BG_PRESET_NUMBERS.length ? " + background " + s.n : "";\n' +
'}\n' +
'\n' +
'function bgSyncUi() {\n' +
'  var box = bgEl("useCustomBg");\n' +
'  var panel = bgEl("bgPanel");\n' +
'  var wbox = bgEl("useWeatherBg"), wpanel = bgEl("weatherBgPanel");\n' +
'  var pbox = bgEl("usePluginBg"), ppanel = bgEl("pluginBgPanel");\n' +
'  if (wpanel) wpanel.style.display = (wbox && wbox.checked) ? "" : "none";\n' +
'  if (ppanel) ppanel.style.display = (pbox && pbox.checked) ? "" : "none";\n' +
'  var bmode = (wbox && wbox.checked) ? 2 : ((box && box.checked) ? 1 : ((pbox && pbox.checked) ? 3 : 0));\n' +
'  var bbtns = bgEl("bgModeGroup") ? bgEl("bgModeGroup").getElementsByClassName("mode-btn") : [];\n' +
'  for (var bi = 0; bi < bbtns.length; bi++) bbtns[bi].className = "mode-btn" + (bi === bmode ? " active" : "");\n' +
'  var trow = bgEl("bgTranslucentRow");\n' +
'  if (trow) trow.style.display = bmode === 0 ? "none" : "";\n' +
'  if (panel) panel.style.display = (box && box.checked) ? "" : "none";\n' +
'  var sel = bgParseSource();\n' +
'  for (var i = 0; i < BG_PRESET_NUMBERS.length; i++) {\n' +
'    var n = BG_PRESET_NUMBERS[i];\n' +
'    var b = bgEl("bgPresetBtn-" + n);\n' +
'    if (b) b.className = "example-style-btn" + (sel.kind === "p" && sel.n === n ? " selected" : "");\n' +
'  }\n' +
'  var host = bgEl("bgSlotGrid");\n' +
'  if (!host) return;\n' +
'  var html = "";\n' +
'  for (var k = 1; k <= BG_SLOT_COUNT; k++) {\n' +
'    var has = bgSlotHas(k);\n' +
'    var isSel = sel.kind === "u" && sel.n === k && has;\n' +
'    if (has) {\n' +
'      html += \'<div class="bg-slot"><button type="button" class="example-style-btn\' + (isSel ? " selected" : "") +\n' +
'        \'" onclick="bgSelectSlot(\' + k + \')"><img src="\' + bgSlotThumbUrl(k) + \'" alt="My image \' + k + \'"></button>\' +\n' +
'        \'<div class="bg-slot-actions"><button type="button" onclick="bgOpenEditor(\' + k + \')">Replace</button>\' +\n' +
'        \'<button type="button" onclick="bgDeleteSlot(\' + k + \')">Delete</button></div></div>\';\n' +
'    } else {\n' +
'      html += \'<div class="bg-slot"><button type="button" class="example-style-btn bg-tile-empty" onclick="bgOpenEditor(\' + k +\n' +
'        \')">+</button><div class="bg-slot-actions"><span>Slot \' + k + \'</span></div></div>\';\n' +
'    }\n' +
'  }\n' +
'  host.innerHTML = html;\n' +
'}\n' +
'function refreshBackgroundSubsectionPreview() {\n' +
'  var box = bgEl("useCustomBg");\n' +
'  var html = "", title = "Plain background color";\n' +
'  var pbox = bgEl("usePluginBg");\n' +
'  if (pbox && pbox.checked && !(box && box.checked)) title = "Plugin background";\n' +
'  var wbox = bgEl("useWeatherBg");\n' +
'  if (wbox && wbox.checked) {\n' +
'    var wi = bgEl("weatherBgThumb-" + bgEl("weatherBgStyle").value);\n' +
'    if (wi) html = \'<img src="\' + wi.getAttribute("src") + \'" alt="">\';\n' +
'    title = "Weather background";\n' +
'    setPreviewThumbnail("subsecpreview-background", html);\n' +
'    setSubsubheaderText("background", title);\n' +
'    return;\n' +
'  }\n' +
'  if (box && box.checked) {\n' +
'    var s = bgParseSource();\n' +
'    if (s.kind === "u" && bgSlotHas(s.n)) { var u = bgSlotThumbUrl(s.n); if (u) html = \'<img src="\' + u + \'" alt="">\'; title = "My image " + s.n; }\n' +
'    else if (s.kind === "p") { var im = bgEl("bgPresetImg-" + s.n); if (im) html = \'<img src="\' + im.getAttribute("src") + \'" alt="">\'; title = "Predefined background " + s.n; }\n' +
'  }\n' +
'  setPreviewThumbnail("subsecpreview-background", html);\n' +
'  setSubsubheaderText("background", title);\n' +
'}\n' +
'function bgRefresh() {\n' +
'  bgSyncUi();\n' +
'  try { refreshAllSectionSubheaders(); } catch (e) {}\n' +
'  updatePreview();\n' +
'}\n' +
'function bgInit() {\n' +
'  var s = bgParseSource();\n' +
'  if (s.kind === "u" && !bgSlotHas(s.n)) bgEl("bgSource").value = bgDefaultSource();\n' +
'  bgSyncUi();\n' +
'  bgEdSetup();\n' +
'}\n' +
'function bgSetMode(m) {\n' +
'  var cb = bgEl("useCustomBg"), wb = bgEl("useWeatherBg"), pb = bgEl("usePluginBg");\n' +
'  if (cb) cb.checked = (m === 1);\n' +
'  if (wb) wb.checked = (m === 2);\n' +
'  if (pb) pb.checked = (m === 3);\n' +
'  if (m === 2) {\n' +
'    var ne = bgEl("nightEnabled");\n' +
'    if (ne && !ne.checked) { ne.checked = true; try { onNightToggle(); } catch (e) {} }\n' +
'  }\n' +
'  bgRefresh();\n' +
'}\n' +
'function onUseCustomBgChange() {\n' +
'  var cb = bgEl("useCustomBg"), wb = bgEl("useWeatherBg"), pb = bgEl("usePluginBg");\n' +
'  if (cb && cb.checked && wb) wb.checked = false;\n' +
'  if (cb && cb.checked && pb) pb.checked = false;\n' +
'  bgRefresh();\n' +
'}\n' +
'function onUseWeatherBgChange() {\n' +
'  var cb = bgEl("useCustomBg"), wb = bgEl("useWeatherBg"), pb = bgEl("usePluginBg");\n' +
'  if (wb && wb.checked) {\n' +
'    if (cb) cb.checked = false;\n' +
'    if (pb) pb.checked = false;\n' +
'    var ne = bgEl("nightEnabled");\n' +
'    if (ne && !ne.checked) { ne.checked = true; try { onNightToggle(); } catch (e) {} }\n' +
'  }\n' +
'  bgRefresh();\n' +
'}\n' +
'function bgSelectPreset(n) { bgEl("bgSource").value = "p:" + n; bgRefresh(); }\n' +
'function bgSelectSlot(k) { bgEl("bgSource").value = "u:" + k; bgRefresh(); }\n' +
'function bgDeleteSlot(k) {\n' +
'  showConfirm("Delete image", "Remove my image " + k + "?", function () {\n' +
'    BG_USER_SLOTS[String(k)] = "";\n' +
'    delete BG_USER_SLOTS[String(k)];\n' +
'    bgSlotUpdates[String(k)] = "";\n' +
'    delete bgSlotCanvas[k];\n' +
'    delete bgSlotThumb[k];\n' +
'    var s = bgParseSource();\n' +
'    if (s.kind === "u" && s.n === k) bgEl("bgSource").value = bgDefaultSource();\n' +
'    bgRefresh();\n' +
'  }, { danger: true, confirmLabel: "Delete" });\n' +
'}\n' +
'function bgAfterStyleApplied() {\n' +
'  var cb0 = bgEl("useCustomBg"), wb0 = bgEl("useWeatherBg"), pb0 = bgEl("usePluginBg");\n' +
'  if (cb0 && wb0 && cb0.checked) wb0.checked = false;\n' +
'  if (pb0 && ((cb0 && cb0.checked) || (wb0 && wb0.checked))) pb0.checked = false;\n' +
'  var s = bgParseSource();\n' +
'  if (s.kind === "u" && !bgSlotHas(s.n)) bgEl("bgSource").value = bgDefaultSource();\n' +
'  bgSyncUi();\n' +
'}\n' +
'\n' +
'function bgEdSchedule() {\n' +
'  if (bgEd.raf) return;\n' +
'  var raf = window.requestAnimationFrame || function (fn) { return setTimeout(fn, 16); };\n' +
'  bgEd.raf = raf(bgEdRender);\n' +
'}\n' +
'function bgEdRender() {\n' +
'  bgEd.raf = 0;\n' +
'  if (!bgEd.open) return;\n' +
'  var live = bgEl("bgEdCanvas");\n' +
'  var lctx = live.getContext("2d");\n' +
'  if (!bgEd.src) {\n' +
'    lctx.fillStyle = "#222";\n' +
'    lctx.fillRect(0, 0, BG_W, BG_H);\n' +
'    return;\n' +
'  }\n' +
'  if (!bgEd.raw) {\n' +
'    bgEd.raw = document.createElement("canvas");\n' +
'    bgEd.raw.width = BG_W; bgEd.raw.height = BG_H;\n' +
'  }\n' +
'  var rctx = bgEd.raw.getContext("2d");\n' +
'  rctx.fillStyle = "#000";\n' +
'  rctx.fillRect(0, 0, BG_W, BG_H);\n' +
'  var lvl = 0, s = bgEd.scale;\n' +
'  while (lvl + 1 < bgEd.mips.length && s * 2 <= 1.0001) { s *= 2; lvl++; }\n' +
'  var mip = bgEd.mips[lvl];\n' +
'  try { rctx.imageSmoothingQuality = "high"; } catch (e) {}\n' +
'  rctx.drawImage(mip, bgEd.offX, bgEd.offY, bgEd.sw * bgEd.scale, bgEd.sh * bgEd.scale);\n' +
'  var id = rctx.getImageData(0, 0, BG_W, BG_H);\n' +
'  var rgb = bgStyleRgb(id.data, BG_W * BG_H, bgEl("bgEdStyle").value);\n' +
'  bgEd.vals = bgQuantize(rgb, BG_W, BG_H, bgEl("bgEdDither").value);\n' +
'  if (!bgEd.out) bgEd.out = lctx.createImageData(BG_W, BG_H);\n' +
'  bgValsToRgba(bgEd.vals, bgEd.out.data);\n' +
'  lctx.putImageData(bgEd.out, 0, 0);\n' +
'  updatePreview();\n' +
'}\n' +
'function bgEdSetZoomUi() {\n' +
'  bgEl("bgEdZoom").value = String(Math.round(bgEd.zoom * 100));\n' +
'  bgEl("bgEdZoomVal").textContent = Math.round(bgEd.zoom * 100) + "%";\n' +
'}\n' +
'function bgEdClampOffsets() {\n' +
'  bgEd.offX = bgClampOff(bgEd.offX, bgEd.sw * bgEd.scale, BG_W);\n' +
'  bgEd.offY = bgClampOff(bgEd.offY, bgEd.sh * bgEd.scale, BG_H);\n' +
'}\n' +
'function bgEdZoomAt(zoom, cx, cy) {\n' +
'  if (!bgEd.src) return;\n' +
'  if (zoom < 1) zoom = 1;\n' +
'  if (zoom > 4) zoom = 4;\n' +
'  var oldScale = bgEd.scale;\n' +
'  var newScale = bgEd.minScale * zoom;\n' +
'  bgEd.offX = cx - (cx - bgEd.offX) * newScale / oldScale;\n' +
'  bgEd.offY = cy - (cy - bgEd.offY) * newScale / oldScale;\n' +
'  bgEd.scale = newScale;\n' +
'  bgEd.zoom = zoom;\n' +
'  bgEdClampOffsets();\n' +
'  bgEdSetZoomUi();\n' +
'  bgEdSchedule();\n' +
'}\n' +
'function bgEdZoomSlider(v) { bgEdZoomAt(parseInt(v, 10) / 100, BG_W / 2, BG_H / 2); }\n' +
'function bgEdReset() {\n' +
'  if (!bgEd.src) return;\n' +
'  bgEd.zoom = 1;\n' +
'  bgEd.scale = bgEd.minScale;\n' +
'  bgEd.offX = (BG_W - bgEd.sw * bgEd.scale) / 2;\n' +
'  bgEd.offY = (BG_H - bgEd.sh * bgEd.scale) / 2;\n' +
'  bgEdSetZoomUi();\n' +
'  bgEdSchedule();\n' +
'}\n' +
'function bgEdOptionsChanged() { bgEdSchedule(); }\n' +
'function bgEdMessage(text) { bgEl("bgEdMsg").textContent = text || ""; }\n' +
'function bgEdSlotRowRender() {\n' +
'  var html = "";\n' +
'  for (var k = 1; k <= BG_SLOT_COUNT; k++) {\n' +
'    html += \'<button type="button" class="bg-ed-slot\' + (k === bgEd.slot ? " active" : "") + (bgSlotHas(k) ? " used" : "") +\n' +
'      \'" onclick="bgEdPickSlot(\' + k + \')">\' + k + \'</button>\';\n' +
'  }\n' +
'  bgEl("bgEdSlotRow").innerHTML = html;\n' +
'  var used = bgSlotHas(bgEd.slot);\n' +
'  bgEl("bgEdSlotNote").textContent = used ? "Slot " + bgEd.slot + " already has an image -- it will be replaced." : "";\n' +
'}\n' +
'function bgEdPickSlot(k) { bgEd.slot = k; bgEdSlotRowRender(); }\n' +
'function bgOpenEditor(k) {\n' +
'  bgEd.open = true;\n' +
'  bgEd.slot = k;\n' +
'  bgEd.src = null; bgEd.mips = null; bgEd.raw = null; bgEd.out = null; bgEd.vals = null;\n' +
'  bgEd.ptrs = {};\n' +
'  bgEl("bgEdApplyBtn").disabled = true;\n' +
'  bgEl("bgEdPlaceholder").style.display = "";\n' +
'  bgEl("bgEdZoom").disabled = true;\n' +
'  bgEdMessage("");\n' +
'  bgEdSlotRowRender();\n' +
'  bgEl("bgEditorModal").className = "modal-overlay open";\n' +
'  bgEdSchedule();\n' +
'  bgEdChooseFile();\n' +
'}\n' +
'function bgEdChooseFile() {\n' +
'  var inp = bgEl("bgEdFile");\n' +
'  try { inp.click(); } catch (e) {}\n' +
'}\n' +
'function bgEdFileChosen(inp) {\n' +
'  var f = inp.files && inp.files[0];\n' +
'  if (f) bgEdLoadFile(f);\n' +
'  try { inp.value = ""; } catch (e) {}\n' +
'}\n' +
'function bgEdLoadFile(file) {\n' +
'  bgEdMessage("Loading image...");\n' +
'  var URLApi = window.URL || window.webkitURL;\n' +
'  if (!URLApi || !URLApi.createObjectURL) { bgEdMessage("This browser cannot open image files."); return; }\n' +
'  var url = URLApi.createObjectURL(file);\n' +
'  var img = new Image();\n' +
'  img.onload = function () {\n' +
'    try {\n' +
'      var nw = img.naturalWidth, nh = img.naturalHeight;\n' +
'      if (!nw || !nh) throw new Error("empty image");\n' +
'      var cap = 1600;\n' +
'      var k = Math.min(1, cap / Math.max(nw, nh));\n' +
'      var c = document.createElement("canvas");\n' +
'      c.width = Math.max(1, Math.round(nw * k));\n' +
'      c.height = Math.max(1, Math.round(nh * k));\n' +
'      var cx = c.getContext("2d");\n' +
'      cx.fillStyle = "#000";\n' +
'      cx.fillRect(0, 0, c.width, c.height);\n' +
'      cx.drawImage(img, 0, 0, c.width, c.height);\n' +
'      var mips = [c];\n' +
'      var cur = c;\n' +
'      while (cur.width >= BG_W * 2 && cur.height >= BG_H * 2 && mips.length < 6) {\n' +
'        var m = document.createElement("canvas");\n' +
'        m.width = Math.floor(cur.width / 2);\n' +
'        m.height = Math.floor(cur.height / 2);\n' +
'        m.getContext("2d").drawImage(cur, 0, 0, m.width, m.height);\n' +
'        mips.push(m);\n' +
'        cur = m;\n' +
'      }\n' +
'      URLApi.revokeObjectURL(url);\n' +
'      if (!bgEd.open) return;\n' +
'      bgEd.mips = mips;\n' +
'      bgEd.src = c;\n' +
'      bgEd.sw = c.width; bgEd.sh = c.height;\n' +
'      bgEd.minScale = bgCoverScale(c.width, c.height);\n' +
'      bgEl("bgEdPlaceholder").style.display = "none";\n' +
'      bgEl("bgEdApplyBtn").disabled = false;\n' +
'      bgEl("bgEdZoom").disabled = false;\n' +
'      bgEdMessage("");\n' +
'      bgEdReset();\n' +
'    } catch (e) {\n' +
'      try { URLApi.revokeObjectURL(url); } catch (e2) {}\n' +
'      bgEdMessage("Could not use that image (" + (e && e.message ? e.message : "error") + ").");\n' +
'    }\n' +
'  };\n' +
'  img.onerror = function () {\n' +
'    try { URLApi.revokeObjectURL(url); } catch (e2) {}\n' +
'    bgEdMessage("Could not read that file as an image.");\n' +
'  };\n' +
'  img.src = url;\n' +
'}\n' +
'function bgEdLoadUrl() {\n' +
'  var inp = bgEl("bgEdUrl");\n' +
'  var u = inp ? inp.value.replace(/^\\s+|\\s+$/g, "") : "";\n' +
'  if (!u) { bgEdMessage("Type or paste the web address of an image first."); return; }\n' +
'  if (!window.fetch) { bgEdMessage("This browser cannot load images from a web address."); return; }\n' +
'  bgEdMessage("Downloading image...");\n' +
'  fetch(u, { mode: "cors" }).then(function (r) {\n' +
'    if (!r.ok) throw new Error("HTTP " + r.status);\n' +
'    return r.blob();\n' +
'  }).then(function (b) {\n' +
'    bgEdLoadFile(b);\n' +
'  }).catch(function () {\n' +
'    bgEdMessage("Could not download that image (the site may not allow it). Save it to your photos and pick it from the library instead.");\n' +
'  });\n' +
'}\n' +
'function bgEdPaste(e) {\n' +
'  if (!bgEd.open) return;\n' +
'  var items = e.clipboardData && e.clipboardData.items;\n' +
'  if (!items) return;\n' +
'  for (var i = 0; i < items.length; i++) {\n' +
'    if (items[i].type && items[i].type.indexOf("image/") === 0) {\n' +
'      var f = items[i].getAsFile();\n' +
'      if (f) { e.preventDefault(); bgEdLoadFile(f); return; }\n' +
'    }\n' +
'  }\n' +
'}\n' +
'function bgEdClose() {\n' +
'  bgEd.open = false;\n' +
'  bgEd.src = null; bgEd.mips = null; bgEd.raw = null; bgEd.out = null; bgEd.vals = null;\n' +
'  bgEd.ptrs = {};\n' +
'  bgEl("bgEditorModal").className = "modal-overlay";\n' +
'}\n' +
'function bgEdCancel() { bgEdClose(); updatePreview(); }\n' +
'function bgEdApply() {\n' +
'  if (!bgEd.src || !bgEd.vals) return;\n' +
'  var str = bgB64urlEncode(bgPackPixels(bgEd.vals));\n' +
'  var k = bgEd.slot;\n' +
'  BG_USER_SLOTS[String(k)] = str;\n' +
'  bgSlotUpdates[String(k)] = str;\n' +
'  delete bgSlotCanvas[k];\n' +
'  delete bgSlotThumb[k];\n' +
'  bgEdClose();\n' +
'  bgEl("bgSource").value = "u:" + k;\n' +
'  bgEl("useCustomBg").checked = true;\n' +
'  bgRefresh();\n' +
'}\n' +
'function bgEdCanvasPoint(e) {\n' +
'  var r = bgEl("bgEdCanvas").getBoundingClientRect();\n' +
'  return { x: (e.clientX - r.left) * BG_W / r.width, y: (e.clientY - r.top) * BG_H / r.height, k: BG_W / r.width };\n' +
'}\n' +
'function bgEdPtrCount() { return Object.keys(bgEd.ptrs).length; }\n' +
'function bgEdPinchState() {\n' +
'  var ids = Object.keys(bgEd.ptrs);\n' +
'  var a = bgEd.ptrs[ids[0]], b = bgEd.ptrs[ids[1]];\n' +
'  return { dist: Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y)) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };\n' +
'}\n' +
'function bgEdPointerDown(e) {\n' +
'  if (!bgEd.src) return;\n' +
'  e.preventDefault();\n' +
'  var p = bgEdCanvasPoint(e);\n' +
'  bgEd.ptrs[e.pointerId] = { x: p.x, y: p.y };\n' +
'  try { bgEl("bgEdCanvas").setPointerCapture(e.pointerId); } catch (e2) {}\n' +
'  if (bgEdPtrCount() === 2) {\n' +
'    var st = bgEdPinchState();\n' +
'    bgEd.lastDist = st.dist; bgEd.lastMidX = st.mx; bgEd.lastMidY = st.my;\n' +
'  }\n' +
'}\n' +
'function bgEdPointerMove(e) {\n' +
'  if (!bgEd.ptrs[e.pointerId]) return;\n' +
'  e.preventDefault();\n' +
'  var p = bgEdCanvasPoint(e);\n' +
'  var prev = bgEd.ptrs[e.pointerId];\n' +
'  if (bgEdPtrCount() === 1) {\n' +
'    bgEd.offX += p.x - prev.x;\n' +
'    bgEd.offY += p.y - prev.y;\n' +
'    bgEd.ptrs[e.pointerId] = { x: p.x, y: p.y };\n' +
'    bgEdClampOffsets();\n' +
'    bgEdSchedule();\n' +
'  } else if (bgEdPtrCount() === 2) {\n' +
'    bgEd.ptrs[e.pointerId] = { x: p.x, y: p.y };\n' +
'    var st = bgEdPinchState();\n' +
'    bgEd.offX += st.mx - bgEd.lastMidX;\n' +
'    bgEd.offY += st.my - bgEd.lastMidY;\n' +
'    bgEdZoomAt(bgEd.zoom * st.dist / bgEd.lastDist, st.mx, st.my);\n' +
'    bgEd.lastDist = st.dist; bgEd.lastMidX = st.mx; bgEd.lastMidY = st.my;\n' +
'  }\n' +
'}\n' +
'function bgEdPointerUp(e) {\n' +
'  delete bgEd.ptrs[e.pointerId];\n' +
'  var ids = Object.keys(bgEd.ptrs);\n' +
'  if (ids.length === 2) {\n' +
'    var st = bgEdPinchState();\n' +
'    bgEd.lastDist = st.dist; bgEd.lastMidX = st.mx; bgEd.lastMidY = st.my;\n' +
'  }\n' +
'}\n' +
'function bgEdWheel(e) {\n' +
'  if (!bgEd.src) return;\n' +
'  e.preventDefault();\n' +
'  var p = bgEdCanvasPoint(e);\n' +
'  bgEdZoomAt(bgEd.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y);\n' +
'}\n' +
'function bgEdDrop(e) {\n' +
'  e.preventDefault();\n' +
'  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];\n' +
'  if (f) bgEdLoadFile(f);\n' +
'}\n' +
'function bgEdSetup() {\n' +
'  var c = bgEl("bgEdCanvas");\n' +
'  if (!c) return;\n' +
'  c.addEventListener("pointerdown", bgEdPointerDown);\n' +
'  c.addEventListener("pointermove", bgEdPointerMove);\n' +
'  c.addEventListener("pointerup", bgEdPointerUp);\n' +
'  c.addEventListener("pointercancel", bgEdPointerUp);\n' +
'  c.addEventListener("wheel", bgEdWheel);\n' +
'  var stage = bgEl("bgEdStage");\n' +
'  stage.addEventListener("dragover", function (e) { e.preventDefault(); });\n' +
'  stage.addEventListener("drop", bgEdDrop);\n' +
'  document.addEventListener("paste", bgEdPaste);\n' +
'}\n';

var CSS_TEXT =
'  .example-style-btn.selected { outline: 3px solid #ff9200; outline-offset: -3px; }\n' +
'  .bg-slot { display: flex; flex-direction: column; gap: 4px; }\n' +
'  .bg-slot-actions { display: flex; gap: 4px; justify-content: center; font-size: 11px; color: var(--text-muted); min-height: 24px; align-items: center; }\n' +
'  .bg-slot-actions button { flex: 1; padding: 4px 2px; font-size: 11px; border-radius: 6px; border: 1px solid var(--border); background: var(--btn-bg); color: var(--text); }\n' +
'  .bg-tile-empty { font-size: 28px; font-weight: 300; color: var(--text-faint); display: flex; align-items: center; justify-content: center; }\n' +
'  .bg-subtitle { margin-top: 12px; font-size: 13px; font-weight: 600; color: var(--text-strong); }\n' +
'  #bgEdStage { position: relative; width: 100%; max-width: 240px; margin: 0 auto; aspect-ratio: ' + BG_W + ' / ' + BG_H + '; background: #222; border-radius: 6px; overflow: hidden; }\n' +
'  #bgEdCanvas { display: block; width: 100%; height: 100%; touch-action: none; image-rendering: pixelated; cursor: grab; }\n' +
'  #bgEdPlaceholder { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; text-align: center; padding: 12px; color: #bbb; font-size: 13px; pointer-events: none; }\n' +
'  .bg-ed-row { display: flex; gap: 8px; margin-top: 10px; }\n' +
'  .bg-ed-row button { flex: 1; }\n' +
'  .bg-ed-slots { display: flex; gap: 4px; margin-top: 6px; }\n' +
'  .bg-ed-slot { flex: 1; padding: 8px 0; font-size: 13px; font-weight: 600; border-radius: 6px; border: 1px solid var(--border); background: var(--btn-bg); color: var(--text); }\n' +
'  .bg-ed-slot.used { border-style: dashed; }\n' +
'  .bg-ed-slot.active { background: #ff9200; border-color: #ff9200; color: #fff; }\n' +
'  #bgEditorModal .modal-box { overflow-y: auto; }\n' +
'  #bgEditorModal label { display: block; margin-top: 12px; }\n';

function backgroundCss() { return CSS_TEXT; }

function backgroundScript(current) {
  var numbers = bgImages.numbers || [];
  return '' +
'var BG_W = ' + BG_W + ';\n' +
'var BG_H = ' + BG_H + ';\n' +
'var SCREEN_ROUND = ' + (platform.round ? 'true' : 'false') + ';\n' +
'var BG_SLOT_COUNT = ' + BG_SLOT_COUNT + ';\n' +
'var BG_PRESET_NUMBERS = ' + JSON.stringify(numbers) + ';\n' +
'var BG_USER_SLOTS = ' + JSON.stringify(validSlots(current)) + ';\n' +
  CLIENT_BODY;
}

module.exports = {
  BG_W: BG_W,
  BG_H: BG_H,
  BG_SLOT_COUNT: BG_SLOT_COUNT,
  backgroundSectionHtml: backgroundSectionHtml,
  backgroundModalHtml: backgroundModalHtml,
  backgroundCss: backgroundCss,
  backgroundScript: backgroundScript
};
