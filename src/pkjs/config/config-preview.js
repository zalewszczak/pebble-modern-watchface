// Miniature watch preview renderer
module.exports =
'function hasPreviewContent(contentId) {' +
'  var el = document.getElementById(contentId);' +
'  if (!el) return false;' +
'  var customEl = document.getElementById(contentId.replace(/Content$/, \"\") + \"CustomPrims\");' +
'  if (customEl && customEl.value && composerPreviewLabel(customEl.value)) return true;' +
'  var v = parseInt(el.value, 10);' +
'  return v !== 0 && !!primitiveDecompositionText(v);' +
'}' +

'function slotAvailable(wrapId) {' +
'  var avail = computeSlotAvailability();' +
'  switch (wrapId) {' +
'    case "cornerTLWrap": case "cornerTRWrap": case "cornerBLWrap": case "cornerBRWrap":' +
'      return !avail.cornersGrayed;' +
'    case "upperMiddleWrap": return avail.upper;' +
'    case "bottomMiddleWrap": return avail.bottom;' +
'    case "middleLeftWrap": return avail.left;' +
'    case "middleRightWrap": return avail.right;' +
'    default: return false;' +
'  }' +
'}' +

'function drawCornerSlot(ctx, contentId, colorId, x, y, textAlign, colors, fontCss) {' +
'  var contentEl = document.getElementById(contentId);' +
'  var colorEl = document.getElementById(colorId);' +
'  if (!contentEl || !colorEl) return;' +
'  var content = parseInt(contentEl.value, 10);' +
'  var customEl = document.getElementById(contentId.replace(/Content$/, \"\") + \"CustomPrims\");' +
'  var label = (customEl && customEl.value) ? composerPreviewLabel(customEl.value) : \"\";' +
'  if (!label) label = primitiveDecompositionText(content, true);' +
'  if (!label) return;' +
'  var mode = parseInt(colorEl.value, 10);' +
'  var color = colors.text, alpha = 1;' +
'  if (mode === 1) { color = colors.accent; }' +
'  else if (mode === 2) { color = colors.accent; alpha = 0.55; }' +
'  else if (mode === 3) { color = "#4caf50"; }' +
'  var fm = /([0-9.]+)px/.exec(fontCss);' +
'  var fontPx = fm ? parseFloat(fm[1]) : 10;' +
'  ctx.font = fontCss;' +
'  ctx.textBaseline = "top";' +
'  ctx.globalAlpha = alpha;' +
'  ctx.fillStyle = color;' +
'  var segs = previewLabelSegments(label, fontPx);' +
'  var total = 0, i;' +
'  for (i = 0; i < segs.length; i++) {' +
'    if (segs[i].icon) { segs[i].width = segs[i].icon.width; }' +
'    else if (segs[i].gap) { segs[i].width = segs[i].gap; }' +
'    else { segs[i].width = ctx.measureText(segs[i].text).width; }' +
'    total += segs[i].width;' +
'  }' +
'  var cx = (textAlign === "center") ? x - total / 2 : (textAlign === "right" ? x - total : x);' +
'  ctx.textAlign = "left";' +
'  for (i = 0; i < segs.length; i++) {' +
'    if (segs[i].icon) {' +
'      var ic = segs[i].icon;' +
'      var iy = y + (fontPx - ic.height) / 2;' +
'      drawPreviewIcon(ctx, ic, cx, iy, color);' +
'    } else {' +
'      ctx.fillStyle = color;' +
'      ctx.fillText(segs[i].text, cx, y);' +
'    }' +
'    cx += segs[i].width;' +
'  }' +
'  ctx.globalAlpha = 1;' +
'}' +

'var PREVIEW_ICON_OUTLINE_THIN = [[-1,0],[1,0],[0,-1],[0,1]];' +
'var PREVIEW_ICON_OUTLINE_THICK = [[-1,0],[1,0],[0,-1],[0,1],[-2,0],[2,0],[0,-2],[0,2],[1,1],[-1,1],[-1,-1],[1,-1]];' +
'var PREVIEW_TINT_CACHE = {};' +

'function previewIconSource(style, name) {' +
'  var set = (typeof PREVIEW_ICON_IMAGES !== "undefined") ? PREVIEW_ICON_IMAGES[style] : null;' +
'  return set ? set[name] : null;' +
'}' +

'function previewIconForToken(token, iconPx) {' +
'  if (typeof PREVIEW_ICON_TOKENS === "undefined") return null;' +
'  var name = PREVIEW_ICON_TOKENS[token];' +
'  if (!name) return null;' +
'  var styleEl = document.getElementById("weatherIconStyle");' +
'  var style = styleEl ? String(parseInt(styleEl.value, 10) || 0) : "1";' +
'  var src = previewIconSource(style, name);' +
'  if (!src) return null;' +
'  var img = getCachedImage(src);' +
'  if (!img.complete || !img.naturalWidth) return null;' +
'  var f = iconPx / 16;' +
'  return { name: name, style: style, factor: f, width: img.naturalWidth * f, height: img.naturalHeight * f };' +
'}' +

'function previewLabelSegments(label, fontPx) {' +
'  var parts = label.split(/(\\([A-Za-z]+\\)|\\uE000)/);' +
'  var iconPx = Math.max(8, Math.round(fontPx * 1.15));' +
'  var out = [];' +
'  for (var i = 0; i < parts.length; i++) {' +
'    var p = parts[i];' +
'    if (!p) continue;' +
'    if (p === "\\uE000") { out.push({ text: "", gap: Math.round(fontPx * 0.4) }); continue; }' +
'    var m = /^\\(([A-Za-z]+)\\)$/.exec(p);' +
'    var ic = m ? previewIconForToken(m[1], iconPx) : null;' +
'    if (ic) out.push({ icon: ic });' +
'    else out.push({ text: p });' +
'  }' +
'  return out;' +
'}' +

'function previewHexLuma(hex) {' +
'  var c = hexToRgb(hex);' +
'  return ((c.r >> 6) * 3 + (c.g >> 6) * 6 + (c.b >> 6));' +
'}' +

