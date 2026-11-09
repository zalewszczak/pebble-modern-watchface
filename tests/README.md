# Tests

```
tests/
  package.json            npm scripts (no dependencies - Node 18+ built-ins only)
  emulator/               screenshot tests against the Pebble emulator   <- implemented
    run.js                the runner
    cli.json              the ONLY place with pebble CLI syntax; adjust here if a command differs
    scenarios/*.json      one file per screenshot (name = file name); _defaults.json pins everything that must not vary
    golden/<platform>/    reference screenshots (created with --update)
    out/                  screenshots, diff images and report.html from the last run (git-ignored)
    lib/                  png codec, image compare, message capture, pebble wrapper
    selftest/             tests of the tooling itself (run without an emulator)
```

Later layers (see `testing_suite.md`): PKJS unit tests, host-compiled C tests, settings-page tests. They get their own folders next to `emulator/`.

## How an emulator test works

For every platform (flint = also covers diorite, emery, gabbro) and scenario:

1. `pebble kill`, `pebble wipe`, `pebble install --emulator <platform>`, wait for the app's own startup traffic.
2. Pin the world: `emu-time-format`, `emu-battery`, `emu-bt-connection`.
3. Run the **real phone code** (`src/pkjs`, in `lib/capture.js`) with the scenario's settings: the example style is applied by
   the app's own `scheduled-style.applyPreset`, then `buildFullKeysetDict` / `sendFakeWeather` build the real AppMessages.
   Those are sent to the watch with `pebble send-app-message`. So settings encoding, message layout and the watch decoder are all exercised.
4. Pin the clock LAST (set one minute earlier, then to the target time, so the watch redraws), wait 0.4 s and run
   `pebble screenshot --no-correction --no-open`. The emulator clock keeps running, and a hand is drawn at the time of the last redraw,
   so anything that redraws (messages, battery, Bluetooth) must happen before the clock is set. On a mismatch the runner retakes
   the clock+screenshot up to `retries` times (default 2) before failing. Then compare with `golden/<platform>/<scenario>.png`
   (exact by default; gabbro's transparent round corners are handled; transparent vs opaque counts as a difference).
5. On a mismatch: `out/<platform>/<scenario>.diff.png` (magenta = changed) and `out/report.html` (golden | new | diff side by side).

## Commands (run from the project root, or from `tests/` with npm)

```
node tests/emulator/run.js --probe                 # print the real `pebble ... --help` texts; do this first
node tests/emulator/run.js --dry-run               # no emulator: checks messages build for all scenarios, writes out/dry-run-commands.txt
node tests/emulator/run.js --platform emery --scenario style-1 --update   # create/refresh a golden (LOOK at the screenshot first)
node tests/emulator/run.js                         # run everything, exit code 1 on any failure
node tests/emulator/run.js --fresh -v              # wipe + reinstall per scenario, print every command
cd tests && npm test                               # tooling self-tests (no emulator)
```

## Adding a scenario

Create `scenarios/<name>.json` (the `name` must equal the file name):

```json
{
  "name": "my-case",
  "exampleStyle": 3,
  "preset": { "handHourColor": "2" },
  "settings": { "CONFIG_BORDER_SOURCE": "1" },
  "weather": { "WEATHER_CONDITION": 5, "WEATHER_TEMP_C": 4 },
  "clock": { "time": "07:45:00", "format": "12h" },
  "battery": { "percent": 15, "charging": false },
  "bluetooth": false,
  "platforms": ["emery", "gabbro"],
  "tolerance": { "maxDiffPixels": 0, "channelTolerance": 0 },
  "settleMs": 3000
}
```
Everything is optional except `name` and something to show. `preset` uses the settings-page field names (as in `src/pkjs/example-style-presets.js`),
`settings` uses raw `CONFIG_*` localStorage keys. Then `--update --scenario my-case`, inspect `golden/.../my-case.png`, commit it.

## Known limits

- **Not yet run against a real emulator** (the sandbox this was written in has no pebble CLI). Everything up to the CLI call is tested:
  message capture, key-id mapping, PNG codec, comparison, dry run. The exact flags for `send-app-message` are a best guess in `cli.json`.
- With the second hand hidden, the watch draws hour and minute hands on whole minutes (seconds ignored), so a redraw a few seconds
  late looks identical. With the second hand shown, hands are second-precise and such a scenario would be timing-sensitive; the default
  scenarios all hide it.
- The emulator also runs the app's own PKJS, which sends default settings ~5 s after start. The runner waits `afterInstallMs` (12 s)
  before sending; if a screenshot shows default settings, raise it, or add a test-build switch that silences the app's own phone traffic.
- Scenarios that vary battery / Bluetooth / time only show a difference if the chosen style has a complication that uses it.
- Quiet Time, calendar and phone/music data cannot be set from the CLI, so they are not covered here.
- Updating goldens blindly hides regressions: always look at the new screenshots before committing them.
