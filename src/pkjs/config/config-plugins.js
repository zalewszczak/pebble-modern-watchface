// ---- settings page: Pebble plugins (HTML + client script) -----------------------------
//
// The phone app's plugin catalogue is computed by PKJS (plugins/plugin-manager.js) and
// handed to the page as current.pluginCatalogue = { status, message, sources[] }, with
// current.pluginSlots = the 12 watch slots' assigned source keys.
//
// A data source the user picks (in the Features "Plugins" category, or as a
// "Plugin data" element in the custom feature builder) is assigned one of 12 watch
// text slots; the page owns that assignment (PLUGIN_SLOTS) and saves it as
// CONFIG_PLUGIN_SLOTS. Slots no longer referenced by any feature are freed on save.
//
// When plugins are not available (old Pebble app, or switched off) the weather source
// select and the plugin dropdown are disabled and the page says plugins are not enabled.

var esc = require('./config-template').esc;

function catalogueOf(current) {
  var c = current && current.pluginCatalogue;
  if (!c || typeof c !== 'object') {
    return { status: 'unsupported', sources: [], message: 'Plugins are not enabled: this version of the Pebble app does not support plugins.' };
  }
  return c;
}

// Weather section: data source select + plugin status.
function weatherSourceHtml(current) {
  var cat = catalogueOf(current);
  var ok = cat.status === 'ok';
  var src = current.weatherSource === 'openmeteo' ? 'openmeteo' : 'plugin';
  var shown = ok ? src : 'openmeteo';
  return '' +
'    <div class="field-label-row"><label for="weatherSource" style="margin-top:10px;">Weather data source</label><button type="button" class="help-btn" onclick="toggleHelp(\'help-weatherSource\')">?</button></div>' +
'    <select id="weatherSource" data-stored="' + esc(src) + '"' + (ok ? '' : ' disabled') + '>' +
'      <option value="plugin"' + (shown === 'plugin' ? ' selected' : '') + '>Pebble weather plugin (default)</option>' +
'      <option value="openmeteo"' + (shown === 'openmeteo' ? ' selected' : '') + '>Open-Meteo</option>' +
'    </select>' +
'    <div class="help" id="help-weatherSource" style="display:none;">The Pebble app\'s weather plugin supplies temperature, high/low, condition, UV and rain chance. Wind, humidity, pressure, cloud cover and the forecast still come from Open-Meteo. If the plugin cannot be read, Open-Meteo is used automatically.</div>' +
(ok ? '' : '    <div class="help" id="pluginNotice" style="margin-top:6px; color:#d9822b;">' + esc(cat.message || 'Plugins are not enabled.') + ' Weather uses Open-Meteo.</div>');
}

