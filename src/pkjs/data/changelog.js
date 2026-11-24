// changelog.js -- release notes shown by the "NEW!" button in the settings page.
//
// Newest version FIRST. When you bump "version" in package.json, add a new entry on top here (keep its version
// identical to package.json -- tests/pkjs/changelog.test.js checks that) and add short bullets while you work.
// Keep every bullet to a few words. The version at index 0 is what the NEW! button pulses for.
module.exports = [
  { version: '4.0.8', items: [
    'Battery usage estimate button',
    'Smarter data update triggers',
    'Separate settings per platform',
    'Calendar complications',
    'Calories burned complication',
    'Rain outlook complication',
    'Chime icon complication',
    'Multi-line plugin text complication',
    'Hourly chimes with volume and preview',
    'Chime when Bluetooth is lost',
    'Complications startup animation',
    'Seconds indices animation',
    'Downloadable indices from GitHub',
    'Custom complication builder improvements',
    'Legacy watches: tweaked hands and complications'
  ] },
  { version: '4.0.7', items: [
    'Moved complication text preparation to phone',
    'Optimized combined complications',
    'Improved round indices',
    'Refreshed previews'
  ] },
  { version: '4.0.6', items: [
    'Plugin image preview in settings',
    'Image cycling on B&W watches',
    'Round: lower memory use, fixed image loading',
    'Round: complication spacing fixes',
    'Per-platform example styles',
    'Border ring tweaks',
    'Numerals no longer animate',
    'My Styles JSON export fix',
    'Pebble logo drawing fix'
  ] },
  { version: '4.0.5', items: [
    'Calendar border ring',
    'Phone battery complication',
    'Music complications (Android)',
    '"Features" renamed to "complications"',
    'Fisheye lens effect for round',
    'Per-platform indices and offsets',
    'Auto colors from plugin image',
    'Plugin image progress bar',
    'Optional plugin image caching',
    'Odd-state option for status icons',
    'Permission warnings',
    'Black & white screen tweaks',
    'Settings page tweaks'
  ] },
  { version: '4.0.4', items: [
    'Fixed permissions',
    'Fixed opening external links'
  ] },
  { version: '4.0.3', items: [
    'Restored live preview',
    'Fixed donate button'
  ] },
  { version: '4.0.2', items: [
    'Black & white artwork tweaks'
  ] },
  { version: '4.0.1', items: [
    'Black & white watches support'
  ] },
  { version: '4.0.0', items: [
    'Round watch support (beta)',
    'Pebble plugins support',
    'Plugin images as background',
    'Weather backgrounds',
    'Weather border ring',
    'Custom complication builder',
    'Live settings updates',
    'Example styles',
    'Translucent backgrounds',
    'Semi-transparent hands on shake',
    'Inverted indices mode',
    'Vibrate when Bluetooth is lost',
    'Preferred settings from Pebble app',
    'Whole-degree border temperatures',
    'Font tweaks'
  ] }
];
