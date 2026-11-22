#include "./beep.h"

#ifdef PBL_SPEAKER

// Sounds are stored as compact (midi note, duration in 5 ms units) byte pairs, a note of 0 being a rest, and
// expanded into SpeakerNotes when played (the speaker service plays the sequence asynchronously, so the
// expanded buffer is static). Ids and order match BeepKind in beep.h.
#define N(midi, ms) (midi), ((ms) / 5)
#define LEAD_REST_MS 250   // first note of an async sequence stutters without this
#define MAX_NOTES 32
#define TONE_MIDI 105      // A7 = 3.52 kHz, the shrill pitch of a classic Casio time signal (short/long/double/Morse)

static const uint8_t SND_SHORT[] = { N(107, 110) };
static const uint8_t SND_LONG[] = { N(107, 650) };
static const uint8_t SND_DOUBLE[] = { N(107, 110), N(0, 80), N(107, 110) };
static const uint8_t SND_PHONE_RING[] = { N(91, 50), N(96, 50), N(91, 50), N(96, 50), N(91, 50), N(96, 50), N(91, 50), N(96, 50), N(0, 160), N(91, 50), N(96, 50), N(91, 50), N(96, 50), N(91, 50), N(96, 50), N(91, 50), N(96, 50) };
static const uint8_t SND_GRANDFATHER[] = { N(76, 200), N(0, 80), N(72, 200), N(0, 80), N(67, 200), N(0, 80), N(60, 500) };
static const uint8_t SND_BIG_BEN[] = { N(68, 380), N(0, 100), N(66, 380), N(0, 100), N(64, 380), N(0, 100), N(59, 700), N(0, 380), N(64, 380), N(0, 100), N(66, 380), N(0, 100), N(68, 380), N(0, 100), N(64, 700) };
static const uint8_t SND_SUCCESS[] = { N(84, 90), N(88, 90), N(91, 90), N(96, 300) };
static const uint8_t SND_SCIFI_COMMUNICATOR[] = { N(93, 60), N(0, 25), N(98, 60), N(0, 25), N(105, 60), N(0, 25), N(98, 150) };
static const uint8_t SND_SCIFI_SCANNER[] = { N(72, 40), N(76, 40), N(79, 40), N(84, 40), N(88, 40), N(91, 40), N(96, 40), N(100, 40), N(103, 120) };
static const uint8_t SND_DING_DONG[] = { N(96, 200), N(0, 30), N(88, 400) };
static const uint8_t SND_WIND_CHIMES[] = { N(100, 80), N(0, 20), N(93, 80), N(0, 20), N(98, 80), N(0, 20), N(91, 80), N(0, 20), N(96, 80), N(0, 20), N(88, 260) };
static const uint8_t SND_HARP[] = { N(72, 80), N(76, 80), N(79, 80), N(84, 80), N(88, 80), N(91, 80), N(96, 260) };
static const uint8_t SND_XYLOPHONE[] = { N(96, 60), N(0, 40), N(100, 60), N(0, 40), N(103, 60), N(0, 40), N(105, 60), N(0, 40), N(103, 60), N(0, 40), N(100, 160) };
static const uint8_t SND_GONG[] = { N(48, 180), N(55, 700) };
static const uint8_t SND_CLASSIC[] = { N(84, 190), N(0, 55), N(91, 300) };
static const uint8_t SND_ARCADE[] = { N(84, 115), N(0, 35), N(88, 115), N(0, 35), N(91, 230) };
static const uint8_t SND_ORBIT[] = { N(96, 150), N(0, 45), N(89, 210), N(0, 45), N(93, 280) };
static const uint8_t SND_MOBILE[] = { N(88, 125), N(0, 30), N(91, 125), N(0, 30), N(96, 190), N(0, 30), N(91, 250) };
static const uint8_t SND_PIXEL_QUEST[] = { N(84, 100), N(0, 25), N(91, 100), N(0, 25), N(96, 100), N(0, 25), N(103, 230), N(0, 40), N(100, 140) };
static const uint8_t SND_COMMUNICATOR[] = { N(100, 120), N(0, 45), N(88, 260), N(0, 90), N(95, 120), N(0, 45), N(83, 320) };
static const uint8_t SND_CONSOLE_POWERUP[] = { N(72, 100), N(0, 35), N(79, 100), N(0, 35), N(84, 100), N(0, 35), N(91, 160), N(0, 45), N(96, 260) };
static const uint8_t SND_SCI_FI_SCANNER[] = { N(103, 100), N(0, 45), N(76, 170), N(0, 45), N(100, 100), N(0, 45), N(79, 170), N(0, 45), N(103, 260) };
static const uint8_t SND_TV_IDENT[] = { N(79, 130), N(0, 35), N(88, 130), N(0, 35), N(96, 330) };
static const uint8_t SND_DIGITAL_ALERT[] = { N(96, 105), N(0, 55), N(96, 105), N(0, 55), N(103, 250) };
static const uint8_t SND_WARM_THIRDS[] = { N(84, 125), N(0, 35), N(88, 125), N(0, 35), N(91, 210) };
static const uint8_t SND_BRIGHT_PAIR[] = { N(96, 125), N(0, 85), N(96, 190) };
static const uint8_t SND_LOW_HIGH_LOW[] = { N(79, 130), N(0, 40), N(91, 130), N(0, 40), N(84, 220) };
static const uint8_t SND_GLASS_DROPS[] = { N(100, 115), N(0, 65), N(96, 145), N(0, 65), N(103, 190) };
static const uint8_t SND_MINUTE_MARK[] = { N(88, 95), N(0, 65), N(88, 95), N(0, 65), N(88, 180) };
static const uint8_t SND_GAME_OVER[] = { N(79, 160), N(0, 30), N(77, 160), N(0, 30), N(75, 160), N(0, 30), N(72, 420) };
static const uint8_t SND_SHUTDOWN[] = { N(96, 90), N(91, 90), N(84, 90), N(79, 90), N(72, 90), N(67, 300) };
static const uint8_t SND_WARNING[] = { N(98, 100), N(0, 20), N(91, 100), N(0, 20), N(98, 100), N(0, 20), N(91, 100), N(0, 20), N(98, 100), N(0, 20), N(91, 200) };
static const uint8_t SND_CUCKOO[] = { N(91, 210), N(0, 90), N(84, 320), N(0, 240), N(91, 210), N(0, 90), N(84, 420) };
static const uint8_t SND_SHIP_BELL[] = { N(79, 170), N(0, 65), N(79, 170), N(0, 260), N(79, 170), N(0, 65), N(79, 330) };
static const uint8_t SND_SOS[] = { N(96, 110), N(0, 65), N(96, 110), N(0, 65), N(96, 110), N(0, 170), N(96, 330), N(0, 65), N(96, 330), N(0, 65), N(96, 330), N(0, 170), N(96, 110) };
static const uint8_t SND_MUSIC_BOX[] = { N(100, 180), N(0, 65), N(96, 180), N(0, 65), N(91, 180), N(0, 65), N(88, 340) };

