// GENERATED FILE -- do not hand-edit.
// Produced by scripts/generate-backgrounds.js from resources/{square,round,legacy}/backgrounds/<n>.png.
#pragma once

#include <pebble.h>
#include "../rendering/dial/bg_picture.h"

// Number of predefined background images compiled into this build.
#define BG_PRESET_COUNT 18

// Resource id of predefined background <n> (1-based, the number in the PNG
// file name), or 0 when there is no such image.
// On a round watch only the presets that have a resources/round/backgrounds/<n>.png exist, on a
// black and white one (flint, diorite) none (predefined backgrounds are not offered there).
static inline BgPicture bg_preset_picture(uint8_t n) {
#ifdef PBL_ROUND
  switch (n) {
    case 1: return BG_PIC2(RESOURCE_ID_BG_PRESET_1_P0, RESOURCE_ID_BG_PRESET_1_P1);
    case 2: return BG_PIC2(RESOURCE_ID_BG_PRESET_2_P0, RESOURCE_ID_BG_PRESET_2_P1);
    case 3: return BG_PIC2(RESOURCE_ID_BG_PRESET_3_P0, RESOURCE_ID_BG_PRESET_3_P1);
    case 4: return BG_PIC2(RESOURCE_ID_BG_PRESET_4_P0, RESOURCE_ID_BG_PRESET_4_P1);
    case 5: return BG_PIC2(RESOURCE_ID_BG_PRESET_5_P0, RESOURCE_ID_BG_PRESET_5_P1);
    case 6: return BG_PIC2(RESOURCE_ID_BG_PRESET_6_P0, RESOURCE_ID_BG_PRESET_6_P1);
    case 7: return BG_PIC2(RESOURCE_ID_BG_PRESET_7_P0, RESOURCE_ID_BG_PRESET_7_P1);
    case 8: return BG_PIC2(RESOURCE_ID_BG_PRESET_8_P0, RESOURCE_ID_BG_PRESET_8_P1);
    case 9: return BG_PIC2(RESOURCE_ID_BG_PRESET_9_P0, RESOURCE_ID_BG_PRESET_9_P1);
    case 10: return BG_PIC2(RESOURCE_ID_BG_PRESET_10_P0, RESOURCE_ID_BG_PRESET_10_P1);
    default: return BG_PIC_NONE;
  }
#elif defined(PBL_BW)
  switch (n) {
    default: return BG_PIC_NONE;
  }
#else
  switch (n) {
    case 1: return BG_PIC1(RESOURCE_ID_BG_PRESET_1);
    case 2: return BG_PIC1(RESOURCE_ID_BG_PRESET_2);
    case 3: return BG_PIC1(RESOURCE_ID_BG_PRESET_3);
    case 4: return BG_PIC1(RESOURCE_ID_BG_PRESET_4);
    case 5: return BG_PIC1(RESOURCE_ID_BG_PRESET_5);
    case 6: return BG_PIC1(RESOURCE_ID_BG_PRESET_6);
    case 7: return BG_PIC1(RESOURCE_ID_BG_PRESET_7);
    case 8: return BG_PIC1(RESOURCE_ID_BG_PRESET_8);
    case 9: return BG_PIC1(RESOURCE_ID_BG_PRESET_9);
    case 10: return BG_PIC1(RESOURCE_ID_BG_PRESET_10);
    case 11: return BG_PIC1(RESOURCE_ID_BG_PRESET_11);
    case 12: return BG_PIC1(RESOURCE_ID_BG_PRESET_12);
    case 13: return BG_PIC1(RESOURCE_ID_BG_PRESET_13);
    case 14: return BG_PIC1(RESOURCE_ID_BG_PRESET_14);
    case 15: return BG_PIC1(RESOURCE_ID_BG_PRESET_15);
    case 16: return BG_PIC1(RESOURCE_ID_BG_PRESET_16);
    case 17: return BG_PIC1(RESOURCE_ID_BG_PRESET_17);
    case 18: return BG_PIC1(RESOURCE_ID_BG_PRESET_18);
    default: return BG_PIC_NONE;
  }
#endif
}
static inline uint32_t bg_preset_resource_id(uint8_t n) { return bg_preset_picture(n).id[0]; }
