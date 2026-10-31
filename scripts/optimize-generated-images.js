#!/usr/bin/env node
// Shrinks the images the settings page carries as base64 data: URIs.
//
// Every scripts/generate-*.js bakes its source PNGs into src/pkjs/data/generated/*.js
// as "data:image/png;base64,...". Those strings end up inside pebble-js-app.js
// (and so inside the .pbw) and are about a third of all the JS. This script runs
// AFTER the generators (generate-all.js calls it last) and rewrites each PNG data
// URI in those files as a LOSSLESS WebP data URI whenever that is smaller.
//
// Why lossless WebP and not JPEG / lossy WebP / AVIF / JPEG XL:
//   * The pictures are 64-colour (Pebble palette), dithered pixel art, flat-colour
//     UI diagrams and 1-bit masks. Lossy codecs smear the dither and ring around
//     edges: measured on this project's own images, lossy WebP q80 came out LARGER
//     than the PNG for the backgrounds (dither is noise to a DCT codec), and JPEG
//     has no alpha at all. Lossless WebP is 13% (dithered backgrounds) to 80%
//     (diagrams, masks, icons) smaller than the PNG with every pixel identical.
//   * Transparency is exact. The settings preview recolours marker / clock-font
//     bitmaps by "alpha > 0" (getImageData), so alpha must survive untouched.
//   * Every WebView the Pebble app can open the page in decodes WebP with alpha
//     (Android WebView / Chrome, iOS 14+). JPEG XL is not decoded by Chromium-based
//     Android WebView, so a JXL page would show blank previews there.
//
// Safety: each replacement is decoded again and compared with the original: alpha
// must be identical everywhere, and RGB identical wherever alpha > 0 (RGB under
// fully transparent pixels is invisible and is what WebP discards). If anything
// differs, or WebP is not at least MIN_GAIN smaller, the PNG is kept.
//
// Idempotent: only "data:image/png" URIs are touched, so re-running does nothing.
// Needs `sharp` (already used by generate-infographics.js and friends).
//
// Usage (from the project root):
//   node scripts/optimize-generated-images.js            # rewrite in place
//   node scripts/optimize-generated-images.js --dry-run  # only report

var fs = require('fs');
var path = require('path');

var sharp;
try { sharp = require('sharp'); } catch (e) {
  console.error('optimize-generated-images: the "sharp" package is needed (npm install sharp). Left everything as PNG.');
  process.exit(1);
}

var DIR = path.join(__dirname, '..', 'src', 'pkjs', 'data', 'generated');
var DRY = process.argv.indexOf('--dry-run') >= 0;
var MIN_GAIN = 0.03; // keep the PNG unless WebP is at least 3% smaller
var RE = /data:image\/png;base64,([A-Za-z0-9+\/=]+)/g;

function rawRgba(buf) {
  return sharp(buf).ensureAlpha().raw().toBuffer();
}

// Same picture as far as any viewer or canvas can tell?
function samePicture(a, b) {
  if (a.length !== b.length) return false;
  for (var i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3]) return false;
    if (a[i + 3] !== 0 && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) return false;
  }
  return true;
}

async function convert(pngB64) {
  var png = Buffer.from(pngB64, 'base64');
  var webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  if (webp.length > png.length * (1 - MIN_GAIN)) return null;
  var a = await rawRgba(png), b = await rawRgba(webp);
  if (!samePicture(a, b)) return null;
  return webp;
}

(async function main() {
  var files = fs.readdirSync(DIR).filter(function (f) { return /\.js$/.test(f); }).sort();
  var grandBefore = 0, grandAfter = 0, kept = 0;
  for (var fi = 0; fi < files.length; fi++) {
    var file = path.join(DIR, files[fi]);
    var text = fs.readFileSync(file, 'utf8');
    var matches = [];
    var m;
    RE.lastIndex = 0;
    while ((m = RE.exec(text))) matches.push({ start: m.index, end: m.index + m[0].length, b64: m[1] });
    if (!matches.length) continue;

    var out = '', pos = 0, before = 0, after = 0, converted = 0;
    for (var i = 0; i < matches.length; i++) {
      var mt = matches[i];
      out += text.slice(pos, mt.start);
      var uri = text.slice(mt.start, mt.end);
      var webp = await convert(mt.b64);
      var next = webp ? 'data:image/webp;base64,' + webp.toString('base64') : uri;
      if (webp) converted++; else kept++;
      before += uri.length; after += next.length;
      out += next;
      pos = mt.end;
    }
    out += text.slice(pos);
    grandBefore += before; grandAfter += after;
    console.log('  ' + files[fi] + ': ' + converted + '/' + matches.length + ' -> WebP, ' + before + ' -> ' + after + ' chars (' +
      Math.round(100 * (1 - after / before)) + '% smaller)');
    if (!DRY && out !== text) fs.writeFileSync(file, out);
  }
  if (!grandBefore) { console.log('optimize-generated-images: no PNG data URIs left to convert.'); return; }
  console.log('optimize-generated-images: ' + grandBefore + ' -> ' + grandAfter + ' chars (' +
    Math.round(100 * (1 - grandAfter / grandBefore)) + '% smaller), ' + kept + ' image(s) kept as PNG' + (DRY ? ' [dry run, nothing written]' : ''));
})().catch(function (e) { console.error(e); process.exit(1); });
