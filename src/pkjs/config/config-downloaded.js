// "Downloaded" indices: the settings-page half (tile helpers, popup, GitHub browsing, PNG -> 1-bit mask).
// The mask format is the watch's (GBitmap 1BitPalette: rows padded to 4 bytes, least significant bit = leftmost
// pixel, 1 = ink), see bg-image/marker-image-sync.js and c/rendering/dial/marker_download.c.
var platform = require('../platform');

var REPO = 'zalewszczak/pebble-modern-watchface';
var FOLDER = 'resources/extras/' + (platform.round ? 'round' : (platform.bw ? 'legacy' : 'square')) + '/indices';
var DL_ICON = '<svg class="dl-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/></svg>';

function pinnedHtml() {
  return '' +
'<div class="dl-pinned" id="dlPinned">' +
'  <div class="dl-pinned-img" id="dlPinnedImg"></div>' +
'  <div class="dl-pinned-info"><div class="dl-pinned-label" id="dlPinnedLabel"></div><div id="dlPinnedText"></div></div>' +
'</div>';
}

function moreViewHtml() {
  return '' +
'<div class="dl-status" id="dlStatus"></div>' +
'<details class="dl-debug" id="dlDebug" style="display:none;"><summary>More information</summary><pre id="dlDebugText"></pre></details>' +
'<div class="style-picker-grid" id="dlGrid"></div>';
}

function uploadViewHtml() {
  return '' +
'<input type="file" id="dlFile" accept="image/png" style="display:none;" onchange="dlOnFile(this)">' +
'<div class="help" id="dlRequirements" style="display:none;"></div>' +
'<div class="dl-status" id="dlLibStatus"></div>' +
'<div class="style-picker-grid" id="dlLibGrid"></div>';
}

function downloadedCss() {
  return '' +
'  .dl-icon { display: block; margin: 0 auto; }' +
'  .dl-badge { position: absolute; right: 3px; top: 3px; width: 16px; height: 16px; padding: 2px; border-radius: 50%; background: #ff9200; color: #fff; box-sizing: border-box; }' +
'  .dl-empty-note { display: block; font-size: 10px; line-height: 1.2; padding: 0 4px; color: var(--text-muted, #888); text-align: center; }' +
'  .dl-pinned { display: flex; gap: 10px; margin: 10px 0 4px; padding: 8px; background: rgba(128,128,128,.12); border-radius: 8px; }' +
'  .dl-pinned-img { flex: 0 0 38%; display: flex; align-items: center; justify-content: center; background: #2a2a2e; border-radius: 6px; padding: 4px; box-sizing: border-box; min-height: 70px; }' +
'  .dl-pinned-img img { max-width: 100%; max-height: 96px; display: block; }' +
'  .dl-pinned-info { flex: 1; min-width: 0; font-size: 12px; line-height: 1.4; }' +
'  .dl-pinned-label { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-muted, #888); margin-bottom: 2px; }' +
'  .dl-pinned-info b { font-size: 13px; }' +
'  .dl-more-link { color: #ff9200; font-weight: 700; margin-top: 2px; display: inline-block; }' +
'  .dl-debug { font-size: 11px; margin-bottom: 8px; color: var(--text-muted, #888); }' +
'  .dl-debug pre { white-space: pre-wrap; word-break: break-all; margin: 4px 0 0; font-size: 10px; user-select: text; -webkit-user-select: text; }' +
'  .dl-status { font-size: 12px; color: var(--text-muted, #888); margin: 8px 0 6px; }' +
'  .dl-cell { background: #2a2a2e; border: 2px solid transparent; position: relative; display: flex; align-items: center; justify-content: center; padding: 2px; }' +
'  .dl-cell img { max-width: 100%; max-height: 100%; width: auto; height: auto; }' +
'  .dl-cell.selected, .style-picker-btn.selected { border-color: #ff9200; box-shadow: 0 0 0 1px #ff9200; }' +
'  .dl-remove { position: absolute; top: 3px; right: 3px; width: 22px; height: 22px; border-radius: 50%; border: none; background: #c0392b; color: #fff; font-size: 14px; line-height: 22px; padding: 0; }';
}

