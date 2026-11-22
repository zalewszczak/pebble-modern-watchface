// Rain outlook complication ("30% in 3 hours" / "No rain for 2 days"): the phone compiles it from the hourly rain
// chance (snapshot.rh) that the weather fetch hands over as extraWeather.rainHourly.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', '..', 'src');
const slots = require(path.join(SRC, 'pkjs/comms/phone-slots.js'));

test('the weather fetch hands the hourly rain chance over to the phone slots', () => {
  const refresh = fs.readFileSync(path.join(SRC, 'pkjs/refresh-manager.js'), 'utf8');
  assert.ok(/rainHourly:\s*snapshot\.rainHourly/.test(refresh), 'refresh-manager must pass snapshot.rainHourly in extraWeather');
  // and the snapshot keeps it
  slots.reset();
  slots.applyWeather({ weatherOk: true, locationName: '', headlineSources: 0, headlineCloud: 0, weather: { condition: 0 },
    extraWeather: { rainHourly: { start: Date.now() - 600000, rain: [0, 0, 10, 40, 80] } } });
  assert.deepStrictEqual(slots.snapshot().rh.rain, [0, 0, 10, 40, 80]);
  slots.reset();
});
