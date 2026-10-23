#include "./render_math.h"

uint8_t render_math_lerp8(uint8_t a, uint8_t b, int32_t num, int32_t den) {
  if (den == 0) return a;
  return (uint8_t)(a + ((int32_t)(b - a) * num) / den);
}

uint16_t render_math_isqrt32(int32_t v) {
  if (v <= 0) return 0;
  uint32_t x = (uint32_t)v;
  uint32_t res = 0;
  uint32_t bit = 1u << 30;
  while (bit > x) bit >>= 2;
  while (bit != 0) {
    if (x >= res + bit) {
      x -= res + bit;
      res = (res >> 1) + bit;
    } else {
      res >>= 1;
    }
    bit >>= 2;
  }
  return (uint16_t)res;
}
