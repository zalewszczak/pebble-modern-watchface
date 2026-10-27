#!/usr/bin/env python3
"""
Procedural Manhattan skyline renderer for the "weather background" style
resources/weatherbg/manhattan/.

Draws one 200x228 image per weather condition and time of day (20 files):

    <condition>_day.png / <condition>_night.png

conditions (index = the watch's detailed weather class, see weather_wx_now in
watch_data.h): clear_sky, partly_cloudy, overcast, fog, drizzle, rain,
heavy_rain, snow, thunderstorm, sleet.

These are generated stand-ins, not photographs. To use real photos instead,
just overwrite the PNGs (same names, 200x228) and run
`node scripts/generate-weather-backgrounds.js`.

Usage:  python3 scripts/render-manhattan-weatherbg.py [output_dir]
Needs:  Pillow, numpy
"""
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 200, 228
SS = 3                      # supersampling factor
SW, SH = W * SS, H * SS

CONDITIONS = ["clear_sky", "partly_cloudy", "overcast", "fog", "drizzle",
              "rain", "heavy_rain", "snow", "thunderstorm", "sleet"]

# ----------------------------------------------------------------- helpers --

def lerp(a, b, t):
    return a + (b - a) * t

def vgrad(top, bottom, y0=0, y1=None):
    """vertical gradient image (SH,SW,3) float 0..255"""
    y1 = SH if y1 is None else y1
    t = np.clip((np.arange(SH) - y0) / max(1, (y1 - y0)), 0, 1)[:, None, None]
    top = np.array(top, float)[None, None, :]
    bottom = np.array(bottom, float)[None, None, :]
    return np.broadcast_to(top + (bottom - top) * t, (SH, SW, 3)).copy()

