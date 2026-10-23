#pragma once

#include <pebble.h>

// The dial's static-content cache.
//
// Everything on the dial that does not change from one screen update to the
// next -- the background colour, the custom background image, the hour/second
// indices (drawn rings, numerals or a bitmap style) -- is drawn ONCE into the
// frame buffer, copied into a single full-layer 8-bit bitmap, and from then
// on put back with one blit per update. The cache is rebuilt only when its
// signature (a hash of every input those elements depend on, see
// dial_layer.c) changes. Resources only needed while drawing (marker bitmap,
// marker font, the background image) are released after the copy, so the
// steady-state cost is exactly one bitmap.

typedef struct {
  GBitmap *bitmap;
  uint32_t signature;   // what `bitmap` was built from
  GSize size;
  // A capture that failed (out of memory) is not retried every frame, only
  // when the signature changes.
  bool failed;
  uint32_t failed_signature;
} DialCache;

void dial_cache_init(DialCache *cache);
void dial_cache_release(DialCache *cache);

// True if the cache holds an image built for exactly this signature and size.
bool dial_cache_valid(const DialCache *cache, uint32_t signature, GSize size);
// True if building for this signature already failed (draw uncached instead).
bool dial_cache_failed(const DialCache *cache, uint32_t signature);

// Puts the cached image back on screen. `origin` is the layer's screen position.
bool dial_cache_blit(GContext *ctx, const DialCache *cache, GPoint origin);

// Copies what has just been drawn (the layer's rect at `origin` in the frame
// buffer) into a new cache bitmap. Returns false on failure.
bool dial_cache_capture(GContext *ctx, DialCache *cache, GSize size, GPoint origin, uint32_t signature);
