#pragma once

#include <pebble.h>

// Sound ids, as stored in WatchData (hourly_vibe_sound / bt_lost_beep) and sent by the settings page.
// Hourly and Bluetooth-lost sounds share this id space; each setting simply offers its own subset (see
// BEEP_HOURLY_OPTIONS / BEEP_DISCONNECT_OPTIONS in src/pkjs/config/beep-options.js, which must match).
// Ids are stored settings: only ever append.
typedef enum {
  BEEP_OFF = 0,
  BEEP_SHORT,
  BEEP_LONG,
  BEEP_DOUBLE,
  BEEP_MORSE_HOUR,       // the current hour as Morse code, on the same pitch as the short beep

  // Hourly chimes
  BEEP_PHONE_RING,
  BEEP_GRANDFATHER,
  BEEP_BIG_BEN,
  BEEP_SUCCESS,
  BEEP_SCIFI_COMMUNICATOR,
  BEEP_SCIFI_SCANNER,
  BEEP_DING_DONG,
  BEEP_WIND_CHIMES,
  BEEP_HARP,
  BEEP_CHURCH_BELL,
  BEEP_XYLOPHONE,
  BEEP_GONG,
  BEEP_CLASSIC,
  BEEP_ARCADE,
  BEEP_ORBIT,
  BEEP_MOBILE,
  BEEP_PIXEL_QUEST,
  BEEP_COMMUNICATOR,
  BEEP_DOORBELL,
  BEEP_CONSOLE_POWERUP,
  BEEP_SCI_FI_SCANNER,
  BEEP_TV_IDENT,
  BEEP_DIGITAL_ALERT,
  BEEP_WARM_THIRDS,
  BEEP_BRIGHT_PAIR,
  BEEP_LOW_HIGH_LOW,
  BEEP_GLASS_DROPS,
  BEEP_MINUTE_MARK,

  // Bluetooth-lost sounds
  BEEP_GAME_OVER,
  BEEP_SHUTDOWN,
  BEEP_WARNING,
  BEEP_CUCKOO,
  BEEP_SHIP_BELL,
  BEEP_SOS,
  BEEP_MUSIC_BOX,
  BEEP_GENTLE_ASCENT,
  BEEP_GENTLE_DESCENT,

  BEEP_KIND_COUNT,
} BeepKind;

#define BEEP_VOLUME_DEFAULT 50 // percent; the settings page offers 10..100 in steps of 10

// Plays a sound through the watch speaker (Speaker API, SDK 4.9+) at `volume` percent (10-100). Every sound
// starts with a 250 ms rest: the first note of an asynchronously played sequence otherwise stutters. Does nothing
// on watches without a speaker (no PBL_SPEAKER), for BEEP_OFF or an unknown id, and while the system keeps the
// speaker muted (Quiet Time; apps cannot override that).
void beep_play(uint8_t kind, uint8_t volume);
