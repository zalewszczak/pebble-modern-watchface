#pragma once

#include <pebble.h>

// Persistent storage for the user's uploaded background image.
//
// The phone converts the picture to 64 colours (2 bits per channel), packs
// it 4 pixels -> 3 bytes (row-major, 6 bits per pixel: 0bRRGGBB) and streams
// it over AppMessage. Every persist value holds BG_IMG_CHUNK_BYTES of that
// stream (85 groups = 340 pixels, under the 256-byte persist value limit);
// the Time 2 allows 1 MB of persistent storage per app, so a full-screen
// image (~34 KB) fits easily. The packed data is never held in RAM: chunks
// are written straight to storage as they arrive and decoded straight into
// the background cache bitmap (bg_image_cache.c) when it is built.

#define BG_IMG_CHUNK_BYTES 255
#define BG_IMG_MAX_PIXELS (320 * 320)

// Stamp (content hash chosen by the phone) of the complete image currently in
// storage, or 0 when there is none -- including while a transfer is half done.
uint32_t bg_image_store_stamp(void);

// Starts a transfer: invalidates any stored image and records what is coming.
bool bg_image_store_begin(uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h);

// Stores `len` bytes of the stream beginning at persist chunk `first_chunk`.
bool bg_image_store_write(uint16_t first_chunk, const uint8_t *data, uint16_t len);

// Ends a transfer. Verifies every chunk is present, then makes the image
// current. Returns false (and leaves no image) if anything is missing.
bool bg_image_store_commit(uint32_t stamp);

// Decodes the stored image straight into the frame buffer, centred in
// `bounds` (layer coordinates; `origin` is the layer's position on screen).
// Nothing is allocated: pixels go from persistent storage to the screen in
// 255-byte pieces. Returns false if there is no (readable) image.
bool bg_image_store_draw(GContext *ctx, GRect bounds, GPoint origin);
