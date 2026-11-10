# Tests

```
tests/
  package.json            npm scripts (no dependencies - Node 18+ built-ins only)
  emulator/               screenshot tests against the Pebble emulator
    run.js                the runner
    cli.json              the ONLY place with pebble CLI syntax and timings; adjust here if a command differs
    scenarios/*.json      hand-written scenarios (name = file name)
    scenarios/_defaults.json   what every scenario starts from (fixed date/time, data, no animations, per-platform defaults)
    scenarios/_families.js     the generated "tour" scenarios (complications + indices + fonts + icon styles + backgrounds), per platform
    golden/<platform>/    reference screenshots (created with --update)
    out/                  screenshots, diff images, report.html/json of the last run (git-ignored)
    lib/                  png codec, image compare, datasets, scenario resolver, message capture, pebble wrapper
    selftest/             tests of the tooling itself (run without an emulator)
```

Later layers (see `testing_suite.md`): PKJS unit tests, host-compiled C tests, settings-page tests. They get their own folders next to `emulator/`.

## How an emulator test works

For every platform (flint = also covers diorite, emery, gabbro) and scenario:

1. `pebble kill`, `pebble wipe`, `pebble install --emulator <platform>` once per platform, then wait for the app's own startup traffic.
2. Time format, battery and Bluetooth are set only when they differ from the previous scenario.
3. The **real phone code** (`src/pkjs`, in `lib/capture.js`) runs with the scenario's settings and a **fixed date, location and data set**:
   the example style is applied by the app's own `scheduled-style.applyPreset`, `buildFullKeysetDict` builds the settings and
   `sendWeatherData` the weather/astronomy/forecast/air quality/ISS/aurora data, exactly as `refresh-manager` would (sunrise, moon phase and
   "last update" come out identical on every run because `Date` is pinned). The AppMessages are sent with `pebble send-app-message`;
   messages identical to what the emulator already has are skipped (`--resend-all` sends everything).
4. The clock is pinned LAST, right before the screenshot (`emu-set-time <unix>` - a full date, so date complications do not change from day to day),
   then `pebble screenshot --no-correction --no-open`. The emulator clock keeps running and a redraw draws the time of that moment, so anything that
   redraws (messages, battery, Bluetooth) happens before. By default the clock is set once. If the comparison fails, the runner retakes up to `retries`
   times (default 2) and **every retake sets the clock twice** (one minute earlier first, then the target - a minute change that forces a redraw).
   `--double-time` (or `"doubleSetTime": true` in a scenario) does the double set on the first take too.
