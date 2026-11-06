#include "./font_lookup.h"

// Keep system font keys in a separate immutable table so FONT_TABLE
// contains only compact scalar and resource fields. This keeps the system-font
// lookup data independent from resource-backed custom font entries.

static const char *const SYSTEM_FONT_KEYS[] = {
  FONT_KEY_GOTHIC_14,                // 0: System Small
  FONT_KEY_GOTHIC_14_BOLD,           // 1: System Medium
  FONT_KEY_GOTHIC_18_BOLD,           // 2: System Large
  FONT_KEY_GOTHIC_24_BOLD,           // 3: System XL
  FONT_KEY_GOTHIC_28_BOLD,           // 4: System XXL
  FONT_KEY_LECO_28_LIGHT_NUMBERS,    // 5: Leco Small
  FONT_KEY_LECO_32_BOLD_NUMBERS,     // 6: Leco Medium
  FONT_KEY_LECO_36_BOLD_NUMBERS,     // 7: Leco Large
  FONT_KEY_LECO_42_NUMBERS,          // 8: Leco XL (main clock's own default)
  FONT_KEY_DROID_SERIF_28_BOLD,      // 9: Droid Serif
  FONT_KEY_ROBOTO_CONDENSED_21,      // 10: Roboto Condensed
  FONT_KEY_ROBOTO_BOLD_SUBSET_49,    // 11: Roboto Bold (big)
  FONT_KEY_BITHAM_30_BLACK,          // 12: Bitham Bold 30
  FONT_KEY_BITHAM_34_MEDIUM_NUMBERS, // 13: Bitham Medium 34
  FONT_KEY_BITHAM_42_LIGHT,          // 14: Bitham Light (big)
  FONT_KEY_BITHAM_42_BOLD,           // 15: Bitham Bold (big)
};

typedef struct {
  uint32_t resource_id;   // 0 => system font, look up SYSTEM_FONT_KEYS[sys_idx] instead
  uint8_t  sys_idx;        // valid iff resource_id == 0 -- index into SYSTEM_FONT_KEYS above
  uint8_t  height;         // rough export height in px, for text-box sizing
  int8_t   y_offset;       // vertical fine-tune, see font_lookup_y_offset()'s own header comment
} FontLookupEntry; // 8 bytes