'function tintPreviewIcon(img, hex) {' +
'  var key = img.src.length + ":" + img.src.slice(-40) + ":" + hex;' +
'  if (PREVIEW_TINT_CACHE[key]) return PREVIEW_TINT_CACHE[key];' +
'  var cv = document.createElement("canvas");' +
'  cv.width = img.naturalWidth; cv.height = img.naturalHeight;' +
'  var c2 = cv.getContext("2d");' +
'  c2.drawImage(img, 0, 0);' +
'  var data = c2.getImageData(0, 0, cv.width, cv.height);' +
'  var d = data.data, n = d.length / 4, k, hasClear = false, lo = 1e9, hi = -1;' +
'  for (k = 0; k < n; k++) {' +
'    if (d[k*4+3] < 128) { hasClear = true; continue; }' +
'    var l = d[k*4] * 0.3 + d[k*4+1] * 0.59 + d[k*4+2] * 0.11;' +
'    if (l < lo) lo = l; if (l > hi) hi = l;' +
'  }' +
'  var mid = (lo + hi) / 2;' +
'  var rgb = hexToRgb(hex);' +
'  for (k = 0; k < n; k++) {' +
'    var opaque = d[k*4+3] >= 128;' +
'    var ink = opaque;' +
'    if (opaque && !hasClear) { var l2 = d[k*4] * 0.3 + d[k*4+1] * 0.59 + d[k*4+2] * 0.11; ink = (hi === lo) || l2 <= mid; }' +
'    d[k*4] = rgb.r; d[k*4+1] = rgb.g; d[k*4+2] = rgb.b; d[k*4+3] = ink ? 255 : 0;' +
'  }' +
'  c2.putImageData(data, 0, 0);' +
'  PREVIEW_TINT_CACHE[key] = cv;' +
'  return cv;' +
'}' +

'function drawPreviewIcon(ctx, ic, x, y, hex) {' +
'  var img = getCachedImage(previewIconSource(ic.style, ic.name));' +
'  if (!img.complete || !img.naturalWidth) return;' +
'  var f = ic.factor;' +
'  var oEl = document.getElementById("outlineStyle");' +
'  var outline = oEl ? parseInt(oEl.value, 10) || 0 : 0;' +
'  var prevSmooth = ctx.imageSmoothingEnabled;' +
'  ctx.imageSmoothingEnabled = false;' +
'  if (outline) {' +
'    var outHex = previewHexLuma(hex) >= 9 ? "#000000" : "#ffffff";' +
'    var sil = img;' +
'    if (ic.style === "2") {' +
'      var hs = previewIconSource("1", ic.name);' +
'      var himg = hs ? getCachedImage(hs) : null;' +
'      sil = (himg && himg.complete && himg.naturalWidth) ? himg : null;' +
'    }' +
'    if (sil) {' +
'      var tc = tintPreviewIcon(sil, outHex);' +
'      var offs = outline >= 2 ? PREVIEW_ICON_OUTLINE_THICK : PREVIEW_ICON_OUTLINE_THIN;' +
'      for (var o = 0; o < offs.length; o++) {' +
'        ctx.drawImage(tc, x + offs[o][0] * f, y + offs[o][1] * f, tc.width * f, tc.height * f);' +
'      }' +
'    }' +
'  }' +
'  if (ic.style === "2") ctx.drawImage(img, x, y, img.naturalWidth * f, img.naturalHeight * f);' +
'  else { var main = tintPreviewIcon(img, hex); ctx.drawImage(main, x, y, main.width * f, main.height * f); }' +
'  ctx.imageSmoothingEnabled = prevSmooth;' +
'}' +

'function isBitmapMarkerStyleId(n) { return (n >= 3 && n <= 7) || (n >= 11 && n <= 19); }' +
'function computeMiddleFeatureMargins(w, h) {' +
'  var scale = w / BG_W;' +
'  var margins = { top: 44 * scale, bottom: 40 * scale, left: 30 * scale, right: 30 * scale };' +
'  var markerStyle = parseInt(document.getElementById("bigAnalogMarkerStyle").value, 10);' +
'  var isBitmapStyle = isBitmapMarkerStyleId(markerStyle);' +
'  if (isBitmapStyle) return margins;' +
'  var pct, ecc;' +
'  var hourCfg = readCustomMarkerConfig("hour");' +
'  pct = hourCfg.innerBorderPct; ecc = hourCfg.innerEccentricity;' +
'  var cx = w / 2, cy = h / 2;' +
'  var topPt = pointOnRing(cx, cy, w, h, 0, pct, ecc);' +
'  var rightPt = pointOnRing(cx, cy, w, h, Math.PI / 2, pct, ecc);' +
'  var bottomPt = pointOnRing(cx, cy, w, h, Math.PI, pct, ecc);' +
'  var leftPt = pointOnRing(cx, cy, w, h, 3 * Math.PI / 2, pct, ecc);' +
'  var margin = 4 * scale;' +
'  if (topPt.y + margin > margins.top) margins.top = topPt.y + margin;' +
'  if (h - bottomPt.y + margin > margins.bottom) margins.bottom = h - bottomPt.y + margin;' +
'  var leftReach = leftPt.x + margin, rightReach = w - rightPt.x + margin;' +
'  if (leftReach > margins.left) margins.left = leftReach;' +
'  if (rightReach > margins.right) margins.right = rightReach;' +
'  return margins;' +
'}' +