def fbm(rng, w, h, octaves=5, base=4, persistence=0.55):
    """smooth value noise 0..1"""
    out = np.zeros((h, w), float)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        n = base * (2 ** o)
        small = rng.random((max(2, n * h // w + 2), n + 2)).astype(np.float32)
        im = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
        out += np.asarray(im, float) / 255.0 * amp
        total += amp
        amp *= persistence
    return out / total

def blend(dst, src, alpha):
    """alpha: (SH,SW) or scalar 0..1"""
    if np.ndim(alpha) == 2:
        alpha = alpha[:, :, None]
    return dst * (1 - alpha) + np.asarray(src, float) * alpha

# -------------------------------------------------------------- scene data --

def build_skyline(rng):
    """Returns list of buildings: dict(x0,x1,top,layer,kind,seed) in 0..1 coords.
    layer 0 = far, 1 = mid, 2 = near."""
    b = []
    def block(layer, x0, x1, top, kind="box", tiers=None):
        b.append(dict(layer=layer, x0=x0, x1=x1, top=top, kind=kind, tiers=tiers))
    # far layer: many low-contrast blocks
    x = -0.02
    while x < 1.02:
        w = rng.uniform(0.03, 0.07)
        block(0, x, x + w, rng.uniform(0.40, 0.56))
        x += w * rng.uniform(0.7, 1.0)
    # mid layer
    x = -0.02
    while x < 1.02:
        w = rng.uniform(0.04, 0.09)
        block(1, x, x + w, rng.uniform(0.46, 0.64), tiers=rng.integers(0, 3))
        x += w * rng.uniform(0.8, 1.05)
    # near layer: lower, wider blocks along the waterfront
    x = -0.03
    while x < 1.03:
        w = rng.uniform(0.05, 0.11)
        block(2, x, x + w, rng.uniform(0.62, 0.72), tiers=rng.integers(0, 2))
        x += w * rng.uniform(0.85, 1.05)
    # landmarks (layer 1, drawn on top of the mid layer)
    b.append(dict(layer=1, x0=0.585, x1=0.695, top=0.55, kind="empire", tiers=None))
    b.append(dict(layer=1, x0=0.135, x1=0.235, top=0.30, kind="wtc", tiers=None))
    b.append(dict(layer=1, x0=0.40, x1=0.465, top=0.42, kind="chrysler", tiers=None))
    b.append(dict(layer=1, x0=0.78, x1=0.84, top=0.47, kind="slab", tiers=None))
    b.append(dict(layer=1, x0=0.04, x1=0.10, top=0.45, kind="slab", tiers=None))
    return b

LAYER_Y_BASE = {0: 0.80, 1: 0.80, 2: 0.80}   # all stand on the water line

def draw_buildings(img, rng, skyline, layer, body, edge, win_lit, win_dark, night,
                   lit_prob, snow_cap, haze_col, haze_amt):
    """img: float array (SH,SW,3) modified in place. Draws every building of `layer`."""
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(pil)
    waterline = int(LAYER_Y_BASE[layer] * SH)
    body_c = tuple(int(c) for c in lerp(np.array(body, float), np.array(haze_col, float), haze_amt))
    edge_c = tuple(int(c) for c in lerp(np.array(edge, float), np.array(haze_col, float), haze_amt))
    cell = {0: 4, 1: 5, 2: 7}[layer]
    win_dark = tuple(int(c) for c in win_dark)
    win_lit = [tuple(int(c) for c in w) for w in win_lit]
    for bd in [q for q in skyline if q["layer"] == layer]:
        x0, x1 = int(bd["x0"] * SW), int(bd["x1"] * SW)
        top = int(bd["top"] * SH)
        kind = bd["kind"]
        shapes = []     # list of (x0,x1,y0) rectangles standing on the waterline
        spire = None
        if kind == "empire":
            cx = (x0 + x1) // 2
            wbase = x1 - x0
            shapes = [(x0, x1, int(top + 0.17 * SH)),
                      (x0 + int(wbase * .14), x1 - int(wbase * .14), int(top + 0.11 * SH)),
                      (x0 + int(wbase * .27), x1 - int(wbase * .27), int(top + 0.065 * SH)),
                      (cx - int(wbase * .17), cx + int(wbase * .17), int(top + 0.025 * SH)),
                      (cx - int(wbase * .10), cx + int(wbase * .10), top)]
            spire = (cx, top, top - int(0.085 * SH), 3)
        elif kind == "wtc":
            cx = (x0 + x1) // 2
            wbase = x1 - x0
            shapes = [(x0, x1, top + int(0.02 * SH))]
            spire = (cx, top + int(0.02 * SH), top - int(0.10 * SH), 4)  # body is a tapered polygon, drawn below
        elif kind == "chrysler":
            cx = (x0 + x1) // 2
            wbase = x1 - x0
            shapes = [(x0, x1, int(top + 0.10 * SH)),
                      (x0 + int(wbase * .12), x1 - int(wbase * .12), int(top + 0.055 * SH))]
        elif kind == "slab":
            shapes = [(x0, x1, top)]
        else:
            shapes = [(x0, x1, top)]
            if bd.get("tiers"):
                n = int(bd["tiers"])
                for t in range(n):
                    inset = int((x1 - x0) * (0.18 + 0.1 * t))
                    shapes.append((x0 + inset, x1 - inset, top - int((0.02 + 0.02 * t) * SH)))
        for (sx0, sx1, sy0) in shapes:
            d.rectangle([sx0, sy0, sx1, waterline], fill=body_c)
            d.line([sx0, sy0, sx0, waterline], fill=edge_c, width=SS)
        if kind == "wtc":
            cx = (x0 + x1) // 2
            wbase = x1 - x0
            poly = [(x0, waterline), (x1, waterline), (x1 - int(wbase * .22), top + int(0.02 * SH)),
                    (x0 + int(wbase * .22), top + int(0.02 * SH))]
            d.polygon(poly, fill=body_c)
            d.line([(x0, waterline), (x0 + int(wbase * .22), top + int(0.02 * SH))], fill=edge_c, width=SS)
        if kind == "chrysler":
            cx = (x0 + x1) // 2
            wbase = x1 - x0
            # stepped sunburst crown
            base_y = top + int(0.055 * SH)
            for k, hw in enumerate([0.36, 0.28, 0.20, 0.12]):
                yy = base_y - int(k * 0.016 * SH)
                d.rectangle([cx - int(wbase * hw), yy - int(0.016 * SH), cx + int(wbase * hw), yy], fill=body_c)
                d.ellipse([cx - int(wbase * hw), yy - int(0.030 * SH), cx + int(wbase * hw), yy], fill=body_c)
            spire = (cx, base_y - int(0.07 * SH), top - int(0.03 * SH), 2)
        if spire:
            sx, sy0, sy1, sw = spire
            d.line([(sx, sy0), (sx, sy1)], fill=body_c, width=sw)
        # windows
        for (sx0, sx1, sy0) in shapes + ([(x0 + int((x1 - x0) * .22), x1 - int((x1 - x0) * .22), top + int(0.02 * SH))] if kind == "wtc" else []):
            if layer == 0 and not night:
                continue
            gx = max(cell, cell)
            for wy in range(sy0 + cell * 2, waterline - cell, cell * 2):
                for wx in range(sx0 + cell, sx1 - cell, cell * 2):
                    if night:
                        if rng.random() < lit_prob:
                            col = win_lit[int(rng.integers(0, len(win_lit)))]
                            d.rectangle([wx, wy, wx + cell - 2, wy + cell - 2], fill=col)
                    else:
                        if rng.random() < 0.55:
                            d.rectangle([wx, wy, wx + cell - 2, wy + cell - 2], fill=win_dark)
        if snow_cap:
            for (sx0, sx1, sy0) in shapes:
                d.rectangle([sx0, sy0 - SS, sx1, sy0 + SS], fill=(235, 240, 248))
    img[:] = np.asarray(pil, float)

def draw_stars(img, rng, density, alpha=1.0):
    n = int(density)
    ys = (rng.random(n) ** 1.6 * SH * 0.55).astype(int)
    xs = (rng.random(n) * SW).astype(int)
    br = rng.random(n)
    for x, y, b in zip(xs, ys, br):
        v = 150 + 105 * b
        img[y:y + SS, x:x + SS] = np.maximum(img[y:y + SS, x:x + SS], v * alpha)

def draw_disc(img, cx, cy, r, color, glow_r, glow_col, glow_amt):
    yy, xx = np.mgrid[0:SH, 0:SW]
    dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    g = np.clip(1 - dist / glow_r, 0, 1) ** 2 * glow_amt
    img[:] = blend(img, glow_col, g)
    a = np.clip((r - dist) / (1.5 * SS) + 0.5, 0, 1)
    img[:] = blend(img, color, a)

def clouds(img, rng, coverage, col_lit, col_dark, y_max=0.62, softness=0.12, sharp=1.0):
    n = fbm(rng, SW, SH, octaves=6, base=3)
    ygrad = np.clip(1 - (np.arange(SH) / (SH * y_max)), 0, 1)[:, None] ** 0.6
    field = n * (0.55 + 0.45 * ygrad)
    thr = 1.0 - coverage
    a = np.clip((field - thr) / softness, 0, 1) ** sharp
    shade = np.clip(fbm(rng, SW, SH, octaves=4, base=5) * 1.4 - 0.2, 0, 1)
    col = np.array(col_lit, float)[None, None, :] * (1 - shade[:, :, None]) + np.array(col_dark, float)[None, None, :] * shade[:, :, None]
    img[:] = blend(img, col, a)
    return a

def rain_layer(img, rng, count, length, slant, color, alpha, width=1):
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")
    over = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    for _ in range(count):
        x = rng.random() * (SW + 200) - 100
        y = rng.random() * SH
        L = length * rng.uniform(0.6, 1.3)
        d.line([(x, y), (x - slant * L, y + L)], fill=color + (int(255 * alpha * rng.uniform(0.5, 1)),), width=width * SS // 2 or 1)
    pil = Image.alpha_composite(pil, over).convert("RGB")
    img[:] = np.asarray(pil, float)

def snow_layer(img, rng, count, color=(255, 255, 255)):
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")
    over = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    for _ in range(count):
        x, y = rng.random() * SW, rng.random() * SH
        r = rng.choice([1.2, 1.6, 2.2, 3.0]) * SS * 0.5
        a = int(rng.uniform(140, 255))
        d.ellipse([x - r, y - r, x + r, y + r], fill=color + (a,))
    pil = Image.alpha_composite(pil, over).convert("RGB")
    img[:] = np.asarray(pil, float)

def lightning(img, rng, night):
    pil = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).convert("RGBA")
    glow = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    x, y = SW * rng.uniform(0.35, 0.7), 0
    pts = [(x, y)]
    while y < SH * 0.62:
        y += rng.uniform(0.03, 0.07) * SH
        x += rng.uniform(-0.06, 0.06) * SW
        pts.append((x, y))
    d.line(pts, fill=(200, 215, 255, 255), width=SS * 6)
    glow = glow.filter(ImageFilter.GaussianBlur(SS * 6))
    core = Image.new("RGBA", pil.size, (0, 0, 0, 0))
    ImageDraw.Draw(core).line(pts, fill=(255, 255, 255, 255), width=SS * 2)
    pil = Image.alpha_composite(pil, glow)
    pil = Image.alpha_composite(pil, core).convert("RGB")
    img[:] = np.asarray(pil, float)

def water(img, rng, sky_col_top, sky_col_bottom, night, skyline_snapshot, wet, ripple):
    wl = int(0.80 * SH)
    h = SH - wl
    # reflection: mirrored picture above the waterline, darkened & blurred
    refl = skyline_snapshot[wl - h:wl][::-1].copy()
    refl_img = Image.fromarray(np.clip(refl, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SS * 1.2))
    refl = np.asarray(refl_img, float)
    base = vgrad(sky_col_bottom, tuple(np.array(sky_col_top) * 0.5), 0, h)[:h, :1, :] if False else None
    # horizontal ripple displacement
    n = fbm(rng, SW, h, octaves=4, base=14)
    shift = ((n - 0.5) * 2 * ripple * SS).astype(int)
    out = np.empty_like(refl)
    xs = np.arange(SW)
    for yy in range(h):
        out[yy] = refl[yy, np.clip(xs + shift[yy], 0, SW - 1)]
    t = np.linspace(0.0, 1.0, h)[:, None, None]
    tint = np.array(sky_col_bottom, float)[None, None, :] * 0.55 + np.array([10, 25, 45], float)[None, None, :] * 0.45
    mix = 0.22 + 0.40 * t * wet
    out = out * (1 - mix) * 0.9 + tint * mix
    # sparkle bands
    band = (np.sin(np.arange(h)[:, None] * 0.5 + n * 12) > 0.93).astype(float)[:, :, None] * (0.35 if not night else 0.18)
    out = np.clip(out + band * 60, 0, 255)
    img[wl:] = out

# --------------------------------------------------------------- the scene --

PALETTES = {
    # sky top, sky horizon, building body, edge, haze colour
    "day_clear":   dict(top=(70, 140, 225), hor=(185, 220, 245), body=(70, 82, 100), edge=(110, 122, 140), haze=(185, 215, 240)),
    "day_part":    dict(top=(85, 150, 225), hor=(190, 220, 240), body=(70, 82, 100), edge=(112, 124, 140), haze=(190, 215, 235)),
    "day_over":    dict(top=(150, 158, 168), hor=(195, 200, 205), body=(78, 86, 98), edge=(112, 118, 128), haze=(185, 190, 196)),
    "day_fog":     dict(top=(195, 200, 205), hor=(215, 218, 220), body=(100, 108, 118), edge=(130, 136, 144), haze=(210, 213, 216)),
    "day_drizzle": dict(top=(135, 145, 156), hor=(178, 186, 192), body=(70, 80, 92), edge=(100, 110, 120), haze=(170, 178, 186)),
    "day_rain":    dict(top=(112, 124, 138), hor=(160, 170, 178), body=(48, 58, 70), edge=(84, 94, 104), haze=(128, 138, 148)),
    "day_heavy":   dict(top=(70, 78, 92), hor=(122, 130, 140), body=(30, 36, 46), edge=(64, 72, 82), haze=(86, 94, 104)),
    "day_snow":    dict(top=(188, 196, 206), hor=(222, 226, 232), body=(92, 100, 112), edge=(128, 134, 144), haze=(214, 218, 224)),
    "day_storm":   dict(top=(44, 48, 62), hor=(104, 110, 124), body=(22, 26, 36), edge=(50, 56, 68), haze=(70, 76, 90)),
    "day_sleet":   dict(top=(130, 142, 156), hor=(176, 186, 196), body=(64, 76, 90), edge=(96, 106, 118), haze=(168, 178, 188)),
    "night_clear": dict(top=(6, 12, 38), hor=(40, 52, 96), body=(14, 18, 30), edge=(30, 38, 58), haze=(34, 46, 86)),
    "night_part":  dict(top=(8, 14, 40), hor=(48, 58, 98), body=(14, 18, 30), edge=(30, 38, 58), haze=(40, 50, 88)),
    "night_over":  dict(top=(28, 32, 44), hor=(62, 66, 80), body=(16, 20, 30), edge=(34, 40, 54), haze=(54, 58, 72)),
    "night_fog":   dict(top=(48, 52, 64), hor=(80, 84, 96), body=(24, 28, 38), edge=(44, 48, 60), haze=(74, 78, 90)),
    "night_drizzle": dict(top=(24, 28, 40), hor=(56, 60, 74), body=(14, 18, 28), edge=(30, 36, 48), haze=(48, 52, 66)),
    "night_rain":  dict(top=(16, 20, 32), hor=(44, 50, 64), body=(12, 16, 26), edge=(26, 32, 44), haze=(38, 44, 58)),
    "night_heavy": dict(top=(10, 12, 22), hor=(32, 36, 48), body=(8, 10, 18), edge=(20, 24, 34), haze=(28, 32, 44)),
    "night_snow":  dict(top=(40, 46, 66), hor=(96, 100, 120), body=(24, 28, 40), edge=(60, 66, 84), haze=(84, 90, 110)),
    "night_storm": dict(top=(8, 10, 20), hor=(28, 32, 46), body=(8, 10, 18), edge=(20, 24, 34), haze=(24, 28, 42)),
    "night_sleet": dict(top=(22, 28, 42), hor=(58, 64, 80), body=(14, 18, 28), edge=(32, 38, 52), haze=(50, 56, 72)),
}
KEY = {"clear_sky": "clear", "partly_cloudy": "part", "overcast": "over", "fog": "fog",
       "drizzle": "drizzle", "rain": "rain", "heavy_rain": "heavy", "snow": "snow",
       "thunderstorm": "storm", "sleet": "sleet"}

HAZE = {  # how much the far/mid/near layers dissolve into the haze colour
    "clear_sky": (0.50, 0.22, 0.04), "partly_cloudy": (0.50, 0.22, 0.04), "overcast": (0.52, 0.26, 0.06),
    "fog": (0.93, 0.78, 0.42), "drizzle": (0.54, 0.30, 0.08), "rain": (0.52, 0.28, 0.08),
    "heavy_rain": (0.40, 0.20, 0.04), "snow": (0.62, 0.36, 0.10), "thunderstorm": (0.36, 0.16, 0.02),
    "sleet": (0.54, 0.30, 0.08),
}

def render(cond, night, seed):
    rng = np.random.default_rng(seed)
    pal = PALETTES[("night_" if night else "day_") + KEY[cond]]
    sk = build_skyline(np.random.default_rng(7))      # same skyline for every image
    img = vgrad(pal["top"], pal["hor"], 0, int(SH * 0.80))

    # -- celestial bodies and clouds
    sun_visible = cond in ("clear_sky", "partly_cloudy")
    if night:
        if cond in ("clear_sky", "partly_cloudy"):
            draw_stars(img, rng, 260 if cond == "clear_sky" else 150)
            draw_disc(img, SW * 0.78, SH * 0.17, 13 * SS, (245, 245, 225), 90 * SS, (120, 140, 200), 0.45)
        elif cond in ("overcast", "drizzle", "snow", "sleet", "fog"):
            draw_disc(img, SW * 0.78, SH * 0.17, 12 * SS, (200, 205, 215), 80 * SS, (120, 130, 160), 0.20 if cond != "fog" else 0.10)
    else:
        if sun_visible:
            draw_disc(img, SW * 0.80, SH * 0.20, 11 * SS, (255, 250, 220), 120 * SS, (255, 240, 190), 0.65)
    cov = {"clear_sky": 0.0, "partly_cloudy": 0.42, "overcast": 1.0, "fog": 0.0, "drizzle": 0.95,
           "rain": 1.0, "heavy_rain": 1.0, "snow": 0.95, "thunderstorm": 1.0, "sleet": 0.95}[cond]
    if cov > 0:
        if night:
            lit, dark = tuple(np.array(pal["hor"]) * 1.25), tuple(np.array(pal["top"]) * 0.9)
        else:
            lit, dark = {
                "partly_cloudy": ((255, 255, 255), (170, 185, 205)),
                "overcast": ((200, 205, 210), (140, 146, 156)),
                "drizzle": ((178, 186, 194), (120, 128, 140)),
                "rain": ((140, 150, 160), (92, 100, 112)),
                "heavy_rain": ((100, 108, 120), (56, 62, 74)),
                "snow": ((226, 230, 238), (176, 184, 198)),
                "thunderstorm": ((78, 84, 96), (30, 34, 44)),
                "sleet": ((170, 180, 192), (116, 126, 140)),
            }[cond]
        sharp = 1.0 if cond != "partly_cloudy" else 0.7
        a = clouds(img, rng, cov, lit, dark, y_max=0.78 if cond != "partly_cloudy" else 0.6,
                   softness=0.10 if cond == "partly_cloudy" else 0.35, sharp=sharp)
    if cond == "thunderstorm":
        if rng.random() < 2:  # always
            lightning(img, rng, night)

    # -- skyline layers (hazier with distance)
    haze_amt = HAZE[cond]
    lit_cols = [(255, 214, 128), (255, 232, 170), (255, 196, 96), (200, 220, 255)]
    lit_prob = 0.30 if night else 0
    if cond in ("fog",):
        lit_prob *= 0.7
    snow_cap = cond == "snow"
    for layer in (0, 1, 2):
        body = tuple(np.array(pal["body"], float) * (1.15 if layer == 0 else (1.0 if layer == 1 else 0.82)))
        draw_buildings(img, rng, sk, layer, body, pal["edge"], lit_cols, tuple(np.array(pal["body"]) * 0.78),
                       night, lit_prob, snow_cap, pal["haze"], haze_amt[layer])
        if layer == 0:
            # soft glow behind the nearer layers
            pass

    # horizon haze band
    hz = np.exp(-(((np.arange(SH) - SH * 0.74) / (SH * 0.12)) ** 2))[:, None, None]
    img = blend(img, pal["haze"], hz[:, :, 0] * (0.16 if cond != "fog" else 0.60))
    if cond == "fog":
        n = fbm(rng, SW, SH, octaves=4, base=2)
        img = blend(img, pal["haze"], np.clip(0.30 + n * 0.45, 0, 1) * 0.65)

    # -- water with reflection
    snapshot = img.copy()
    wet = {"rain": 1.0, "heavy_rain": 1.0, "thunderstorm": 1.0, "drizzle": 0.9}.get(cond, 0.7)
    ripple = {"heavy_rain": 7, "thunderstorm": 7, "rain": 5, "drizzle": 4}.get(cond, 3)
    water(img, rng, pal["top"], pal["hor"], night, snapshot, wet, ripple)
    # night: city light streaks on the water
    if night:
        wl = int(0.80 * SH)
        for _ in range(60):
            x = int(rng.random() * SW)
            y0 = wl + int(rng.random() * (SH - wl) * 0.9)
            L = int(rng.uniform(3, 14) * SS)
            col = lit_cols[int(rng.integers(0, 3))]
            a = 0.35 if cond not in ("fog",) else 0.2
            img[y0:y0 + SS, x:x + L] = img[y0:y0 + SS, x:x + L] * (1 - a) + np.array(col, float) * a
    if cond == "snow":
        wl = int(0.80 * SH)
        # snowy bank along the waterline
        n = fbm(rng, SW, 40, octaves=3, base=8)
        bank_top = wl - 1 * SS - (n[20] * 3 * SS).astype(int)
        for x in range(SW):
            y0 = int(bank_top[x])
            img[y0:wl + 1 * SS, x] = img[y0:wl + 1 * SS, x] * 0.25 + np.array((236, 240, 247), float) * 0.75

    # -- precipitation (over everything)
    if cond == "drizzle":
        rain_layer(img, rng, 520, 9 * SS, 0.18, (205, 215, 225), 0.55)
    elif cond == "rain":
        rain_layer(img, rng, 420, 22 * SS, 0.25, (210, 222, 235), 0.45)
    elif cond == "heavy_rain":
        rain_layer(img, rng, 1000, 30 * SS, 0.32, (205, 218, 235), 0.42)
    elif cond == "thunderstorm":
        rain_layer(img, rng, 800, 28 * SS, 0.34, (190, 205, 228), 0.40)
    elif cond == "snow":
        snow_layer(img, rng, 520)
    elif cond == "sleet":
        rain_layer(img, rng, 420, 14 * SS, 0.30, (205, 220, 238), 0.55)
        snow_layer(img, rng, 130, (230, 238, 250))

    # -- finishing: slight vignette so the watch's own text stays readable
    yy, xx = np.mgrid[0:SH, 0:SW]
    v = 1 - 0.18 * (((xx - SW / 2) / (SW / 2)) ** 2 + ((yy - SH / 2) / (SH / 2)) ** 2) / 2
    img = img * v[:, :, None]
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)
    return out

def pebble_quantize(im):
    """64-colour Pebble palette (2 bits per channel) with Floyd-Steinberg dithering."""
    levels = [0, 85, 170, 255]
    pal = []
    for r in levels:
        for g in levels:
            for b in levels:
                pal += [r, g, b]
    pal += [0] * (768 - len(pal))
    p = Image.new("P", (1, 1))
    p.putpalette(pal)
    q = im.convert("RGB").quantize(palette=p, dither=Image.FLOYDSTEINBERG)
    return q

def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "resources", "weatherbg", "manhattan")
    os.makedirs(out_dir, exist_ok=True)
    seed = 100
    for cond in CONDITIONS:
        for night in (False, True):
            seed += 1
            im = render(cond, night, seed)
            q = pebble_quantize(im)
            name = "%s_%s.png" % (cond, "night" if night else "day")
            path = os.path.join(out_dir, name)
            q.save(path, optimize=True)
            print("%-28s %6d bytes" % (name, os.path.getsize(path)))

if __name__ == "__main__":
    main()
