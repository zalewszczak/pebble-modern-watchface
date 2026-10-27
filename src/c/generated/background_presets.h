// GENERATED FILE -- do not hand-edit.
// Produced by scripts/generate-backgrounds.js from resources/backgrounds/<n>.png.
#pragma once

#include <pebble.h>

// Number of predefined background images compiled into this build.
#define BG_PRESET_COUNT 34

// Resource id of predefined background <n> (1-based, the number in the PNG
// file name), or 0 when there is no such image.
static inline uint32_t bg_preset_resource_id(uint8_t n) {
  switch (n) {
    case 1: return RESOURCE_ID_BG_PRESET_1;
    case 2: return RESOURCE_ID_BG_PRESET_2;
    case 3: return RESOURCE_ID_BG_PRESET_3;
    case 4: return RESOURCE_ID_BG_PRESET_4;
    case 5: return RESOURCE_ID_BG_PRESET_5;
    case 6: return RESOURCE_ID_BG_PRESET_6;
    case 7: return RESOURCE_ID_BG_PRESET_7;
    case 8: return RESOURCE_ID_BG_PRESET_8;
    case 9: return RESOURCE_ID_BG_PRESET_9;
    case 10: return RESOURCE_ID_BG_PRESET_10;
    case 11: return RESOURCE_ID_BG_PRESET_11;
    case 12: return RESOURCE_ID_BG_PRESET_12;
    case 13: return RESOURCE_ID_BG_PRESET_13;
    case 14: return RESOURCE_ID_BG_PRESET_14;
    case 15: return RESOURCE_ID_BG_PRESET_15;
    case 16: return RESOURCE_ID_BG_PRESET_16;
    case 17: return RESOURCE_ID_BG_PRESET_17;
    case 18: return RESOURCE_ID_BG_PRESET_18;
    case 19: return RESOURCE_ID_BG_PRESET_19;
    case 20: return RESOURCE_ID_BG_PRESET_20;
    case 21: return RESOURCE_ID_BG_PRESET_21;
    case 22: return RESOURCE_ID_BG_PRESET_22;
    case 23: return RESOURCE_ID_BG_PRESET_23;
    case 24: return RESOURCE_ID_BG_PRESET_24;
    case 25: return RESOURCE_ID_BG_PRESET_25;
    case 26: return RESOURCE_ID_BG_PRESET_26;
    case 27: return RESOURCE_ID_BG_PRESET_27;
    case 28: return RESOURCE_ID_BG_PRESET_28;
    case 29: return RESOURCE_ID_BG_PRESET_29;
    case 30: return RESOURCE_ID_BG_PRESET_30;
    case 31: return RESOURCE_ID_BG_PRESET_31;
    case 32: return RESOURCE_ID_BG_PRESET_32;
    case 33: return RESOURCE_ID_BG_PRESET_33;
    case 34: return RESOURCE_ID_BG_PRESET_34;
    default: return 0;
  }
}
