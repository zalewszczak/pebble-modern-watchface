# Modern
**Modern is an analog watchface for Pebble Time 2 built around configurable Features.**
A big analog dial with hands and markers you can restyle completely, surrounded by information slots (corners and edges) that you fill with whatever matters to you — weather, temperature, UV, air quality, wind, pressure, altitude, compass, battery, Bluetooth, steps, sleep, digital time, sunrise/sunset, Moon phase, ISS passes, planets, aurora information and much more.
The settings page provides a live preview and lets you save complete designs as reusable presets. You can also configure automatic or manual location, weather units, update frequency, nighttime colors, animations and hourly vibrations.
Out of the box the watch starts with the **Modern** bitmap marker style (marker style 3) and sensible defaults (see `src/c/data/watch_defaults.c`); these are applied before the phone sends anything, unless the watch already has persisted settings.
## Feature list
##### Dial
* Analog only: custom hour, minute and second hands
* Multiple index/marker styles (including the bitmap "Modern", "Shadow", "Tally", "Bell" and "Fancy" styles) and fully custom markers
* Optional marker text (numbers/roman numerals)
* Semi-transparent bitmap markers
* Optional seconds hand, smooth seconds on shake
* Optional startup marker animation
* Shifting dial where possible to accommodate on-screen overlays
##### Features and information
* Fully configurable feature slots around the dial (4 corners + edge/middle lines)
* Date, weekday, month, week number and digital time components (including seconds)
* Battery, Bluetooth and Quiet Time status
* Heart rate, steps, step-goal percentage and sleep information
* Current, high, low and feels-like temperature
* Weather conditions and weather icons
* Rain chance, humidity, wind speed and direction
* Weather forecast (+X hours/days)
* Visibility and cloud cover
* Timezones
* UV index
* Air quality and dew point
* Atmospheric pressure and pressure trend
* Altitude and compass
* Moon phase
* Sunrise and sunset
* Planets visible, upcoming planetary rise
* Saturn ring angle
* Meteor showers
* Next ISS pass
* Aurora Kp index
##### Weather
* Automatic weather data
* Cloud cover from Open-Meteo with no API key required
* Optional OpenWeatherMap integration
* Configurable temperature, wind, air-quality and altitude units
* Configurable weather refresh interval
##### Location
* Automatic phone GPS location
* Manual location search
* Manual latitude/longitude
##### Interactions & updates
* Shake-triggered smooth second hand
* Optional semi-transparent hands for the duration of the shake animation
* Preserve battery option for the watchface to suspend activity when not used
* Configurable shake duration
* Automatic data refresh with configurable interval
* Battery-saving update mode
* Manual "refresh now" option
##### Colors & styles
* Separate daytime and nighttime color schemes (switching at sunrise/sunset)
* Main, accent and background colors can be customized
* Ready-made color presets
* Multiple icon styles: Simple, Hollow and Full Color
* Configurable text/icon outlines for contrast
* Example style gallery
* Up to six personal Style Presets, optionally scheduled
* Export/import designs as JSON
##### Hourly Vibrations
* Hourly vibration reminders
* Configurable vibration interval
* Start/end time
* Active weekdays
* Optional Quiet Time override
##### Settings & preview
* Live watchface preview while configuring
* Font previews
* Hand and marker previews
* Weather icon previews
* Feature-slot preview
* Custom font import for settings-page preview
* Configuration options adapt to the selected marker style

## Project layout

```
src/c/          Watch app (C); src/c/generated/ holds generator output
                 (message_key_index.h -- see "Message keys" below)
src/pkjs/        Phone-side JS: weather/astronomy fetching, and the
                 settings page itself; src/pkjs/data/generated/ holds
                 the settings page's own generator output (baked-in
                 preview images -- see "Build-time scripts" below)
resources/       Fonts and images declared in package.json
scripts/         Build-time generator scripts (see below), plus a
                 standalone dev-only tool in `scripts/js table editor/`
                 (see its own readme.md -- not part of the build)
```

## Modern conversion (architecture notes)

The project was converted from the Eclipz solar-eclipse watchface into the analog-only Modern watchface:

- **Removed:** all digital/grid layouts (and the Big Digital `IMAGE_TALLDIGITS_*` bitmap resources), sky/background rendering, planets/stars/flights drawing, eclipse calculation and handling, Sky Styles, planet-seek and the nearby-flights fetch. What remains of astronomy is only what Features need: moon phase, sun event, planets visible, next planet rise, Saturn rings, meteor shower, ISS next pass, aurora Kp and compass.
- **Data model:** `EclipseData` became `WatchData` (`src/c/data/watch_data.h`). Persistence (`src/c/persistence/`) stores it in 200-byte chunks plus a schema signature key (`PERSIST_KEY_SCHEMA`, `(version << 16) | sizeof(WatchData)`); on a mismatch the stored data is discarded and defaults are applied instead of misreading an old layout.
- **Defaults:** `watch_defaults_apply()` (`src/c/data/watch_defaults.c`) runs before any phone settings arrive, unless persisted settings load successfully. Default marker style is **3 (Modern bitmap)**.
- **Wire format:** `package.json` now declares 96 `messageKeys` (regenerate `src/c/generated/message_key_index.h` with `node scripts/generate-message-keys.js` whenever they change). Chunk types (`MESSAGE_TYPE`): STATUS 0, WEATHER 1, ASTRONOMY 2, SKY_EFFECTS 3, FEATURES 4, SETTINGS 5 -- keep `src/pkjs/comms/message-schema.js` in sync with `comms_decoder.c`. Scattered byte settings travel as positional blobs (`SETTINGS_U8_BLOB`, `WEATHER_CLOUD_U8_BLOB`, `WEATHER_MAIN_U8_BLOB`, `ASTRO_U8_BLOB`); their field order in `message-encoder.js` must match the `*_BLOB_OFFSETS` tables in `comms_decoder.c`.
- **Phone side:** one `sendWeatherData()` replaces the old eclipse/no-eclipse senders; `refresh-manager.js` fetches the weather snapshot, cloud outlook and only the optional sources (air quality, aurora Kp, ISS) that a slot actually shows.
- **Settings:** the edge/middle slot settings keep their legacy `*_ANALOG` storage keys; the `*_DIGITAL` twins are ignored. Settings schema version is 4 (cached full dict is discarded on upgrade).
- **Example styles:** 5 remain (the digital/grid ones were removed and the rest renumbered). Their preview screenshots (`resources/example-styles/<n>.png`) should be regenerated to show the new look.

