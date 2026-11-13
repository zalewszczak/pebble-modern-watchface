#pragma once

#include <pebble.h>

// A background picture stored as resources. On the round watch (gabbro) a 260 x 260 picture is too
// big to decode in one piece (the PNG decoder needs the whole bitmap plus scratch space, and the
// heap runs out), so scripts/split-gabbro-backgrounds.py cuts it into horizontal bands that the
// resource generators list as <NAME>_P0, <NAME>_P1. id[] holds one resource id per band from top to
// bottom (0 ends the list); an unsplit picture is just id[0]. The generated tables return these.
#define BG_PICTURE_MAX_PARTS 2
typedef struct { uint32_t id[BG_PICTURE_MAX_PARTS]; } BgPicture;
#define BG_PIC_NONE ((BgPicture){{0, 0}})
#define BG_PIC1(a) ((BgPicture){{(a), 0}})
#define BG_PIC2(a, b) ((BgPicture){{(a), (b)}})

#ifndef PBL_BW
// Draws the picture centred in `bounds`: one band at a time, each decoded, drawn and freed before
// the next, so only one band is in memory. Returns false when a band could not be loaded.
bool bg_picture_draw(GContext *ctx, GRect bounds, BgPicture pic);
#endif