'function drawCornersAndEdges(ctx, w, h, colors, skyBottom, skyTop) {' +
'  var bottomY = (typeof skyBottom === "number") ? skyBottom : h;' +
'  var topY = (typeof skyTop === "number") ? skyTop : 0;' +
'  var cornerFontSel = document.getElementById("cornerFont");' +
'  var cornerOpt = cornerFontSel.options[cornerFontSel.selectedIndex];' +
'  var cornerEntry = fontLookupEntry(cornerFontSel.value);' +
'  var cornerScale = w / BG_W;' +
'  var cornerPx = Math.max(7, Math.min(22, Math.round(cornerEntry.height * cornerScale)));' +
'  var cornerFontCss = canvasFontFor(cornerOpt.getAttribute("data-preview") || "", cornerPx, cornerFontSel.value);' +
'  var lineH = Math.round(cornerPx * 1.4);' +
'  if (slotAvailable("cornerTLWrap")) drawCornerSlot(ctx, "cornerTL", "cornerTLColor", 5, topY + 5, "left", colors, cornerFontCss);' +
'  if (slotAvailable("cornerTRWrap")) drawCornerSlot(ctx, "cornerTR", "cornerTRColor", w - 5, topY + 5, "right", colors, cornerFontCss);' +
'  if (slotAvailable("cornerBLWrap")) drawCornerSlot(ctx, "cornerBL", "cornerBLColor", 5, bottomY - 14, "left", colors, cornerFontCss);' +
'  if (slotAvailable("cornerBRWrap")) drawCornerSlot(ctx, "cornerBR", "cornerBRColor", w - 5, bottomY - 14, "right", colors, cornerFontCss);' +
'  var needMiddleMargins = slotAvailable("upperMiddleWrap") || slotAvailable("bottomMiddleWrap") || slotAvailable("middleLeftWrap") || slotAvailable("middleRightWrap");' +
'  var mm = needMiddleMargins ? computeMiddleFeatureMargins(w, h) : null;' +
'  if (slotAvailable("upperMiddleWrap")) {' +
'    var upperHasLine2 = hasPreviewContent("upperMiddleLine2Content");' +
'    drawCornerSlot(ctx, "upperMiddleLine1Content", "upperMiddleLine1Color", w / 2, upperHasLine2 ? mm.top : mm.top + lineH / 2, "center", colors, cornerFontCss);' +
'    if (upperHasLine2) drawCornerSlot(ctx, "upperMiddleLine2Content", "upperMiddleLine2Color", w / 2, mm.top + lineH, "center", colors, cornerFontCss);' +
'  }' +
'  if (slotAvailable("bottomMiddleWrap")) {' +
'    var bottomHasLine2 = hasPreviewContent("bottomMiddleLine2Content");' +
'    drawCornerSlot(ctx, "bottomMiddleLine1Content", "bottomMiddleLine1Color", w / 2, bottomHasLine2 ? bottomY - mm.bottom - lineH : bottomY - mm.bottom - lineH / 2, "center", colors, cornerFontCss);' +
'    if (bottomHasLine2) drawCornerSlot(ctx, "bottomMiddleLine2Content", "bottomMiddleLine2Color", w / 2, bottomY - mm.bottom, "center", colors, cornerFontCss);' +
'  }' +
'  if (slotAvailable("middleLeftWrap")) {' +
'    var midLeftHasLine2 = hasPreviewContent("middleLeftLine2Content");' +
'    drawCornerSlot(ctx, "middleLeftLine1Content", "middleLeftLine1Color", mm.left, midLeftHasLine2 ? h / 2 - 4 - lineH / 2 : h / 2 - 4, "left", colors, cornerFontCss);' +
'    if (midLeftHasLine2) drawCornerSlot(ctx, "middleLeftLine2Content", "middleLeftLine2Color", mm.left, h / 2 - 4 + lineH / 2, "left", colors, cornerFontCss);' +
'  }' +
'  if (slotAvailable("middleRightWrap")) {' +
'    var midRightHasLine2 = hasPreviewContent("middleRightLine2Content");' +
'    drawCornerSlot(ctx, "middleRightLine1Content", "middleRightLine1Color", w - mm.right, midRightHasLine2 ? h / 2 - 4 - lineH / 2 : h / 2 - 4, "right", colors, cornerFontCss);' +
'    if (midRightHasLine2) drawCornerSlot(ctx, "middleRightLine2Content", "middleRightLine2Color", w - mm.right, h / 2 - 4 + lineH / 2, "right", colors, cornerFontCss);' +
'  }' +
'}' +

'function handAxialPoint(cx, cy, angle, axial) {' +
'  return { x: cx + axial * Math.sin(angle), y: cy - axial * Math.cos(angle) };' +
'}' +
'function handPerpOffset(angle, halfW) {' +
'  return { dx: halfW * Math.cos(angle), dy: halfW * Math.sin(angle) };' +
'}' +
'function computeHandGeometry(cx, cy, angle, cfg) {' +
'  var len = cfg.length, back = -cfg.backOffset, mid = cfg.middleOffset;' +
'  var halfW = Math.max(0.5, cfg.width / 2), halfSW = Math.max(0.5, cfg.secondaryWidth / 2);' +
'  var polys = [], circles = [];' +
'  function axial(a) { return handAxialPoint(cx, cy, angle, a); }' +
'  function perp(hw) { return handPerpOffset(angle, hw); }' +
'  function capsule(innerAx, outerAx, hw, roundCaps) {' +
'    var inner = axial(innerAx), outer = axial(outerAx), p = perp(hw);' +
'    polys.push([' +
'      { x: inner.x - p.dx, y: inner.y - p.dy }, { x: inner.x + p.dx, y: inner.y + p.dy },' +
'      { x: outer.x + p.dx, y: outer.y + p.dy }, { x: outer.x - p.dx, y: outer.y - p.dy }' +
'    ]);' +
'    if (roundCaps) { circles.push({ x: inner.x, y: inner.y, r: hw }); circles.push({ x: outer.x, y: outer.y, r: hw }); }' +
'  }' +
'  function taper(baseAx, hw, tipPoint) {' +
'    var base = axial(baseAx), p = perp(hw);' +
'    polys.push([{ x: base.x - p.dx, y: base.y - p.dy }, { x: base.x + p.dx, y: base.y + p.dy }, tipPoint]);' +
'  }' +

'  switch (cfg.style) {' +
'    case 1: { var outer = axial(len); taper(back, halfW, outer); break; }' +

