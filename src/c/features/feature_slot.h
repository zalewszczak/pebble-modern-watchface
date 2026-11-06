#pragma once

#include <pebble.h>
#include "../data/watch_data.h"
#include "./primitives/primitive_storage.h"
#include "../platform/platform_bw.h"

// Shared feature-row geometry used by both layout and rendering.
#define CORNER_ROW_H PL_CORNER_ROW_H

// Internal primitive-only feature-layer data model shared by layout and drawing

// B&W watches (flint, diorite) keep the left/right edge slots in the enum (wire bit positions
// must not move) but never activate them: a 144 px screen has no room for them next to the dial.
//
// Round watches have no corners, so they carry only the eight edge-line slots
// (the four corner slots are the last four enum values below, which is why the
// edge-line slot indices and the wire bit positions stay the same on both shapes).
#ifdef PBL_ROUND
#define FEATURES_MAX_SLOTS 8
#else
#define FEATURES_MAX_SLOTS 12
#endif
#define CORNER_BOX_W PL_CORNER_BOX_W

typedef struct FeatureSlot {
  bool active;
  bool shake_only;
  uint8_t color_mode;

  bool is_top;
  bool is_left;
  bool is_middle;
  bool is_edge;
  int16_t top_offset;
  int16_t bottom_shift;
  int16_t middle_inset;
  bool center_horizontal;
  bool center_vertical;
  bool allow_outline;
  bool needs_second_refresh;

  bool draw_pill;
  GColor pill_bg;
  PrimitiveFeature primitives;
} FeatureSlot;

typedef struct {
  WatchData *data;
  FeatureSlot slots[FEATURES_MAX_SLOTS];
} FeaturesState;

enum {
  SLOT_UPPER_L1 = 0, SLOT_UPPER_L2,
  SLOT_BOTTOM_L1, SLOT_BOTTOM_L2,
  SLOT_LEFT_L1, SLOT_LEFT_L2,
  SLOT_RIGHT_L1, SLOT_RIGHT_L2,
  SLOT_CORNER_TL, SLOT_CORNER_TR, SLOT_CORNER_BL, SLOT_CORNER_BR,
};