typedef struct { const uint8_t *data; uint8_t pairs; } Sound;
#define SND(name) { SND_##name, sizeof(SND_##name) / 2 }
// Index = BeepKind - 1 (BEEP_OFF has no sound); BEEP_MORSE_HOUR is built on the fly.
static const Sound SOUNDS[] = {
  SND(SHORT),
  SND(LONG),
  SND(DOUBLE),
  { NULL, 0 },
  SND(PHONE_RING),
  SND(GRANDFATHER),
  SND(BIG_BEN),
  SND(SUCCESS),
  SND(SCIFI_COMMUNICATOR),
  SND(SCIFI_SCANNER),
  SND(DING_DONG),
  SND(WIND_CHIMES),
  SND(HARP),
  SND(XYLOPHONE),
  SND(GONG),
  SND(CLASSIC),
  SND(ARCADE),
  SND(ORBIT),
  SND(MOBILE),
  SND(PIXEL_QUEST),
  SND(COMMUNICATOR),
  SND(CONSOLE_POWERUP),
  SND(SCI_FI_SCANNER),
  SND(TV_IDENT),
  SND(DIGITAL_ALERT),
  SND(WARM_THIRDS),
  SND(BRIGHT_PAIR),
  SND(LOW_HIGH_LOW),
  SND(GLASS_DROPS),
  SND(MINUTE_MARK),
  SND(GAME_OVER),
  SND(SHUTDOWN),
  SND(WARNING),
  SND(CUCKOO),
  SND(SHIP_BELL),
  SND(SOS),
  SND(MUSIC_BOX),
};

_Static_assert(sizeof(SOUNDS) / sizeof(SOUNDS[0]) == BEEP_KIND_COUNT - 1, "SOUNDS must match BeepKind");

static SpeakerNote s_notes[MAX_NOTES];
static uint32_t s_count;

static void add_note(uint8_t midi, uint32_t ms) {
  if (s_count >= MAX_NOTES) return;
  if (midi == 0) {
    s_notes[s_count] = (SpeakerNote) { .midi_note = 0, .duration_ms = ms }; // a rest has no waveform
  } else {
    s_notes[s_count] = (SpeakerNote) { .midi_note = midi, .waveform = SpeakerWaveformSquare, .duration_ms = ms };
  }
  s_count++;
}

// Morse digits, one string per digit ('.' = dot, '-' = dash).
static const char *const MORSE_DIGITS[10] = {
  "-----", ".----", "..---", "...--", "....-", ".....", "-....", "--...", "---..", "----."
};
#define MORSE_DOT_MS 70
#define MORSE_DASH_MS 210
#define MORSE_GAP_MS 60
#define MORSE_DIGIT_GAP_MS 180

static void add_morse_digit(int digit) {
  const char *code = MORSE_DIGITS[digit];
  for (int i = 0; code[i]; i++) {
    if (i > 0) add_note(0, MORSE_GAP_MS);
    add_note(TONE_MIDI, code[i] == '.' ? MORSE_DOT_MS : MORSE_DASH_MS);
  }
}

static void build_morse_hour(void) {
  time_t now = time(NULL);
  int hour = localtime(&now)->tm_hour;
  if (!clock_is_24h_style()) { hour %= 12; if (hour == 0) hour = 12; }
  if (hour >= 10) { add_morse_digit(hour / 10); add_note(0, MORSE_DIGIT_GAP_MS); }
  add_morse_digit(hour % 10);
}

void beep_play(uint8_t kind, uint8_t volume) {
  if (kind == BEEP_OFF || kind >= BEEP_KIND_COUNT) return;
  // Quiet Time: never make a sound. The system does not reliably keep the speaker muted for apps, so every
  // caller (hourly beep, Bluetooth-lost beep, settings preview) is gated here, in one place.
  if (quiet_time_is_active()) return;
  s_count = 0;
  add_note(0, LEAD_REST_MS);
  if (kind == BEEP_MORSE_HOUR) {
    build_morse_hour();
  } else {
    const Sound *s = &SOUNDS[kind - 1];
    for (uint8_t i = 0; i < s->pairs; i++) {
      add_note(s->data[i * 2], (uint32_t)s->data[i * 2 + 1] * 5);
    }
  }
  if (volume < 10) volume = 10;
  if (volume > 100) volume = 100;
  speaker_play_notes(s_notes, s_count, volume);
}

#else

void beep_play(uint8_t kind, uint8_t volume) { (void)kind; (void)volume; }

#endif
