// Phase 9 composer -- client-side (settings page) code.
//
// Same non-Node-module shape as config-preview.js/config-runtime.js: this
// file exports client JS *source text* that config-page.js splices into the
// generated <script>. Unlike those, the code below is written as real
// function declarations (embedded via Function.prototype.toString) rather
// than as concatenated string literals, so `node --check` validates it
// directly and there is no quote-escaping to get wrong -- the class of bug
// IMPLEMENTATION_NOTES.md's Update 20 hit with an embedded `//` comment.
//
// Nothing in composerClientBody() ever runs in PKJS; it only runs inside the
// settings page, where these globals exist (defined elsewhere in the
// generated script): esc(), PRIMITIVE_PALETTE, PRIMITIVE_LABEL_BY_ID,
// PRIMITIVE_TRANSPORT_SEQUENCES, PRIMITIVE_TRANSPORT_AUX, TIMEZONE_ZONES,
// PRIM_SPACE_ID, COMPOSER_MAX, PRIMITIVE_PREVIEW_TEXT, FORECAST_SLOTS.
//
// Working-copy semantics (report Section 24): the composer edits COMPOSER.items
// only. Nothing touches the slot's hidden input until saveSlotEditor()
// validates and commits, so Cancel / tapping outside discards every edit.
//
// Storage format of the hidden input / CONFIG_CORNER_*_CUSTOM_PRIMS setting:
// comma-separated "id" or "id:aux" entries (aux omitted when 0). See
// parseCustomPrimsSetting() in primitive-decompose.js, the PKJS-side parser.