'    case 3: {' +
'      var effBack = Math.max(cfg.backOffset, cfg.middleOffset);' +
'      var backTip = axial(-effBack), topTip = axial(len), midPt = axial(mid), p = perp(halfW);' +
'      polys.push([backTip, { x: midPt.x - p.dx, y: midPt.y - p.dy }, topTip, { x: midPt.x + p.dx, y: midPt.y + p.dy }]);' +
'      break;' +
'    }' +
'    case 4: {' +
'      var midAx = Math.min(mid, len);' +
'      var top = axial(len), base = axial(back), midPt = axial(midAx);' +
'      var pw = perp(halfW), psw = perp(halfSW);' +
'      polys.push([' +
'        { x: base.x - pw.dx, y: base.y - pw.dy }, { x: midPt.x - psw.dx, y: midPt.y - psw.dy }, top,' +
'        { x: midPt.x + psw.dx, y: midPt.y + psw.dy }, { x: base.x + pw.dx, y: base.y + pw.dy }' +
'      ]);' +
'      break;' +
'    }' +
'    case 5: capsule(mid, len, halfW, true); capsule(back, mid, halfSW, false); break;' +

'    case 6: {' +
'      capsule(back, len, halfW, true);' +
'      var tip = axial(len);' +
'      circles.push({ x: tip.x, y: tip.y, r: halfSW });' +
'      var centerAx = (len + back) / 2, apexAx = centerAx + mid;' +
'      if (apexAx > len) {' +
'        var apex = axial(apexAx), psw = perp(halfSW);' +
'        polys.push([{ x: tip.x - psw.dx, y: tip.y - psw.dy }, { x: tip.x + psw.dx, y: tip.y + psw.dy }, apex]);' +
'      }' +
'      break;' +
'    }' +
'    case 7: {' +
'      var tip = axial(len);' +
'      taper(back, halfW, tip);' +
'      var apex = axial(len + mid), psw = perp(halfSW);' +
'      polys.push([{ x: tip.x - psw.dx, y: tip.y - psw.dy }, { x: tip.x + psw.dx, y: tip.y + psw.dy }, apex]);' +
'      break;' +
'    }' +
'    case 8: {' +
'      var centerAx = (back + len) / 2, peakAx = centerAx + mid;' +
'      if (peakAx < back) peakAx = back;' +
'      if (peakAx > len) peakAx = len;' +
'      var N = 2;' +
'      var haveBack = peakAx > back, haveTip = peakAx < len;' +
'      var plusA = [], minusA = [], plusB = [], minusB = [];' +
'      if (haveBack) {' +
'        for (var k = 1; k <= N; k++) {' +
'          var u = k / (N + 1), ax = back + (peakAx - back) * u, w = halfW * Math.sin(Math.PI / 2 * u);' +
'          var p = axial(ax), pw = perp(w);' +
'          plusA.push({ x: p.x + pw.dx, y: p.y + pw.dy }); minusA.push({ x: p.x - pw.dx, y: p.y - pw.dy });' +
'        }' +
'      }' +
'      if (haveTip) {' +
'        for (var k = 1; k <= N; k++) {' +
'          var v = k / (N + 1), ax = peakAx + (len - peakAx) * v, w = halfW * Math.cos(Math.PI / 2 * v);' +
'          var p = axial(ax), pw = perp(w);' +
'          plusB.push({ x: p.x + pw.dx, y: p.y + pw.dy }); minusB.push({ x: p.x - pw.dx, y: p.y - pw.dy });' +
'        }' +
'      }' +
'      var peakP = axial(peakAx), pPerp = perp(halfW);' +
'      var peakPlus = { x: peakP.x + pPerp.dx, y: peakP.y + pPerp.dy }, peakMinus = { x: peakP.x - pPerp.dx, y: peakP.y - pPerp.dy };' +
'      var pts = [];' +
'      if (haveBack) { pts.push(axial(back)); for (var i = 0; i < N; i++) pts.push(plusA[i]); }' +
'      pts.push(peakPlus);' +
'      if (haveTip) { for (var i = 0; i < N; i++) pts.push(plusB[i]); pts.push(axial(len)); for (var i = N - 1; i >= 0; i--) pts.push(minusB[i]); }' +
'      pts.push(peakMinus);' +
'      if (haveBack) { for (var i = N - 1; i >= 0; i--) pts.push(minusA[i]); }' +
'      polys.push(pts);' +
'      break;' +
'    }' +
'    case 9: {' +
'      capsule(back, len, halfW, false);' +
'      var cornerAx = len + mid, taperLen = Math.max(0.5, halfW - halfSW), tipAx = cornerAx + taperLen;' +
'      var corner = axial(cornerAx), tip = axial(tipAx), pw = perp(halfW), psw = perp(halfSW);' +
'      polys.push([' +
'        { x: corner.x - pw.dx, y: corner.y - pw.dy }, { x: corner.x + pw.dx, y: corner.y + pw.dy },' +
'        { x: tip.x + psw.dx, y: tip.y + psw.dy }, { x: tip.x - psw.dx, y: tip.y - psw.dy }' +
'      ]);' +
'      break;' +
'    }' +
'    case 10: {' +
'      var SEG = 6;' +
'      var amp = Math.max(0, halfSW - halfW);' +
'      var diameter = Math.abs(cfg.middleOffset); if (diameter < 4) diameter = 4;' +
'      var period = diameter * 2, dirSign = cfg.middleOffset < 0 ? -1 : 1, span = len - back;' +
'      var verts = [];' +
'      for (var i = 0; i <= SEG; i++) {' +
'        var sRel = span * i / SEG, ax = back + sRel;' +
'        var ang = (sRel / period) * 2 * Math.PI;' +
'        var dev = amp * Math.sin(ang) * dirSign;' +
'        var p = axial(ax), pd = perp(dev);' +
'        verts.push({ x: p.x + pd.dx, y: p.y + pd.dy });' +
'      }' +
'      for (var i = 0; i < SEG; i++) {' +
'        var a = verts[i], b = verts[i + 1];' +
'        var tx = b.x - a.x, ty = b.y - a.y, tlen = Math.sqrt(tx * tx + ty * ty);' +
'        var ox, oy;' +
'        if (tlen === 0) { var pd = perp(halfW); ox = pd.dx; oy = pd.dy; }' +
'        else { ox = -ty * halfW / tlen; oy = tx * halfW / tlen; }' +
'        polys.push([{ x: a.x - ox, y: a.y - oy }, { x: a.x + ox, y: a.y + oy }, { x: b.x + ox, y: b.y + oy }, { x: b.x - ox, y: b.y - oy }]);' +
'      }' +
'      break;' +
'    }' +
'    case 0: case 2: default: capsule(back, len, halfW, cfg.style === 0); break;' +
'  }' +
'  return { polys: polys, circles: circles };' +
'}' +

