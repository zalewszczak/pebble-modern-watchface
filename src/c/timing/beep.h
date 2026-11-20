#pragma once

#include <pebble.h>

// Beep kinds, as stored in WatchData (hourly_vibe_sound / bt_lost_beep).
#define BEEP_OFF    0
#define BEEP_SHORT  1
#define BEEP_LONG   2
#define BEEP_DOUBLE 3

// Plays a high-pitched square-wave beep, like the time signal of an old digital quartz watch, through the
// watch speaker (Speaker API, SDK 4.9+). Does nothing on watches without a speaker (no PBL_SPEAKER), when
// `kind` is BEEP_OFF, or while the system keeps the speaker muted (Quiet Time; apps cannot override that).
void beep_play(uint8_t kind);
