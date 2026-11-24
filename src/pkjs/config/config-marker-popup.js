// "Hour/seconds indices style" popup: one popup with a tab selector (None / Preloaded / Procedural / Edit / More / Upload).
// The browser code is written as a normal function and injected into the page as text (see popupScript()).
var platform = require('../platform');
var configDownloaded = require('./config-downloaded');
var configMarkers = require('./config-markers');

var TABS = [
  ['none', 'NONE'], ['bitmaps', 'PRELOADED'], ['procedural', 'CUSTOM'],
  ['edit', 'EDIT'], ['more', 'MORE'], ['upload', 'UPLOAD']
];

var DESIGN_ICON = '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
  '<circle cx="22" cy="24" r="15" stroke-dasharray="1.5 6.2"/><circle cx="22" cy="24" r="2"/>' +
  '<path d="M30 40l2-7 11-11 5 5-11 11z"/><path d="M40 24l5 5"/></svg>';

function popupCss() {
  return '' +
'  #markerStyleModal .modal-box { height: 90vh; max-height: 90vh; }' +
'  .ms-tabs { flex-wrap: nowrap; flex: 0 0 auto; margin-bottom: 4px; }' +
'  .ms-tabs .mode-btn { flex: 1 1 auto; min-width: 0; padding: 9px 3px; font-size: 11px; letter-spacing: 0; white-space: nowrap; }' +
'  .ms-tabs .mode-btn.active { background: #ff9200; color: #fff; }' +
'  .ms-title-row { display: flex; align-items: center; justify-content: center; position: relative; }' +
'  .modal-box { position: relative; }' +
'  .modal-x { position: absolute; top: 6px; right: 6px; z-index: 5; width: 30px; height: 30px; padding: 0; border: none; border-radius: 50%; background: rgba(128,128,128,.25); color: var(--text-strong); display: flex; align-items: center; justify-content: center; line-height: 0; cursor: pointer; }' +
'  .modal-x svg { display: block; width: 12px; height: 12px; pointer-events: none; }' +
'  .modal-confirm-btn:disabled { opacity: .45; }' +
'  .ms-acc-body { display: none; padding: 4px 2px 8px; }' +
'  .ms-acc-body.open { display: block; }' +
'  .ms-view { display: none; padding-bottom: 6px; }' +
'  .ms-view.open { display: block; }' +
'  .ms-design-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: var(--text-strong); }' +
'  .ms-design-tile .style-picker-btn-cap { position: static; }' +
'  .ms-edit-preview { display: flex; justify-content: center; box-sizing: border-box; margin: 6px 0 8px; padding: 10px; background: var(--btn-bg); border: 1px solid var(--border); border-radius: 10px; }' +
'  .ms-edit-preview-box { width: 40%; aspect-ratio: ' + platform.w + ' / ' + platform.h + '; overflow: hidden; border: 1px solid var(--border); box-sizing: border-box; border-radius: ' + (platform.round ? '50%' : '8px') + '; }' +
'  .ms-edit-preview-box img { width: 100%; height: 100%; display: block; }' +
'  @media (prefers-color-scheme: dark) { .ms-edit-preview-box img { filter: invert(1); } }' +
'  .ms-save-row { display: flex; gap: 8px; margin-top: 12px; }' +
'  .ms-save-row input { flex: 1 1 auto; min-width: 0; margin: 0; }' +
'  .ms-save-row .secondary-btn { flex: 0 0 auto; width: auto; margin-top: 0; padding: 10px 14px; }' +
'  .ms-upload-row { display: flex; gap: 8px; margin-bottom: 4px; }' +
'  .ms-upload-row .secondary-btn { flex: 1 1 0; margin-top: 8px; padding: 14px 8px; font-size: 14px; }' +
'  .ms-note { font-size: 12px; color: var(--text-muted, #888); margin: 10px 0; }';
}