'function handPathPolygon(ctx, pts) {' +
'  ctx.beginPath();' +
'  ctx.moveTo(pts[0].x, pts[0].y);' +
'  for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);' +
'  ctx.closePath();' +
'}' +
'function handFillRing(ctx, pathFn, thicknessPx, color) {' +
'  ctx.save();' +
'  pathFn(); ctx.clip();' +
'  pathFn(); ctx.lineWidth = thicknessPx * 2; ctx.strokeStyle = color; ctx.stroke();' +
'  ctx.restore();' +
'}' +
'function handGeometryPaths(geo) {' +
'  return geo.polys.map(function (pts) { return function (ctx) { handPathPolygon(ctx, pts); }; })' +
'    .concat(geo.circles.map(function (c) { return function (ctx) { ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(0, c.r), 0, 2 * Math.PI); }; }));' +
'}' +
'function drawHandGeometryFill(ctx, geo, color, translucent, hollow, hollowThicknessPx) {' +
'  ctx.globalAlpha = translucent ? 0.5 : 1;' +
'  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1;' +
'  handGeometryPaths(geo).forEach(function (pathFn) {' +
'    if (hollow) {' +
'      if (hollowThicknessPx <= 1) { pathFn(ctx); ctx.lineWidth = 1; ctx.stroke(); }' +
'      else handFillRing(ctx, function () { pathFn(ctx); }, hollowThicknessPx, color);' +
'    } else { pathFn(ctx); ctx.fill(); }' +
'  });' +
'  ctx.globalAlpha = 1;' +
'}' +
'function drawHandGeometryOutline(ctx, geo, color, translucent) {' +
'  ctx.globalAlpha = translucent ? 0.5 : 1;' +
'  ctx.strokeStyle = color; ctx.lineWidth = 1;' +
'  handGeometryPaths(geo).forEach(function (pathFn) { pathFn(ctx); ctx.stroke(); });' +
'  ctx.globalAlpha = 1;' +
'}' +
'function drawHandShadow(ctx, cx, cy, angle, cfg, shadowAngleDeg, shadowTranslucentStyle) {' +
'  if (!cfg.shadowEnabled) return;' +
'  var shadowAngleRad = (shadowAngleDeg || 0) * Math.PI / 180;' +
'  var dx = cfg.shadowDistance * Math.sin(shadowAngleRad), dy = -cfg.shadowDistance * Math.cos(shadowAngleRad);' +
'  var geo = computeHandGeometry(cx + dx, cy + dy, angle, cfg);' +
'  ctx.globalAlpha = shadowTranslucentStyle ? (cfg.translucent ? 0.25 : 0.5) : 1;' +
'  ctx.fillStyle = "#000";' +
'  handGeometryPaths(geo).forEach(function (pathFn) { pathFn(ctx); ctx.fill(); });' +
'  ctx.globalAlpha = 1;' +
'}' +
'function resolveHandPreviewColor(colorVal, colors) {' +
'  if (colorVal === "1") return colors.accent;' +
'  if (colorVal === "2") return colors.bg;' +
'  if (colorVal === "3") return null;' +
'  return colors.text;' +
'}' +
'function readHandConfig(kind, scale) {' +
'  var prefix = (s_openHandEditorKind === kind) ? hePopupPrefix(kind) : heHiddenPrefix(kind);' +
'  function num(field, def) { var el = document.getElementById(prefix + field); var v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? def : v; }' +
'  function str(field, def) { var el = document.getElementById(prefix + field); return el ? el.value : def; }' +
'  function bool(field) {' +
'    var el = document.getElementById(prefix + field);' +
'    if (!el) return false;' +
'    return (el.type === "checkbox") ? el.checked : el.value === "true";' +
'  }' +
'  return {' +
'    style: parseInt(str("Style", "0"), 10) || 0,' +
'    width: num("Width", 12) * scale,' +
'    length: num("Length", 51) * scale,' +
'    backOffset: num("BackOffset", 0) * scale,' +
'    middleOffset: num("MiddleOffset", 0) * scale,' +
'    secondaryWidth: num("SecondaryWidth", 6) * scale,' +
'    color: str("Color", "0"),' +
'    outlineEnabled: bool("OutlineEnabled"),' +
'    outlineColor: str("OutlineColor", "0"),' +
'    translucent: bool("Translucent"),' +
'    shadowEnabled: bool("ShadowEnabled"),' +
'    shadowDistance: num("ShadowDistance", 2) * scale,' +
'    hollow: bool("Hollow"),' +
'    hollowThickness: num("HollowThickness", 1) * scale' +
'  };' +
'}' +
'function drawHandFull(ctx, cx, cy, angle, cfg, colors, shadowAngleDeg, shadowTranslucentStyle) {' +
'  drawHandShadow(ctx, cx, cy, angle, cfg, shadowAngleDeg, shadowTranslucentStyle);' +
'  var geo = computeHandGeometry(cx, cy, angle, cfg);' +
'  if (cfg.outlineEnabled) {' +
'    drawHandGeometryOutline(ctx, geo, resolveHandPreviewColor(cfg.outlineColor, colors) || colors.text, cfg.translucent);' +
'  }' +
'  var fillColor = resolveHandPreviewColor(cfg.color, colors);' +
'  if (fillColor) drawHandGeometryFill(ctx, geo, fillColor, cfg.translucent, cfg.hollow, cfg.hollowThickness);' +
'}' +

