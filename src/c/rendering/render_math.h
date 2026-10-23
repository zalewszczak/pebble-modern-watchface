#pragma once

#include <pebble.h>

// Shared integer math for dial and icon rendering.
uint8_t render_math_lerp8(uint8_t a, uint8_t b, int32_t num, int32_t den);
uint16_t render_math_isqrt32(int32_t v);