#ifdef PBL_COLOR
// One row per distinct font used by the watchface. Multiple presentation
// roles can resolve the same row, while each FontSlot owns its loaded resource.
// Heights are export estimates used for text-box sizing and vertical alignment;
// they are intentionally approximate rather than pixel measurements.
static const FontLookupEntry FONT_TABLE[] = {
  [0]  = { .sys_idx = 0,  .height = 14, .y_offset = 1 }, // Gothic x-small
  [1]  = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Gothic small
  [2]  = { .sys_idx = 2,  .height = 18, .y_offset = 2 }, // Gothic medium
  [3]  = { .sys_idx = 3,  .height = 14, .y_offset = 10 }, // Gothic large
  [4]  = { .sys_idx = 4,  .height = 18, .y_offset = 12 }, // Gothic x-large
  [5]  = { .sys_idx = 5,  .height = 28, .y_offset = 2 }, // Leco Small
  [6]  = { .sys_idx = 6,  .height = 32, .y_offset = 4 }, // Leco Medium
  [7]  = { .sys_idx = 7,  .height = 36, .y_offset = 6 }, // Leco Large
  [8]  = { .sys_idx = 8,  .height = 42, .y_offset = 9 }, // Leco XL (main clock's own default)
  [9]  = { .sys_idx = 9,  .height = 28, .y_offset = 1 }, // Droid Serif - MARK THIS INCOMPATIBLE
  [10] = { .sys_idx = 10, .height = 21 }, // Roboto Condensed
  [11] = { .sys_idx = 11, .height = 49, .y_offset = 8 }, // Roboto Bold
  [12] = { .sys_idx = 12, .height = 30, .y_offset = 2 }, // Bitham Bold 30  - MARK THIS INCOMPATIBLE
  [13] = { .sys_idx = 13, .height = 34, .y_offset = 4 }, // Bitham Medium 34

  [14] = { .resource_id = RESOURCE_ID_BITCOUNTGRID_FONT_18,  .height = 18, .y_offset = 2 }, // Bitcount Grid Double Small
  [15] = { .resource_id = RESOURCE_ID_MINECRAFTER_FONT_12,   .height = 12, .y_offset = -2}, // Minecrafter Small
  [16] = { .resource_id = RESOURCE_ID_ALAGARD_FONT_19,       .height = 19, .y_offset = -1 }, // Alagard Small
  [17] = { .resource_id = RESOURCE_ID_BEBAS_FONT_20,         .height = 20, .y_offset = 1 }, // Bebas Small
  
  [18] = { .resource_id = RESOURCE_ID_BYTESIZED_FONT_16,     .height = 16, .y_offset = 8 }, // Bytesized
  [19] = { .resource_id = RESOURCE_ID_MPLUSBLACK_FONT_16,    .height = 16, .y_offset = -2 }, // M PLus 1C
  [20] = { .resource_id = RESOURCE_ID_NOTOITALIC_FONT_18,    .height = 18, .y_offset = -2 }, // Noto Serif
  
  [21] = { .resource_id = RESOURCE_ID_ARCADE_FONT_18,        .height = 18 }, // Arcade
  [22] = { .resource_id = RESOURCE_ID_DSDIGIB_FONT_20,       .height = 20, .y_offset = 1 }, // DS Digital Bold
  [23] = { .resource_id = RESOURCE_ID_DSDIGIT_FONT_20,       .height = 20, .y_offset = 1 }, // DS Digital Bold Italic
  [24] = { .resource_id = RESOURCE_ID_LCDSOLID_FONT_18,      .height = 18, .y_offset = -3 }, // LCD
  [25] = { .resource_id = RESOURCE_ID_RADIOLAND_FONT_16,     .height = 16, .y_offset = -4 }, // Radioland
  [26] = { .resource_id = RESOURCE_ID_NUNITO_FONT_21,        .height = 21, .y_offset = 2 }, // Nunito small
  
  [27] = { .resource_id = RESOURCE_ID_DIGITALDREAM_FONT_13,  .height = 13, .y_offset = -2 }, // Digital Dream Small
  [28] = { .resource_id = RESOURCE_ID_DIGITALDREAMNARROW_FONT_14,  .height = 14, .y_offset = -2 }, // Digital Dream Narrow Small
  [29] = { .resource_id = RESOURCE_ID_DIGITALDREAMFAT_FONT_15,  .height = 15, .y_offset = -2 }, // Digital Dream Fat Small
};
#else
// B&W (flint, diorite): a 144 px screen needs about 0.72x the sizes, and the 42-49 px system fonts
// do not fit at all (legacy_support.md, 7.1). The ids stay the same as on the colour watches (the
// phone shares them); each one resolves to a smaller font here.
//  - System fonts: same rows, except Leco XL (8) -> Leco 36 and Roboto Bold 49 (11) -> Bitham 30.
//  - Custom fonts: the same TTF at a smaller pixel size (the size is part of the resource name, so
//    these are separate resources from the colour ones, see package.json).
//  - Pixel fonts (Bitcount, Minecrafter, Alagard, Bytesized, Arcade, LCD, Radioland) only stay crisp at
//    their design size, so they are not shipped here. Their ids fall back to Gothic 14 Bold; the
//    phone never offers them to a B&W watch (platform-normalize.js).
// Heights and y_offset values are the colour ones scaled by 0.72 as a first guess and need a visual
// check on the emulator, as every font's offsets were tuned by eye.
static const FontLookupEntry FONT_TABLE[] = {
  [0]  = { .sys_idx = 0,  .height = 14, .y_offset = 1 }, // Gothic x-small
  [1]  = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Gothic small
  [2]  = { .sys_idx = 2,  .height = 18, .y_offset = 2 }, // Gothic medium
  [3]  = { .sys_idx = 3,  .height = 14, .y_offset = 10 }, // Gothic large
  [4]  = { .sys_idx = 4,  .height = 18, .y_offset = 12 }, // Gothic x-large
  [5]  = { .sys_idx = 5,  .height = 28, .y_offset = 2 }, // Leco Small
  [6]  = { .sys_idx = 6,  .height = 32, .y_offset = 4 }, // Leco Medium
  [7]  = { .sys_idx = 7,  .height = 36, .y_offset = 6 }, // Leco Large
  [8]  = { .sys_idx = 7,  .height = 36, .y_offset = 6 }, // Leco XL -> Leco 36
  [9]  = { .sys_idx = 9,  .height = 28, .y_offset = 1 }, // Droid Serif
  [10] = { .sys_idx = 10, .height = 21 }, // Roboto Condensed
  [11] = { .sys_idx = 12, .height = 30, .y_offset = 2 }, // Roboto Bold (big) -> Bitham Bold 30
  [12] = { .sys_idx = 12, .height = 30, .y_offset = 2 }, // Bitham Bold 30
  [13] = { .sys_idx = 13, .height = 34, .y_offset = 4 }, // Bitham Medium 34

  [14] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Bitcount Grid: not shipped
  [15] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Minecrafter: not shipped
  [16] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Alagard: not shipped
  [17] = { .resource_id = RESOURCE_ID_BEBAS_FONT_14,         .height = 14, .y_offset = 1 }, // Bebas Small
  [18] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Bytesized: not shipped
  [19] = { .resource_id = RESOURCE_ID_MPLUSBLACK_FONT_12,    .height = 12, .y_offset = -1 }, // M PLus 1C
  [20] = { .resource_id = RESOURCE_ID_NOTOITALIC_FONT_13,    .height = 13, .y_offset = -1 }, // Noto Serif
  [21] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Arcade: not shipped
  [22] = { .resource_id = RESOURCE_ID_DSDIGIB_FONT_14,       .height = 14, .y_offset = 1 }, // DS Digital Bold
  [23] = { .resource_id = RESOURCE_ID_DSDIGIT_FONT_14,       .height = 14, .y_offset = 1 }, // DS Digital Bold Italic
  [24] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // LCD: not shipped
  [25] = { .sys_idx = 1,  .height = 14, .y_offset = 2 }, // Radioland: not shipped
  [26] = { .resource_id = RESOURCE_ID_NUNITO_FONT_15,        .height = 15, .y_offset = 1 }, // Nunito small

  [27] = { .resource_id = RESOURCE_ID_DIGITALDREAM_FONT_10,  .height = 10, .y_offset = -1 }, // Digital Dream Small
  [28] = { .resource_id = RESOURCE_ID_DIGITALDREAMNARROW_FONT_10,  .height = 10, .y_offset = -1 }, // Digital Dream Narrow Small
  [29] = { .resource_id = RESOURCE_ID_DIGITALDREAMFAT_FONT_11,  .height = 11, .y_offset = -1 }, // Digital Dream Fat Small
};
#endif

