# Tests

```
tests/
  package.json            npm scripts (no dependencies - Node 18+ built-ins only)
  emulator/               screenshot tests against the Pebble emulator
    run.js                the runner
    cli.json              the ONLY place with pebble CLI syntax and timings; adjust here if a command differs
    scenarios/*.json      hand-written scenarios (name = file name)
    scenarios/_defaults.json   what every scenario starts from (fixed date/time, data, no animations, per-platform defaults)
    scenarios/_families.js     scenarios generated per platform from what the tree offers (complications, indices, backgrounds)
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

Timers: every scenario line shows its duration, every platform a subtotal, and the end a total plus the three slowest scenarios.

## Commands (from the project root)

```
node tests/emulator/run.js --list                  # what would run, per platform and group
node tests/emulator/run.js --probe                 # print the real `pebble ... --help` texts
node tests/emulator/run.js --dry-run               # no emulator: checks all messages build, writes out/dry-run-commands.txt
node tests/emulator/run.js --platform emery --group indices --update   # create/refresh goldens (LOOK at the screenshots first)
node tests/emulator/run.js                         # run everything, exit code 1 on any failure
node tests/emulator/run.js --group complications --platform flint
node tests/emulator/run.js --double-time --fresh -v
cd tests && npm test                               # tooling self-tests (no emulator)
```
Groups: `styles` (the nine example styles), `env` (clock format, battery, Bluetooth, weather, border...), `complications`, `indices`, `backgrounds`.

## What is covered

- **styles / env**: example styles 1-9, plus style 1 with 12h clock, hands stacked, low battery, charging, Bluetooth lost, rain, night time, weather border ring.
- **complications** (generated): every complication in the catalogue except plugin slots, placed into all slots (4 corners + 8 lines; round has no corners),
  chunked by category. Weather ones are shown with three data sets (mild, snow, storm); the others with the default set. The data sets
  (`lib/datasets.js`: mild, rain, snow, hot, storm) cover negative and extreme temperatures, high UV, bad air quality, pressure trends, forecasts, wind.
  Not covered: plugin data, and phone/music complications get no data (they show their "no data" state); Quiet Time and calendar cannot be set from the CLI.
- **indices** (generated per platform): none, the five drawn styles, and every bitmap style that platform has (read from the tree's generated tables).
  On flint each is tested in a dark (white on black) and a light scheme, since 1-bit colour is the usual reason for missing indices.
- **backgrounds** (generated): the predefined backgrounds the platform has (round: only those with a round image; flint: none).
- Scenarios whose preset names a background or a bitmap indices style that the platform does not have are adjusted automatically
  (another available one, or off), so they still show something sensible.
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
- Updating goldens blindly hides regressions: always look at the new screenshots first.