function pluginScript(current) {
  var cat = catalogueOf(current);
  var slots = [];
  for (var i = 0; i < 12; i++) slots.push(typeof (current.pluginSlots || [])[i] === 'string' ? current.pluginSlots[i] : '');
  return '' +
'var PLUGIN_INFO = ' + JSON.stringify({ status: cat.status, message: cat.message || '', sources: cat.sources || [] }) + ';\n' +
'var PLUGIN_SLOTS = ' + JSON.stringify(slots) + ';\n' +
'var PLUGIN_CONTENT_FIRST = 200, PLUGIN_SLOT_COUNT = 12;\n' +
'var LIVE_MODE = ' + (current.liveMode ? 'true' : 'false') + ';\n' +
'function pluginsAvailable() { return PLUGIN_INFO.status === "ok" && PLUGIN_INFO.sources.length > 0; }\n' +
'function pluginUnavailableText() {\n' +
'  if (PLUGIN_INFO.status !== "ok") return PLUGIN_INFO.message || "Plugins are not enabled.";\n' +
'  return PLUGIN_INFO.sources.length ? "No free plugin slot (12 at most): remove a plugin feature first." : "No plugin provides data right now.";\n' +
'}\n' +
'function pluginSourceByKey(key) {\n' +
'  for (var i = 0; i < PLUGIN_INFO.sources.length; i++) if (PLUGIN_INFO.sources[i].key === key) return PLUGIN_INFO.sources[i];\n' +
'  return null;\n' +
'}\n' +
'function pluginSlotOf(key) { return PLUGIN_SLOTS.indexOf(key); }\n' +
'function pluginSourceLabel(src) { return src.pluginName + " \\u2013 " + src.category + "/" + src.item + ": " + src.label; }\n' +
'function pluginSlotLabel(slot) {\n' +
'  var key = PLUGIN_SLOTS[slot];\n' +
'  if (!key) return "Plugin " + (slot + 1);\n' +
'  var src = pluginSourceByKey(key);\n' +
'  return src ? src.label : "(unavailable)";\n' +
'}\n' +
// Slots referenced by saved features and by the slot editor's open draft.
'function pluginSlotsInUse() {\n' +
'  var used = {};\n' +
'  var els = document.querySelectorAll("input, select");\n' +
'  for (var i = 0; i < els.length; i++) {\n' +
'    var id = els[i].id || "";\n' +
'    if (id.indexOf("CustomPrims") !== -1) {\n' +
'      var items = composerParse(els[i].value);\n' +
'      for (var j = 0; j < items.length; j++) if (items[j].id === PRIM_PLUGIN_TEXT_ID) used[items[j].aux] = true;\n' +
'    } else if (/(Content|^corner(TL|TR|BL|BR))$/.test(id)) {\n' +
'      var n = parseInt(els[i].value, 10);\n' +
'      if (n >= PLUGIN_CONTENT_FIRST && n < PLUGIN_CONTENT_FIRST + PLUGIN_SLOT_COUNT) used[n - PLUGIN_CONTENT_FIRST] = true;\n' +
'    }\n' +
'  }\n' +
'  if (typeof COMPOSER !== "undefined" && COMPOSER.items) {\n' +
'    for (var k = 0; k < COMPOSER.items.length; k++) if (COMPOSER.items[k].id === PRIM_PLUGIN_TEXT_ID) used[COMPOSER.items[k].aux] = true;\n' +
'  }\n' +
'  var sel = document.getElementById("slotEditContent");\n' +
'  if (sel && CURRENT_SLOT_KEY) { var sv = parseInt(sel.value, 10); if (sv >= PLUGIN_CONTENT_FIRST && sv < PLUGIN_CONTENT_FIRST + PLUGIN_SLOT_COUNT) used[sv - PLUGIN_CONTENT_FIRST] = true; }\n' +
'  return used;\n' +
'}\n' +
'function pluginAllocSlot(key) {\n' +
'  var existing = pluginSlotOf(key);\n' +
'  if (existing >= 0) return existing;\n' +
'  var used = pluginSlotsInUse(), i;\n' +
'  for (i = 0; i < PLUGIN_SLOT_COUNT; i++) if (!PLUGIN_SLOTS[i]) { PLUGIN_SLOTS[i] = key; return i; }\n' +
'  for (i = 0; i < PLUGIN_SLOT_COUNT; i++) if (!used[i]) { PLUGIN_SLOTS[i] = key; return i; }\n' +
'  return -1;\n' +
'}\n' +
'function pluginGcSlots() {\n' +
'  var used = pluginSlotsInUse();\n' +
'  for (var i = 0; i < PLUGIN_SLOT_COUNT; i++) if (!used[i]) PLUGIN_SLOTS[i] = "";\n' +
'}\n' +
// Composer: value "c<i>" = catalogue source i, not yet in a slot; "<n>" = slot n.
'function pluginParamOptions() {\n' +
'  var out = [], seen = {};\n' +
'  PLUGIN_INFO.sources.forEach(function (src, i) {\n' +
'    var slot = pluginSlotOf(src.key);\n' +
'    if (slot >= 0) seen[slot] = true;\n' +
'    out.push({ value: slot >= 0 ? String(slot) : "c" + i, label: pluginSourceLabel(src) });\n' +
'  });\n' +
'  for (var s = 0; s < PLUGIN_SLOT_COUNT; s++) {\n' +
'    if (PLUGIN_SLOTS[s] && !seen[s]) out.push({ value: String(s), label: "(unavailable) " + PLUGIN_SLOTS[s].split("|").slice(1).join("/") });\n' +
'  }\n' +
'  return out;\n' +
'}\n' +
'function pluginAuxFromValue(value) {\n' +
'  if (value && value.charAt(0) === "c") {\n' +
'    var src = PLUGIN_INFO.sources[parseInt(value.slice(1), 10)];\n' +
'    return src ? pluginAllocSlot(src.key) : -1;\n' +
'  }\n' +
'  var n = parseInt(value, 10);\n' +
'  return isNaN(n) ? -1 : n;\n' +
'}\n' +
// Slot editor, Plugins category: option value is the content id (200 + slot) or "plug:<i>".
'function pluginItemOptionsHtml(selectedContentId) {\n' +
'  if (!pluginsAvailable()) return "<option value=\\"0\\">" + esc(PLUGIN_INFO.status !== "ok" ? "Plugins are not enabled" : "No plugin data available") + "</option>";\n' +
'  var html = "", seen = {};\n' +
'  PLUGIN_INFO.sources.forEach(function (src, i) {\n' +
'    var slot = pluginSlotOf(src.key);\n' +
'    var value = slot >= 0 ? String(PLUGIN_CONTENT_FIRST + slot) : "plug:" + i;\n' +
'    if (slot >= 0) seen[slot] = true;\n' +
'    html += "<option value=\\"" + value + "\\"" + (String(selectedContentId) === value ? " selected" : "") + ">" + esc(pluginSourceLabel(src)) + "</option>";\n' +
'  });\n' +
'  var sel = parseInt(selectedContentId, 10) - PLUGIN_CONTENT_FIRST;\n' +
'  if (sel >= 0 && sel < PLUGIN_SLOT_COUNT && !seen[sel]) html = "<option value=\\"" + selectedContentId + "\\" selected>(unavailable) " + esc(PLUGIN_SLOTS[sel] || "") + "</option>" + html;\n' +
'  return html;\n' +
'}\n' +
'function pluginResolveContentSelect(sel) {\n' +
'  var v = sel.value;\n' +
'  if (v.indexOf("plug:") !== 0) return;\n' +
'  var src = PLUGIN_INFO.sources[parseInt(v.slice(5), 10)];\n' +
'  var slot = src ? pluginAllocSlot(src.key) : -1;\n' +
'  if (slot < 0) { alert(pluginUnavailableText()); sel.innerHTML = "<option value=\\"0\\">None</option>"; return; }\n' +
'  sel.options[sel.selectedIndex].value = String(PLUGIN_CONTENT_FIRST + slot);\n' +
'}\n' +
'function pluginButtonText(contentId) {\n' +
'  var slot = parseInt(contentId, 10) - PLUGIN_CONTENT_FIRST;\n' +
'  return pluginSlotLabel(slot);\n' +
'}\n' +
'function slotEditContentDisabled(categoryId) {\n' +
'  return categoryId === "none" || (categoryId === "plugins" && !pluginsAvailable());\n' +
'}\n' +
'function slotEditCategoryHelpUpdate(categoryId) {\n' +
'  var help = document.getElementById("slotEditCategoryHelp");\n' +
'  if (categoryId === "plugins") {\n' +
'    help.textContent = pluginsAvailable() ? "Shows the latest value of a data source provided by a Pebble plugin, as plain text." : pluginUnavailableText();\n' +
'    help.style.display = "";\n' +
'  } else if (categoryId === "timezone") {\n' +
'    help.textContent = "Shows the time-zone option used for the selected location. Daylight saving rules may vary by location.";\n' +
'    help.style.display = "";\n' +
'  } else {\n' +
'    help.style.display = "none";\n' +
'  }\n' +
'}\n';
}

module.exports = { weatherSourceHtml: weatherSourceHtml, pluginScript: pluginScript };
