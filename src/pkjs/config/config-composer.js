// Custom feature-sequence editor used by the settings page.
function composerClientBody() {
  var COMPOSER = { items: [], selected: -1, addGroup: 0, dragFrom: -1 };

  function composerFindPaletteItem(id, aux) {
    var isTxt = (id === PRIM_PLUGIN_TEXT_ID) && pluginIsTextSlot(aux);
    for (var g = 0; g < PRIMITIVE_PALETTE.length; g++) {
      for (var i = 0; i < PRIMITIVE_PALETTE[g].items.length; i++) {
        var it = PRIMITIVE_PALETTE[g].items[i];
        if (it.id === id && !!it.customText === isTxt) return it;
      }
    }
    return PRIMITIVE_LABEL_BY_ID[id] ? { id: id, label: PRIMITIVE_LABEL_BY_ID[id] } : null;
  }
  function composerPaletteByValue(value) {
    if (String(value).indexOf("k:") === 0) {
      for (var g = 0; g < PRIMITIVE_PALETTE.length; g++) {
        for (var i = 0; i < PRIMITIVE_PALETTE[g].items.length; i++) {
          if (PRIMITIVE_PALETTE[g].items[i].key === value.slice(2)) return PRIMITIVE_PALETTE[g].items[i];
        }
      }
      return null;
    }
    var id = parseInt(value, 10), isTxt = false;
    for (var g2 = 0; g2 < PRIMITIVE_PALETTE.length; g2++) {
      for (var j = 0; j < PRIMITIVE_PALETTE[g2].items.length; j++) {
        var it = PRIMITIVE_PALETTE[g2].items[j];
        if (it.id === id && !it.customText) return it;
      }
    }
    return null;
  }

  function composerZoneShortLabel(aux) {
    var z = TIMEZONE_ZONES[aux];
    return z ? (z.abbr || z.label.split(" ")[0]) : ("zone " + aux);
  }

  var PARAM_OPTIONS = { timezone: TIMEZONE_ZONES, forecast: FORECAST_SLOTS };
  var PARAM_ROW_LABEL = { timezone: "Zone", forecast: "Forecast slot", plugin: "Plugin data source" };
  function composerParamShortLabel(param, aux) {
    if (param === "timezone") return composerZoneShortLabel(aux);
    if (param === "plugin") return pluginSlotLabel(aux);
    var opts = PARAM_OPTIONS[param] || [];
    var o = null;
    for (var i = 0; i < opts.length; i++) { if (opts[i].index === aux) { o = opts[i]; break; } }
    return o ? o.label : (param + " " + aux);
  }

  function composerItemLabel(item) {
    var pal = composerFindPaletteItem(item.id, item.aux);
    if (!pal) return "?" + item.id;
    if (pal.customText) return "Text [" + pluginTextOfSlot(item.aux) + "]";
    if (pal.param) return pal.label + " [" + composerParamShortLabel(pal.param, item.aux) + "]";
    return pal.label;
  }

  function composerParse(raw) {
    var items = [];
    String(raw || "").split(",").forEach(function (entry) {
      var parts = entry.split(":");
      var id = parseInt(parts[0], 10);
      if (isNaN(id) || id <= 0 || id > 255) return;
      var aux = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      if (isNaN(aux) || aux < 0 || aux > 255) aux = 0;
      items.push({ id: id, aux: aux });
    });
    return items;
  }

  function composerSerialize(items) {
    return items.map(function (it) { return it.aux ? (it.id + ":" + it.aux) : String(it.id); }).join(",");
  }

  function composerItemsForContent(contentVal) {
    var cid = parseInt(contentVal, 10);
    var seq = PRIMITIVE_TRANSPORT_SEQUENCES[cid] || [];
    var aux = PRIMITIVE_TRANSPORT_AUX[cid] || [];
    var out = [];
    for (var i = 0; i < seq.length; i++) {
      if (seq[i] > 0) out.push({ id: seq[i], aux: aux[i] || 0 });
    }
    return out;
  }

  function composerPreviewLabel(stored) {
    var items = composerParse(stored);
    if (!items.length) return "";
    return items.map(function (it) {
      var pal = composerFindPaletteItem(it.id, it.aux);
      if (pal && pal.customText) return pluginTextOfSlot(it.aux);
      if (pal && pal.param === "timezone") {
        if (pal.label.indexOf("name") >= 0) return composerZoneShortLabel(it.aux);
        return pal.label.indexOf("AM/PM") >= 0 ? "PM" : "12:00";
      }
      if (pal && pal.param === "forecast") {
        var t2 = PRIMITIVE_PREVIEW_TEXT[it.id];
        return (t2 === undefined) ? "" : t2;
      }
      var t = PRIMITIVE_PREVIEW_TEXT[it.id];
      return (t === undefined) ? "" : t;
    }).join("");
  }

  function composerSetError(text) {
    var el = document.getElementById("composerError");
    el.textContent = text || "";
    el.style.display = text ? "" : "none";
  }

  function composerRender() {
    var n = COMPOSER.items.length;
    if (COMPOSER.selected >= n) COMPOSER.selected = n - 1;
    var strip = document.getElementById("composerStrip");
    strip.innerHTML = COMPOSER.items.map(function (it, idx) {
      var cls = "composer-chip" + (idx === COMPOSER.selected ? " selected" : "");
      return "<button type=\"button\" class=\"" + cls + "\" draggable=\"true\"" +
        " ondragstart=\"composerDragStart(" + idx + ")\" ondragover=\"composerDragOver(event)\" ondrop=\"composerDrop(" + idx + ")\"" +
        " onclick=\"composerSelect(" + idx + ")\">" +
        esc(composerItemLabel(it)) + "</button>";
    }).join("");
    document.getElementById("composerEmpty").style.display = n ? "none" : "";
    document.getElementById("composerCount").textContent = n + " / " + COMPOSER_MAX;
    document.getElementById("composerCount").style.color = (n > COMPOSER_MAX) ? "#d00" : "";
    var sel = COMPOSER.selected;
    document.getElementById("composerLeft").disabled = (sel <= 0);
    document.getElementById("composerRight").disabled = (sel < 0 || sel >= n - 1);
    document.getElementById("composerDelete").disabled = (sel < 0 || n <= 1);
    var zoneRow = document.getElementById("composerSelZoneRow");
    var selPal = sel >= 0 ? composerFindPaletteItem(COMPOSER.items[sel].id, COMPOSER.items[sel].aux) : null;
    if (selPal && selPal.param) {
      zoneRow.style.display = "";
      document.getElementById("composerSelZoneLabel").textContent = PARAM_ROW_LABEL[selPal.param] + " for selected";
      composerFillParamSelect(document.getElementById("composerSelZone"), selPal.param, String(COMPOSER.items[sel].aux));
      if (selPal.param !== "plugin") document.getElementById("composerSelZone").value = String(COMPOSER.items[sel].aux);
    } else {
      zoneRow.style.display = "none";
    }
    var txtRow = document.getElementById("composerSelTextRow");
    if (selPal && selPal.customText) {
      txtRow.style.display = "";
      var txtIn = document.getElementById("composerSelText");
      var curTxt = pluginTextOfSlot(COMPOSER.items[sel].aux);
      if (txtIn.value !== curTxt) txtIn.value = curTxt;
    } else {
      txtRow.style.display = "none";
    }
    renderSlotEditPreview();
    composerUpdateAddZoneVisibility();
  }

  function composerSelect(idx) {
    COMPOSER.selected = (COMPOSER.selected === idx) ? -1 : idx;
    composerSetError("");
    composerRender();
  }

  function composerPlus() {
    COMPOSER.items.push({ id: PRIM_SPACE_ID, aux: 0 });
    COMPOSER.selected = COMPOSER.items.length - 1;
    composerSetError("");
    composerRender();
  }

  function composerMinus() {
    if (COMPOSER.items.length <= 1) return;
    COMPOSER.items.pop();
    composerSetError("");
    composerRender();
  }

  function composerMove(delta) {
    var s = COMPOSER.selected;
    var t = s + delta;
    if (s < 0 || t < 0 || t >= COMPOSER.items.length) return;
    var tmp = COMPOSER.items[s];
    COMPOSER.items[s] = COMPOSER.items[t];
    COMPOSER.items[t] = tmp;
    COMPOSER.selected = t;
    composerRender();
  }

  function composerDelete() {
    var s = COMPOSER.selected;
    if (s < 0 || COMPOSER.items.length <= 1) return;
    COMPOSER.items.splice(s, 1);
    COMPOSER.selected = Math.min(s, COMPOSER.items.length - 1);
    composerSetError("");
    composerRender();
  }

  function composerOnSelTextInput() {
    var s = COMPOSER.selected;
    if (s < 0) return;
    var v = document.getElementById("composerSelText").value.replace(/\s+/g, " ");
    PLUGIN_SLOTS[COMPOSER.items[s].aux] = "text|" + v;
    composerRender();
  }

  function composerOnSelZoneChange() {
    var s = COMPOSER.selected;
    if (s < 0) return;
    var selPal2 = composerFindPaletteItem(COMPOSER.items[s].id, COMPOSER.items[s].aux);
    var newAux = composerParamValueToAux(selPal2 ? selPal2.param : "", document.getElementById("composerSelZone").value);
    if (newAux < 0) { composerSetError(pluginUnavailableText()); composerRender(); return; }
    COMPOSER.items[s].aux = newAux;
    composerRender();
  }

  function composerDragStart(idx) {
    COMPOSER.dragFrom = idx;
  }
  function composerDragOver(ev) {
    ev.preventDefault();
  }
  function composerDrop(idx) {
    var from = COMPOSER.dragFrom;
    COMPOSER.dragFrom = -1;
    if (from == null || from < 0 || from === idx || from >= COMPOSER.items.length) return;
    var item = COMPOSER.items.splice(from, 1)[0];
    COMPOSER.items.splice(idx, 0, item);
    COMPOSER.selected = idx;
    composerRender();
  }

  function composerParamValueToAux(param, value) {
    if (param === "plugin") return pluginAuxFromValue(value);
    return parseInt(value, 10) || 0;
  }

  function composerFillParamSelect(sel, param, wanted) {
    if (param === "plugin") {
      pluginFillComposerSelect(sel, wanted);
      return;
    }
    pluginHideProvider(sel);
    var opts = PARAM_OPTIONS[param] || [];
    sel.innerHTML = opts.map(function (o) {
      return "<option value=\"" + o.index + "\">" + esc(o.label) + "</option>";
    }).join("");
  }

  function composerBuildPalette() {
    var groupSel = document.getElementById("composerAddGroup");
    if (groupSel.getAttribute("data-built")) return;
    groupSel.setAttribute("data-built", "1");
    groupSel.innerHTML = PRIMITIVE_PALETTE.map(function (g, gi) {
      return "<option value=\"" + gi + "\">" + esc(g.group) + "</option>";
    }).join("");
    composerOnAddGroupChange();
  }

  function composerOnAddGroupChange() {
    var gi = parseInt(document.getElementById("composerAddGroup").value, 10) || 0;
    document.getElementById("composerAddItem").innerHTML = PRIMITIVE_PALETTE[gi].items.map(function (it) {
      return "<option value=\"" + (it.key ? "k:" + it.key : it.id) + "\">" + esc(it.label) + "</option>";
    }).join("");
    composerUpdateAddZoneVisibility();
  }

  function composerUpdateAddZoneVisibility() {
    var pal = composerPaletteByValue(document.getElementById("composerAddItem").value);
    var row = document.getElementById("composerAddZoneRow");
    document.getElementById("composerAddTextRow").style.display = (pal && pal.customText) ? "" : "none";
    if (pal && pal.param) {
      row.style.display = "";
      document.getElementById("composerAddZoneLabel").textContent = PARAM_ROW_LABEL[pal.param];
      composerFillParamSelect(document.getElementById("composerAddZone"), pal.param);
      if (pal.param !== "plugin") pluginHideProvider(document.getElementById("composerAddZone"));
    } else {
      row.style.display = "none";
    }
  }

  function composerAddFromPalette() {
    var pal = composerPaletteByValue(document.getElementById("composerAddItem").value);
    if (!pal) return;
    var id = pal.id;
    var aux = 0;
    if (pal.customText) {
      var txt = document.getElementById("composerAddText").value.replace(/\s+/g, " ").trim();
      if (!txt) { composerSetError("Type the text to show first."); return; }
      aux = pluginAllocTextSlot(txt);
      if (aux < 0) { composerSetError("No free slot: at most 12 plugin and custom text elements can be used in total."); return; }
      document.getElementById("composerAddText").value = "";
    } else if (pal.param) {
      aux = composerParamValueToAux(pal.param, document.getElementById("composerAddZone").value);
      if (aux < 0) { composerSetError(pluginUnavailableText()); return; }
    }
    COMPOSER.items.push({ id: id, aux: aux });
    COMPOSER.selected = COMPOSER.items.length - 1;
    composerSetError("");
    composerRender();
  }

  function composerOpen(def) {
    var section = document.getElementById("slotEditCustomPrimsSection");
    if (!def.customPrimsId) { section.style.display = "none"; section.setAttribute("data-available", "0"); document.getElementById("slotEditCustomPrimsToggle").checked = false; document.getElementById("slotEditPrebuiltBlock").style.display = ""; COMPOSER.items = []; slotEditUpdateKindButtons(); return; }
    section.style.display = "";
    section.setAttribute("data-available", "1");
    composerBuildPalette();
    var stored = document.getElementById(def.customPrimsId).value || "";
    COMPOSER.items = composerParse(stored);
    COMPOSER.selected = -1;
    COMPOSER.dragFrom = -1;
    document.getElementById("slotEditCustomPrimsToggle").checked = (COMPOSER.items.length > 0);
    document.getElementById("slotEditCustomPrimsBody").style.display = COMPOSER.items.length ? "" : "none";
    document.getElementById("slotEditPrebuiltBlock").style.display = COMPOSER.items.length ? "none" : "";
    setSlotEditorColorGroupVisibility(document.getElementById("slotEditContent").value);
    composerSetError("");
    slotEditUpdateKindButtons();
    composerRender();
  }

  function slotEditUpdateKindButtons() {
    var on = document.getElementById("slotEditCustomPrimsToggle").checked;
    var off = !on && document.getElementById("slotEditContent").value === "0";
    var active = on ? 2 : (off ? 0 : 1);
    var group = document.getElementById("slotEditKindGroup");
    var btns = group.getElementsByClassName("mode-btn");
    for (var i = 0; i < btns.length; i++) btns[i].className = "mode-btn" + (i === active ? " active" : "");
    var customAvail = document.getElementById("slotEditCustomPrimsSection").getAttribute("data-available") !== "0";
    if (btns[2]) btns[2].style.display = customAvail ? "" : "none";
    document.getElementById("slotEditPrebuiltBlock").style.display = (on || off) ? "none" : "";
  }
  function slotEditSetKind(custom) {
    if (!custom && document.getElementById("slotEditContent").value === "0") {
      document.getElementById("slotEditCustomPrimsToggle").checked = false;
      document.getElementById("slotEditCustomPrimsBody").style.display = "none";
      selectSlotEditCategory(CORNER_CATEGORIES[1].id);
      slotEditUpdateKindButtons();
      return;
    }
    document.getElementById("slotEditCustomPrimsToggle").checked = !!custom;
    composerOnToggle();
  }
  function slotEditSetOff() {
    document.getElementById("slotEditCustomPrimsToggle").checked = false;
    COMPOSER.items = [];
    COMPOSER.selected = -1;
    document.getElementById("slotEditCategory").value = "none";
    var contentSelect = document.getElementById("slotEditContent");
    contentSelect.innerHTML = categoryItemOptionsHtml("none", 0);
    contentSelect.disabled = true;
    document.getElementById("slotEditCustomPrimsBody").style.display = "none";
    slotEditCategoryHelpUpdate("none");
    updateCategoryButtonActive("none");
    composerSetError("");
    onSlotEditContentChange();
    slotEditUpdateKindButtons();
    composerRender();
  }

  function composerOnToggle() {
    var on = document.getElementById("slotEditCustomPrimsToggle").checked;
    document.getElementById("slotEditCustomPrimsBody").style.display = on ? "" : "none";
    document.getElementById("slotEditPrebuiltBlock").style.display = on ? "none" : "";
    setSlotEditorColorGroupVisibility(document.getElementById("slotEditContent").value);
    if (on && !COMPOSER.items.length) {
      COMPOSER.items = composerItemsForContent(document.getElementById("slotEditContent").value);
      COMPOSER.selected = -1;
    }
    composerSetError("");
    slotEditUpdateKindButtons();
    composerRender();
  }

  function slotEditPreviewLabel() {
    var customOn = document.getElementById("slotEditCustomPrimsToggle").checked;
    if (customOn) return composerPreviewLabel(composerSerialize(COMPOSER.items));
    var contentVal = document.getElementById("slotEditContent").value;
    return parseInt(contentVal, 10) ? primitiveDecompositionText(contentVal, true) : "";
  }

  function renderSlotEditPreview() {
    var canvas = document.getElementById("slotEditPreviewCanvas");
    if (!canvas || !canvas.getContext || !document.getElementById("slotEditCustomPrimsToggle")) return;
    var cssW = canvas.clientWidth || 368, cssH = 64;
    var dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    var nightActive = document.getElementById("nightEnabled").checked && isNightNowApprox();
    var colors = nightActive ? nightColors() : dayColors();
    var mode = SLOT_EDITOR_DRAFT_COLOR;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssW, cssH);
    if (mode === 2) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = colors.text;
      ctx.lineWidth = 3;
      for (var sx = -cssH; sx < cssW; sx += 10) {
        ctx.beginPath(); ctx.moveTo(sx, cssH); ctx.lineTo(sx + cssH, 0); ctx.stroke();
      }
      ctx.restore();
    }

    var fontSel = document.getElementById("cornerFont");
    var fontOpt = fontSel.options[fontSel.selectedIndex];
    var entry = fontLookupEntry(fontSel.value);
    var px = Math.max(12, Math.min(30, Math.round(entry.height * 1.6)));
    var scale = px / Math.max(1, entry.height);
    var fontCss = canvasFontFor(fontOpt.getAttribute("data-preview") || "", px, fontSel.value);

    var color = colors.text;
    if (mode === 1) color = colors.accent;
    else if (mode === 3) color = "#4caf50";
    var outHex = previewHexLuma(color) >= 9 ? "#000000" : "#ffffff";
    var oEl = document.getElementById("outlineStyle");
    var outline = oEl ? (parseInt(oEl.value, 10) || 0) : 0;

    var label = slotEditPreviewLabel();
    ctx.font = fontCss;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    var cy = cssH / 2;
    if (!label) {
      ctx.fillStyle = colors.text;
      ctx.globalAlpha = 0.45;
      ctx.fillText("Nothing to show", 12, cy);
      ctx.globalAlpha = 1;
    } else {
      var segs = previewLabelSegments(label, px);
      var total = 0, i;
      for (i = 0; i < segs.length; i++) {
        segs[i].width = segs[i].icon ? segs[i].icon.width : (segs[i].gap || ctx.measureText(segs[i].text).width);
        total += segs[i].width;
      }
      var x0 = Math.max(6, (cssW - total) / 2);
      if (mode === 2) {
        var pw = Math.min(cssW - 8, total + px * 1.6), ph = Math.round(px * 1.9);
        ctx.fillStyle = colors.bg;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect((cssW - pw) / 2, cy - ph / 2, pw, ph, ph / 2);
        else ctx.rect((cssW - pw) / 2, cy - ph / 2, pw, ph);
        ctx.fill();
      }
      var offs = outline >= 2 ? [[-1,0],[1,0],[0,-1],[0,1],[-2,0],[2,0],[0,-2],[0,2],[1,1],[-1,1],[-1,-1],[1,-1]]
                 : (outline === 1 ? [[-1,0],[1,0],[0,-1],[0,1]] : []);
      var cx = x0;
      for (i = 0; i < segs.length; i++) {
        if (segs[i].icon) {
          var ic = segs[i].icon;
          drawPreviewIcon(ctx, ic, cx, cy - ic.height / 2, color);
        } else {
          ctx.font = fontCss;
          ctx.textBaseline = "middle";
          ctx.fillStyle = outHex;
          for (var o = 0; o < offs.length; o++) ctx.fillText(segs[i].text, cx + offs[o][0] * scale, cy + offs[o][1] * scale);
          ctx.fillStyle = color;
          ctx.fillText(segs[i].text, cx, cy);
        }
        cx += segs[i].width;
      }
    }
  }

  function composerCommitValue() {
    if (!document.getElementById("slotEditCustomPrimsToggle").checked) return "";
    var n = COMPOSER.items.length;
    if (n > COMPOSER_MAX) { composerSetError("Feature can have only " + COMPOSER_MAX + " elements"); return null; }
    if (n < 1) { composerSetError("Add at least one element, or turn off the custom sequence."); return null; }
    return composerSerialize(COMPOSER.items);
  }
}

var src = composerClientBody.toString();
module.exports = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'));