function downloadedScript(current) {
  var cur = current && current.dlIndex ? current.dlIndex : null;
  return '' +
'var DL_REPO = ' + JSON.stringify(REPO) + ';' +
'var DL_FOLDER = ' + JSON.stringify(FOLDER) + ';' +
'var DL_MAX_W = ' + platform.w + ', DL_MAX_H = ' + platform.h + ';' +
'var DL_ICON = ' + JSON.stringify(DL_ICON) + ';' +
'var dlCurrent = ' + JSON.stringify(cur) + ';' +
'var dlUpdate = null;' +        // pending change for the phone: { name, w, h, data } or { clear: true }
'var dlFiles = null;' +         // file list of the GitHub folder (null = not loaded)
'var dlPick = null;' +
'var dlLibrary = ' + JSON.stringify(current && current.dlLibrary ? current.dlLibrary : []) + ';' +
'var dlLibOps = { add: [], remove: [] };' +        // changes the phone has not been given yet
'var DL_LIB_MAX = 12;' +
'function dlLibOpsSent(sent) {' +
'  dlLibOps.add = dlLibOps.add.filter(function (a) { return !sent.add.some(function (b) { return b.name === a.name && b.data === a.data; }); });' +
'  dlLibOps.remove = dlLibOps.remove.filter(function (n) { return sent.remove.indexOf(n) < 0; });' +
'}' +
'function dlLibHasOps() { return dlLibOps.add.length > 0 || dlLibOps.remove.length > 0; }' +          // entry picked in the popup
'var DL_B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";' +
'function dlB64Encode(bytes) {' +
'  var out = "", i;' +
'  for (i = 0; i + 2 < bytes.length; i += 3) {' +
'    var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];' +
'    out += DL_B64.charAt(n >> 18) + DL_B64.charAt((n >> 12) & 63) + DL_B64.charAt((n >> 6) & 63) + DL_B64.charAt(n & 63);' +
'  }' +
'  var rest = bytes.length - i;' +
'  if (rest === 1) { var a = bytes[i] << 16; out += DL_B64.charAt(a >> 18) + DL_B64.charAt((a >> 12) & 63); }' +
'  else if (rest === 2) { var b = (bytes[i] << 16) | (bytes[i + 1] << 8); out += DL_B64.charAt(b >> 18) + DL_B64.charAt((b >> 12) & 63) + DL_B64.charAt((b >> 6) & 63); }' +
'  return out;' +
'}' +
'function dlB64Decode(str) {' +
'  var out = [], acc = 0, bits = 0;' +
'  for (var i = 0; i < str.length; i++) {' +
'    acc = (acc << 6) | DL_B64.indexOf(str.charAt(i)); bits += 6;' +
'    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); acc &= (1 << bits) - 1; }' +
'  }' +
'  return out;' +
'}' +
// mask bytes -> PNG data URL (white ink, transparent elsewhere), for the preview and the popup
'function dlMaskToDataUrl(w, h, bytes) {' +
'  var c = document.createElement("canvas"); c.width = w; c.height = h;' +
'  var ctx = c.getContext("2d"), im = ctx.createImageData(w, h), stride = ((w + 31) >> 5) << 2;' +
'  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {' +
'    if ((bytes[y * stride + (x >> 3)] >> (x & 7)) & 1) { var p = (y * w + x) * 4; im.data[p] = im.data[p + 1] = im.data[p + 2] = 255; im.data[p + 3] = 255; }' +
'  }' +
'  ctx.putImageData(im, 0, 0);' +
'  return c.toDataURL("image/png");' +
'}' +
'function dlImageToMask(img) {' +
'  var w = img.naturalWidth, h = img.naturalHeight;' +
'  var c = document.createElement("canvas"); c.width = w; c.height = h;' +
'  var ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);' +
'  var px = ctx.getImageData(0, 0, w, h).data, stride = ((w + 31) >> 5) << 2, bytes = new Array(stride * h);' +
'  for (var i = 0; i < bytes.length; i++) bytes[i] = 0;' +
'  for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {' +
'    if (px[(y * w + x) * 4 + 3] >= 128) bytes[y * stride + (x >> 3)] |= 1 << (x & 7);' +
'  }' +
'  return { w: w, h: h, bytes: bytes };' +
'}' +
// keeps MARKER_PREVIEW_IMAGES["20"] (used by the tile, the preview and the tinted dial preview) in step with the data
'function dlRefreshPreview() {' +
'  var data = dlUpdate ? (dlUpdate.clear ? null : dlUpdate) : dlCurrent;' +
'  MARKER_PREVIEW_IMAGES["20"] = data ? dlMaskToDataUrl(data.w, data.h, dlB64Decode(data.data)) : "";' +
'  if (typeof MARKER_PREVIEW_IMG_CACHE === "object") delete MARKER_PREVIEW_IMG_CACHE["20"];' +
'  if (typeof MARKER_TINT_CACHE === "object") MARKER_TINT_CACHE = {};' +
'  return data;' +
'}' +
'function dlIsCurrentStyle20() { var el = document.getElementById("bigAnalogMarkerStyle"); return !!el && el.value === "20"; }' +
'function dlRenderGrid() {' +
'  var grid = document.getElementById("dlGrid"), html = "";' +
'  (dlFiles || []).forEach(function (f, i) {' +
'    var sel = dlPick ? dlPick.key === f.name : (dlIsCurrentStyle20() && dlCurrent && dlCurrent.name === f.name);' +
'    html += \'<button type="button" class="style-picker-btn dl-cell\' + (sel ? " selected" : "") + \'" title="\' + dlEsc(dlTitle(f)) + \'" onclick="dlSelect(\' + i + \')">\' +' +
'      \'<img crossorigin="anonymous" loading="lazy" src="\' + f.url + \'" alt=""></button>\';' +
'  });' +
'  grid.innerHTML = html;' +
'}' +
'function dlRenderLib() {' +
'  var grid = document.getElementById("dlLibGrid"), html = "";' +
'  dlLibrary.forEach(function (e, i) {' +
'    var key = "u:" + e.name;' +
'    var sel = dlPick ? dlPick.key === key : (dlIsCurrentStyle20() && dlCurrent && dlCurrent.name === key);' +
'    if (!e._url) e._url = dlMaskToDataUrl(e.w, e.h, dlB64Decode(e.data));' +
'    html += \'<div class="style-picker-btn dl-cell\' + (sel ? " selected" : "") + \'" title="\' + dlEsc(e.name.replace(/_/g, " ")) + \'" onclick="dlSelectLib(\' + i + \')"><img src="\' + e._url + \'" alt="">\' +' +
'      \'<button type="button" class="dl-remove" title="Remove" onclick="event.stopPropagation(); dlRemoveLib(\' + i + \')">&times;</button></div>\';' +
'  });' +
'  grid.innerHTML = html;' +
'  document.getElementById("dlLibStatus").textContent = dlLibrary.length ? "" : "Nothing uploaded yet. Use Upload below to add a PNG.";' +
'}' +
'function dlSelect(i) { var f = dlFiles[i]; dlPick = { key: f.name, name: f.name, url: f.url }; dlRenderGrid(); dlRenderPinned(); }' +
'function dlSelectLib(i) { var e = dlLibrary[i]; dlPick = { key: "u:" + e.name, name: e.name, lib: e }; dlRenderLib(); dlRenderPinned(); }' +
'function dlRemoveLib(i) {' +
'  var e = dlLibrary[i];' +
'  if (!confirm("Remove " + e.name.replace(/_/g, " ") + " from your indices?")) return;' +
'  dlLibrary.splice(i, 1);' +
'  dlLibOps.add = dlLibOps.add.filter(function (a) { return a.name !== e.name; });' +
'  if (dlLibOps.remove.indexOf(e.name) < 0) dlLibOps.remove.push(e.name);' +
'  if (dlPick && dlPick.key === "u:" + e.name) { dlPick = null; dlRenderPinned(); }' +
'  dlRenderLib();' +
'}' +
'function dlRequirementsHtml() {' +
'  return "<b>Image requirements</b><br>" +' +
'    "\\u2022 PNG file, exactly " + DL_MAX_W + " \\u00d7 " + DL_MAX_H + " pixels (this watch\'s screen)<br>" +' +
'    "\\u2022 transparent background<br>" +' +
'    "\\u2022 the design in plain white pixels<br>" +' +
'    "\\u2022 no semi-transparency: every pixel is either fully white or fully transparent (turn off anti-aliasing)<br>" +' +
'    "The watch draws the white pixels in the dial colour. Uploaded images stay on your phone; the one you pick is sent to the watch.";' +
'}' +
// the uploaded file -> mask, with a clear message when it does not meet the requirements
'function dlCheckUpload(img) {' +
'  var w = img.naturalWidth, h = img.naturalHeight;' +
'  if (w !== DL_MAX_W || h !== DL_MAX_H) return "The image is " + w + " \\u00d7 " + h + " px, this watch needs " + DL_MAX_W + " \\u00d7 " + DL_MAX_H + ".";' +
'  var c = document.createElement("canvas"); c.width = w; c.height = h;' +
'  var ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);' +
'  var px = ctx.getImageData(0, 0, w, h).data, semi = 0, notWhite = 0, ink = 0;' +
'  for (var i = 0; i < px.length; i += 4) {' +
'    var a = px[i + 3];' +
'    if (a === 0) continue;' +
'    if (a !== 255) { semi++; continue; }' +
'    ink++;' +
'    if (px[i] < 250 || px[i + 1] < 250 || px[i + 2] < 250) notWhite++;' +
'  }' +
'  if (semi) return semi + " pixels are semi-transparent. Every pixel must be fully white or fully transparent (no anti-aliasing).";' +
'  if (notWhite) return notWhite + " visible pixels are not white. Draw the design in white on a transparent background.";' +
'  if (!ink) return "The image has no visible pixels.";' +
'  return "";' +
'}' +
'function dlOnFile(input) {' +
'  var file = input.files && input.files[0];' +
'  input.value = "";' +
'  var st = document.getElementById("dlLibStatus");' +
'  if (!file) return;' +
'  if (dlLibrary.length >= DL_LIB_MAX) { st.textContent = "You can keep up to " + DL_LIB_MAX + " uploaded indices. Remove one first."; return; }' +
'  var reader = new FileReader();' +
'  reader.onerror = function () { st.textContent = "Could not read that file."; };' +
'  reader.onload = function () {' +
'    var img = new Image();' +
'    img.onerror = function () { st.textContent = "That file is not an image the page can read. Use a PNG."; };' +
'    img.onload = function () {' +
'      var problem = dlCheckUpload(img);' +
'      if (problem) { st.textContent = problem; document.getElementById("dlRequirements").style.display = ""; return; }' +
'      var m = dlImageToMask(img);' +
'      var name = file.name.replace(/\\.png$/i, "").replace(/[^A-Za-z0-9_\\-]+/g, "_").slice(0, 40) || "index";' +
'      var entry = { name: name, w: m.w, h: m.h, data: dlB64Encode(m.bytes) };' +
'      dlLibrary = dlLibrary.filter(function (e) { return e.name !== name; });' +
'      dlLibrary.push(entry);' +
'      dlLibOps.remove = dlLibOps.remove.filter(function (n) { return n !== name; });' +
'      dlLibOps.add = dlLibOps.add.filter(function (a) { return a.name !== name; });' +
'      dlLibOps.add.push({ name: name, w: m.w, h: m.h, data: entry.data });' +
'      dlSelectLib(dlLibrary.length - 1);' +
'    };' +
'    img.src = reader.result;' +
'  };' +
'  reader.readAsDataURL(file);' +
'}' +
'var dlLog = [];' +
'function dlNote(line) { dlLog.push(line); var t = document.getElementById("dlDebugText"); if (t) t.textContent = dlLog.join("\\n"); }' +
'function dlShowDebug(on) { var d = document.getElementById("dlDebug"); if (d) d.style.display = on ? "" : "none"; dlNote(""); }' +
'function dlErr(e) { return (e && (e.name ? e.name + ": " : "") + (e.message || e)) || "unknown"; }' +
// GET through the phone app (no web view restrictions); resolves { text } or { b64 }
'function dlViaPhone(url, binary) {' +
'  return new Promise(function (resolve, reject) {' +
'    if (typeof Pebble === "undefined" || !Pebble.sendMessage) { reject(new Error("no phone bridge in this page")); return; }' +
'    Pebble.sendMessage("pkjs", { type: "fetch", url: url, binary: !!binary }).then(function (r) {' +
'      if (r && !r.error && (r.text !== undefined || r.b64 !== undefined)) resolve(r);' +
'      else reject(new Error((r && r.error) || "phone app gave no answer") + (r && r.text ? " " + r.text : ""));' +
'    }, function (e) { reject(new Error("phone bridge: " + dlErr(e))); });' +
'  });' +
'}' +
// list: the page first, then the phone app
'function dlFetchText(url) {' +
'  return fetch(url).then(function (r) {' +
'    dlNote("direct fetch " + url.split("/").pop() + ": HTTP " + r.status);' +
'    if (!r.ok) return r.text().then(function (t) { throw new Error("HTTP " + r.status + " " + t.slice(0, 200)); });' +
'    return r.text();' +
'  }).catch(function (e) {' +
'    dlNote("direct fetch failed: " + dlErr(e));' +
'    return dlViaPhone(url, false).then(function (r) { dlNote("via phone app: ok"); return r.text; });' +
'  });' +
'}' +
'function dlFetchList(url) { return dlFetchText(url).then(function (t) { return JSON.parse(t); }); }' +
'var dlMeta = {}, dlRawList = [];' +
'function dlLoadMeta(list) {' +
'  var entry = list.filter(function (e) { return e.type === "file" && e.name.toLowerCase() === "indices.json" && e.download_url; })[0];' +
'  if (!entry) { dlNote("no indices.json in the folder (file names are shown instead)"); return Promise.resolve(); }' +
'  return dlFetchText(entry.download_url).then(function (t) {' +
'    var j = JSON.parse(t), all = (j && j.indices) || {};' +
'    Object.keys(all).forEach(function (k) { if (all[k] && typeof all[k] === "object") dlMeta[k] = all[k]; });' +
'    dlNote("metadata for " + Object.keys(dlMeta).length + " indices");' +
'  }).catch(function (e) { dlNote("indices.json unusable: " + dlErr(e)); });' +
'}' +
'function dlMetaOf(name) { return dlMeta[name] || null; }' +
'function dlTitle(f) { var m = dlMetaOf(f.name); return (m && m.name) || f.name.replace(/_/g, " ").replace(/\\.png$/i, ""); }' +
'function dlMarginsOf(m) {' +
'  var g = m && m.margins, a = g && (Array.isArray(g) ? g : [g.top, g.bottom, g.left, g.right]);' +
'  return a && a.length === 4 && a.every(function (v) { return typeof v === "number" && v >= 0 && v <= 255; }) ? a : null;' +
'}' +
'function dlEsc(t) { return String(t === undefined || t === null ? "" : t).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]; }); }' +
'var dlMoreOpen = false;' +
'function dlToggleMore() { dlMoreOpen = !dlMoreOpen; dlRenderPinned(); }' +
'function dlInfoHtml(name, m, uploaded) {' +
'  var title = (m && m.name) || name.replace(/^u:/, "").replace(/_/g, " ").replace(/\\.png$/i, "");' +
'  var h = "<b>" + dlEsc(title) + "</b>" + (m && m.author ? "<br>by " + dlEsc(m.author) : "");' +
'  if (uploaded) h += "<br>Uploaded by you.";' +
'  if (m && m.description) h += "<br>" + dlEsc(m.description);' +
'  var rest = "", g = dlMarginsOf(m);' +
'  if (m && m.tags && m.tags.length) rest += "<br>Tags: " + dlEsc(m.tags.join(", "));' +
'  if (g) rest += "<br>Complication spacing: top " + g[0] + ", bottom " + g[1] + ", left " + g[2] + ", right " + g[3] + " px";' +
'  if (m && m.license) rest += "<br>License: " + dlEsc(m.license);' +
'  if (m && m.added) rest += "<br>Added: " + dlEsc(m.added);' +
'  if (m && m.link) rest += "<br>" + dlEsc(m.link);' +
'  if (!m && !uploaded) rest += "<br>No details for this one.";' +
'  if (rest) h += (dlMoreOpen ? rest : "") + "<br><a class=\\"dl-more-link\\" href=\\"#\\" onclick=\\"dlToggleMore(); return false;\\">" + (dlMoreOpen ? "less" : "more") + "</a>";' +
'  return h;' +
'}' +
'function dlRenderPinned() {' +
'  if (typeof msUpdateSend === "function") msUpdateSend();' +
'  var img = document.getElementById("dlPinnedImg"), txt = document.getElementById("dlPinnedText"), lab = document.getElementById("dlPinnedLabel");' +
'  if (!img) return;' +
'  var data = dlUpdate ? (dlUpdate.clear ? null : dlUpdate) : dlCurrent;' +
'  if (dlPick) {' +
'    lab.textContent = "Selected image";' +
'    var src = dlPick.lib ? (dlPick.lib._url || (dlPick.lib._url = dlMaskToDataUrl(dlPick.lib.w, dlPick.lib.h, dlB64Decode(dlPick.lib.data)))) : dlPick.url;' +
'    img.innerHTML = \'<img src="\' + src + \'" alt="">\';' +
'    txt.innerHTML = dlInfoHtml(dlPick.name, dlPick.lib ? null : dlMetaOf(dlPick.name), !!dlPick.lib);' +
'  } else if (data) {' +
'    lab.textContent = "Currently on watch";' +
'    img.innerHTML = \'<img src="\' + dlMaskToDataUrl(data.w, data.h, dlB64Decode(data.data)) + \'" alt="">\';' +
'    txt.innerHTML = dlInfoHtml(data.name, data.meta, data.name.indexOf("u:") === 0);' +
'  } else {' +
'    lab.textContent = "Currently on watch";' +
'    img.innerHTML = "";' +
'    txt.innerHTML = "Nothing downloaded yet.<br>Browse for more on my github, or upload your own.";' +
'  }' +
'}' +
'function dlOpenViews() {' +
'  document.getElementById("dlRequirements").innerHTML = dlRequirementsHtml();' +
'  dlRenderLib(); dlRenderPinned();' +
'  var st = document.getElementById("dlStatus");' +
'  if (dlFiles) { st.textContent = dlFiles.length ? "" : "Nothing in the folder yet."; dlRenderGrid(); return; }' +
'  dlLog = [];' +
'  var url = "https://api.github.com/repos/" + DL_REPO + "/contents/" + DL_FOLDER;' +
'  dlShowDebug(false);' +
'  dlNote("url: " + url);' +
'  dlNote("page origin: " + location.protocol + "//" + (location.host || "(none)") + "  online: " + navigator.onLine);' +
'  dlNote("agent: " + navigator.userAgent);' +
'  st.textContent = "Loading from github\\u2026";' +
'  dlFetchList(url).then(function (list) {' +
'    dlRawList = list;' +
'    if (!Array.isArray(list)) throw new Error("GitHub answered with: " + JSON.stringify(list).slice(0, 200));' +
'    dlFiles = list.filter(function (e) { return e.type === "file" && /\\.png$/i.test(e.name) && e.download_url; })' +
'      .map(function (e) { return { name: e.name, url: e.download_url }; })' +
'      .sort(function (a, b) { return a.name < b.name ? -1 : 1; });' +
'    dlNote("files found: " + dlFiles.length);' +
'    return dlLoadMeta(dlRawList);' +
'  }).then(function () {' +
'    st.textContent = dlFiles.length ? "" : "Nothing in the folder yet.";' +
'    if (!dlFiles.length) { dlShowDebug(true); }' +
'    dlRenderGrid();' +
'  }).catch(function (err) {' +
'    dlNote("giving up: " + dlErr(err));' +
'    st.textContent = "Could not load the list from github (" + dlErr(err) + "). Check your connection and try again.";' +
'    dlShowDebug(true);' +
'  });' +
'}' +
'function dlPickFile() { document.getElementById("dlFile").click(); }' +
'function dlToggleRequirements() { var r = document.getElementById("dlRequirements"); r.style.display = r.style.display === "none" ? "" : "none"; }' +
'function dlLoadImage(src, cors) {' +
'  return new Promise(function (resolve, reject) {' +
'    var img = new Image();' +
'    if (cors) img.crossOrigin = "anonymous";' +
'    img.onload = function () { resolve(img); };' +
'    img.onerror = function () { reject(new Error("image did not load")); };' +
'    img.src = src;' +
'  });' +
'}' +
'function dlImageData(url) {' +
// the page reads the pixels itself when the image allows it, else the phone app downloads the file
'  return dlLoadImage(url, true).then(function (img) { dlImageToMask(img); return img; }).catch(function (e) {' +
'    dlNote("image direct read failed: " + dlErr(e));' +
'    return dlViaPhone(url, true).then(function (r) { dlNote("image via phone app: ok"); return dlLoadImage("data:image/png;base64," + r.b64, false); });' +
'  });' +
'}' +
'function dlApply(key, m, meta) {' +
'  dlUpdate = { name: key, w: m.w, h: m.h, data: m.data, meta: meta };' +
'  dlCurrent = { name: key, w: m.w, h: m.h, data: m.data, meta: meta };' +
'  dlRefreshPreview();' +
'  chooseMarkerStyle("20");' +
'}' +
'function saveDlIndices() {' +
'  if (!dlPick) return;' +
'  if (dlPick.lib) { dlApply(dlPick.key, dlPick.lib, null); return; }' +
'  var st = document.getElementById("dlStatus"), pick = dlPick;' +
'  st.textContent = "Downloading\\u2026";' +
'  dlNote("downloading: " + pick.url);' +
'  dlImageData(pick.url).then(function (img) {' +
'    if (img.naturalWidth > DL_MAX_W || img.naturalHeight > DL_MAX_H) { st.textContent = "That image is larger than the watch screen."; return; }' +
'    var m = dlImageToMask(img);' +
'    var pm = dlMetaOf(pick.name), meta = null;' +
'    if (pm) { meta = { name: pm.name, description: pm.description, author: pm.author, link: pm.link, license: pm.license, added: pm.added, tags: pm.tags, margins: dlMarginsOf(pm) }; }' +
'    dlUpdate = { name: pick.name, w: m.w, h: m.h, data: dlB64Encode(m.bytes), meta: meta };' +
'    dlCurrent = { name: pick.name, w: m.w, h: m.h, data: dlUpdate.data, meta: meta };' +
'    dlRefreshPreview();' +
'    chooseMarkerStyle("20");' +
'  }).catch(function (e) {' +
'    dlNote("giving up: " + dlErr(e));' +
'    st.textContent = "Could not download that image (" + dlErr(e) + ").";' +
'    dlShowDebug(true);' +
'  });' +
'}' +
'dlRefreshPreview();';
}

module.exports = {
  pinnedHtml: pinnedHtml,
  moreViewHtml: moreViewHtml,
  uploadViewHtml: uploadViewHtml,
  downloadedCss: downloadedCss,
  downloadedScript: downloadedScript
};
