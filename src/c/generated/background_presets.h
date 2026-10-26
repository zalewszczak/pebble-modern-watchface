// GENERATED FILE -- do not hand-edit.
// Produced by scripts/generate-backgrounds.js from resources/backgrounds/<n>.png.
#pragma once

#include <pebble.h>

// Number of predefined background images compiled into this build.
#define BG_PRESET_COUNT 15

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
    case 12: return RESOURCE_ID_BG_PRESET_12;
    case 13: return RESOURCE_ID_BG_PRESET_13;
    case 15: return RESOURCE_ID_BG_PRESET_15;
    case 16: return RESOURCE_ID_BG_PRESET_16;
    case 17: return RESOURCE_ID_BG_PRESET_17;
    default: return 0;
  }
}