const uint8_t FONT_LOOKUP_COUNT = sizeof(FONT_TABLE) / sizeof(FONT_TABLE[0]);

static const FontLookupEntry *entry_for(uint8_t font_id) {
  if (font_id >= FONT_LOOKUP_COUNT) font_id = 0; // out-of-range -- fall back rather than crash
  return &FONT_TABLE[font_id];
}

GFont font_lookup_resolve(FontSlot *slot, uint8_t font_id) {
  if (font_id >= FONT_LOOKUP_COUNT) font_id = 0;
  const FontLookupEntry *e = &FONT_TABLE[font_id];

  if (e->resource_id == 0) {
    // Switching to a system font releases the custom resource because
    // system fonts do not use the slot's resource handle.
    if (slot->loaded_font) {
      fonts_unload_custom_font(slot->loaded_font);
      slot->loaded_font = NULL;
    }
    slot->loaded_id = font_id;
    return fonts_get_system_font(SYSTEM_FONT_KEYS[e->sys_idx]);
  }

  if (slot->loaded_id == font_id && slot->loaded_font) return slot->loaded_font; // already the right one

  if (slot->loaded_font) {
    fonts_unload_custom_font(slot->loaded_font);
    slot->loaded_font = NULL;
  }
  slot->loaded_font = fonts_load_custom_font(resource_get_handle(e->resource_id));
  slot->loaded_id = font_id;
  return slot->loaded_font;
}

uint8_t font_lookup_height(uint8_t font_id) {
  return entry_for(font_id)->height;
}

int8_t font_lookup_y_offset(uint8_t font_id) {
  return entry_for(font_id)->y_offset;
}

void font_lookup_release(FontSlot *slot) {
  if (slot->loaded_font) {
    fonts_unload_custom_font(slot->loaded_font);
    slot->loaded_font = NULL;
  }
  slot->loaded_id = 255;
}