## Custom backgrounds

Style -> Background: an OFF / IMAGE / WEATHER button group chooses what is drawn behind the indices (plain color, a predefined/own image, or a weather picture). Below it, "Translucent background image" (hidden for OFF) draws only every other pixel of the picture (checkerboard) and leaves the rest in the background color (`bg_translucent`, applied in `bg_image_draw()`). The buttons drive the two hidden checkboxes `#useCustomBg` / `#useWeatherBg`, so presets and saving are unchanged.

The picture is a full-screen image behind the indices.

- **Predefined images**: put numbered PNGs in `resources/backgrounds/` (`1.png`, `2.png`, ...; 200x228, palette PNGs are best; they are re-encoded as lossless WebP for the settings page by `optimize-generated-images.js`) and run `node scripts/generate-backgrounds.js` (also part of `generate-all.js`). It embeds them into the settings page (`src/pkjs/data/generated/background-images.js`), writes `src/c/generated/background_presets.h` (`bg_preset_resource_id(n)`) and (re)creates the `BG_PRESET_<n>` bitmap entries in `package.json`. The watch loads the chosen one with `gbitmap_create_with_resource()`, draws it once into the dial cache (below) and frees it.
- **Your own images**: 9 slots, edited in the settings page (`src/pkjs/config/config-background.js`): crop/pan/zoom, dithering (none, Floyd-Steinberg, Atkinson, Bayer 4x4/8x8) and style (neutral, B&W, sepia, vivid), converted to 64 colors (6 bits/pixel, packed 4 px -> 3 bytes, 34200 bytes) and kept in phone `localStorage` (`CONFIG_BG_SLOT_<k>`, base64url).
- **Transfer**: `src/pkjs/bg-image/bg-image-sync.js` streams the selected slot with raw `BG_IMG_*` AppMessages (1020-byte payloads, 36 messages) straight into watch persistent storage (`rendering/dial/bg_image_store.c`, 255-byte persist values; the Time 2 allows 1 MB). The watch reports the stored image's stamp (`BG_IMG_STAMP`) with every `REQUEST_UPDATE`, so a missing or stale image is re-sent automatically.
- **Watch RAM**: the packed data is never held in RAM: uploaded images are decoded straight from persistent storage into the frame buffer while the dial cache is built.

## Dial cache and "show on shake"

- **Dial cache** (`rendering/dial/dial_cache.c`, used by `dial_layer.c`): the static dial content -- background colour, custom background image, hour/second indices (rings, numerals or bitmap style) -- is drawn once into the frame buffer, copied into one full-layer 8-bit bitmap, and put back with a single blit on every later update. It is rebuilt only when its signature changes (`dial_static_signature()`: size, active colour scheme, marker settings, background image selection/stamp). The marker bitmap/font and the background image are freed after the copy, so steady state is one bitmap (~45 KB). The launch animation of the indices bypasses the cache. To add another static element: draw it in `dial_draw_static()` and add its inputs to `dial_static_signature()`.
- **Show on shake**: every feature slot has a "Show only when the watch is shaken" flag (slot editor). The 12 flags travel as `SHAKE_ONLY_MASK` (bit order = `feature_slot.h` slot enum); the watch shows those features for `shake_seconds` after a tap/shake (`input_shake_features_active()`), independently of the shake animation mode.

## Building

Run the generator scripts before `pebble build` -- one of them
(`generate-message-keys.js`) writes a header the C side won't compile
without, and the rest bake preview images the settings page won't
have without them (see "Build-time scripts" below for why):

```
node scripts/generate-all.js
pebble build
pebble install --emulator emery
```

## Build-time scripts

`scripts/generate-all.js` runs the generator scripts in one fixed
order (`generate-message-keys.js` first; `generate_hand_style_icons.py`
before `generate-hand-style-icons.js`, since the latter bakes the
former's own PNG output; the rest don't depend on each other). Most of
them exist because the settings page is one self-contained `data:` URI
with no server behind it, so it can't load external image files when
it's actually open on the phone -- anything it previews (fonts, hand
shapes, marker art, weather icons, style presets, ...) has to already
be embedded as base64 by the time the app is built. One
(`generate-message-keys.js`) is a different kind of generator: it
writes a plain C header the watch app itself needs to compile, not a
settings-page preview -- see its own section below. Every script here
is safe to run even before you've added its own source PNGs (a missing
source image just means that one preview shows no picture in settings
-- not an error, and it never affects that feature working on the
watch itself).

Run them all at once, in that one fixed order:

```
node scripts/generate-all.js
```

