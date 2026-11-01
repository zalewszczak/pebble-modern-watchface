#pragma once

// Stores the resolved data needed to draw a feature. Domain-specific values
// are resolved before they reach this layer.
// Each instance retains its primitive ID and refresh class alongside its payload.

#include <pebble.h>
#include "./primitive_types.h"
#include "./primitive_ids.h"

#define PRIMITIVE_FEATURE_MAX 10 // Maximum primitives in one feature.

typedef struct {
  PrimitiveId id;
  PrimitiveKind kind;
  PrimitiveRefreshClass refresh_class;

  // Payload -- exactly one of these is meaningful, selected by `kind`.
  char text[20];        // PRIMITIVE_KIND_TEXT
  uint8_t icon_kind;     // PRIMITIVE_KIND_ICON: existing 1-30 icon-ID space (feature_icons.c)
  int16_t aux;           // icon_extra equivalent: zone/offset index, percent, heading, etc.
  bool aux_flag;         // icon_flag equivalent: day/night, charging, crossed-out, etc.

  // Colors are resolved before storage.
  GColor color;
  GColor color2; // only used where two colors are needed at once (e.g. compass)

  // Layout is computed by primitive_layout.c when feature data changes.
  int16_t width;
  int16_t x_offset;
} PrimitiveInstance;

typedef struct {
  uint8_t count;
  bool tight;          // user-built sequence: no automatic gaps, spacing comes only from Space elements
  int16_t total_width; // Cached total width of the sequence.
  PrimitiveInstance items[PRIMITIVE_FEATURE_MAX];
} PrimitiveFeature;
