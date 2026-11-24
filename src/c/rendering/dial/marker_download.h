#pragma once

#include <pebble.h>

// The "Downloaded" index set: a 1-bit mask picked in the settings page (from the extras folder of the watchface's
// GitHub repository) and kept in persistent storage. Its pixels are a GBitmap 1BitPalette (1 = ink, rows padded to
// 4 bytes, least significant bit first), sent in <= 255 byte chunks. Compiled on every platform, so keep it small.
#define MARKER_STYLE_DOWNLOADED 20
#define MARKER_DL_SLOT 11   // the slot byte of the BG_IMG_BEGIN message that carries it

void marker_download_begin(uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h);
void marker_download_write(uint16_t index, const uint8_t *data, uint16_t len);
bool marker_download_commit(uint32_t stamp);
void marker_download_clear(void);
bool marker_download_active(void);   // a transfer is in progress
void marker_download_abort(void);
// Identifies the stored image (0 = none); changes whenever it does.
uint32_t marker_download_stamp(void);
// Draws the stored image (nothing when there is none) centred in `bounds`, in `color`, without allocating memory.
void marker_download_draw(GContext *ctx, GRect bounds, GColor color, bool translucent);