function popupHtml(current) {
  var tabs = TABS.map(function (t) {
    return '<button type="button" class="mode-btn" data-tab="' + t[0] + '" onclick="msTabClick(\'' + t[0] + '\')">' + t[1] + '</button>';
  }).join('');
  return '' +
'<div class="modal-overlay" id="markerStyleModal" onclick="if (event.target === this) closeMarkerStyleModal();">' +
'  <div class="modal-box">' +
'    <div class="modal-title ms-title-row">Hour/seconds indices style</div>' +
'    <div class="mode-btn-group ms-tabs" id="msTabs">' + tabs + '</div>' +
'    <div id="msPinned" style="display:none; flex:0 0 auto;">' + configDownloaded.pinnedHtml() + '</div>' +
'    <div id="msEditPinned" style="display:none; flex:0 0 auto;"><div class="ms-edit-preview"><div class="ms-edit-preview-box"><img id="msEditImg" alt=""></div></div></div>' +
'    <div class="modal-scroll-body" id="msBody">' +
'      <div class="ms-view" id="msView-none"><div class="ms-note" id="msNoneNote"></div></div>' +
'      <div class="ms-view" id="msView-bitmaps"><div class="style-picker-grid" id="msGrid-bitmaps"></div></div>' +
'      <div class="ms-view" id="msView-procedural"><div class="style-picker-grid" id="msGrid-procedural"></div></div>' +
'      <div class="ms-view" id="msView-edit">' +
'        <button type="button" class="marker-edit-btn" onclick="msAcc(\'hour\')">Hour indices: <span id="cmHourStatusLabel"></span> <span class="ms-arrow" id="msArrow-hour">&#9656;</span></button>' +
'        <div class="ms-acc-body" id="msAcc-hour" oninput="cmLive(\'hour\')" onchange="cmLive(\'hour\')" onclick="setTimeout(function () { cmLive(\'hour\'); }, 0)">' + configMarkers.customMarkerBodyHtml('hour', 20) + '</div>' +
'        <button type="button" class="marker-edit-btn" onclick="msAcc(\'sec\')">Seconds indices: <span id="cmSecStatusLabel"></span> <span class="ms-arrow" id="msArrow-sec">&#9656;</span></button>' +
'        <div class="ms-acc-body" id="msAcc-sec" oninput="cmLive(\'sec\')" onchange="cmLive(\'sec\')" onclick="setTimeout(function () { cmLive(\'sec\'); }, 0)">' + configMarkers.customMarkerBodyHtml('sec', 10) + '</div>' +
'        <button type="button" class="marker-edit-btn" onclick="msAcc(\'text\')">Numerals: <span id="numeralsStatusLabel"></span> <span class="ms-arrow" id="msArrow-text">&#9656;</span></button>' +
'        <div class="ms-acc-body" id="msAcc-text" oninput="setTimeout(msTouched, 0)" onchange="setTimeout(msTouched, 0)" onclick="setTimeout(msTouched, 0)">' + configMarkers.textMarkerBodyHtml(current) + '</div>' +
'        <div class="ms-save-row"><input type="text" id="msPresetName" maxlength="24" placeholder="Name"><button type="button" class="secondary-btn" onclick="msSavePreset()">Save to CUSTOM</button></div>' +
'        <div class="ms-note" id="msPresetNote"></div>' +
'      </div>' +
'      <div class="ms-view" id="msView-more">' + configDownloaded.moreViewHtml() + '</div>' +
'      <div class="ms-view" id="msView-upload">' + configDownloaded.uploadViewHtml() + '</div>' +
'    </div>' +
'    <div class="modal-footer" id="msFooter" style="display:none;">' +
'      <div class="ms-upload-row" id="msUploadRow" style="display:none;">' +
'        <button type="button" class="secondary-btn" onclick="dlPickFile()">UPLOAD</button>' +
'        <button type="button" class="secondary-btn" onclick="dlToggleRequirements()">REQUIREMENTS</button>' +
'      </div>' +
'      <button type="button" class="modal-confirm-btn" id="msSaveBtn" onclick="msSave()">Send selected to watch</button>' +
'      <button type="button" class="modal-confirm-btn" id="msApplyBtn" style="display:none;" onclick="msApplyEdit()">Apply</button>' +
'      <button type="button" class="modal-confirm-btn" id="msDisableBtn" style="display:none;" onclick="msDisable()">Disable indices</button>' +
'    </div>' +
'  </div>' +
'</div>';
}

