#pragma once

#include <pebble.h>

// cloud_pct at/above this reads as "overcast" rather than "sunny" -- shared
#define OVERCAST_CLOUD_THRESHOLD 40

#ifdef PBL_BW
// A B&W watch has no colour to grade values with, so every gradient is just white and the real
// colour comes from the slot's own (text) colour; see primitive_transport.c. Compiling the ~14
// gradient functions out saves code size. The macros keep the call sites unchanged.
#define feature_colors_seven_stop_gradient(v, a, b) ((void)(v), (void)(a), (void)(b), GColorWhite)
#define feature_colors_white_to_turquoise_gradient(v, a, b) ((void)(v), (void)(a), (void)(b), GColorWhite)
#define feature_colors_seven_stop_gradient_reversed(v, a, b) ((void)(v), (void)(a), (void)(b), GColorWhite)
#define feature_colors_red_green_gradient(pct) ((void)(pct), GColorWhite)
#define feature_colors_white_to_red_gradient(kp) ((void)(kp), GColorWhite)
#define feature_colors_heart_rate_gradient(bpm) ((void)(bpm), GColorWhite)
#define feature_colors_altitude_gradient(m) ((void)(m), GColorWhite)
#define feature_colors_meteor_intensity_gradient(pct) ((void)(pct), GColorWhite)
#define feature_colors_daynight_gradient(at, rise, set) ((void)(at), (void)(rise), (void)(set), GColorWhite)
#define feature_colors_linear_white_black(v, a, b) ((void)(v), (void)(a), (void)(b), GColorWhite)
#define feature_colors_date_year_progress_gradient(t) ((void)(t), GColorWhite)
#define feature_colors_weather_staleness_gradient(now, last) ((void)(now), (void)(last), GColorWhite)
#define feature_colors_overcast_gray_gradient(pct) ((void)(pct), GColorWhite)
#define feature_colors_weather_condition_color(c, cloud, rain) ((void)(c), (void)(cloud), (void)(rain), GColorWhite)
#else
GColor feature_colors_seven_stop_gradient(int32_t value, int32_t min_v, int32_t max_v);
GColor feature_colors_white_to_turquoise_gradient(int32_t value, int32_t min_v, int32_t max_v);
GColor feature_colors_seven_stop_gradient_reversed(int32_t value, int32_t min_v, int32_t max_v);
GColor feature_colors_red_green_gradient(uint8_t pct);
GColor feature_colors_white_to_red_gradient(uint8_t kp_x10);
#ifndef PBL_PLATFORM_GABBRO
GColor feature_colors_heart_rate_gradient(int bpm);
#endif
GColor feature_colors_altitude_gradient(int16_t altitude_m);
GColor feature_colors_meteor_intensity_gradient(uint8_t pct);
GColor feature_colors_daynight_gradient(time_t at, time_t sun_rise, time_t sun_set);
GColor feature_colors_linear_white_black(int32_t value, int32_t min_v, int32_t max_v);
GColor feature_colors_date_year_progress_gradient(const struct tm *t);
GColor feature_colors_weather_staleness_gradient(time_t now, time_t last_update);
GColor feature_colors_overcast_gray_gradient(uint8_t cloud_pct);
GColor feature_colors_weather_condition_color(uint8_t condition, uint8_t cloud_pct, uint8_t rain_chance_pct);
#endif // PBL_BW
