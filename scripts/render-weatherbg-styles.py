#!/usr/bin/env python3
"""
Procedural renderers for three more "weather background" styles
(resources/weatherbg/<style>/<condition>_<day|night>.png, 200x228, 64 colours):

    alps_chalet          realistic-looking alpine chalet in front of a mountain lake
    comic_isometric_town comic-style isometric town
    baroque_beach        beach with ships, in the manner of a 17th-century (Dutch) seascape painting

Every moon in these sets is a thin crescent (80 % in shadow).
Generated stand-ins, not photographs or paintings: overwrite the PNGs with real
artwork of the same names if you have it, then run scripts/generate-weather-backgrounds.js.

Usage:  python3 scripts/render-weatherbg-styles.py [style ...]      (default: all three)
Needs:  Pillow, numpy (and render-manhattan-weatherbg.py next to this file)
"""
import sys, os, math, importlib.util
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("manh", os.path.join(HERE, "render-manhattan-weatherbg.py"))
M = importlib.util.module_from_spec(spec); spec.loader.exec_module(M)
W, H, SS, SW, SH = M.W, M.H, M.SS, M.SW, M.SH
CONDITIONS = M.CONDITIONS
lerp, vgrad, blend, fbm = M.lerp, M.vgrad, M.blend, M.fbm

# ---------------------------------------------------------------- shared --

DARK = {"clear_sky": 1.0, "partly_cloudy": 1.0, "overcast": 0.86, "fog": 1.0, "drizzle": 0.84,
        "rain": 0.72, "heavy_rain": 0.58, "snow": 0.96, "thunderstorm": 0.48, "sleet": 0.82}
NIGHT_MULT = np.array([0.20, 0.27, 0.44])

class Ctx:
    def __init__(self, cond, night, seed):
        self.cond, self.night = cond, night
        self.rng = np.random.default_rng(seed)
        self.pal = M.PALETTES[("night_" if night else "day_") + M.KEY[cond]]
        self.haze = M.HAZE[cond]
        self.dark = DARK[cond]
    def g(self, col):
        """grade an object colour for weather / night"""
        c = np.array(col, float) * self.dark
        if self.night:
            c = c * NIGHT_MULT * (1.25 if self.cond in ("clear_sky", "partly_cloudy", "snow") else 1.0)
        return tuple(int(v) for v in np.clip(c, 0, 255))
    def mix_haze(self, col, amt):
        return tuple(int(v) for v in lerp(np.array(col, float), np.array(self.pal["haze"], float), amt))

def noise1d(rng, n, octaves=5, base=4, pers=0.55):
    out = np.zeros(n); amp = 1.0; tot = 0.0
    for o in range(octaves):
        k = base * 2 ** o
        pts = rng.random(k + 2)
        out += np.interp(np.linspace(0, k, n), np.arange(k + 2), pts) * amp
        tot += amp; amp *= pers
    return out / tot

def crescent_mask(cx, cy, r, lit=0.20, shadow_angle=math.radians(200)):
    """float mask of a crescent whose lit part is `lit` of the disc (0.20 = 80 % in shadow)."""
    # distance d between the two circle centres giving the wanted lit fraction
    def lit_frac(d):
        if d >= 2 * r: return 1.0
        inter = 2 * r * r * math.acos(d / (2 * r)) - (d / 2) * math.sqrt(4 * r * r - d * d)
        return 1 - inter / (math.pi * r * r)
    lo, hi = 0.0, 2 * r
    for _ in range(40):
        mid = (lo + hi) / 2
        if lit_frac(mid) < lit: lo = mid
        else: hi = mid
    d = (lo + hi) / 2
    bx, by = cx + d * math.cos(shadow_angle), cy + d * math.sin(shadow_angle)
    yy, xx = np.mgrid[0:SH, 0:SW]
    a = np.clip((r - np.hypot(xx - cx, yy - cy)) / (1.5 * SS) + 0.5, 0, 1)
    b = np.clip((r - np.hypot(xx - bx, yy - by)) / (1.5 * SS) + 0.5, 0, 1)
    return np.clip(a - b, 0, 1), a

def draw_moon(img, cx, cy, r, glow=1.0, cover=0.0):
    crescent, disc = crescent_mask(cx, cy, r)
    gl = np.clip(1 - np.hypot(*(np.mgrid[0:SH, 0:SW][::-1] - np.array([cx, cy])[:, None, None])) / (r * 7), 0, 1) ** 2
    img[:] = blend(img, (130, 150, 210), gl * 0.30 * glow * (1 - cover))
    img[:] = blend(img, (70, 80, 120), disc * 0.10 * (1 - cover))           # faint earthshine on the dark part
    img[:] = blend(img, (250, 248, 228), crescent * (1 - cover * 0.85))

def sky_fill(c, horizon=0.8):
    return vgrad(c.pal["top"], c.pal["hor"], 0, int(SH * horizon))

def celestial(img, c, sun_xy=(0.80, 0.18), moon_xy=(0.80, 0.17), sun_r=11, moon_r=12):
    cond, night, rng = c.cond, c.night, c.rng
    if night:
        if cond in ("clear_sky", "partly_cloudy"):
            M.draw_stars(img, rng, 260 if cond == "clear_sky" else 140)
            draw_moon(img, SW * moon_xy[0], SH * moon_xy[1], moon_r * SS)
        elif cond in ("overcast", "drizzle", "snow", "sleet", "fog"):
            draw_moon(img, SW * moon_xy[0], SH * moon_xy[1], moon_r * SS, glow=0.6, cover=0.55)
    elif cond in ("clear_sky", "partly_cloudy"):
        M.draw_disc(img, SW * sun_xy[0], SH * sun_xy[1], sun_r * SS, (255, 250, 220), 120 * SS, (255, 240, 190), 0.65)

CLOUD_COL = {
    "partly_cloudy": ((255, 255, 255), (170, 185, 205)), "overcast": ((200, 205, 210), (140, 146, 156)),
    "drizzle": ((178, 186, 194), (120, 128, 140)), "rain": ((140, 150, 160), (92, 100, 112)),
    "heavy_rain": ((100, 108, 120), (56, 62, 74)), "snow": ((226, 230, 238), (176, 184, 198)),
    "thunderstorm": ((78, 84, 96), (30, 34, 44)), "sleet": ((170, 180, 192), (116, 126, 140))}
CLOUD_COV = {"clear_sky": 0.0, "partly_cloudy": 0.42, "overcast": 1.0, "fog": 0.0, "drizzle": 0.95,
             "rain": 1.0, "heavy_rain": 1.0, "snow": 0.95, "thunderstorm": 1.0, "sleet": 0.95}