// ---- browser side -------------------------------------------------------------------------------------------
function browserCode() {
  var msTab = 'none';
  var msStage = { style: '3', user: null };
  var msSnap = '';
  var markerApplyTick = MS_TICK;
  var userMarkerPresets = MS_PRESETS;

  function msEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function msVal(id) { var el = document.getElementById(id); return el ? el.value : ''; }

  // the editable indices as a plain object, same shape as the built-in presets (MARKER_STYLE_PRESET_FIELDS)
  function msFieldsNow() {
    var out = { hour: {}, sec: {}, text: {} };
    ['hour', 'sec'].forEach(function (kind) {
      CM_FIELDS.forEach(function (f) { out[kind][f] = msVal(cmHiddenPrefix(kind) + f); });
    });
    var roman = document.getElementById('markerTextRoman');
    out.text = {
      Target: msVal('markerTextTarget'), Font: msVal('markerTextFont'), Roman: (roman && roman.checked) ? 'true' : 'false',
      Offset: msVal('markerTextOffset'), HourMask: msVal('markerTextHourMask'), SecMask: msVal('markerTextSecMask')
    };
    return out;
  }
  function msRegisterPresets() {
    userMarkerPresets.forEach(function (p) { MARKER_STYLE_PRESET_FIELDS['u:' + p.id] = p.fields; });
  }

  function msMatchingPreset() {
    var now = JSON.stringify(msFieldsNow());
    for (var i = 0; i < userMarkerPresets.length; i++) {
      if (JSON.stringify(userMarkerPresets[i].fields) === now) return userMarkerPresets[i];
    }
    return null;
  }
  function msCurrentName() {
    var p = msMatchingPreset();
    return p ? p.name : 'Custom';
  }

  // draws the current custom indices (white-on-dark tiles use the same black ink + invert as the built-in images)
  function msGenImage() {
    var w = MS_W, h = MS_H;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var colors = { text: '#000000', bg: '#ffffff', accent: '#000000' };
    var cx = w / 2, cy = h / 2;
    drawMarkerRing(ctx, cx, cy, w, h, readCustomMarkerConfig('sec'), 60, 5, colors);
    drawMarkerRing(ctx, cx, cy, w, h, readCustomMarkerConfig('hour'), 12, 0, colors);
    drawTextMarkers(ctx, cx, cy, w, h, colors);
    try { return c.toDataURL('image/png'); } catch (e) { return ''; }
  }

  function msCurrentStage() {
    var val = msVal('bigAnalogMarkerStyle');
    if (val === '8') { var p = msMatchingPreset(); return { style: '8', user: p ? p.id : null }; }
    return { style: val, user: null };
  }
  function msTabForStyle(val) {
    if (val === '0') return 'none';
    if (val === '20') return (dlCurrent && String(dlCurrent.name).indexOf('u:') === 0) ? 'upload' : 'more';
    if (val === '8') return msMatchingPreset() ? 'procedural' : 'edit';
    if (val === '9' || val === '1' || val === '2' || val === '10') return 'procedural';
    return 'bitmaps';
  }

  function msTile(img, title, sel, onclick, extra) {
    return '<button type="button" class="style-picker-btn' + (sel ? ' selected' : '') + '" onclick="' + onclick + '">' +
      (img ? '<img class="bitmap-marker-img" src="' + img + '" alt="' + msEsc(title) + '">' : '<span class="style-picker-btn-empty">' + msEsc(title) + '</span>') +
      '<span class="style-picker-btn-cap">' + msEsc(title) + '</span>' + (extra || '') + '</button>';
  }
  function msRenderGrids() {
    var html = '';
    MARKER_BITMAP_STYLES.concat(MARKER_VARIANT_STYLES).forEach(function (s) {
      html += msTile(MARKER_PREVIEW_IMAGES[s.value], s.title, msStage.style === s.value, 'msPick(\'' + s.value + '\')');
    });
    var g = document.getElementById('msGrid-bitmaps');
    if (g) g.innerHTML = html;

    html = '';
    MARKER_PRESET_STYLES.forEach(function (s) {
      html += msTile(MARKER_PRESET_IMAGES[s.image], s.title, msStage.style === s.value, 'msPick(\'' + s.value + '\')');
    });
    userMarkerPresets.forEach(function (p) {
      html += '<div class="style-picker-btn' + ((msStage.style === '8' && msStage.user === p.id) ? ' selected' : '') + '" onclick="msPickUser(\'' + p.id + '\')">' +
        (p.img ? '<img class="bitmap-marker-img" src="' + p.img + '" alt="">' : '') +
        '<span class="style-picker-btn-cap">' + msEsc(p.name) + '</span>' +
        '<button type="button" class="dl-remove" title="Remove" onclick="event.stopPropagation(); msRemovePreset(\'' + p.id + '\')">&times;</button></div>';
    });
    html += '<button type="button" class="style-picker-btn ms-design-tile' + ((msStage.style === '8' && !msStage.user) ? ' selected' : '') + '" onclick="msPick(\'8\')">' +
      MS_DESIGN_ICON + '<span class="style-picker-btn-cap">design your own</span></button>';
    g = document.getElementById('msGrid-procedural');
    if (g) g.innerHTML = html;
  }

  function msShow(tab) {
    msTab = tab;
    TABS_LIST.forEach(function (t) {
      var v = document.getElementById('msView-' + t);
      if (v) v.className = 'ms-view' + (t === tab ? ' open' : '');
    });
    var btns = document.querySelectorAll('#msTabs .mode-btn');
    for (var i = 0; i < btns.length; i++) btns[i].className = 'mode-btn' + (btns[i].getAttribute('data-tab') === tab ? ' active' : '');
    var dl = (tab === 'more' || tab === 'upload');
    document.getElementById('msPinned').style.display = dl ? '' : 'none';
    document.getElementById('msEditPinned').style.display = (tab === 'edit') ? '' : 'none';
    document.getElementById('msFooter').style.display = (dl || tab === 'edit' || tab === 'none') ? '' : 'none';
    document.getElementById('msSaveBtn').style.display = dl ? '' : 'none';
    document.getElementById('msApplyBtn').style.display = (tab === 'edit') ? '' : 'none';
    document.getElementById('msDisableBtn').style.display = (tab === 'none') ? '' : 'none';
    if (tab === 'none') msRefreshNone();
    document.getElementById('msUploadRow').style.display = (tab === 'upload') ? '' : 'none';
    msUpdateSend();
    if (tab === 'edit') { openCustomMarkerEditor('hour'); openCustomMarkerEditor('sec'); msRefreshMarkGrids(); refreshEditButtonLabels(); msSnap = JSON.stringify(msFieldsNow()); msRefreshEdit(); }
    if (tab === 'bitmaps' || tab === 'procedural') msRenderGrids();
    if (dl) {
      dlOpenViews();
      // the grid that is not on screen is hidden by the view, both live in the same scroll area
    }
    document.getElementById('msBody').scrollTop = 0;
  }

  // tab click: only switches the view; NONE needs its "Disable indices" button, EDIT its "Apply" button
  function msTabClick(tab) {
    // an empty custom design would show a blank preview: start from Minimal instead
    if (tab === 'edit' && msVal(cmHiddenPrefix('hour') + 'Thickness') === '0' && msVal(cmHiddenPrefix('sec') + 'Thickness') === '0') applyMarkerStylePresetToCustom('10');
    msShow(tab);
  }
  function msRefreshNone() {
    var off = msVal('bigAnalogMarkerStyle') === '0';
    var note = document.getElementById('msNoneNote');
    if (note) note.textContent = off ? 'Hour and seconds indices are disabled.' : 'Press "Disable indices" to stop drawing hour and seconds indices.';
    var b = document.getElementById('msDisableBtn');
    if (b) { b.disabled = off; b.textContent = 'Disable indices'; }
  }
  function msFlash(id, text, back) {
    var b = document.getElementById(id);
    if (!b) return;
    b.textContent = text;
    setTimeout(function () { if (b) b.textContent = back; }, 1400);
  }
  // NONE tab button: the only way to switch the indices off
  function msDisable() {
    msStage = { style: '0', user: null };
    chooseMarkerStyle('0', true);
    msRefreshNone();
    var b = document.getElementById('msDisableBtn');
    if (b) b.textContent = 'Indices disabled';
  }
  // EDIT tab button: use the indices as they are now, without having to change a value first
  function msApplyEdit() {
    msSnap = JSON.stringify(msFieldsNow());
    chooseMarkerStyle('8', true);
    msStage = msCurrentStage();
    msFlash('msApplyBtn', 'Applied', 'Apply');
  }
  // the first real change in EDIT switches the watch to the custom indices; just looking changes nothing
  function msTouched() {
    var now = JSON.stringify(msFieldsNow());
    if (now === msSnap) return;
    msSnap = now;
    if (msVal('bigAnalogMarkerStyle') !== '8') chooseMarkerStyle('8', true);
    msEditChanged();
  }
  function msUpdateSend() {
    var b = document.getElementById('msSaveBtn');
    if (b) b.disabled = !dlPick;
  }
  function msRefreshMarkGrids() {
    [['hour', 'markerTextHourMask'], ['sec', 'markerTextSecMask']].forEach(function (k) {
      var mask = parseInt(msVal(k[1]), 10) || 0;
      for (var i = 0; i < 12; i++) {
        var b = document.getElementById('markBtn-' + k[0] + '-' + i);
        if (b) b.className = 'mark-btn' + ((mask & (1 << i)) ? ' active' : '');
      }
    });
  }
  function msInstallCloseButtons() {
    var ov = document.querySelectorAll('.modal-overlay');
    for (var i = 0; i < ov.length; i++) {
      var box = ov[i].querySelector('.modal-box');
      if (!box || box.querySelector('.modal-x')) continue;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'modal-x'; b.setAttribute('aria-label', 'Close'); b.innerHTML = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg>';
      b.onclick = function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        var o = this.parentNode;
        while (o && (!o.className || o.className.indexOf('modal-overlay') < 0)) o = o.parentNode;
        if (!o) return;
        if (o.onclick) o.onclick.call(o, { target: o });
        if (o.className.indexOf('open') >= 0) o.className = 'modal-overlay';
      };
      box.insertBefore(b, box.firstChild);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', msInstallCloseButtons);
  else msInstallCloseButtons();
  function msAcc(name) {
    ['hour', 'sec', 'text'].forEach(function (n) {
      var body = document.getElementById('msAcc-' + n);
      var open = (n === name) && body.className.indexOf('open') < 0;
      body.className = 'ms-acc-body' + (open ? ' open' : '');
      document.getElementById('msArrow-' + n).innerHTML = open ? '&#9662;' : '&#9656;';
    });
  }
  function cmLive(kind) {
    saveCustomMarkerEditor(kind);
    msTouched();
  }

  function msRefreshEdit() {
    var img = document.getElementById('msEditImg');
    if (img) img.src = msGenImage();
    var note = document.getElementById('msPresetNote');
    var p = msMatchingPreset();
    if (note) note.textContent = p ? ('Same as "' + p.name + '" in CUSTOM.') : (userMarkerPresets.length >= MS_MAX_PRESETS ? 'You have reached the limit of ' + MS_MAX_PRESETS + ' saved indices, remove one first.' : '');
  }
  function msEditChanged() {
    if (msTab === 'edit' && document.getElementById('markerStyleModal').className.indexOf('open') >= 0) msRefreshEdit();
  }

  function msPick(value) {
    if (value === '8') { msTabClick('edit'); return; }
    msStage = { style: value, user: null };
    chooseMarkerStyle(value, true);
    msRenderGrids();
  }
  function msPickUser(id) {
    msStage = { style: '8', user: id };
    applyMarkerStylePresetToCustom('u:' + id);
    chooseMarkerStyle('8', true);
    msRenderGrids();
  }

  function msSavePreset() {
    if (userMarkerPresets.length >= MS_MAX_PRESETS) { msRefreshEdit(); return; }
    var nameEl = document.getElementById('msPresetName');
    var name = (nameEl.value || '').replace(/^\s+|\s+$/g, '') || ('My indices ' + (userMarkerPresets.length + 1));
    var p = { id: Date.now().toString(36), name: name.slice(0, 24), img: msGenImage(), fields: msFieldsNow() };
    userMarkerPresets.push(p);
    MARKER_STYLE_PRESET_FIELDS['u:' + p.id] = p.fields;
    nameEl.value = '';
    msStage = msCurrentStage();
    msShow('procedural');
    document.getElementById('msEditPinned').style.display = 'none';
  }
  function msRemovePreset(id) {
    if (!confirm('Remove this saved indices design?')) return;
    userMarkerPresets = userMarkerPresets.filter(function (p) { return p.id !== id; });
    delete MARKER_STYLE_PRESET_FIELDS['u:' + id];
    if (msStage.user === id) msStage = { style: '8', user: null };
    msRenderGrids();
  }

  function msSave() {
    if (dlPick) saveDlIndices();
  }

  function openMarkerStyleModal() {
    msStage = msCurrentStage();
    dlPick = null;
    dlRenderPinned();
    document.getElementById('markerStyleModal').className = 'modal-overlay open';
    msShow(msTabForStyle(msVal('bigAnalogMarkerStyle')));
  }
  function closeMarkerStyleModal() {
    document.getElementById('markerStyleModal').className = 'modal-overlay';
  }
  function chooseMarkerStyle(value, keepOpen) {
    var id = parseInt(value, 10);
    document.getElementById('bigAnalogMarkerStyle').value = value;
    // an indices style drawn by the watch plays its start-up animation again; bitmaps and "none" have none
    if (value !== '0' && !isBitmapMarkerStyleId(id)) markerApplyTick = (markerApplyTick + 1) >>> 0;
    onMarkerStyleChange();
    if (!keepOpen) closeMarkerStyleModal();
  }
  function renderMarkerStyleGrid() { msRegisterPresets(); msRenderGrids(); }
}

function popupScript(current) {
  var presets = (current && Array.isArray(current.userMarkerPresets)) ? current.userMarkerPresets : [];
  var src = browserCode.toString();
  var body = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'));
  return '' +
    'var MS_W = ' + platform.w + ', MS_H = ' + platform.h + ', MS_MAX_PRESETS = 24;\n' +
    'var MS_TICK = ' + ((parseInt(current && current.markerApplyTick, 10) || 0) >>> 0) + ';\n' +
    'var MS_PRESETS = ' + JSON.stringify(presets) + ';\n' +
    'var MS_DESIGN_ICON = ' + JSON.stringify(DESIGN_ICON) + ';\n' +
    'var TABS_LIST = ' + JSON.stringify(TABS.map(function (t) { return t[0]; })) + ';\n' +
    body + '\n';
}

module.exports = { popupCss: popupCss, popupHtml: popupHtml, popupScript: popupScript };