This keeps going even if one script fails (e.g. a missing optional
dependency like `pngjs`, `sharp` or Pillow -- see each script's own section
below) and prints a pass/fail summary at the end, so one broken
generator never blocks the others from still updating. See "Running
it automatically" further down for wiring this into your own build
step instead of remembering to run it by hand.

Quick reference (details for each are in their own section below):

| Script | Runtime | What it produces |
| --- | --- | --- |
| `generate-all.js` | Node | Runs every script below, in order |
| `generate-message-keys.js` | Node | `src/c/generated/message_key_index.h` -- required for the watch app to compile, not a preview |
| `generate-marker-previews.js` | Node | Bitmap marker style artwork (Modern/Shadow/Tally/Bell/Fancy) |
| `generate-infographics.js` | Node | Hand-style picker pictures, hand-editor explainer diagrams |
| `generate-preset-previews.js` | Node + `sharp` | Procedural marker-preset pictures (none/minimal/small/big) |
| `generate-example-style-previews.js` | Node | Example style gallery preview images |
| `generate-preview-icons.js` | Node | Copies the real icon PNGs used by the preview's example features (`resources/images/{simple,hollow,fullcolor}/*.png`, listed in `src/pkjs/config/preview-icons.js`) into `src/pkjs/data/generated/preview-icon-images.js`. The settings preview then draws these instead of `(text)` placeholders, tinted/outlined like the watch does, following the Icons style and outline settings. Missing PNGs just keep the placeholder. |
| `generate-font-previews.js` | Node | Real on-watch renderings for the font picker (Gothic/Bitham/LECO) |
| `generate_hand_style_icons.py` | Python 3 + Pillow | Renders the 11 hand-style shape icons |
| `generate-hand-style-icons.js` | Node | Bakes those 11 icons for the hand-style picker popup |
| `generate-weather-icon-previews.js` | Node + `pngjs` | Weather icon style picker previews |
| `optimize-generated-images.js` | Node + `sharp` | Last step of `generate-all.js`: rewrites every PNG data URI in `src/pkjs/data/generated/*.js` as a **lossless WebP** one (about 30% less image data in the .pbw, pixels and alpha identical). Keeps the PNG if WebP is not smaller or the round-trip check fails. Safe to re-run; `--dry-run` only reports. |

### Why the settings-page images are lossless WebP

The settings page is one `data:` URI built by PKJS, so it cannot link to
the PNGs in `resources/` (those live inside the watch app, which PKJS
cannot read, and a data: page has no files next to it): every picture has
to be embedded as base64. Lossy formats were measured and rejected: the
pictures are 64-colour dithered pixel art, flat diagrams and alpha masks,
which lossy WebP/JPEG/AVIF store *larger* or visibly smeared, and JPEG has
no alpha (the preview recolours marker/font bitmaps by `alpha > 0`).
JPEG XL is not decoded by Android's WebView. Lossless WebP keeps every
pixel and is decoded by every WebView the Pebble app uses. Run
`node scripts/optimize-generated-images.js` by hand if you ran a single
`generate-*.js` script on its own (they still write PNG).

## Message keys

`src/c/generated/message_key_index.h` (the header the
`SIMPLE_FIELD_MAP`/`BLOB_FIELD_MAP` tables in `comms_decoder.c`
`#include`s) is generated, not hand-written. The Pebble SDK assigns each `MESSAGE_KEY_<n>` a real numeric value at
*link* time, sequentially, in the order `package.json`'s
`pebble.messageKeys` array lists them -- so those constants can't be
referenced from a `static const` table initializer (they're extern
variables, not compile-time constants). This script bakes each key's
plain *array index* into `MK_<n>` `#define`s instead, which compile
fine as integer literals; the field-mapping code adds
`MESSAGE_KEY_MESSAGE_TYPE` back on at runtime to recover the real key.

```
node scripts/generate-message-keys.js
```

Unlike every other script on this page, this one has nothing to do
with the settings page's own preview images -- it's a plain codegen
step the **watch app** needs to even compile. Run it (or
`generate-all.js`, which always runs it first) any time
`messageKeys` changes in `package.json` -- an add, a remove, or a
reorder -- before `pebble build`. The generated header is committed to
the repo (easier to diff than regenerating on every clone), but it
must be regenerated before building if `messageKeys` has moved since
it was last written, or the field-mapping tables will read the wrong
offsets.

## Style Presets: Example styles and custom presets

The settings page has two related but separate ways to save/share a
whole look (every setting in the Style, Colors, and Features
sections) as a single blob:

- **Style Presets** (its own section, between Features and Weather) --
  3 user-editable quick-recall slots, plus a free-form export/import
  box, all live only on the phone (never sent to the watch itself,
  and never touch `package.json`'s `messageKeys`).
- **Example styles** (the very first section on the page) -- a fixed,
  developer-authored gallery of ready-made looks, meant to ship with
  the app rather than be edited by the end user.

Both build the underlying design snapshot the same way, produced by
walking every `input`/`select`/`textarea` with an `id` inside the
page's `#section-style`, `#section-colors`, and `#section-corners`
containers (see `collectStyleCornersJson()` in
`src/pkjs/config-page.js`). Style Presets stores that object directly;
Example styles wraps it as one field (`preset`) alongside a `title`
and `description` for its preview popup -- either way, a design
exported from Style Presets pastes straight into an Example style's
`preset` field, and vice versa.

### Making one

The easiest way to author a preset -- for either an Example style or
a Style Presets slot -- is to just use the settings page itself:

1. Open the watchface's settings and design the look you want (fonts,
   colors, hand style, corner/edge features, everything in Style,
   Colors, and Features).
