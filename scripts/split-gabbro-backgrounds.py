#!/usr/bin/env python3
"""Cut the round (gabbro) background pictures into horizontal bands.

gabbro cannot decode a whole 260 x 260 PNG at once ("PNG memory allocation failed"), so every
picture under resources/round/backgrounds/ and resources/round/weatherbg/<style>/ is split in two
(top / bottom half). Bands go next to the original, in a "halves" sub-folder:

    resources/round/backgrounds/3.png
    resources/round/backgrounds/halves/3_h0.png   (top)
    resources/round/backgrounds/halves/3_h1.png   (bottom)

The resource generators (generate-backgrounds.js, generate-weather-backgrounds.js) use the bands
automatically when BOTH exist for a picture (as <NAME>_P0 / <NAME>_P1); the full PNG is still used
for the settings page and as fallback. The watch decodes, draws and frees one band at a time.
Palette (indexed) PNGs stay palette PNGs, so the colour count is unchanged.

Needs Pillow.  Usage:  python3 scripts/split-gabbro-backgrounds.py [--force]
Re-run after changing a round picture, then `node scripts/generate-all.js`.
"""
import os
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
ROUND = os.path.join(ROOT, "resources", "round")
PARTS = 2  # keep in sync with ROUND_PARTS in scripts/lib/resources.js
force = "--force" in sys.argv


def sources():
    for sub in ("backgrounds", "weatherbg"):
        for d, dirs, files in os.walk(os.path.join(ROUND, sub)):
            dirs[:] = [x for x in dirs if x != "halves"]
            for f in sorted(files):
                if f.lower().endswith(".png"):
                    yield os.path.join(d, f)


done = skipped = 0
for src in sources():
    base = os.path.splitext(os.path.basename(src))[0]
    out_dir = os.path.join(os.path.dirname(src), "halves")
    outs = [os.path.join(out_dir, "%s_h%d.png" % (base, i)) for i in range(PARTS)]
    if not force and all(os.path.exists(o) and os.path.getmtime(o) >= os.path.getmtime(src) for o in outs):
        skipped += 1
        continue
    im = Image.open(src)
    im.load()
    w, h = im.size
    cut = (h + PARTS - 1) // PARTS  # equal bands, the last one at most a row shorter
    os.makedirs(out_dir, exist_ok=True)
    for i, o in enumerate(outs):
        band = im.crop((0, i * cut, w, min(h, (i + 1) * cut)))  # crop keeps the palette
        band.save(o, optimize=True)
    print("split %s (%dx%d, %s) -> %d bands of %d rows" % (os.path.relpath(src, ROOT), w, h, im.mode, PARTS, cut))
    done += 1

print("done: %d split, %d up to date" % (done, skipped))
