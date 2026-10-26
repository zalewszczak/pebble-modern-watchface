#pragma once

// Primitive metadata only. Feature selection and feature/content IDs remain
// entirely on the phone and are not represented in the watch-side catalogue.

#include <pebble.h>
#include "./primitive_types.h"
#include "./primitive_ids.h"

PrimitiveSource primitive_catalogue_source_for(PrimitiveId id);
PrimitiveRefreshClass primitive_catalogue_refresh_class_for(PrimitiveId id);