2. Open the **Style Presets** section, tap **Generate JSON** under
   "Export current design", and copy the box's contents.
3. That's a complete preset. Paste it into a Style Presets slot's
   save flow, the "Import a design" box, or (for a permanent, shipped
   example) the `preset` field of an entry in
   `src/pkjs/example-style-presets.js`.

You don't need to hand-write or understand the JSON's keys -- it's
just whatever the settings page's own form fields happened to be set
to, keyed by their HTML element `id` (`bottomStyle`, `customBg`,
`cornerTL`, and so on). Applying a preset just writes each value back
into the matching field and re-runs the page's normal change
handlers, the same as if you'd clicked through every control by hand.

### Scheduled My styles

Each My Style slot has a clock button (next to save / rename / delete)
that opens a schedule popup: an **Enable schedule** checkbox, weekday
buttons (all selected by default) and an **Apply at** time. While a
schedule is on, the slot's clock icon is burgundy. The schedule is
stored per slot as `CONFIG_PRESET_<n>_SCHEDULE`
(`{"enabled":true,"days":127,"time":"08:00"}`, days bit 0 = Sunday).

PKJS only runs while the watchface does and cannot wake itself, so the
**watch's clock** is what triggers a scheduled style:

1. Every settings push carries `NEXT_STYLE_CHECK`: the epoch second of
   the next schedule occurrence that has not been served yet (0 = none).
   The watch keeps it in `WatchData.next_style_check` (persisted).
2. The tick handler calls `comms_maybe_request_scheduled_style()`. Once
   that time has passed and the phone is connected, it sends
   `REQUEST_SCHEDULED_STYLE` (retrying at most once a minute). That
   message is what starts/wakes PKJS.
3. PKJS (`src/pkjs/scheduled-style.js`) applies the most recent due
   style to the stored settings, pushes the normal settings update, and
   the new `NEXT_STYLE_CHECK` in it ends the retries.

Things that follow from this: a schedule saved at 09:30 for 08:00 first
fires tomorrow (occurrences before saving never fire); occurrences
missed while the phone was off or the watch was on another app are
caught up when the watch asks again or PKJS starts (only the most recent
one is applied); a manual style change is never reverted by an already
served occurrence; two slots at the same minute -> the higher slot wins.

Applying a style from PKJS uses a table of element id -> `CONFIG_*` key
in `scheduled-style.js` (mirroring `save()`'s payload). After adding or
renaming a style setting run `node scripts/check-scheduled-style-map.js`;
if a saved style contains an element id the table does not know, the
schedule popup shows a "Developer note" listing it.
The table also covers each feature slot's custom-primitives field
(`*CustomPrims`), and the check script verifies those too.

### Adding a new Example style

Example styles are meant to be authored by you (the developer), not
end users, and shipped with the app. Tapping one in the settings page
opens a preview popup (screenshot, title, description, an Apply
button) rather than applying it immediately:

1. Design the look and export its JSON as above.
2. Open `src/pkjs/example-style-presets.js` and fill in the next
   empty numbered slot with `{ title, description, preset }` --
   `title` is the short bold heading the popup shows, `description`
   is a sentence or two under it, and `preset` is the JSON you just
   copied (`"1": null` becomes `"1": { title: "...", description:
   "...", preset: { ...the JSON you copied... } }`).
3. Take a screenshot of that look (emulator or a real watch) and save
   it as `resources/example-styles/<n>.png`, matching the slot number.
4. Run `node scripts/generate-example-style-previews.js` to bake that
   PNG into `src/pkjs/data/generated/example-style-images.js` as the button's preview
   image -- the settings page can't load an external image at
   runtime, so this has to happen before `pebble build`.
5. A slot left as `null`, or with no matching PNG generated yet, just
   shows an empty/disabled placeholder tile -- not an error, and
   doesn't stop the app from building.

How many Example style slots exist at all is controlled by a single
constant, `EXAMPLE_STYLE_COUNT` near the top of
`src/pkjs/config/config-state.js` and `config-page.js` (5 by default) -- bump it, add the matching
PNG and preset entry, and nothing else needs to change.

## Feature icons

Every small, fixed-shape icon the corner/edge content slots can show
(weather condition, heart rate, steps, umbrella/rain chance, wind,
GPS/manual location, visibility, cloud cover, Bluetooth, ISS pass,
Saturn ring angle, planets-up count, aurora, the 5 sleep icons, Quiet
Time, Hourly Vibrations, sunrise/sunset, ...) is a PNG image resource,
in **3 style variants** -- Simple, Hollow, Full color -- picked by the
single "Icons style" setting in settings (`icon_style` in
`watch_data.h`; still travels over the wire as `WEATHER_ICON_STYLE`
for backwards compatibility, even though it now covers every icon, not
just weather). Icons that draw a genuinely dynamic/continuous shape
instead -- the battery bar, the compass rose, the wind direction arrow,
moon phase, pressure trend chevron, the altitude mountain glyph, and
the small Pebble logo used by one corner content option -- are NOT
part of this system and stay hand-drawn vector/bitmap-array code, same
as before.

Each style lives in its own resources subfolder:

```
resources/images/simple/<name>.png
resources/images/hollow/<name>.png
resources/images/fullcolor/<name>.png
```

declared in `package.json`'s `resources.media` list as
`ICON_SIMPLE_<NAME>` / `ICON_HOLLOW_<NAME>` / `ICON_FULLCOLOR_<NAME>`
for plain feature icons, and `ICON_WEATHER_SIMPLE_<NAME>` /
`ICON_WEATHER_HOLLOW_<NAME>` / `ICON_WEATHER_FULLCOLOR_<NAME>` for
weather condition icons (so `RESOURCE_ID_ICON_..._<NAME>` in C). The 2
weather conditions that actually look different after dark -- clear
sky and partly cloudy -- also have a `_NIGHT`/`MOON` variant of each
style (`weather_moon.png`, `weather_partly_cloudy_night.png`); every
other icon is used as-is at night too.

All the drawing logic lives behind one small generic API in
`feature_icon_assets.c`, built around an `IconResourceSet { simple,
hollow, fullcolor }` struct:

- `feature_icon_assets_draw_styled(ctx, top_left, set, style, color, w,
  h)` -- resolves `set` against `style`, tints for Simple/Hollow (these
  are authored as 2-color, fully-transparent-plus-one-opaque-color
  PNGs with `"memoryFormat": "1BitPalette"`, remapped to any `GColor`
  at draw time via `gbitmap_set_palette()`, exactly the same trick as
  before), and draws Full color art natively with no tint (it's a
  genuinely multi-color image, e.g. the storm icon bakes in a gray
  cloud, yellow bolt, and blue rain).

- `feature_icon_assets_draw_styled_with_outline(...)` -- same, plus (if
  `outline_style != 0`) an outline pass first, 4 or 12 extra draws at a
  1px offset in a contrasting color, same `OUTLINE_OFFSETS` technique
  `feature_render_draw_text_outlined()` uses for text. Full color's
  outline pass borrows the Hollow set's silhouette (full color art has
  no alpha channel to tint).