'var MARKER_PREVIEW_IMG_CACHE = {};' +
'function getMarkerPreviewImg(styleVal) {' +
'  var src = MARKER_PREVIEW_IMAGES[styleVal];' +
'  if (!src) return null;' +
'  if (!MARKER_PREVIEW_IMG_CACHE[styleVal]) {' +
'    var img = new Image();' +
'    img.src = src;' +
'    MARKER_PREVIEW_IMG_CACHE[styleVal] = img;' +
'  }' +
'  var cached = MARKER_PREVIEW_IMG_CACHE[styleVal];' +
'  return (cached.complete && cached.naturalWidth > 0) ? cached : null;' +
'}' +
'function hexToRgb(hex) {' +
'  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");' +
'  if (!m) return { r: 0, g: 0, b: 0 };' +
'  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };' +
'}' +
'var MARKER_TINT_CACHE = {};' +
'function getTintedMarkerCanvas(styleVal, tintColor) {' +
'  var cacheKey = styleVal + "|" + tintColor;' +
'  if (MARKER_TINT_CACHE[cacheKey]) return MARKER_TINT_CACHE[cacheKey];' +
'  var img = getMarkerPreviewImg(styleVal);' +
'  if (!img) return null;' +
'  var iw = img.naturalWidth, ih = img.naturalHeight;' +
'  if (!iw || !ih) return null;' +
'  try {' +
'    var off = document.createElement("canvas");' +
'    off.width = iw; off.height = ih;' +
'    var octx = off.getContext("2d");' +
'    octx.drawImage(img, 0, 0, iw, ih);' +
'    var imageData = octx.getImageData(0, 0, iw, ih);' +
'    var rgb = hexToRgb(tintColor);' +
'    var data = imageData.data;' +
'    for (var i = 0; i < data.length; i += 4) {' +
'      if (data[i + 3] > 0) {' +
'        data[i] = rgb.r;' +
'        data[i + 1] = rgb.g;' +
'        data[i + 2] = rgb.b;' +
'      }' +
'    }' +
'    octx.putImageData(imageData, 0, 0);' +
'    MARKER_TINT_CACHE[cacheKey] = off;' +
'    return off;' +
'  } catch (e) {' +
'    return null;' +
'  }' +
'}' +
'function drawTintedMarkerBitmap(ctx, styleVal, w, h, tintColor) {' +
'  var tinted = getTintedMarkerCanvas(styleVal, tintColor);' +
'  if (!tinted) return false;' +
'  ctx.drawImage(tinted, 0, 0, w, h);' +
'  return true;' +
'}' +

'var FONT_IMG_TINT_CACHE = {};' +
'function getTintedFontImageCanvas(src, tintColor) {' +
'  var cacheKey = src + "|" + tintColor;' +
'  if (FONT_IMG_TINT_CACHE[cacheKey]) return FONT_IMG_TINT_CACHE[cacheKey];' +
'  var img = getCachedImage(src);' +
'  if (!img.complete || !img.naturalWidth) return null;' +
'  var iw = img.naturalWidth, ih = img.naturalHeight;' +
'  try {' +
'    var off = document.createElement("canvas");' +
'    off.width = iw; off.height = ih;' +
'    var octx = off.getContext("2d");' +
'    octx.drawImage(img, 0, 0, iw, ih);' +
'    var imageData = octx.getImageData(0, 0, iw, ih);' +
'    var rgb = hexToRgb(tintColor);' +
'    var data = imageData.data;' +
'    for (var i = 0; i < data.length; i += 4) {' +
'      if (data[i + 3] > 0) {' +
'        data[i] = rgb.r;' +
'        data[i + 1] = rgb.g;' +
'        data[i + 2] = rgb.b;' +
'      }' +
'    }' +
'    octx.putImageData(imageData, 0, 0);' +
'    FONT_IMG_TINT_CACHE[cacheKey] = off;' +
'    return off;' +
'  } catch (e) {' +
'    return null;' +
'  }' +
'}' +