5. Compare with `golden/<platform>/<scenario>.png` (exact by default; gabbro's transparent round corners are handled).
   On a mismatch: `out/<platform>/<scenario>.diff.png` (magenta = changed) and `out/report.html` (failures first: golden | new | diff).
6. **Review and accept in the browser**: `node tests/emulator/run.js --serve` serves the report on http://127.0.0.1:8765/. Every failing row has an
   "Accept new screenshot as golden" button; it asks for confirmation (popup) and then copies the new screenshot over the golden image.
   (Opened directly as a file the buttons only explain how to start the server.)

Timers: every scenario line shows its duration, every platform a subtotal, and the end a total plus the three slowest scenarios.

## Commands (from the project root)

```
node tests/emulator/run.js --list                  # what would run, per platform and group
node tests/emulator/run.js --probe                 # print the real `pebble ... --help` texts
node tests/emulator/run.js --dry-run               # no emulator: checks all messages build, writes out/dry-run-commands.txt
node tests/emulator/run.js --platform emery --group tour --update    # create/refresh goldens (LOOK at the screenshots first)
node tests/emulator/run.js --update2     # golden only when 2 consecutive screenshots are identical (--update3: three)
node tests/emulator/run.js --serve       # review the last report in the browser, accept changes as new goldens
node tests/emulator/run.js                         # run everything, exit code 1 on any failure
node tests/emulator/run.js --group tour --platform flint
node tests/emulator/run.js --double-time --fresh -v
cd tests && npm test                               # tooling self-tests (no emulator)
```
Groups: `styles` (the nine example styles), `env` (battery, Bluetooth, clock format, weather, border, night), `tour`.

## What is covered (about 30 scenarios per platform)

- **styles** (9): the example styles as shipped (indices styles that a platform lacks, and backgrounds it lacks, are swapped for available ones).
- **env** (3): low battery + Bluetooth lost + 12h clock; charging + rain + hands stacked; night scheme + weather border ring.
- **tour** (~20, generated, `scenarios/_families.js`): each scenario shows a batch of complications and, at the same time, one indices style, one
  predefined background, one complication font, one icon style (Simple / Hollow / Full colour) and - on flint - alternately a dark or light scheme.
  Across the tour:
  - every complication of the catalogue appears (packed into all slots, 4 corners + 8 lines; round has no corners; wide ones in the lines),
    except plugin slots; the weather ones appear twice with different data sets (mild, rain, snow, hot, storm in `lib/datasets.js`:
    negative and extreme temperatures, UV, bad air quality, pressure trends, forecasts, wind);
  - every bitmap indices style of the platform appears once (read from the tree's generated tables), plus the drawn styles none (0), 2 and 10,
    the inverted blend and (colour) the semi-transparent blend; Braun (1) and Classy (9) come with example styles 2 and 3;
  - every predefined background of the platform (round: only those with a round image; flint: none);
  - 20 complication fonts and the 3 icon styles rotate.
  The scenario descriptions (`--list`, report) name everything a tour screenshot contains.
- Not covered: plugin data; phone/music complications get no data (they show their "no data" state); Quiet Time and calendar cannot be set from the CLI.
- flint starts from a clean white-on-black scheme (`platformDefaults.flint` in `_defaults.json`).

## Adding a scenario

Create `scenarios/<name>.json` (the `name` must equal the file name). Everything is optional except `name` and something to show:

```json
{
  "name": "my-case", "group": "env",
  "exampleStyle": 3,
  "preset": { "handHourColor": "2" },
  "settings": { "CONFIG_BORDER_SOURCE": "1" },
  "dataset": "storm", "data": { "weather": { "tempC": -3 } },
  "clock": { "date": "2026-12-24", "time": "07:45:00", "format": "12h" },
  "battery": { "percent": 15, "charging": false },
  "bluetooth": false,
  "platforms": ["emery", "gabbro"],
  "platformOverrides": { "flint": { "preset": { "customBgValue": "255" } } },
  "tolerance": { "maxDiffPixels": 0, "channelTolerance": 0 },
  "doubleSetTime": false, "noData": false
}
```
`preset` uses settings-page field names (as in `src/pkjs/example-style-presets.js`), `settings` raw `CONFIG_*` localStorage keys.
Then `--update --scenario my-case`, inspect the golden, commit it.

## Things to know

- **Clock timezone**: `emu-set-time <unix>` is assumed to show the host computer's local time (`"clockTimezone": "host"` in `cli.json`). If the emulator
  shows UTC instead, set it to `"utc"`. Phase 0 check: the first screenshot must read 10:08 and the date 24 (Sep 2026).
- With the second hand hidden the watch draws hour and minute hands on whole minutes, so a late redraw looks the same. A scenario that shows the second hand is timing-sensitive.
- The emulator also runs the app's own PKJS, which sends default settings ~5 s after start; the runner waits `afterInstallMs` (12 s) before sending.
- To speed up a run: lower `betweenMessagesMs` / `settleMs` and the `timing` values in `cli.json`, run one `--group` or `--platform`, and keep `--fresh` off.
- `--update2` / `--update3` take screenshots until 2 / 3 in a row are identical (at most 3x as many takes) and write nothing if they never agree.
- Updating goldens blindly hides regressions: always look at the new screenshots first.