Every call site -- the weather condition table in
`feature_weather_icons.c` and the `STYLED_ICONS` table plus the
Bluetooth/Quiet Time/Hourly Vibrations/sunrise-sunset cases in
`feature_icons.c` -- is just a small `IconResourceSet` table (or a
literal one for a single icon) plus one call into the API above. This
is deliberate: adding an icon or a style is a data row, not new drawing
code, which is what keeps the compiled binary small as the icon set
grows, instead of a duplicated switch/case per style per icon.

Every icon resource is now drawn at a uniform **16x16px**
(`ICON_DRAW_W`/`ICON_DRAW_H` in `feature_icons.c`, `ICON_W`/`ICON_H` in
`feature_weather_icons.c`) -- up from the old 16x12 (and 20x10 for the
sunrise/sunset glyph). The top-left point each icon is drawn from was
deliberately left unchanged (the position/centering math still uses the
old row-height constants), so icons simply draw taller/wider from where
they always started rather than re-centering.

Nothing is cached or preloaded -- `feature_icon_assets_draw_styled[_with_outline]`
calls `gbitmap_create_with_resource()` right before drawing and
`gbitmap_destroy()` right after, so at any redraw only the icon(s)
belonging to feature slots actually visible on screen are ever decoded
into memory.

### Editing or adding an icon

Simple/Hollow icons need to stay a **2-color** PNG -- fully transparent
plus exactly one opaque color (any color works; only the alpha pattern
matters, since the opaque color gets replaced at draw time). Full color
icons can use any colors/alpha you want, same as a normal image. Keep
every icon at 16x16px. A minimal Python/Pillow snippet for either case:

```python
from PIL import Image

# 1-bit silhouette icon (any single opaque color; it's re-tinted at
# runtime, so plain black is the simplest choice to author against)
img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
img.putpixel((7, 5), (0, 0, 0, 255))  # opaque = part of the icon
# ... draw the rest of the silhouette ...
img.save("resources/images/simple/myicon.png")
```

Then add a matching `ICON_SIMPLE_MYICON` / `ICON_HOLLOW_MYICON` /
`ICON_FULLCOLOR_MYICON` trio to `package.json`'s `resources.media`
list (`"type": "bitmap"`), and reference the new `IconResourceSet` from
a `feature_icon_assets_draw_styled_with_outline()` call site --
usually just a new row in `STYLED_ICONS` in `feature_icons.c`, or the
weather tables in `feature_weather_icons.c` for a new weather
condition.


The big-analog watchface mode has several "bitmap" marker styles
(Modern, Shadow, Tally, Bell, Fancy), each using its own PNG resource
under `resources/indices/<name>_background.png`. The settings page can
show a live preview of each style's artwork so you see it before
applying -- but since that settings page is a single self-contained
`data:` URI with no server behind it, it has no way to load an
external image file when it's actually open on the phone. The preview
images have to already be embedded in the page's HTML by the time the
app is built.

That embedding is handled by:

```
node scripts/generate-marker-previews.js
```

Run this **before** `pebble build`, any time you add or change one of
the `*_background.png` files in `resources/indices/`. It reads
whatever's there, base64-encodes it, and writes
`src/pkjs/data/generated/marker-preview-images.js` -- a generated file the settings
page requires and embeds directly. No separate preview-only files are
needed: whatever art a marker style already uses on the watch is
exactly what shows as its preview in settings.

You don't need every style's PNG to exist for this to work -- any
style missing a `*_background.png` simply shows no preview image in
settings (not an error, and it doesn't affect that style working on
the watch itself). The committed placeholder
(`src/pkjs/data/generated/marker-preview-images.js` with no entries) means the app
also builds fine before you've added any of these images at all.

### Running it automatically

`pebble build` has no plugin/hook system of its own, so to avoid
remembering this step by hand, either:

- Add an npm script and use `npm run build` instead of `pebble build`
  directly:

  ```json
  "scripts": {
    "build": "node scripts/generate-all.js && pebble build"
  }
  ```

- Or add `node scripts/generate-all.js` to whatever shell alias/CI
  step you already use to invoke `pebble build`.

(`generate-all.js` runs every script in this file's own "Build-time
scripts" section above, including this one -- there's no need to also
list `generate-marker-previews.js` separately once you're using it.)

### Keep the source PNGs reasonably small

Everything the script embeds ends up base64-encoded (about 33% larger
than the raw file) inside the settings page's own HTML, which is
itself one big `data:` URI passed to the phone's webview. The simple
white-on-transparent mask art these marker styles already use is
fine. Full-resolution photos or anything visually complex will bloat
the page and risk hitting inconsistent limits across different
phones/OS versions.

## Font picker previews

The font picker popup (Clock font / Small companion font / corner-
feature font / marker numerals font) shows each option rendered in
its own real typeface, loaded live from Google Fonts -- see
`FONT_LOOKUP` in `config-page.js` for the full table and which of
these are the exact same family as the on-watch font versus a close
visual substitute (`approx: true`, with a comment explaining why for
each one).

Three of the watch's built-in system fonts have no substitute at all
in that table: Gothic ("System"), Bitham, and LECO. These are
commercially licensed typefaces (Bitham is a renamed/relicensed
Gotham from Hoefler&Co/Typography.com; Gothic is Mark Simonson's
Raster Gothic; LECO 1976 is licensed from MyFonts), so embedding them
as a live webfont for the settings page to render arbitrary text with
isn't something their licenses cover, even though the app itself is
licensed to use them on the watch. `scripts/generate_hand_style_icons.py`'s
sibling for this, `scripts/generate-font-previews.js`, sidesteps that
by baking in a small PNG of one real on-watch RENDERING of the
picker's own sample text instead -- you're using a font you're
already licensed to use to flatten your own fixed string to an image,
not redistributing the font file itself for a browser to render
arbitrary text with, the same distinction most font EULAs draw between
ordinary desktop use and a separate webfont license.

### Producing the source PNGs

There's no automated renderer for these three (they only exist inside
Pebble's firmware) -- you make them yourself, once, using the actual
`FONT_KEY_*` constant each font id maps to (see `font_lookup.c`):

```c
GFont font = fonts_get_system_font(FONT_KEY_LECO_42_NUMBERS);
graphics_context_set_text_color(ctx, GColorWhite);
graphics_draw_text(ctx, "12:34", font, bounds, GTextOverflowModeWordWrap, GTextAlignmentCenter, NULL);
```

White text (not black) on a transparent/black background -- see
"Keep it themed" below for why. Run this in a throwaway watchapp in
the emulator, screenshot it, and crop tight to the text.

Save each as `resources/font-previews/<fontId>_<role>.png`, where
`fontId` is that font's own numeric id in `FONT_LOOKUP` and `role` is
one of `clock`, `clockFontSmall`, `cornerFont`, `markerTextFont`
(matching `FONT_PICKER_ROLES` in `config-page.js`) -- whichever
picker(s) that font can actually appear in, each with its own sample
text ("12:34", "Tue 12", "-10°C", "12"/"XII"). You don't need every
combination -- a font with no PNG for a given role just falls back to
its existing CSS-approximation text preview for that one button.
`fontLookupEntry(id).mainClock` tells you whether a font is eligible
for the Clock font role at all.

Then bake it in:

```
node scripts/generate-font-previews.js
```

which reads `resources/font-previews/*.png` and writes
`src/pkjs/data/generated/font-preview-images.js`.

### Keep it themed

The picker previews render as white-on-transparent and get CSS-
inverted for light mode (`filter: invert(1)`, undone via
`prefers-color-scheme: dark`) -- the same trick `bitmap-marker-img`
already uses. Author your screenshot with light/white text so it
already looks right in dark mode without any extra work.

## Hand style picker icons

The hand style picker popup (inside each "Edit hour/minute/second
hand" editor) shows a small silhouette icon per `HandConfig.style`
value (Baton/Galba/Pencil/Dauphine/Sword/Pomme/Spade/Arrow/Leaf/
Syringe/Serpentine) next to its name. Unlike the full-width labeled
explainer diagram already covered above (`resources/infographics/
<style name>.png`, via `generate-infographics.js`), these are plain
unlabeled shapes meant to read at a glance in a compact button list --
a separate image set in its own `resources/hand-style-icons/`
subfolder, so the two never collide on a filename.

This is a two-step pipeline, since actually rendering a shape (rather
than just packaging an existing file, which is all the other
generate-*.js scripts here do) needs a real rasterizer, and plain
Node.js has none built in without a native `canvas` dependency:

```
python3 scripts/generate_hand_style_icons.py
node scripts/generate-hand-style-icons.js
```

The first is a from-scratch Python + Pillow port of this project's
own `compute_hand_geometry_fp()` (`hand_layer.c`) -- the exact same
capsule/taper/kite/pentagon/etc. construction the watch itself uses,
just oriented flat (pointing right) and rendered directly instead of
returned as polygon data for a Pebble `GContext` to fill, using
representative width/length/offset parameters chosen to resemble this
project's own reference diagrams rather than any particular preset.
Requires Pillow (`pip install pillow`, or `pip install pillow
--break-system-packages` if your system's `pip` refuses to install
outside a virtualenv). It writes PNGs straight into
`resources/hand-style-icons/`.

The second bakes those PNGs into `src/pkjs/data/generated/hand-style-icon-images.js`,
the same shape every other generate-*.js script here uses.

### Tweaking a shape

Every style's own proportions (width, length, back offset, middle
offset, secondary width, all in the same "px" units `HandConfig`
itself uses) are plain local variables at the top of that style's own
`style_<name>(draw)` function in `generate_hand_style_icons.py` --
change them and re-run both scripts above to see the result. The
white pivot-marker dot's own position (`STYLES`'s third entry per
style) has to land somewhere already solidly inside that style's own
black shape, or it'll just draw on empty transparent canvas -- most
styles just need an axial (x) position, but serpentine's own wavy
centerline needs its actual curve position at that point too (see
`serpentine_dot_point()`).

