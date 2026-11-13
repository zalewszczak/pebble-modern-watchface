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

// Shift-subtract division: only reached when an operand does not fit in 32 bits.
int64_t render_math_div64(int64_t n, int64_t d) {
  if (d == 0) return 0;
  if (n >= INT32_MIN && n <= INT32_MAX && d >= INT32_MIN && d <= INT32_MAX) {
    return (int32_t)n / (int32_t)d; // the common case: one hardware divide
  }
  const bool negative = (n < 0) != (d < 0);
  uint64_t un = n < 0 ? 0 - (uint64_t)n : (uint64_t)n;
  const uint64_t ud = d < 0 ? 0 - (uint64_t)d : (uint64_t)d;
  uint64_t q = 0, r = 0;
  for (int i = 63; i >= 0; i--) {
    r = (r << 1) | ((un >> i) & 1u);
    if (r >= ud) { r -= ud; q |= (uint64_t)1 << i; }
  }
  return negative ? -(int64_t)q : (int64_t)q;
}

int32_t render_math_muldiv(int32_t a, int32_t b, int32_t c) {
  if (c == 0) return 0;
  int32_t p;
  if (!__builtin_mul_overflow(a, b, &p)) return p / c;
  return (int32_t)render_math_div64((int64_t)a * b, c);
}

// 1000 * (1 - (1 - i/32)^3) for i = 0..32 (max error of the interpolated curve: 4 / 1000).
static const uint16_t EASE_OUT_LUT[33] = {
     0,  91, 176, 256, 330, 399, 464, 523, 578, 629, 675, 717, 756, 791, 822, 850, 875,
   897, 916, 933, 947, 959, 969, 978, 984, 990, 993, 996, 998, 999, 1000, 1000, 1000
};

int32_t render_math_ease_out_1000(int32_t t) {
  if (t <= 0) return 0;
  if (t >= 1000) return 1000;
  const int32_t u = (t * 1049) >> 10;   // 0..1024 (t / 1000 scaled to 1024ths, no division)
  const int32_t i = u >> 5;             // table slot 0..32
  const int32_t f = u & 31;             // position between slots
  if (i >= 32) return 1000;
  const int32_t a = EASE_OUT_LUT[i];
  return a + (((int32_t)EASE_OUT_LUT[i + 1] - a) * f >> 5);
}