function composerClientBody() {
  var COMPOSER = { items: [], selected: -1, addGroup: 0, dragFrom: -1 };

  function composerFindPaletteItem(id) {
    for (var g = 0; g < PRIMITIVE_PALETTE.length; g++) {
      for (var i = 0; i < PRIMITIVE_PALETTE[g].items.length; i++) {
        if (PRIMITIVE_PALETTE[g].items[i].id === id) return PRIMITIVE_PALETTE[g].items[i];
      }
    }
    return null;
  }

  function composerZoneShortLabel(aux) {
    var z = TIMEZONE_ZONES[aux];
    return z ? (z.abbr || z.label.split(" ")[0]) : ("zone " + aux);
  }

  // Generalizes the zone picker to any parametrized primitive (Update 25
  // adds 'forecast' alongside 'timezone'): which option list backs the
  // picker and what its row is labelled.
  var PARAM_OPTIONS = { timezone: TIMEZONE_ZONES, forecast: FORECAST_SLOTS };
  var PARAM_ROW_LABEL = { timezone: "Zone", forecast: "Forecast slot" };
  function composerParamShortLabel(param, aux) {
    if (param === "timezone") return composerZoneShortLabel(aux);
    var opts = PARAM_OPTIONS[param] || [];
    var o = opts[aux];
    return o ? o.label : (param + " " + aux);
  }

  function composerItemLabel(item) {
    var pal = composerFindPaletteItem(item.id);
    if (!pal) return "?" + item.id;
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

  // "Prebuilt feature" (report Section 19/20): the primitive sequence a
  // legacy content id transports as, including per-position aux (zone
  // index for the time-zone contents). Empty when that content has no
  // transport sequence (None, astronomy, composites that aren't
  // transport-enabled yet).
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

  // Text the settings page's watch preview draws for a corner's stored
  // custom sequence ("id" / "id:aux" entries), or "" when there is none
  // (so the caller falls back to the Content dropdown's label). Zone
  // primitives are rendered from their aux byte: name, a fixed sample
  // time, and PM.
  function composerPreviewLabel(stored) {
    var items = composerParse(stored);
    if (!items.length) return "";
    return items.map(function (it) {
      var pal = composerFindPaletteItem(it.id);
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
      // Draggable for pointer-based reordering (report's "if feasible"
      // note); <-/-> below remain the primary, keyboard-reachable way to
      // reorder, so drag support is additive, not a replacement.
      return "<button type=\"button\" class=\"" + cls + "\" draggable=\"true\"" +
        " ondragstart=\"composerDragStart(" + idx + ")\" ondragover=\"composerDragOver(event)\" ondrop=\"composerDrop(" + idx + ")\"" +
        " onclick=\"composerSelect(" + idx + ")\">" +
        esc(composerItemLabel(it)) + "</button>";
    }).join("");
    document.getElementById("composerEmpty").style.display = n ? "none" : "";
    document.getElementById("composerCount").textContent = n + " / " + COMPOSER_MAX;
    document.getElementById("composerCount").style.color = (n > COMPOSER_MAX) ? "#d00" : "";
    var sel = COMPOSER.selected;
    document.getElementById("composerMinus").disabled = (n <= 1);
    document.getElementById("composerLeft").disabled = (sel <= 0);
    document.getElementById("composerRight").disabled = (sel < 0 || sel >= n - 1);
    document.getElementById("composerDelete").disabled = (sel < 0 || n <= 1);
    // Zone picker for the *selected* primitive, only when it takes a zone.
    var zoneRow = document.getElementById("composerSelZoneRow");
    var selPal = sel >= 0 ? composerFindPaletteItem(COMPOSER.items[sel].id) : null;
    if (selPal && selPal.param) {
      zoneRow.style.display = "";
      document.getElementById("composerSelZoneLabel").textContent = PARAM_ROW_LABEL[selPal.param] + " for selected";
      composerFillParamSelect(document.getElementById("composerSelZone"), selPal.param);
      document.getElementById("composerSelZone").value = String(COMPOSER.items[sel].aux);
    } else {
      zoneRow.style.display = "none";
    }
    // Live preview of the whole sequence, chip-styled like the read-only strip.
    document.getElementById("composerPreview").innerHTML = COMPOSER.items.map(function (it) {
      var pal = composerFindPaletteItem(it.id);
      var kind = !pal ? "icon" : (pal.label.indexOf("Space") === 0 ? "space" :
        (pal.label.indexOf("Slash") === 0 ? "slash" : (pal.label.indexOf("Dash") === 0 ? "slash" : "value")));
      var text = kind === "space" ? "\u2423" : (kind === "slash" ? (pal.label.indexOf("Dash") === 0 ? "-" : "/") : composerItemLabel(it));
      return "<span class=\"primitive-chip primitive-chip-" + kind + "\">" + esc(text) + "</span>";
    }).join("");
    composerUpdateAddZoneVisibility();
  }

  function composerSelect(idx) {
    COMPOSER.selected = (COMPOSER.selected === idx) ? -1 : idx;
    composerSetError("");
    composerRender();
  }

  // Top row "+" (report Section 21): appends a SPACE -- a harmless,
  // editable default -- and selects it so the person can immediately swap
  // it via the palette below or move it.
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

  function composerOnSelZoneChange() {
    var s = COMPOSER.selected;
    if (s < 0) return;
    COMPOSER.items[s].aux = parseInt(document.getElementById("composerSelZone").value, 10) || 0;
    composerRender();
  }

  function composerDragStart(idx) {
    COMPOSER.dragFrom = idx;
  }
  function composerDragOver(ev) {
    ev.preventDefault(); // required for drop to fire (native HTML5 DnD)
  }
  // Drop reorders by removing the dragged chip and reinserting it at the
  // drop target's position -- same one-array-splice approach as the
  // report's "if feasible" note suggested, layered on top of (not
  // replacing) the <-/-> buttons, which remain the accessible/keyboard path.
  function composerDrop(idx) {
    var from = COMPOSER.dragFrom;
    COMPOSER.dragFrom = -1;
    if (from == null || from < 0 || from === idx || from >= COMPOSER.items.length) return;
    var item = COMPOSER.items.splice(from, 1)[0];
    COMPOSER.items.splice(idx, 0, item);
    COMPOSER.selected = idx;
    composerRender();
  }

  // ---- add-from-palette ------------------------------------------------
  function composerFillParamSelect(sel, param) {
    var opts = PARAM_OPTIONS[param] || [];
    sel.innerHTML = opts.map(function (o) {
      return "<option value=\"" + o.index + "\">" + esc(o.label) + "</option>";
    }).join("");
  }

  function composerBuildPalette() {
    var groupSel = document.getElementById("composerAddGroup");
    if (groupSel.getAttribute("data-built")) return; // static, build once
    groupSel.setAttribute("data-built", "1");
    groupSel.innerHTML = PRIMITIVE_PALETTE.map(function (g, gi) {
      return "<option value=\"" + gi + "\">" + esc(g.group) + "</option>";
    }).join("");
    composerOnAddGroupChange();
  }

  function composerOnAddGroupChange() {
    var gi = parseInt(document.getElementById("composerAddGroup").value, 10) || 0;
    document.getElementById("composerAddItem").innerHTML = PRIMITIVE_PALETTE[gi].items.map(function (it) {
      return "<option value=\"" + it.id + "\">" + esc(it.label) + "</option>";
    }).join("");
    composerUpdateAddZoneVisibility();
  }

  function composerUpdateAddZoneVisibility() {
    var id = parseInt(document.getElementById("composerAddItem").value, 10);
    var pal = composerFindPaletteItem(id);
    var row = document.getElementById("composerAddZoneRow");
    if (pal && pal.param) {
      row.style.display = "";
      document.getElementById("composerAddZoneLabel").textContent = PARAM_ROW_LABEL[pal.param];
      composerFillParamSelect(document.getElementById("composerAddZone"), pal.param);
    } else {
      row.style.display = "none";
    }
  }

  // Selecting a primitive from the palette *appends* it (report Section 20);
  // it never replaces the selected one -- use Delete + Add, or, for a
  // parametrized primitive, the zone picker above the palette.
  function composerAddFromPalette() {
    var id = parseInt(document.getElementById("composerAddItem").value, 10);
    var pal = composerFindPaletteItem(id);
    if (!pal) return;
    var aux = 0;
    if (pal.param) aux = parseInt(document.getElementById("composerAddZone").value, 10) || 0;
    COMPOSER.items.push({ id: id, aux: aux });
    COMPOSER.selected = COMPOSER.items.length - 1;
    composerSetError("");
    composerRender();
  }

  // Appends every primitive of the Content dropdown's current choice
  // (report Section 19's "Prebuilt features"): same append-not-replace rule.
  function composerAppendPrebuilt() {
    var items = composerItemsForContent(document.getElementById("slotEditContent").value);
    if (!items.length) {
      composerSetError("The selected Content has no primitive form to append.");
      return;
    }
    items.forEach(function (it) { COMPOSER.items.push(it); });
    COMPOSER.selected = COMPOSER.items.length - 1;
    composerSetError("");
    composerRender();
  }

  // ---- lifecycle hooks called from the slot editor ----------------------
  function composerOpen(def) {
    var section = document.getElementById("slotEditCustomPrimsSection");
    if (!def.customPrimsId) { section.style.display = "none"; COMPOSER.items = []; return; }
    section.style.display = "";
    composerBuildPalette();
    var stored = document.getElementById(def.customPrimsId).value || "";
    COMPOSER.items = composerParse(stored);
    COMPOSER.selected = -1;
    COMPOSER.dragFrom = -1;
    document.getElementById("slotEditCustomPrimsToggle").checked = (COMPOSER.items.length > 0);
    document.getElementById("slotEditCustomPrimsBody").style.display = COMPOSER.items.length ? "" : "none";
    composerSetError("");
    composerRender();
  }

  // Turning the toggle on with an empty working copy seeds it from the
  // Content dropdown's current choice ("start from what's already there").
  // Turning it off keeps the working copy (re-enabling restores it) but
  // saveSlotEditor() then commits nothing.
  function composerOnToggle() {
    var on = document.getElementById("slotEditCustomPrimsToggle").checked;
    document.getElementById("slotEditCustomPrimsBody").style.display = on ? "" : "none";
    if (on && !COMPOSER.items.length) {
      COMPOSER.items = composerItemsForContent(document.getElementById("slotEditContent").value);
      COMPOSER.selected = -1;
    }
    composerSetError("");
    composerRender();
  }

  // Returns the string to store in the slot's hidden input, or null if the
  // composer refuses to commit (a message is shown and the popup must stay
  // open -- report Section 23: never silently truncate).
  function composerCommitValue() {
    if (!document.getElementById("slotEditCustomPrimsToggle").checked) return "";
    var n = COMPOSER.items.length;
    if (n > COMPOSER_MAX) { composerSetError("Feature can have only " + COMPOSER_MAX + " elements"); return null; }
    if (n < 1) { composerSetError("Add at least one element, or turn off the custom sequence."); return null; }
    return composerSerialize(COMPOSER.items);
  }
}

// Strip the function wrapper: what remains is the plain function
// declarations, ready to be spliced into the generated <script> as globals.
var src = composerClientBody.toString();
module.exports = src.slice(src.indexOf('{') + 1, src.lastIndexOf('}'));