'function markerReach(w, h, pct) {' +
'  var reachMin = Math.min(w / 4, h / 4), reachMax = Math.max(w / 2, h / 2);' +
'  return reachMin + (reachMax - reachMin) * pct / 100;' +
'}' +
'function pointOnRing(cx, cy, w, h, angle, pct, eccentricityPct) {' +
'  var sinV = Math.sin(angle), cosV = Math.cos(angle);' +
'  var reach = markerReach(w, h, pct);' +
'  var circlePt = { x: cx + reach * sinV, y: cy - reach * cosV };' +
'  if (!eccentricityPct) return circlePt;' +
'  var hw = w / 2, hh = h / 2, reachMax = Math.max(hw, hh);' +
'  var rectHw = reach * hw / reachMax, rectHh = reach * hh / reachMax;' +
'  var adx = Math.abs(sinV), ady = Math.abs(cosV);' +
'  var tx = adx === 0 ? Infinity : rectHw / adx, ty = ady === 0 ? Infinity : rectHh / ady;' +
'  var t = Math.min(tx, ty);' +
'  var rectPt = { x: cx + t * sinV, y: cy - t * cosV };' +
'  return {' +
'    x: circlePt.x + (rectPt.x - circlePt.x) * eccentricityPct / 100,' +
'    y: circlePt.y + (rectPt.y - circlePt.y) * eccentricityPct / 100' +
'  };' +
'}' +
'function drawRingMark(ctx, inner, outer, angle, innerHalfThick, outerHalfThick, style, color, translucent) {' +
'  ctx.globalAlpha = translucent ? 0.5 : 1;' +
'  ctx.fillStyle = color;' +
'  var sinV = Math.sin(angle), cosV = Math.cos(angle);' +
'  if (inner.x === outer.x && inner.y === outer.y) {' +
'    ctx.beginPath(); ctx.arc(inner.x, inner.y, outerHalfThick, 0, 2 * Math.PI); ctx.fill();' +
'    ctx.globalAlpha = 1; return;' +
'  }' +
'  var innerDxW = innerHalfThick * cosV, innerDyW = innerHalfThick * sinV;' +
'  var outerDxW = outerHalfThick * cosV, outerDyW = outerHalfThick * sinV;' +
'  var a = inner, b = outer;' +
'  if (style === 2 || style === 4) {' +
'    var innerEx = innerHalfThick * sinV, innerEy = innerHalfThick * cosV;' +
'    var outerEx = outerHalfThick * sinV, outerEy = outerHalfThick * cosV;' +
'    a = { x: inner.x - innerEx, y: inner.y + innerEy }; b = { x: outer.x + outerEx, y: outer.y - outerEy };' +
'  }' +
'  ctx.beginPath();' +
'  ctx.moveTo(a.x - innerDxW, a.y - innerDyW); ctx.lineTo(a.x + innerDxW, a.y + innerDyW);' +
'  ctx.lineTo(b.x + outerDxW, b.y + outerDyW); ctx.lineTo(b.x - outerDxW, b.y - outerDyW); ctx.closePath();' +
'  ctx.fill();' +
'  if (style === 0) {' +
'    ctx.beginPath(); ctx.arc(inner.x, inner.y, innerHalfThick, 0, 2 * Math.PI); ctx.fill();' +
'    ctx.beginPath(); ctx.arc(outer.x, outer.y, outerHalfThick, 0, 2 * Math.PI); ctx.fill();' +
'  }' +
'  ctx.globalAlpha = 1;' +
'}' +
'function drawMarkerRing(ctx, cx, cy, w, h, cfg, marks, skipStep, colors) {' +
'  if (!cfg || !cfg.thickness) return;' +
'  var color = resolveHandPreviewColor(String(cfg.color), colors) || colors.text;' +
'  var innerPct = cfg.innerBorderPct, outerPct = Math.max(cfg.innerBorderPct, cfg.outerBorderPct);' +
'  var outerHalfThick = Math.max(0.5, cfg.thickness / 2);' +
'  var innerHalfThick = cfg.style === 4 ? Math.max(0.5, (cfg.innerThickness || 0) / 2) : outerHalfThick;' +
'  for (var i = 0; i < marks; i++) {' +
'    if (skipStep > 0 && i % skipStep === 0) continue;' +
'    var angle = i * 2 * Math.PI / marks;' +
'    var outer = pointOnRing(cx, cy, w, h, angle, outerPct, cfg.outerEccentricity);' +
'    var inner = pointOnRing(cx, cy, w, h, angle, innerPct, cfg.innerEccentricity);' +
'    drawRingMark(ctx, inner, outer, angle, innerHalfThick, outerHalfThick, cfg.style, color, cfg.translucent);' +
'  }' +
'}' +
'function readCustomMarkerConfig(kind) {' +
'  var p = "custom" + (kind === "hour" ? "Hour" : "Sec");' +
'  function v(f) { var el = document.getElementById(p + f); return el ? el.value : null; }' +
'  return {' +
'    style: parseInt(v("Style"), 10) || 0,' +
'    thickness: parseFloat(v("Thickness")) || 0,' +
'    innerThickness: parseFloat(v("InnerThickness")) || 0,' +
'    innerEccentricity: parseFloat(v("InnerEcc")) || 0,' +
'    outerEccentricity: parseFloat(v("OuterEcc")) || 0,' +
'    innerBorderPct: parseFloat(v("InnerBorder")) || 0,' +
'    outerBorderPct: parseFloat(v("OuterBorder")) || 0,' +
'    translucent: v("Translucent") === "true",' +
'    color: parseInt(v("Color"), 10) || 0' +
'  };' +
'}' +
'function romanNumeral(num) {' +
'  if (num <= 0) return String(num);' +
'  var VALUES = [50, 40, 10, 9, 5, 4, 1], SYMBOLS = ["L", "XL", "X", "IX", "V", "IV", "I"];' +
'  var out = "";' +
'  for (var i = 0; i < VALUES.length && num > 0; i++) { while (num >= VALUES[i]) { out += SYMBOLS[i]; num -= VALUES[i]; } }' +
'  return out;' +
'}' +
'function drawTextMarkers(ctx, cx, cy, w, h, colors) {' +
'  var target = document.getElementById("markerTextTarget").value;' +
'  if (target === "0") return;' +
'  var isHour = target === "1";' +
'  var ring = isHour ? readCustomMarkerConfig("hour") : readCustomMarkerConfig("sec");' +
'  var mask = parseInt(document.getElementById(isHour ? "markerTextHourMask" : "markerTextSecMask").value, 10) || 0;' +
'  if (!mask) return;' +
'  var fontSel = document.getElementById("markerTextFont");' +
'  var opt = fontSel.options[fontSel.selectedIndex];' +
'  var roman = document.getElementById("markerTextRoman").checked;' +
'  var offsetPx = parseFloat(document.getElementById("markerTextOffset").value) || 0;' +
'  var scale = w / BG_W;' +
'  ctx.font = canvasFontFor(opt.getAttribute("data-preview") || "", 14 * scale, fontSel.value);' +
'  ctx.fillStyle = colors.text;' +
'  ctx.textAlign = "center"; ctx.textBaseline = "middle";' +
'  for (var i = 0; i < 12; i++) {' +
'    if (!(mask & (1 << i))) continue;' +
'    var angle = i * 2 * Math.PI / 12;' +
'    var offsetPct = Math.max(0, Math.min(100, ring.innerBorderPct + offsetPx));' +
'    var pos = pointOnRing(cx, cy, w, h, angle, offsetPct, ring.innerEccentricity);' +
'    var label = isHour ? (i === 0 ? 12 : i) : i * 5;' +
'    var text = roman ? (label > 0 ? romanNumeral(label) : "") : String(label);' +
'    ctx.fillText(text, pos.x, pos.y);' +
'  }' +
'}' +

