#pragma once

// Resolves one primitive ID into its current display payload and dynamic
// color. Feature composition stays on the phone. Unsupported IDs are rejected.
// primitive_transport.c combines the resolved color with the slot's color mode.

#include <pebble.h>
#include "./primitive_types.h"
#include "./primitive_ids.h"
#include "../../data/watch_data.h"

typedef struct {
  PrimitiveKind kind;
  char text[20];       // meaningful when kind != PRIMITIVE_KIND_ICON
  uint8_t icon_kind;    // meaningful when kind == PRIMITIVE_KIND_ICON
  int16_t aux;
  bool aux_flag;
  GColor dynamic_color; // this primitive's own candidate for COLOR mode
  // When true, primitive_transport.c uses dynamic_color directly instead
  // of applying the slot's color mode. Used by fixed-color fallback messages.
  bool force_color;
  // Legacy astronomy/composite cases passed main_color (not a graded color)
  // as their COLOR-mode candidate. True = "my dynamic candidate is the
  // slot's main color", resolved in primitive_transport.c where main_color
  // is known.
  bool dynamic_is_main;
  // Compass icon only (compass primitive): in COLOR mode it needs two
  // colors at once -- accent for the north arrow, main for the other three.
  // Every other mode: one flat color for both.
  bool two_tone_accent_main;
} PrimitiveResolved;

// Returns false (leaving *out unspecified) when `id` has no resolver yet.
// `aux_in` is the wire-supplied parameter for primitives that need one --
// currently only the timezone cluster (PRIM_TIMEZONE_ABBR/_TIME/_AMPM),
// where it's the zone index (0-18, feature_timezone_get()'s own index
// space) rather than a raw UTC offset: reusing feature_timezone_get()'s
// existing table means feature_timezone_current_offset_min()'s DST
// handling comes for free, which a bare offset-in-minutes parameter
// could not do correctly across a DST transition. Ignored by every
// primitive that doesn't need it -- pass 0 for those.
bool primitive_resolver_resolve(PrimitiveId id, uint8_t aux_in, const WatchData *data, time_t now, struct tm *t, PrimitiveResolved *out);