## Marker preset previews

The marker style picker popup also offers 4 **procedural** presets
(none/minimal/small/big, drawn at runtime from plain shape parameters
-- not to be confused with the 5 bitmap marker styles above, which are
actual image resources) each with its own small preview picture,
`resources/infographics/marker_preset_<name>.png` -> `src/pkjs/data/generated/marker-preset-images.js`:

```
npm install sharp --save-dev   # once
node scripts/generate-preset-previews.js
```

Requires `sharp` (native image processing bindings) since, unlike the
plain "read a PNG, base64 it" scripts above, this one also does real
pixel work: it reads each `marker_preset_<name>.png` and makes any
pure-black pixel transparent before embedding it, so the source art
can be authored on a plain black canvas (no alpha channel to fuss
with) and still show up correctly against the settings page's own
background. `KNOWN_NAMES` in the script (`none`/`minimal`/`small`/
`big`) is the fixed set of valid preset names -- a PNG whose filename
doesn't match one of those four is ignored, and a name with no
matching PNG yet just leaves that preset's button showing no preview
picture (not an error, and it doesn't affect that preset working on
the watch itself).

Note this is a separate pipeline from `generate-infographics.js`
above, even though `generate-infographics.js`'s own top-of-file
comment still describes covering marker-preset pictures too -- that
responsibility has since moved here; `generate-infographics.js`
itself now only produces the hand-style picker pictures and hand-
editor explainer diagrams.

## Weather icon style previews

The Weather icon style picker (Simple/Hollow/Full color) shows one
representative icon -- the "partly cloudy" one -- from each style's
own resource set (`resources/images/icon_<style>_partly_cloudy.png`;
see `draw_weather_icon_simple()`/`_hollow()`/`_filled()` in
`features_layer.c`), scaled up so it's actually legible next to the
option's name in the picker's own button row.

```
npm install pngjs --save-dev   # once
node scripts/generate-weather-icon-previews.js
```

Requires `pngjs` (a pure-JS PNG decoder/encoder, no native bindings)
since, like the hand-style icon script above, this does real pixel
work rather than just packaging an existing file -- specifically,
nearest-neighbor upscaling (never smooth/bilinear interpolation,
which would blur these into a soft smudge) so the enlarged preview
stays crisp and true to the icon's actual on-watch blocky look, the
same reasoning the picker's own CSS (`image-rendering: pixelated`)
backs up on the display side. The scale factor is always a whole
number, chosen per source image so the result lands close to
`TARGET_HEIGHT` (a constant near the top of the script) -- tweak that
constant, not the source PNGs, if the previews come out too small or
large next to the option names.

## Pebble plugins, live settings, weather background, inverted indices

### Plugins (`src/pkjs/plugins/`, `weather/weather-source.js`)

Newer Pebble apps expose *plugins* (data sources: weather, battery, ...) to PKJS via
`Pebble.enumeratePlugins()` / `Pebble.subscribeToSource()`. Everything is feature-detected;
on an older app (or with plugins switched off) the settings page says "Plugins are not enabled",
disables the plugin dropdown and the weather-source select, and weather keeps using Open-Meteo.

- **Weather source** (Weather section): *Pebble weather plugin (default)* or *Open-Meteo*
  (`CONFIG_WEATHER_SOURCE`). With the plugin, temperature, high/low, condition, UV and rain chance come
  from `weather/location` (first saved location); wind, humidity, pressure, cloud cover and the forecast
  arrays are still taken from Open-Meteo because the plugin does not provide them. Any plugin failure
  falls back to plain Open-Meteo.
- **Features -> puzzle category "Plugins"**: lists every text-capable property the installed plugins
  offer (one entry per plugin/category/item/property). Picking one assigns it one of 12 watch text slots
  (content ids 200-211, `CONFIG_PLUGIN_SLOTS`); slots no feature uses are freed on save.
- **Build custom feature**: group *Plugins* -> *Plugin data* with a source picker (primitive
  `PRIM_PLUGIN_TEXT`, aux = slot). Watch side: `WatchData.plugin_text[12][16]`, wire key `PLUGIN_TEXTS`,
  resolver case in `primitive_resolver.c`. `plugins/plugin-manager.js` subscribes to the assigned sources
  and pushes changed texts (debounced) to the watch.
- Values are shown as plain text: shortText first, else numeric value + unit, timestamp (HH:MM),
  boolean (On/Off), longText. Instances: the first one is used.

### Pebble app user preferences (`plugins/preferences.js`, `settings/first-run.js`)

The built-in Preferences plugin exposes `preferences/units` and `preferences/complications`.