def sky_clouds(img, c, y_max=0.78, warm=None):
    cov = CLOUD_COV[c.cond]
    if cov <= 0: return
    if c.night:
        lit, dark = tuple(np.array(c.pal["hor"]) * 1.25), tuple(np.array(c.pal["top"]) * 0.9)
    else:
        lit, dark = CLOUD_COL[c.cond]
        if warm is not None:
            lit = tuple(np.clip(np.array(lit, float) * warm, 0, 255)); dark = tuple(np.clip(np.array(dark, float) * warm * 0.9, 0, 255))
    pc = c.cond == "partly_cloudy"
    M.clouds(img, c.rng, cov, lit, dark, y_max=0.6 if pc else y_max, softness=0.10 if pc else 0.35, sharp=0.7 if pc else 1.0)

def precipitation(img, c):
    cond, rng = c.cond, c.rng
    if cond == "thunderstorm": M.lightning(img, rng, c.night)
    if cond == "drizzle": M.rain_layer(img, rng, 520, 9 * SS, 0.18, (205, 215, 225), 0.55)
    elif cond == "rain": M.rain_layer(img, rng, 420, 22 * SS, 0.25, (210, 222, 235), 0.45)
    elif cond == "heavy_rain": M.rain_layer(img, rng, 1000, 30 * SS, 0.32, (205, 218, 235), 0.42)
    elif cond == "thunderstorm": M.rain_layer(img, rng, 800, 28 * SS, 0.34, (190, 205, 228), 0.40)
    elif cond == "snow": M.snow_layer(img, rng, 520)
    elif cond == "sleet":
        M.rain_layer(img, rng, 420, 14 * SS, 0.30, (205, 220, 238), 0.55); M.snow_layer(img, rng, 130, (230, 238, 250))

def fog_overlay(img, c, strength=0.65):
    if c.cond != "fog": return
    n = fbm(c.rng, SW, SH, octaves=4, base=2)
    img[:] = blend(img, c.pal["haze"], np.clip(0.30 + n * 0.45, 0, 1) * strength)

def to_image(img, vignette=0.18):
    yy, xx = np.mgrid[0:SH, 0:SW]
    v = 1 - vignette * (((xx - SW / 2) / (SW / 2)) ** 2 + ((yy - SH / 2) / (SH / 2)) ** 2) / 2
    img = img * v[:, :, None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)

def pil_of(img): return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
def arr_of(pil): return np.asarray(pil.convert("RGB"), float)

