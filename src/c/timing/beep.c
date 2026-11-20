#include "./beep.h"

#ifdef PBL_SPEAKER

// A7 = 3.52 kHz: the shrill pitch of the classic Casio time signal / alarm. Tune these to taste.
#define BEEP_MIDI_NOTE 105
#define BEEP_VOLUME    80 // 0-100
#define BEEP_SHORT_MS  110
#define BEEP_LONG_MS   650
#define BEEP_GAP_MS    90

#define BEEP_NOTE(ms) { .midi_note = BEEP_MIDI_NOTE, .waveform = SpeakerWaveformSquare, .duration_ms = (ms) }

// Static: the speaker service plays the sequence asynchronously.
static const SpeakerNote s_short[] = { BEEP_NOTE(BEEP_SHORT_MS) };
static const SpeakerNote s_long[] = { BEEP_NOTE(BEEP_LONG_MS) };
static const SpeakerNote s_double[] = {
  BEEP_NOTE(BEEP_SHORT_MS),
  { .midi_note = 0, .duration_ms = BEEP_GAP_MS }, // rest
  BEEP_NOTE(BEEP_SHORT_MS),
};

void beep_play(uint8_t kind) {
  const SpeakerNote *notes;
  uint32_t count;
  switch (kind) {
    case BEEP_SHORT:  notes = s_short;  count = ARRAY_LENGTH(s_short);  break;
    case BEEP_LONG:   notes = s_long;   count = ARRAY_LENGTH(s_long);   break;
    case BEEP_DOUBLE: notes = s_double; count = ARRAY_LENGTH(s_double); break;
    default: return;
  }
  speaker_play_notes(notes, count, BEEP_VOLUME);
}

#else

void beep_play(uint8_t kind) { (void)kind; }

#endif
