// Sound choices of the hourly indication and of the "Bluetooth connection lost" beep. `name` is the BEEP_<name>
// constant in src/c/timing/beep.h, `value` its number (tests/pkjs/beep-options.test.js keeps both in step).
// Each setting offers its own subset of the shared sound table.
var HOURLY = [
  { value: 0, name: 'OFF', label: 'Off' },
  { group: 'Beeps' },
  { value: 1, name: 'SHORT', label: 'Short beep' },
  { value: 2, name: 'LONG', label: 'Long beep' },
  { value: 3, name: 'DOUBLE', label: 'Double beep' },
  { value: 4, name: 'MORSE_HOUR', label: 'Hour in Morse code' },
  { group: 'Chimes' },
  { value: 16, name: 'CLASSIC', label: 'Classic two-tone' },
  { value: 7, name: 'BIG_BEN', label: 'Big Ben' },
  { value: 6, name: 'GRANDFATHER', label: 'Grandfather clock' },
  { value: 11, name: 'DING_DONG', label: 'Ding-dong' },
  { value: 15, name: 'GONG', label: 'Gong' },
  { value: 12, name: 'WIND_CHIMES', label: 'Wind chimes' },
  { value: 13, name: 'HARP', label: 'Harp' },
  { value: 14, name: 'XYLOPHONE', label: 'Xylophone' },
  { value: 29, name: 'GLASS_DROPS', label: 'Glass drops' },
  { value: 26, name: 'WARM_THIRDS', label: 'Warm thirds' },
  { value: 27, name: 'BRIGHT_PAIR', label: 'Bright pair' },
  { value: 28, name: 'LOW_HIGH_LOW', label: 'Low-high-low' },
  { value: 30, name: 'MINUTE_MARK', label: 'Three pips' },
  { group: 'Electronic' },
  { value: 5, name: 'PHONE_RING', label: 'Mobile phone ring' },
  { value: 19, name: 'MOBILE', label: 'Ringtone motif' },
  { value: 8, name: 'SUCCESS', label: 'Success' },
  { value: 9, name: 'SCIFI_COMMUNICATOR', label: 'Sci-fi communicator chime' },
  { value: 21, name: 'COMMUNICATOR', label: 'Retro communicator call' },
  { value: 10, name: 'SCIFI_SCANNER', label: 'Sci-fi scanner chime' },
  { value: 23, name: 'SCI_FI_SCANNER', label: 'Scanner sweep' },
  { value: 18, name: 'ORBIT', label: 'Orbit signal' },
  { value: 17, name: 'ARCADE', label: 'Arcade flourish' },
  { value: 20, name: 'PIXEL_QUEST', label: 'Pixel quest fanfare' },
  { value: 22, name: 'CONSOLE_POWERUP', label: 'Console power-up' },
  { value: 24, name: 'TV_IDENT', label: 'TV signature' },
  { value: 25, name: 'DIGITAL_ALERT', label: 'Digital alert' }
];

var DISCONNECT = [
  { value: 0, name: 'OFF', label: 'Off' },
  { group: 'Beeps' },
  { value: 1, name: 'SHORT', label: 'Short beep' },
  { value: 2, name: 'LONG', label: 'Long beep' },
  { value: 3, name: 'DOUBLE', label: 'Double beep' },
  { group: 'Signals' },
  { value: 31, name: 'GAME_OVER', label: 'Game over' },
  { value: 32, name: 'SHUTDOWN', label: 'System shutdown' },
  { value: 33, name: 'WARNING', label: 'Warning alarm' },
  { value: 36, name: 'SOS', label: 'SOS' },
  { value: 34, name: 'CUCKOO', label: 'Cuckoo' },
  { value: 35, name: 'SHIP_BELL', label: "Ship's bell" },
  { value: 37, name: 'MUSIC_BOX', label: 'Music box' }
];

// <option>/<optgroup> markup for a <select>; `selected` is the stored value (a string).
function optionsHtml(list, selected) {
  var out = '', open = false;
  list.forEach(function (o) {
    if (o.group) {
      if (open) out += '</optgroup>';
      out += '<optgroup label="' + o.group + '">';
      open = true;
    } else {
      out += '<option value="' + o.value + '"' + (String(o.value) === String(selected) ? ' selected' : '') + '>' + o.label + '</option>';
    }
  });
  if (open) out += '</optgroup>';
  return out;
}

function isValid(list, v) {
  return list.some(function (o) { return !o.group && o.value === v; });
}

module.exports = { HOURLY: HOURLY, DISCONNECT: DISCONNECT, optionsHtml: optionsHtml, isValid: isValid, VOLUME_DEFAULT: 50 };