- **First start only** (no settings ever saved on this phone): the phone settings are set to the watch's
  own defaults (`WATCH_DEFAULTS` in `settings/first-run.js`, mirroring `src/c/data/watch_defaults.c` --
  keep the two in sync) so the settings page matches what the watch draws; then, once the preferences
  have been read, the preferred units and complications are laid over them and sent to the watch.
  `FIRST_RUN_STATE` in localStorage: absent / `seeded` / `done`; any real settings save sets `done`.
  To retest, clear the watchface's phone storage.
- **Units**: temperature (°C/°F), wind speed (km/h, mph, m/s, knots) and altitude (distance km = meters,
  mi = feet). Pressure, precipitation, clock and the air-quality scale have no setting here.
- **Complications**: the first four go to Upper-middle line 2, Bottom-middle line 1, Middle-left line 1 and
  Middle-right line 1, as plugin text slots. Their source key is `|category|item|property#instance`
  (empty plugin id = the plugin the user prefers; `#n` = instance n of the source).
- **Settings page**: *Features* -> "Load user preferences" and *Weather* -> "Load units from Pebble app"
  redo this on demand (fresh values over the live bridge, else the values read at PKJS start); nothing is kept
  until saved.

### Unit changes apply immediately

Temperature, wind, altitude and air-quality texts are formatted on the phone when weather is sent. The raw
inputs of the last push are kept (`LAST_UNIT_INPUTS`, `comms/message-encoder.js`), and a settings save that
changes a unit calls `resendUnitDisplays()` so the watch gets the re-formatted strings right away, with no
weather refresh. The Border style temperature legend (0/25/50/75/100 % labels) follows the temperature unit too.

### Bundled settings page + live changes

`package.json` has `"configPage": "config.html"`. Apps that support it open `config.html` (a tiny
bootstrap) which fetches the real page from PKJS in chunks (`plugins/config-bridge.js`, message type
`page`) and writes it into the document; the page then sends settings changes to PKJS as you edit
(debounced polling, `liveTick()` in `config/config-runtime.js`) and PKJS applies them exactly like a Save
(`applySettingsObject()` in `index.js`), so the watch follows live. In that mode the Save bar becomes
"Send" (also does a forced refresh when used from "Force refresh now"), the top Back button is hidden
(use the app's own back). The browser/tab title reads `Modern Settings (live)` in this mode and
`(legacy)` in the old one; `(warn)` means the page was served by the bundled bootstrap but `Pebble.sendMessage`
is missing (it then behaves like legacy).
Older apps ignore `configPage` and use the legacy `showConfiguration` / `webviewclosed` flow (unchanged).

**Packaging:** plain `pebble build` does not put `config.html` into the pbw. Build with
`scripts/pack-plugin-pbw.py` from the coredevices/mobileapp repo (it runs `pebble build` and adds the
bundled page); without it the legacy flow is used.

### Weather background

Settings -> Style -> Background: "Weather background" (mutually exclusive with "Use custom
background"; enabling it also switches on the night colour scheme) with a *Style* dropdown. Each folder in
`resources/weatherbg/<style>/` is a style, holding `<condition>_<day|night>.png` (200x228) for the 10
conditions `clear_sky, partly_cloudy, overcast, fog, drizzle, rain, heavy_rain, snow, thunderstorm,
sleet`. Run `node scripts/generate-weather-backgrounds.js` (part of `generate-all.js`) after adding a
style; it writes `src/c/generated/weather_backgrounds.h`, `pkjs/data/generated/weather-backgrounds.js`
and the `WEATHERBG_*` media entries in `package.json`. The watch (`bg_image_cache.c`, background mode 3)
picks the image from `weather_wx_now` (new key `WEATHER_WX_NOW`) and day/night from sunrise/sunset;
missing images fall back to the other time of day, then clear sky.
`resources/weatherbg/manhattan` holds procedurally rendered stand-ins
(`scripts/render-manhattan-weatherbg.py`); overwrite the PNGs with real images of the same names.

### Inverted indices

Checkbox *Inverted blend* under the bitmap indices options (`CONFIG_BITMAP_MARKER_INVERT`): indices are
drawn as black or white, whichever contrasts with the pixels underneath (`marker_bitmap_draw_inverted()`);
combined with *Semi transparent* the effect is halved.

## Style presets and plugin features

A saved style (My Style Presets, JSON export, scheduled styles) stores the Features as content ids; plugin features are ids 200-211 = "plugin slot N". What a slot *means* (which plugin data source) lives in `PLUGIN_SLOTS` / `CONFIG_PLUGIN_SLOTS`, not in any input, so a style now also carries `__pluginSlots` (the 12 slot keys, only slots the style uses). `applyStyleCornersJson()` restores them before the Features are rebuilt, and `scheduled-style.js` writes them to `CONFIG_PLUGIN_SLOTS` for scheduled styles. Styles saved by older builds have no `__pluginSlots`; re-save them once.

## Bitmap indices

Bitmap index styles live in `resources/indices/<name>_background.png` (declared in `package.json`; drawn by `marker_bitmap.c`; previews baked by `scripts/generate-marker-previews.js`). Style ids: 3-7 Modern, Shadow, Tally, Bell, Fancy; 11-19 Modern Bold, Modern F, Modern H, Modern P, Modern P Round, Modern S, Modern W, Modern W Round, Roman. To add one: PNG in `resources/indices/`, a `package.json` resource, a case in `marker_bitmap_resource_id()`, a record in `BITMAP_STYLE_MARGINS` (`feature_layout.c`), an entry in `STYLE_IDS_BY_NAME` (generator) and in `MARKER_VARIANT_STYLES` (`config-page.js`). The 11-19 margin records are placeholders copied from Fancy, and they use Fancy's feature-slot availability rules.
