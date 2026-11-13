#pragma once

#include <pebble.h>

// Shared integer math for dial and icon rendering.
uint8_t render_math_lerp8(uint8_t a, uint8_t b, int32_t num, int32_t den);
uint16_t render_math_isqrt32(int32_t v);

// ---- 64-bit division without libgcc -------------------------------------------------------------
// A 64-bit `/` or `%` on this core is a call into libgcc (__aeabi_ldivmod + __udivmoddi4: ~0.9 KB of
// code and a hundred-plus cycles per call). Everything below returns exactly what the 64-bit
// expression would (division truncates toward zero) but takes the single-instruction 32-bit divide
// whenever the operands fit, and a small shift-subtract loop only for the rare huge ones.

// (a * b) / c, truncating, with a 64-bit intermediate product.
int32_t render_math_muldiv(int32_t a, int32_t b, int32_t c);
// n / d for 64-bit operands.
int64_t render_math_div64(int64_t n, int64_t d);

// (a * b) / 65536 (= TRIG_MAX_RATIO), truncating toward zero. Inline: a multiply and two shifts.
static inline int32_t render_math_mul_q16(int32_t a, int32_t b) {
  int64_t p = (int64_t)a * b;
  return (int32_t)((p + ((p >> 63) & 0xFFFF)) >> 16);
}

// ---- easing -------------------------------------------------------------------------------------
// Progress runs 0..1000 in and out. Table lookups with one linear interpolation: no multiplies
// beyond that, no division, no 64-bit maths, identical cost on every frame.
//   ease-out cubic  = 1 - (1 - t)^3   (hands growing out, hour marks sliding in)
int32_t render_math_ease_out_1000(int32_t t);