def lake(img, c, top_frac, snapshot, ripple=3, tint=None, mix_base=0.30):
    """mirror what is above `top_frac` into the water below it"""
    wl = int(top_frac * SH); h = SH - wl
    src = snapshot[max(0, wl - h):wl][::-1]
    pad = h - src.shape[0]
    if pad > 0: src = np.concatenate([src, np.repeat(src[-1:], pad, axis=0)], axis=0)
    refl = np.asarray(Image.fromarray(np.clip(src, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(SS * 1.0)), float)
    n = fbm(c.rng, SW, h, octaves=4, base=14)
    shift = ((n - 0.5) * 2 * ripple * SS).astype(int)
    out = np.empty_like(refl); xs = np.arange(SW)
    for yy in range(h): out[yy] = refl[yy, np.clip(xs + shift[yy], 0, SW - 1)]
    t = np.linspace(0, 1, h)[:, None, None]
    tint = np.array(tint if tint is not None else c.g((18, 70, 88)), float)[None, None, :]
    mix = mix_base + 0.45 * t
    out = out * (1 - mix) + tint * mix
    band = (np.sin(np.arange(h)[:, None] * 0.55 + n * 12) > 0.94).astype(float)[:, :, None] * (0.16 if c.night else 0.3)
    out = np.clip(out + band * 60, 0, 255)
    img[wl:] = out

def pebble_quantize(im): return M.pebble_quantize(im)

# ================================================================ ALPS ====

def ridge_line(rng, base, amp, rough_base, octaves=6):
    n = noise1d(rng, SW, octaves, rough_base)
    return (base - amp * (n - 0.35)) * SH

def draw_mountains(img, c, y, snow_line, rock_col, snow_col, haze_amt, light_from_left=True):
    h = SH
    for x in range(SW):
        yt = int(y[x])
        sl = x + 4 if x + 4 < SW else SW - 1
        sr = x - 4 if x - 4 >= 0 else 0
        slope = y[sl] - y[sr]
        lit = np.clip(0.5 - slope / (12 * SS), 0.15, 1.0) if light_from_left else 0.6
        col_bot = np.array(rock_col, float)
        for yy in range(max(yt, 0), min(int(0.62 * SH), h)):
            depth = (yy - yt) / (0.20 * SH)
            snow = yy < snow_line[x] + 0.02 * SH * math.sin(yy * 0.31 + x * 0.05)
            base = np.array(snow_col if snow else rock_col, float)
            shade = (0.62 + 0.55 * lit) if not snow else (0.78 + 0.28 * lit)
            col = base * shade * (1 - 0.22 * min(depth, 1.0) * (0 if snow else 1))
            img[yy, x] = col
    return img

def pines(img_pil, rng, ridge, x0, x1, n, size, col, snow=False, lit_col=None):
    d = ImageDraw.Draw(img_pil)
    for _ in range(n):
        x = int(rng.uniform(x0, x1)); base = int(ridge[min(max(x, 0), SW - 1)]) + int(rng.uniform(0, size * 0.8))
        s = size * rng.uniform(0.7, 1.3)
        tiers = 4
        for k in range(tiers):
            ty = base - s + k * s * 0.28; hw = s * (0.16 + 0.10 * k)
            d.polygon([(x, ty - s * 0.30), (x - hw, ty + s * 0.18), (x + hw, ty + s * 0.18)], fill=col)
            if snow: d.polygon([(x, ty - s * 0.30), (x - hw * 0.55, ty - s * 0.06), (x + hw * 0.55, ty - s * 0.06)], fill=(236, 240, 247))
        d.rectangle([x - s * 0.04, base - s * 0.05, x + s * 0.04, base + s * 0.12], fill=col)

def draw_chalet(pil, c, cx, base_y, scale, lit_windows):
    d = ImageDraw.Draw(pil)
    s = scale
    wood, wood_d = c.g((126, 80, 46)), c.g((96, 60, 34))
    stone = c.g((128, 124, 118)); roof = c.g((82, 58, 44)); roof_d = c.g((60, 42, 32))
    trim = c.g((70, 44, 28)); shutter = c.g((150, 52, 44)); glass_day = c.g((170, 200, 220))
    glass = (255, 214, 120) if lit_windows else glass_day
    snow = c.cond == "snow" or (c.cond == "sleet")
    bw, bh = 62 * s, 30 * s
    x0, x1 = cx - bw / 2, cx + bw / 2
    # stone base
    d.rectangle([x0 - 2 * s, base_y - 9 * s, x1 + 2 * s, base_y], fill=stone)
    for i in range(int((x1 - x0) / (6 * s))):
        d.line([x0 + i * 6 * s, base_y - 9 * s, x0 + i * 6 * s, base_y], fill=c.g((100, 96, 92)), width=max(1, SS // 2))
    # wooden body with plank lines
    top = base_y - 9 * s - bh
    d.rectangle([x0, top, x1, base_y - 9 * s], fill=wood)
    for k in range(1, 9):
        yy = top + k * bh / 9
        d.line([x0, yy, x1, yy], fill=wood_d, width=max(1, SS // 2))
    # upper balcony (full width) and railing
    by = top + bh * 0.52
    d.rectangle([x0 - 5 * s, by, x1 + 5 * s, by + 2.2 * s], fill=trim)
    for i in range(int((bw + 10 * s) / (3.2 * s))):
        xx = x0 - 5 * s + i * 3.2 * s
        d.line([xx, by - 6 * s, xx, by], fill=trim, width=max(1, SS))
    d.line([x0 - 5 * s, by - 6 * s, x1 + 5 * s, by - 6 * s], fill=trim, width=max(1, SS))
    # windows (upper row and lower row) with shutters
    def window(wx, wy):
        ww, wh = 7 * s, 9 * s
        d.rectangle([wx - 4 * s, wy, wx - 0.2 * s, wy + wh], fill=shutter)
        d.rectangle([wx + ww + 0.2 * s, wy, wx + ww + 4 * s, wy + wh], fill=shutter)
        d.rectangle([wx, wy, wx + ww, wy + wh], fill=glass, outline=trim)
        d.line([wx + ww / 2, wy, wx + ww / 2, wy + wh], fill=trim, width=max(1, SS // 2))
        d.line([wx, wy + wh / 2, wx + ww, wy + wh / 2], fill=trim, width=max(1, SS // 2))
    for fx in (0.18, 0.42, 0.74):
        window(x0 + bw * fx, top + 2.5 * s)
    for fx in (0.14, 0.74):
        window(x0 + bw * fx, by + 5 * s)
    # door
    dx = x0 + bw * 0.42
    d.rectangle([dx, by + 4 * s, dx + 8 * s, base_y - 9 * s], fill=c.g((92, 56, 34)), outline=trim)
    # gabled roof with wide eaves
    ry = top - 1 * s
    peak = (cx, ry - 25 * s)
    d.polygon([(x0 - 11 * s, ry + 2 * s), (peak[0], peak[1]), (x1 + 11 * s, ry + 2 * s)], fill=roof)
    d.polygon([(x0 - 11 * s, ry + 2 * s), (peak[0], peak[1]), (peak[0] + 3 * s, peak[1] + 1.5 * s), (x0 - 7 * s, ry + 4 * s)], fill=roof_d)
    d.line([(x0 - 11 * s, ry + 2 * s), (x1 + 11 * s, ry + 2 * s)], fill=roof_d, width=SS)
    for k in range(1, 5):   # shingle rows
        t = k / 5.0
        yy = ry + 2 * s - t * 27 * s
        hw = (bw / 2 + 11 * s) * (1 - t)
        d.line([cx - hw, yy, cx + hw, yy], fill=roof_d, width=max(1, SS // 2))
    # gable window
    d.polygon([(cx, ry - 17 * s), (cx - 4 * s, ry - 8 * s), (cx + 4 * s, ry - 8 * s)], fill=glass, outline=trim)
    # chimney
    chx = cx + bw * 0.26
    d.rectangle([chx, ry - 22 * s, chx + 5 * s, ry - 6 * s], fill=stone, outline=trim)
    if snow:
        d.polygon([(x0 - 11 * s, ry + 2 * s), (peak[0], peak[1]), (x1 + 11 * s, ry + 2 * s), (x1 + 11 * s, ry - 1 * s), (peak[0], peak[1] - 3 * s), (x0 - 11 * s, ry - 1 * s)], fill=(238, 242, 249))
        d.polygon([(x0 - 11 * s, ry + 2 * s), (peak[0], peak[1]), (x1 + 11 * s, ry + 2 * s), (x1 + 5 * s, ry - 6 * s), (peak[0], peak[1] + 4 * s), (x0 - 5 * s, ry - 6 * s)], fill=(238, 242, 249))
    return chx + 2.5 * s, ry - 22 * s

def alps_scene(cond, night, seed):
    c = Ctx(cond, night, seed)
    rng = c.rng
    img = sky_fill(c, 0.62)
    img = np.concatenate([img, np.zeros((SH - img.shape[0], SW, 3))], axis=0) if img.shape[0] < SH else img[:SH]
    celestial(img, c, sun_xy=(0.78, 0.16), moon_xy=(0.80, 0.15))
    sky_clouds(img, c, y_max=0.6)
    snowy = cond in ("snow",)
    # far range (snowy peaks), then nearer range
    lay = np.random.default_rng(5)
    far = ridge_line(lay, 0.44, 0.50, 3)
    far = np.minimum(far, 0.60 * SH)
    far_sl = far + (0.07 + 0.15 * noise1d(lay, SW, 4, 5)) * SH
    draw_mountains(img, c, far, far_sl, c.mix_haze(c.g((118, 124, 140)), c.haze[0] * 0.8),
                   c.mix_haze(c.g((246, 249, 253)), c.haze[0] * 0.7), c.haze[0])
    mid = ridge_line(np.random.default_rng(9), 0.52, 0.28, 4)
    mid = np.minimum(mid, 0.605 * SH)
    mid_sl = mid + (0.02 + 0.10 * noise1d(np.random.default_rng(3), SW, 4, 6)) * SH
    snow_amt = 1.0 if snowy else 0.0
    draw_mountains(img, c, mid, mid_sl - (0 if snowy else 0.03 * SH), c.mix_haze(c.g((84, 92, 100)), c.haze[1] * 0.7),
                   c.mix_haze(c.g((236, 240, 247)), c.haze[1] * 0.6), c.haze[1])
    # forested foothills with pines
    foot = ridge_line(np.random.default_rng(21), 0.575, 0.07, 6, octaves=4)
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    pts = [(0, int(0.62 * SH))] + [(x, int(foot[x])) for x in range(0, SW, 3)] + [(SW, int(0.62 * SH))]
    d.polygon(pts, fill=c.mix_haze(c.g((36, 70, 56)), c.haze[1] * 0.8))
    pines(pil, np.random.default_rng(2), foot, 0, SW, 70, 15 * SS, c.mix_haze(c.g((30, 62, 48)), c.haze[1] * 0.6), snow=snowy)
    img = arr_of(pil)
    # haze at the foot of the mountains
    hz = np.exp(-(((np.arange(SH) - SH * 0.57) / (SH * 0.07)) ** 2))[:, None]
    img = blend(img, c.pal["haze"], hz * (0.55 if cond == "fog" else 0.22))
    fog_overlay(img, c, 0.7)
    snapshot = img.copy()
    # lake
    img[int(0.62 * SH):] = 0
    lake(img, c, 0.62, snapshot, ripple={"heavy_rain": 7, "thunderstorm": 7, "rain": 5, "drizzle": 4}.get(cond, 2))
    # near shore (peninsula on the right, narrow bank at the bottom)
    xs = np.arange(SW)
    s = np.clip((xs - 0.30 * SW) / (0.50 * SW), 0, 1) ** 0.6
    ground = SH * (0.955 - 0.215 * s) + 3 * SS * np.sin(xs * 0.02)
    grass_a = c.g((74, 112, 58)); grass_b = c.g((46, 80, 44))
    if snowy: grass_a, grass_b = (232, 236, 244), (205, 212, 226)
    gn = fbm(rng, SW, SH, octaves=4, base=10)
    for x in range(SW):
        y0 = int(ground[x])
        t = np.clip((np.arange(y0, SH) - y0) / (SH - y0 + 1), 0, 1)[:, None]
        col = np.array(grass_a, float)[None, :] * (1 - t) + np.array(grass_b, float)[None, :] * t
        col = col * (0.88 + 0.24 * gn[y0:, x][:, None])
        img[y0:, x] = col
    # shoreline edge
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    # wooden jetty into the lake
    jy = int(0.84 * SH)
    d.polygon([(int(0.52 * SW), jy), (int(0.30 * SW), jy + 3 * SS), (int(0.30 * SW), jy + 6 * SS), (int(0.52 * SW), jy + 5 * SS)], fill=c.g((110, 78, 50)))
    for px in range(int(0.31 * SW), int(0.52 * SW), 9 * SS):
        d.line([px, jy + 3 * SS, px, jy + 12 * SS], fill=c.g((70, 48, 32)), width=SS)
    # pines around the chalet
    base_y = int(ground[int(0.72 * SW)]) + 4 * SS
    pines(pil, np.random.default_rng(31), np.full(SW, base_y + 3 * SS), 0.42 * SW, 0.55 * SW, 3, 30 * SS, c.g((26, 58, 42)), snow=snowy)
    pines(pil, np.random.default_rng(32), np.full(SW, base_y + 2 * SS), 0.90 * SW, 1.0 * SW, 3, 34 * SS, c.g((24, 54, 40)), snow=snowy)
    lit = night or cond in ("heavy_rain", "thunderstorm")
    chx, chy = draw_chalet(pil, c, int(0.70 * SW), base_y, 1.55 * SS / 3, lit)
    img = arr_of(pil)
    # warm glow of the windows at night / smoke
    if lit:
        yy, xx = np.mgrid[0:SH, 0:SW]
        g = np.clip(1 - np.hypot(xx - 0.70 * SW, yy - (base_y - 22 * SS)) / (60 * SS), 0, 1) ** 2
        img = blend(img, (255, 190, 90), g * 0.16)
    if cond not in ("rain", "heavy_rain", "thunderstorm", "drizzle"):
        sm = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); sd = ImageDraw.Draw(sm)
        for k in range(7):
            sd.ellipse([chx + k * 3 * SS - (4 + k) * SS, chy - k * 7 * SS - (4 + k) * SS, chx + k * 3 * SS + (4 + k) * SS, chy - k * 7 * SS + (4 + k) * SS],
                       fill=(210, 210, 215, 70 - k * 8))
        sm = sm.filter(ImageFilter.GaussianBlur(3 * SS))
        img = arr_of(Image.alpha_composite(pil_of(img).convert("RGBA"), sm))
    if cond == "fog": fog_overlay(img, c, 0.45)
    precipitation(img, c)
    return to_image(img)

# ============================================================ COMIC TOWN ==

OUT = (24, 22, 30)
def poly(d, pts, fill, w=None):
    d.polygon(pts, fill=fill)
    d.line(list(pts) + [pts[0]], fill=OUT, width=w or int(1.6 * SS), joint="curve")

class Iso:
    def __init__(self, d, c):
        self.d, self.c = d, c
        self.tw, self.th = 36 * SS, 18 * SS
        self.ox, self.oy = SW * 0.5, 0.20 * SH
    def p(self, i, j, z=0):
        return (self.ox + (i - j) * self.tw / 2, self.oy + (i + j) * self.th / 2 - z * SS)
    def tile(self, i, j, fill, z=0, outline=True):
        pts = [self.p(i, j, z), self.p(i + 1, j, z), self.p(i + 1, j + 1, z), self.p(i, j + 1, z)]
        if outline: poly(self.d, pts, fill)
        else: self.d.polygon(pts, fill=fill)
    def box(self, i, j, w, dpt, h, top, left, right, z0=0):
        d = self.d
        A, B, C, D = self.p(i, j, z0 + h), self.p(i + w, j, z0 + h), self.p(i + w, j + dpt, z0 + h), self.p(i, j + dpt, z0 + h)
        a, b, cc, dd = self.p(i, j, z0), self.p(i + w, j, z0), self.p(i + w, j + dpt, z0), self.p(i, j + dpt, z0)
        poly(d, [D, C, cc, dd], left)       # left-facing (towards +j side) face
        poly(d, [C, B, b, cc], right)       # right-facing face
        poly(d, [A, B, C, D], top)
        return (A, B, C, D), (D, C, cc, dd), (C, B, b, cc)
    def windows(self, face, rows, cols, col, kind):
        P0, P1, P2, P3 = face   # P0=top-left of face, P1=top-right, P2=bottom-right, P3=bottom-left
        d = self.d
        def lerp2(a, b, t): return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        for r in range(rows):
            for k in range(cols):
                u0, u1 = (k + 0.25) / cols, (k + 0.75) / cols
                v0, v1 = (r + 0.25) / rows, (r + 0.7) / rows
                def pt(u, v):
                    top = lerp2(P0, P1, u); bot = lerp2(P3, P2, u); return lerp2(top, bot, v)
                w = [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)]
                d.polygon(w, fill=col)

def comic_scene(cond, night, seed):
    c = Ctx(cond, night, seed)
    rng = c.rng
    # --- sky: posterised gradient bands + halftone dots
    sky = sky_fill(c, 0.55)
    sky = np.concatenate([sky, np.zeros((SH - sky.shape[0], SW, 3))], axis=0) if sky.shape[0] < SH else sky[:SH]
    bands = 6
    yb = (np.arange(SH) / (SH * 0.55) * bands).astype(int).clip(0, bands - 1)
    for b in range(bands):
        rows = np.where(yb == b)[0]
        if len(rows): sky[rows] = sky[rows[len(rows) // 2]]
    img = sky
    yy, xx = np.mgrid[0:SH, 0:SW]
    dots = (((xx // (5 * SS) + yy // (5 * SS)) % 2 == 0) & ((np.hypot(xx % (5 * SS) - 2.5 * SS, yy % (5 * SS) - 2.5 * SS)) < 1.3 * SS))
    img = blend(img, tuple(np.array(c.pal["hor"]) * (0.9 if not night else 1.2)), (dots & (yy < SH * 0.55)).astype(float) * 0.35)
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    # --- sun / crescent moon, cartoon style
    if night:
        if cond in ("clear_sky", "partly_cloudy", "snow", "overcast", "drizzle", "sleet", "fog"):
            M.draw_stars  # (stars drawn below as comic sparkles)
        arr = arr_of(pil)
        if cond in ("clear_sky", "partly_cloudy"):
            for _ in range(26):
                sx, sy = rng.uniform(0, SW), rng.uniform(0, SH * 0.30)
                r = rng.uniform(1.2, 2.6) * SS
                ImageDraw.Draw(pil).polygon([(sx, sy - r * 2), (sx + r * .6, sy - r * .6), (sx + r * 2, sy), (sx + r * .6, sy + r * .6), (sx, sy + r * 2), (sx - r * .6, sy + r * .6), (sx - r * 2, sy), (sx - r * .6, sy - r * .6)], fill=(255, 245, 190))
            arr = arr_of(pil)
        if cond in ("clear_sky", "partly_cloudy", "overcast", "drizzle", "snow", "sleet", "fog"):
            draw_moon(arr, SW * 0.80, SH * 0.15, 12 * SS, glow=0.7, cover=0.5 if cond not in ("clear_sky", "partly_cloudy") else 0)
        pil = pil_of(arr); d = ImageDraw.Draw(pil)
    elif cond in ("clear_sky", "partly_cloudy"):
        sx, sy, r = SW * 0.80, SH * 0.15, 13 * SS
        for k in range(12):
            a = k * math.pi / 6
            d.polygon([(sx + math.cos(a - 0.12) * r * 1.2, sy + math.sin(a - 0.12) * r * 1.2), (sx + math.cos(a) * r * 1.85, sy + math.sin(a) * r * 1.85), (sx + math.cos(a + 0.12) * r * 1.2, sy + math.sin(a + 0.12) * r * 1.2)], fill=(255, 205, 70), outline=OUT)
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=(255, 226, 90), outline=OUT, width=int(1.6 * SS))
    # --- cartoon clouds
    def cloud(cx, cy, s, fill):
        blobs = [(-1.0, 0.2, 0.7), (-0.3, -0.2, 0.95), (0.55, -0.05, 0.85), (1.2, 0.25, 0.6), (0.2, 0.3, 0.8)]
        for fx, fy, fr in blobs: d.ellipse([cx + (fx - fr) * s, cy + (fy - fr) * s, cx + (fx + fr) * s, cy + (fy + fr) * s], fill=OUT)
        for fx, fy, fr in blobs:
            r = fr * s - 1.8 * SS
            d.ellipse([cx + fx * s - r, cy + fy * s - r, cx + fx * s + r, cy + fy * s + r], fill=fill)
    cl_fill = {"partly_cloudy": (255, 255, 255), "overcast": (206, 210, 218), "drizzle": (186, 192, 204), "rain": (160, 168, 184),
               "heavy_rain": (120, 128, 148), "snow": (232, 236, 246), "thunderstorm": (84, 88, 110), "sleet": (180, 190, 205), "fog": (226, 228, 232)}
    if cond in cl_fill:
        fill = tuple(int(v) for v in (np.array(cl_fill[cond]) * (NIGHT_MULT * 1.5 + 0.1 if night else 1.0)))
        pos = [(0.20, 0.12, 15), (0.55, 0.07, 18), (0.82, 0.20, 13)] if cond == "partly_cloudy" else \
              [(0.12, 0.10, 18), (0.40, 0.06, 22), (0.70, 0.12, 20), (0.95, 0.07, 16), (0.28, 0.23, 15), (0.60, 0.26, 17)]
        for fx, fy, fs in pos: cloud(SW * fx, SH * fy, fs * SS, fill)
    # --- distant hills (flat colours)
    hill_col = c.g((96, 168, 92)); hill2 = c.g((70, 140, 84))
    hx = np.arange(0, SW + 4, 4)
    for col, base, amp, f in ((hill2, 0.36, 0.05, 3.0), (hill_col, 0.40, 0.04, 5.0)):
        pts = [(0, SH * 0.5)] + [(x, SH * (base - amp * math.sin(x / SW * f * math.pi + base * 9))) for x in hx] + [(SW, SH * 0.5)]
        d.polygon(pts, fill=col); d.line(pts[1:-1], fill=OUT, width=int(1.6 * SS))
    grass = (c.g((114, 196, 96)) if cond != "snow" else (236, 240, 250))
    d.rectangle([0, int(SH * 0.40), SW, SH], fill=grass)
    # --- isometric town
    iso = Iso(d, c)
    N = 14
    layout = np.random.default_rng(11)
    road_i = {4, 9}; road_j = {5, 10}
    kinds = {}
    for i in range(N):
        for j in range(N):
            kinds[(i, j)] = "road" if (i in road_i or j in road_j) else "lot"
    river_j = {0}
    ground_snow = cond == "snow"
    road_col = c.g((92, 96, 112)); lot_col = grass if True else grass
    tile_cols = [c.g((120, 200, 100)), c.g((110, 190, 94))]
    plot = []
    for i in range(N):
        for j in range(N):
            if kinds[(i, j)] == "road":
                iso.tile(i, j, road_col)
            else:
                iso.tile(i, j, (240, 244, 252) if ground_snow else tile_cols[(i + j) % 2], outline=True)
    # road dashes
    for i in range(N):
        for j in range(N):
            if kinds[(i, j)] == "road" and (i in road_i) != (j in road_j):
                a = iso.p(i + 0.5, j + 0.5)
                d.ellipse([a[0] - 2 * SS, a[1] - 1 * SS, a[0] + 2 * SS, a[1] + 1 * SS], fill=c.g((235, 220, 120)))
    palette_walls = [((236, 120, 96), (208, 90, 74)), ((246, 200, 96), (222, 168, 66)), ((120, 176, 226), (88, 144, 200)),
                     ((236, 232, 220), (200, 196, 184)), ((170, 130, 210), (140, 100, 180)), ((120, 206, 170), (90, 176, 140))]
    roof_cols = [(196, 70, 58), (86, 100, 150), (150, 90, 60), (70, 130, 120)]
    cars = []
    for i in range(0, N):
        for j in range(0, N):
            if kinds[(i, j)] != "lot": continue
            r = layout.random()
            order = i + j
            if r < 0.62:
                h = int(layout.choice([10, 14, 18, 24, 32, 44]))
                wl, wr = palette_walls[int(layout.integers(0, len(palette_walls)))]
                wl, wr = c.g(wl), c.g(wr)
                top = c.g(tuple(int(v * 1.12) for v in palette_walls[0][0])) if False else None
                tcol = c.g(tuple(min(255, int(v * 1.15)) for v in (np.array(wl) / max(c.dark, 0.2) / (NIGHT_MULT if night else 1)))) if False else tuple(int(min(255, v * 1.18)) for v in wl)
                if ground_snow: tcol = (240, 244, 252)
                big = layout.random() < 0.3
                w = 0.8 if not big else 0.9
                face_top, left_f, right_f = iso.box(i + 0.1, j + 0.1, w, w, h, tcol, wl, wr)
                if h >= 18 and not ground_snow and layout.random() < 0.8:
                    # pitched / stepped roof: small box on top
                    rc = c.g(roof_cols[int(layout.integers(0, len(roof_cols)))])
                    if h <= 24:
                        A, B, C_, D_ = face_top
                        apex = ((A[0] + C_[0]) / 2, (A[1] + C_[1]) / 2 - 9 * SS)
                        poly(d, [D_, C_, apex], c.g(tuple(int(v * 0.8) for v in roof_cols[0])) if False else rc)
                        poly(d, [C_, B, apex], tuple(int(v * 0.8) for v in rc))
                rows = max(1, h // 11); cols = 2
                wcol = (255, 218, 110) if night or cond in ("heavy_rain", "thunderstorm") else c.g((176, 222, 248))
                iso.windows(left_f, rows, cols, wcol, 0)
                iso.windows(right_f, rows, cols, tuple(int(v * 0.9) for v in wcol), 0)
            elif r < 0.84:
                # tree: trunk + round crown
                p = iso.p(i + 0.5, j + 0.5)
                d.rectangle([p[0] - 1.4 * SS, p[1] - 8 * SS, p[0] + 1.4 * SS, p[1]], fill=c.g((120, 80, 50)), outline=OUT)
                cr = 8 * SS
                d.ellipse([p[0] - cr, p[1] - 8 * SS - cr * 1.5, p[0] + cr, p[1] - 8 * SS + cr * 0.5], fill=(238, 244, 250) if ground_snow else c.g((52, 160, 80)), outline=OUT, width=int(1.6 * SS))
                d.ellipse([p[0] - cr * 0.5, p[1] - 8 * SS - cr * 1.2, p[0] + cr * 0.1, p[1] - 8 * SS - cr * 0.6], fill=(250, 252, 255) if ground_snow else c.g((96, 200, 110)))
            elif r < 0.92:
                p = iso.p(i + 0.5, j + 0.5)   # pond
                d.ellipse([p[0] - 12 * SS, p[1] - 5 * SS, p[0] + 12 * SS, p[1] + 5 * SS], fill=c.g((90, 170, 232)), outline=OUT, width=int(1.6 * SS))
    # street lamps and little cars
    for (i, j) in [(4.5, 3.5), (9.5, 7.5), (6.5, 5.5), (2.5, 10.5), (11.5, 10.5)]:
        p = iso.p(i, j)
        d.line([p[0], p[1], p[0], p[1] - 14 * SS], fill=OUT, width=int(1.6 * SS))
        d.ellipse([p[0] - 2.5 * SS, p[1] - 17 * SS, p[0] + 2.5 * SS, p[1] - 12 * SS], fill=(255, 226, 120) if night else c.g((220, 220, 230)), outline=OUT)
    for (i, j, col) in [(4.5, 7.5, (230, 60, 60)), (9.5, 3.0, (60, 120, 230)), (7.0, 5.5, (250, 200, 50))]:
        a = iso.p(i - 0.25, j); b = iso.p(i + 0.25, j)
        poly(d, [(a[0], a[1] - 3 * SS), (b[0], b[1] - 3 * SS), (b[0], b[1] + 2 * SS), (a[0], a[1] + 2 * SS)], c.g(col), w=int(1.2 * SS))
    img = arr_of(pil)
    if night:
        yy, xx = np.mgrid[0:SH, 0:SW]
        for (i, j) in [(4.5, 3.5), (9.5, 7.5), (6.5, 5.5), (2.5, 10.5), (11.5, 10.5)]:
            p = iso.p(i, j)
            g = np.clip(1 - np.hypot(xx - p[0], yy - (p[1] - 15 * SS)) / (22 * SS), 0, 1) ** 2
            img = blend(img, (255, 214, 110), g * 0.45)
    if cond == "fog":
        top = np.clip(1 - np.abs(np.arange(SH) - SH * 0.55) / (SH * 0.45), 0.25, 1)[:, None]
        img = blend(img, (236, 238, 242), top * 0.72)
    if cond == "snow":
        pass
    # comic precipitation
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    if cond in ("drizzle", "rain", "heavy_rain", "thunderstorm", "sleet"):
        n = {"drizzle": 70, "rain": 110, "heavy_rain": 190, "thunderstorm": 160, "sleet": 90}[cond]
        L = {"drizzle": 8, "rain": 12, "heavy_rain": 16, "thunderstorm": 15, "sleet": 10}[cond] * SS
        for _ in range(n):
            x, y = rng.uniform(0, SW + 60), rng.uniform(0, SH)
            d.line([x, y, x - L * 0.35, y + L], fill=OUT, width=int(2.6 * SS))
            d.line([x, y, x - L * 0.35, y + L], fill=(150, 205, 255), width=int(1.4 * SS))
    if cond in ("snow", "sleet"):
        for _ in range(100 if cond == "snow" else 40):
            x, y = rng.uniform(0, SW), rng.uniform(0, SH); r = rng.uniform(1.0, 2.2) * SS
            d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255), outline=OUT)
    if cond == "thunderstorm":
        x = SW * 0.62; y = SH * 0.16
        pts = [(x, y), (x - 10 * SS, y + 26 * SS), (x - 1 * SS, y + 26 * SS), (x - 14 * SS, y + 60 * SS), (x + 12 * SS, y + 22 * SS), (x + 2 * SS, y + 22 * SS), (x + 12 * SS, y)]
        d.polygon(pts, fill=(255, 240, 80), outline=OUT)
        img = arr_of(pil); img = blend(img, (255, 250, 200), 0.10); pil = pil_of(img)
    return to_image(arr_of(pil), vignette=0.10)

# ============================================================ BAROQUE BEACH ==

def painterly(img, strength=1):
    """oil-paint look: smoothing, brush texture, warm varnish, craquelure-ish noise"""
    pil = pil_of(img)
    pil = pil.filter(ImageFilter.MedianFilter(size=5)).filter(ImageFilter.GaussianBlur(SS * 0.5))
    a = arr_of(pil)
    rng = np.random.default_rng(77)
    # directional brush texture
    st = fbm(rng, SW, SH, octaves=5, base=24)
    st2 = np.asarray(Image.fromarray((st * 255).astype(np.uint8)).resize((SW, SH)).filter(ImageFilter.GaussianBlur(SS * 0.4)), float) / 255
    a = a * (0.90 + 0.20 * st2[:, :, None])
    # canvas weave
    yy, xx = np.mgrid[0:SH, 0:SW]
    weave = 1 + 0.025 * (np.sin(xx * 2.1) + np.sin(yy * 2.1))
    a = a * weave[:, :, None]
    # varnish: warm, slightly desaturated, lifted blacks
    grey = a.mean(axis=2, keepdims=True)
    a = grey + (a - grey) * 0.82
    a = a * np.array([1.05, 0.97, 0.82]) + np.array([10, 6, 0])
    return a

def ship(d, x, y, s, hull, sail, tilt=0.0, flag=True, dim=1.0):
    """simple three-masted ship seen from the side; s = height scale in px"""
    hw = 9 * s
    d.polygon([(x - hw, y), (x + hw, y), (x + hw * 0.8, y + 2.6 * s), (x - hw * 0.9, y + 2.6 * s)], fill=hull)
    d.polygon([(x - hw, y), (x - hw * 1.25, y - 3.2 * s), (x - hw * 0.8, y - 2.2 * s), (x - hw * 0.5, y)], fill=hull)    # stern castle
    for k, (mx, mh) in enumerate([(-4.5, 12), (0.5, 15), (5.5, 11)]):
        px = x + mx * s
        d.line([px, y, px, y - mh * s], fill=hull, width=max(1, int(0.35 * s)))
        for t, wid in enumerate([0.9, 0.72, 0.5]):
            ty = y - (mh * (0.20 + 0.27 * t)) * s
            sh = mh * 0.24 * s
            d.polygon([(px - 3.3 * s * wid - 0.4 * s, ty - sh), (px + 3.3 * s * wid + 0.4 * s, ty - sh), (px + 3.0 * s * wid, ty), (px - 3.0 * s * wid, ty)],
                      fill=tuple(int(v * (1.0 - 0.07 * t) * dim) for v in sail))
    if flag:
        d.polygon([(x + 0.5 * s, y - 15 * s), (x + 4.5 * s, y - 14.2 * s), (x + 0.5 * s, y - 13.4 * s)], fill=(170, 50, 40))

def baroque_scene(cond, night, seed):
    c = Ctx(cond, night, seed)
    rng = c.rng
    hor = 0.56
    img = sky_fill(c, hor)
    img = np.concatenate([img, np.zeros((SH - img.shape[0], SW, 3))], axis=0) if img.shape[0] < SH else img[:SH]
    warm = np.array([1.06, 0.97, 0.80])
    if not night and cond in ("clear_sky", "partly_cloudy"):
        # golden light low in the sky
        gl = np.clip(1 - np.abs(np.arange(SH) - SH * 0.50) / (SH * 0.30), 0, 1)[:, None] ** 1.5
        img = blend(img, (255, 214, 150), gl * 0.35)
    celestial(img, c, sun_xy=(0.30, 0.34), moon_xy=(0.72, 0.22), sun_r=12, moon_r=11)
    sky_clouds(img, c, y_max=0.62, warm=warm)
    if cond in ("clear_sky", "partly_cloudy", "fog") or night:
        # soft billows so the sky is never empty (painted cumulus)
        n = fbm(rng, SW, SH, octaves=5, base=3)
        lit = (255, 238, 205) if not night else tuple(np.array(c.pal["hor"]) * 1.2)
        dk = (150, 150, 160) if not night else tuple(np.array(c.pal["top"]) * 0.8)
        cov = 0.28 if cond == "clear_sky" else 0.45
        a = np.clip((n - (1 - cov)) / 0.14, 0, 1) * np.clip(1 - np.arange(SH) / (SH * 0.52), 0, 1)[:, None]
        img = blend(img, tuple(np.array(lit) * 0.6 + np.array(dk) * 0.4), a * 0.7)
    # distant coast on the right
    far = np.full(SW, hor * SH)
    cn = noise1d(np.random.default_rng(4), SW, 4, 6)
    land = np.clip((np.arange(SW) - 0.62 * SW) / (0.35 * SW), 0, 1)
    far = far - land * (3 + cn * 7) * SS
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    d.polygon([(0, hor * SH)] + [(x, far[x]) for x in range(0, SW, 3)] + [(SW, hor * SH)], fill=c.mix_haze(c.g((92, 98, 92)), 0.45 + 0.4 * c.haze[0]))
    img = arr_of(pil)
    # sea
    sea_top = int(hor * SH)
    sea = vgrad(c.g((86, 118, 118)), c.g((38, 70, 74)), 0, SH - sea_top)[:SH - sea_top]
    if night: sea = vgrad(c.g((90, 120, 130)), c.g((40, 60, 70)), 0, SH - sea_top)[:SH - sea_top]
    # reflect sky colour at the horizon
    t = np.clip(np.arange(SH - sea_top) / (0.12 * SH), 0, 1)[:, None, None]
    sea = sea * t + np.array(c.pal["hor"], float)[None, None, :] * 0.85 * (1 - t) * (0.5 if night else 1)
    stroke = fbm(rng, SW, SH - sea_top, octaves=4, base=20)
    stroke = np.asarray(Image.fromarray((stroke * 255).astype(np.uint8)).resize((SW, SH - sea_top)).filter(ImageFilter.GaussianBlur(SS)), float) / 255
    chop = {"heavy_rain": 1.8, "thunderstorm": 2.0, "rain": 1.3, "drizzle": 1.0}.get(cond, 0.8)
    rows = (np.sin(np.arange(SH - sea_top)[:, None] * (0.9 + 0.35 * chop) + stroke * 14) > 0.65 - 0.1 * chop)
    sea = sea * (0.88 + 0.24 * stroke[:, :, None])
    foam_col = np.array((235, 232, 214) if not night else (150, 165, 180), float)
    sea = blend(sea, foam_col, rows.astype(float) * np.clip(np.arange(SH - sea_top)[:, None] / (SH * 0.2), 0.15, 1) * 0.22 * chop)
    img[sea_top:] = sea
    # moon / sun glitter path
    if night and cond in ("clear_sky", "partly_cloudy"):
        for y in range(sea_top, int(0.80 * SH), SS):
            w = (3 + (y - sea_top) / SS * 0.25) * SS * rng.uniform(0.4, 1.0)
            x = SW * 0.72 + rng.uniform(-3, 3) * SS
            img[y:y + SS, int(x - w):int(x + w)] = blend(img[y:y + SS, int(x - w):int(x + w)], (240, 238, 215), 0.55)
    elif cond in ("clear_sky", "partly_cloudy"):
        for y in range(sea_top, int(0.80 * SH), SS):
            w = (4 + (y - sea_top) / SS * 0.4) * SS * rng.uniform(0.3, 1.0)
            x = SW * 0.30 + rng.uniform(-4, 4) * SS
            img[y:y + SS, int(x - w):int(x + w)] = blend(img[y:y + SS, int(x - w):int(x + w)], (255, 236, 180), 0.5)
    # ships
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    hull = c.mix_haze(c.g((58, 38, 26)), 0.25 * c.haze[1]); sail = c.mix_haze(c.g((226, 214, 184)), 0.20 * c.haze[1])
    dim = 1.0
    ship(d, SW * 0.28, sea_top + 9 * SS, 1.45 * SS, hull, sail, dim=dim)
    ship(d, SW * 0.72, sea_top + 18 * SS, 2.3 * SS, hull, sail, dim=dim)
    ship(d, SW * 0.52, sea_top + 4 * SS, 0.75 * SS, c.mix_haze(hull, 0.3), c.mix_haze(sail, 0.3), flag=False)
    img = arr_of(pil)
    if night:   # lantern glow on the big ship
        yy, xx = np.mgrid[0:SH, 0:SW]
        g = np.clip(1 - np.hypot(xx - SW * 0.66, yy - (sea_top + 18 * SS)) / (24 * SS), 0, 1) ** 2
        img = blend(img, (255, 190, 100), g * 0.4)
    # beach with a wet edge and foam line
    xs = np.arange(SW)
    shore = SH * (0.80 - 0.045 * np.sin(xs / SW * 5.0 + 0.6) - 0.02 * np.sin(xs / SW * 11.0)) + 4 * SS * noise1d(np.random.default_rng(8), SW, 3, 5)
    sand_a, sand_b = (214, 186, 134), (170, 138, 92)
    if cond == "snow": sand_a, sand_b = (236, 238, 244), (206, 212, 224)
    sand_a, sand_b = c.g(sand_a), c.g(sand_b)
    sn = fbm(rng, SW, SH, octaves=5, base=12)
    for x in range(SW):
        y0 = int(shore[x])
        t = np.clip((np.arange(y0, SH) - y0) / (SH - y0 + 1), 0, 1)[:, None]
        col = np.array(sand_a, float)[None, :] * (1 - t) + np.array(sand_b, float)[None, :] * t
        wet = np.clip(1 - (np.arange(y0, SH) - y0) / (7.0 * SS), 0, 1)[:, None]
        col = col * (1 - 0.30 * wet) * (0.90 + 0.2 * sn[y0:, x][:, None])
        img[y0:, x] = col
        f0 = y0 - 2 * SS
        img[f0:y0 + 1 * SS, x] = blend(img[f0:y0 + 1 * SS, x], (240, 236, 220) if not night else (150, 165, 180), 0.55)
    # dune with grass on the left, beached boat, tiny figures
    pil = pil_of(img); d = ImageDraw.Draw(pil)
    dune = [(0, SH * 0.90)] + [(x, SH * (0.80 - 0.10 * math.exp(-((x / SW - 0.04) / 0.20) ** 2) + 0.02 * math.sin(x * 0.03))) for x in range(0, int(0.42 * SW), 4)] + [(0.42 * SW, SH * 0.90)]
    d.polygon(dune, fill=sand_a if cond != "snow" else (232, 236, 244))
    gcol = c.g((96, 100, 52)) if cond != "snow" else (214, 220, 230)
    for _ in range(60):
        gx = rng.uniform(0, 0.36 * SW); gy = SH * (0.80 - 0.10 * math.exp(-((gx / SW - 0.04) / 0.20) ** 2)) + rng.uniform(0, 6) * SS
        for k in range(3):
            d.line([gx, gy, gx + (k - 1) * 2.2 * SS, gy - rng.uniform(4, 9) * SS], fill=gcol, width=max(1, SS // 2))
    # beached fishing boat
    bx, by = SW * 0.70, SH * 0.885
    bc = c.g((92, 60, 38))
    d.polygon([(bx - 22 * SS, by - 6 * SS), (bx + 20 * SS, by - 8 * SS), (bx + 14 * SS, by + 4 * SS), (bx - 16 * SS, by + 5 * SS)], fill=bc)
    d.line([bx - 22 * SS, by - 6 * SS, bx + 20 * SS, by - 8 * SS], fill=c.g((140, 100, 60)), width=SS)
    d.line([bx - 4 * SS, by - 6 * SS, bx - 4 * SS, by - 34 * SS], fill=bc, width=SS)
    d.polygon([(bx - 4 * SS, by - 33 * SS), (bx + 12 * SS, by - 12 * SS), (bx - 4 * SS, by - 12 * SS)], fill=c.g((214, 196, 160)))
    # figures (dark silhouettes with hats), a basket and nets
    for fx, fs in [(0.52, 1.0), (0.56, 0.9), (0.30, 0.8)]:
        px, py = SW * fx, SH * (0.86 if fx > 0.4 else 0.90)
        col = c.g((60, 44, 38)); sc = fs * SS
        d.ellipse([px - 1.6 * sc, py - 11 * sc, px + 1.6 * sc, py - 8 * sc], fill=c.g((196, 160, 130)))
        d.polygon([(px - 3 * sc, py - 10 * sc), (px + 3 * sc, py - 10 * sc), (px + 0.8 * sc, py - 12.5 * sc), (px - 0.8 * sc, py - 12.5 * sc)], fill=col)
        d.polygon([(px - 2.6 * sc, py - 8 * sc), (px + 2.6 * sc, py - 8 * sc), (px + 3.4 * sc, py), (px - 3.4 * sc, py)], fill=c.g((120, 70, 50)) if fx != 0.56 else c.g((70, 90, 110)))
    img = arr_of(pil)
    if cond == "fog": fog_overlay(img, c, 0.75)
    # heavy overcast darkening for storms (the painter's dramatic light)
    if cond in ("thunderstorm", "heavy_rain"):
        img = blend(img, (20, 24, 30), np.clip(1 - np.arange(SH) / (SH * 0.6), 0, 1)[:, None] * 0.25)
    img = painterly(img)
    precipitation(img, c)
    # strong old-painting vignette
    return to_image(img, vignette=0.55)

# ---------------------------------------------------------------- driver --

STYLES = {"alps_chalet": alps_scene, "comic_isometric_town": comic_scene, "baroque_beach": baroque_scene}

def main():
    wanted = sys.argv[1:] or list(STYLES)
    root = os.path.join(HERE, "..", "resources", M.SHAPE, "weatherbg")
    for style in wanted:
        fn = STYLES[style]
        out_dir = os.path.join(root, style); os.makedirs(out_dir, exist_ok=True)
        seed = 900 + 100 * list(STYLES).index(style)
        for cond in CONDITIONS:
            for night in (False, True):
                seed += 1
                q = pebble_quantize(fn(cond, night, seed))
                name = "%s_%s.png" % (cond, "night" if night else "day")
                q.save(os.path.join(out_dir, name), optimize=True)
                print("%s/%-26s %6d bytes" % (style, name, os.path.getsize(os.path.join(out_dir, name))), flush=True)

if __name__ == "__main__":
    main()
