#pragma once

// Shared types describing what a primitive draws, where its value comes
// from, and how often the watch must refresh it. Source and refresh cadence
// are independent: phone-supplied values update when PKJS sends new data;
// watch-runtime values follow the cadence required by their data source.

#include <pebble.h>

typedef enum {
  PRIMITIVE_KIND_TEXT = 0,  // variable-length static text payload
  PRIMITIVE_KIND_SPACE,     // universal single-space glyph
  PRIMITIVE_KIND_SLASH,     // universal "/" glyph
  PRIMITIVE_KIND_DASH,      // universal "-" glyph
  PRIMITIVE_KIND_ICON,      // static icon, payload is an icon ID
  // Punctuation and unit text: drawn from `text`, but laid out tightly -- no
  // gap before it (it attaches to the element in front), and no gap after an
  // opening parenthesis. See primitive_layout.c.
  PRIMITIVE_KIND_PUNCT,
} PrimitiveKind;

typedef enum {
  PRIMITIVE_SOURCE_WATCH_RUNTIME = 0, // watch must calculate/obtain the value itself
  PRIMITIVE_SOURCE_PKJS_VALUE,        // PKJS supplies the final display-ready value
} PrimitiveSource;

typedef enum {
  PRIMITIVE_REFRESH_STATIC = 0, // does not change without an explicit external push
  PRIMITIVE_REFRESH_MINUTE,     // watch-runtime, refresh on the minute tick
  PRIMITIVE_REFRESH_SECOND,     // watch-runtime, refresh every second
  PRIMITIVE_REFRESH_EVENT,      // watch-runtime, refresh on a specific service event (BT/health/battery/quiet time)
  PRIMITIVE_REFRESH_FAST_DYNAMIC, // watch-runtime, refresh on its own fast cadence (compass)
  PRIMITIVE_REFRESH_PKJS_VALUE, // PKJS-value/static: watch just stores whatever PKJS last sent
} PrimitiveRefreshClass;