'function drawBigAnalogPreview(ctx, colors, now, showSeconds, w, h, markerImageDrawn) {' +
'  var cx = w / 2, cy = h / 2;' +
'  var scale = w / BG_W;' +
'  var markerStyle = parseInt(document.getElementById("bigAnalogMarkerStyle").value, 10);' +
'  if (!isBitmapMarkerStyleId(markerStyle)) {' +
'    var secCfg = readCustomMarkerConfig("sec"), hourCfg = readCustomMarkerConfig("hour");' +
'    drawMarkerRing(ctx, cx, cy, w, h, secCfg, 60, 5, colors);' +
'    drawMarkerRing(ctx, cx, cy, w, h, hourCfg, 12, 0, colors);' +
'    drawTextMarkers(ctx, cx, cy, w, h, colors);' +
'  } else if (!markerImageDrawn) {' +
'    ctx.font = "10px sans-serif";' +
'    ctx.fillStyle = colors.text;' +
'    ctx.textAlign = "center"; ctx.textBaseline = "middle";' +
'    ctx.fillText("(bitmap markers)", cx, 12);' +
'  }' +

'  var hh = now.getHours() % 12, mm = now.getMinutes(), ss = now.getSeconds();' +
'  var hourAngle = ((hh * 60 + mm) / 720) * 2 * Math.PI;' +
'  var minAngle = (mm / 60) * 2 * Math.PI;' +
'  var secAngle = (ss / 60) * 2 * Math.PI;' +
'  var shadowAngleDeg = parseFloat(document.getElementById("shadowAngle").value) || 0;' +
'  var shadowTranslucentStyle = document.getElementById("shadowTranslucent").value !== "false";' +
'  drawHandFull(ctx, cx, cy, hourAngle, readHandConfig("hour", scale), colors, shadowAngleDeg, shadowTranslucentStyle);' +
'  drawHandFull(ctx, cx, cy, minAngle, readHandConfig("min", scale), colors, shadowAngleDeg, shadowTranslucentStyle);' +
'  if (showSeconds) {' +
'    drawHandFull(ctx, cx, cy, secAngle, readHandConfig("sec", scale), colors, shadowAngleDeg, shadowTranslucentStyle);' +
'  }' +

'  var ccRadius = (parseFloat(document.getElementById("centerCircleRadius").value) || 0) * scale;' +
'  if (ccRadius > 0) {' +
'    var ccColor = resolveHandPreviewColor(document.getElementById("centerCircleColor").value, colors) || colors.text;' +
'    ctx.fillStyle = ccColor;' +
'    ctx.beginPath(); ctx.arc(cx, cy, ccRadius, 0, 2 * Math.PI); ctx.fill();' +
'  }' +
'}' +

'var PREVIEW_IMAGE_CACHE = {};' +
'function getCachedImage(src) {' +
'  var img = PREVIEW_IMAGE_CACHE[src];' +
'  if (!img) {' +
'    img = new Image();' +
'    img.onload = function () { updatePreview(); };' +
'    img.src = src;' +
'    PREVIEW_IMAGE_CACHE[src] = img;' +
'  }' +
'  return img;' +
'}' +
'function updatePreview() {' +
'  if (typeof CURRENT_SLOT_KEY !== "undefined" && CURRENT_SLOT_KEY && typeof renderSlotEditPreview === "function") { try { renderSlotEditPreview(); } catch (e) {} }' +
'  var canvas = document.getElementById("previewCanvas");' +
'  if (!canvas || !canvas.getContext) return;' +
'  var ctx = canvas.getContext("2d");' +
'  var w = canvas.width, h = canvas.height;' +
'  ctx.clearRect(0, 0, w, h);' +

'  var now = new Date();' +
'  var nightActive = document.getElementById("nightEnabled").checked && isNightNowApprox();' +
'  var colors = nightActive ? nightColors() : dayColors();' +
'  var secondsBox = document.getElementById("showSeconds");' +
'  var showSeconds = secondsBox.checked && !secondsBox.disabled;' +

'  ctx.fillStyle = colors.bg;' +
'  ctx.fillRect(0, 0, w, h);' +
'  drawCustomBackgroundPreview(ctx, w, h);' +
'  drawWeatherBorderPreview(ctx, w, h);' +
'  var markerStyleVal = document.getElementById("bigAnalogMarkerStyle").value;' +
'  var markerStyleInt = parseInt(markerStyleVal, 10);' +
'  var markerTint = colors.text;' +
'  var invEl = document.getElementById("bitmapMarkerInvert");' +
'  if (invEl && invEl.checked) {' +
'    var bgRgb = hexToRgb(colors.bg);' +
'    var bgLum = bgRgb ? (0.3 * bgRgb.r + 0.59 * bgRgb.g + 0.11 * bgRgb.b) : 0;' +
'    markerTint = bgLum > 127 ? "#000000" : "#FFFFFF";' +
'  }' +
'  var markerImageDrawn = isBitmapMarkerStyleId(markerStyleInt) && drawTintedMarkerBitmap(ctx, markerStyleVal, w, h, markerTint);' +
'  drawBigAnalogPreview(ctx, colors, now, showSeconds, w, h, markerImageDrawn);' +
'  drawCornersAndEdges(ctx, w, h, colors, h);' +
'  if (typeof SCREEN_BW !== "undefined" && SCREEN_BW) {' +
'    try {' +
'      var id = ctx.getImageData(0, 0, w, h), d = id.data;' +
'      for (var q = 0; q < d.length; q += 4) {' +
'        var l = 0.299 * d[q] + 0.587 * d[q + 1] + 0.114 * d[q + 2];' +
'        d[q] = d[q + 1] = d[q + 2] = l >= 128 ? 255 : 0; d[q + 3] = 255;' +
'      }' +
'      ctx.putImageData(id, 0, 0);' +
'    } catch (e) {}' +
'  }' +
'}' +
'';
