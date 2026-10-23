#pragma once

#include <pebble.h>

// Persistent storage for the user's uploaded background images.
//
// There are BG_IMG_SLOTS (9) slots, mirroring the nine user slots on the
// settings page. Each image is transferred ONCE and then lives in persistent
// storage, so switching between them (or applying a "My style" that uses one)
// is instant -- nothing is re-sent unless the image itself changed.
//
// The phone converts the picture to 64 colours (2 bits per channel), packs
// it 4 pixels -> 3 bytes (row-major, 6 bits per pixel: 0bRRGGBB) and streams
// it over AppMessage. Every persist value holds BG_IMG_CHUNK_BYTES of that
// stream (85 groups = 340 pixels, under the 256-byte persist value limit).
// The packed data is never held in RAM: chunks are written straight to
// storage as they arrive and decoded straight into the background cache
// bitmap (bg_image_cache.c) when it is built.
//
// Slot numbers are 1-based everywhere (1..BG_IMG_SLOTS).

#define BG_IMG_SLOTS 9
#define BG_IMG_CHUNK_BYTES 255
#define BG_IMG_MAX_PIXELS (320 * 320)

// Stamp (content hash chosen by the phone) of the complete image in `slot`,
// or 0 when the slot is empty -- including while a transfer into it is half done.
uint32_t bg_image_store_stamp(uint8_t slot);

// Fills out[0..BG_IMG_SLOTS-1] with the stamp of slots 1..9 (0 = empty).
void bg_image_store_stamps(uint32_t out[BG_IMG_SLOTS]);

// Starts a transfer into `slot`: invalidates that slot's current image and
// records what is coming. Other slots are untouched.
bool bg_image_store_begin(uint8_t slot, uint32_t stamp, uint16_t chunks, uint16_t w, uint16_t h);

// Stores `len` bytes of the stream beginning at persist chunk `first_chunk`
// of the slot being transferred. Returns false if no transfer is active.
bool bg_image_store_write(uint16_t first_chunk, const uint8_t *data, uint16_t len);

// Ends the transfer. Verifies every chunk is present, then makes the image
// current. Returns false (and leaves the slot empty) if anything is missing.
bool bg_image_store_commit(uint32_t stamp);

// Empties `slot` (the image was removed on the phone).
void bg_image_store_clear(uint8_t slot);

// Slot currently being received (1-based), or 0 when no transfer is active.
uint8_t bg_image_store_pending_slot(void);

// Number of chunks written so far in the active transfer (highest index + 1).
uint16_t bg_image_store_pending_progress(void);

// Total chunks of the active transfer, or 0.
uint16_t bg_image_store_pending_chunks(void);

// Abandons the active transfer (the slot stays empty).
void bg_image_store_abort(void);

// Decodes the image in `slot` straight into the frame buffer, centred in
// `bounds` (layer coordinates; `origin` is the layer's position on screen).
// Nothing is allocated: pixels go from persistent storage to the screen in
// 255-byte pieces. Returns false if the slot has no (readable) image.
bool bg_image_store_draw(uint8_t slot, GContext *ctx, GRect bounds, GPoint origin);
