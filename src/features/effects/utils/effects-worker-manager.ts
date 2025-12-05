/**
 * Singleton Effects Worker Manager
 *
 * Maintains persistent Web Workers for video effect processing.
 * This eliminates worker startup/teardown overhead at clip boundaries.
 *
 * Workers are created lazily on first use and persist for the session.
 * Currently supports: halftone
 * Future: Add more effect workers as needed
 */

import type { HalftoneWorkerMessage, HalftoneWorkerOptions } from '../workers/halftone.worker';

type FrameCallback = (bitmap: ImageBitmap) => void;

/**
 * Halftone effect worker - singleton instance
 */
class HalftoneEffectWorker {
  private worker: Worker | null = null;
  private isReady = false;
  private pendingCallback: FrameCallback | null = null;
  private currentWidth = 0;
  private currentHeight = 0;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;

  /**
   * Initialize or get the singleton worker
   */
  async init(width: number, height: number): Promise<boolean> {
    // If worker exists and dimensions match, we're good
    if (this.worker && this.isReady && this.currentWidth === width && this.currentHeight === height) {
      return true;
    }

    // If worker exists but dimensions changed, resize it
    if (this.worker && this.isReady && (this.currentWidth !== width || this.currentHeight !== height)) {
      this.currentWidth = width;
      this.currentHeight = height;
      this.worker.postMessage({ type: 'resize', width, height });
      return true;
    }

    // If already initializing, wait for it
    if (this.readyPromise) {
      await this.readyPromise;
      // After ready, check if we need to resize
      if (this.currentWidth !== width || this.currentHeight !== height) {
        this.currentWidth = width;
        this.currentHeight = height;
        this.worker?.postMessage({ type: 'resize', width, height });
      }
      return this.isReady;
    }

    // Create new worker
    this.currentWidth = width;
    this.currentHeight = height;

    this.readyPromise = new Promise<void>((resolve) => {
      this.readyResolve = resolve;
    });

    try {
      this.worker = new Worker(
        new URL('../workers/halftone.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e) => {
        if (e.data.type === 'ready' && e.data.success) {
          this.isReady = true;
          this.readyResolve?.();
        } else if (e.data.type === 'frame') {
          // Deliver processed frame to callback
          const bitmap = e.data.bitmap as ImageBitmap;
          if (this.pendingCallback) {
            this.pendingCallback(bitmap);
            this.pendingCallback = null;
          } else {
            bitmap.close(); // No one waiting, clean up
          }
        }
      };

      this.worker.onerror = (e) => {
        console.error('[EffectsWorkerManager] Halftone worker error:', e);
        this.isReady = false;
        this.readyResolve?.();
      };

      // Initialize worker with dimensions
      const initMsg: HalftoneWorkerMessage = {
        type: 'init',
        width,
        height,
      };
      this.worker.postMessage(initMsg);

      await this.readyPromise;
      return this.isReady;

    } catch (err) {
      console.error('[EffectsWorkerManager] Failed to create halftone worker:', err);
      this.readyResolve?.();
      return false;
    }
  }

  /**
   * Process a frame through the halftone effect
   * Returns the processed frame via callback (async for zero-copy transfer)
   */
  processFrame(
    frame: ImageBitmap,
    options: HalftoneWorkerOptions,
    callback: FrameCallback
  ): boolean {
    if (!this.worker || !this.isReady) {
      frame.close();
      return false;
    }

    // Store callback for when result arrives
    // If there's already a pending callback, the previous frame was dropped
    this.pendingCallback = callback;

    const msg: HalftoneWorkerMessage = {
      type: 'render',
      frame,
      options,
    };

    // Transfer the ImageBitmap (zero-copy)
    this.worker.postMessage(msg, [frame]);
    return true;
  }

  /**
   * Check if worker is ready
   */
  getIsReady(): boolean {
    return this.isReady;
  }

  /**
   * Check if currently processing a frame
   */
  isProcessing(): boolean {
    return this.pendingCallback !== null;
  }

  /**
   * Dispose the worker (call on app unmount, not clip transitions)
   */
  dispose(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'dispose' });
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.pendingCallback = null;
      this.readyPromise = null;
      this.readyResolve = null;
    }
  }
}

/**
 * Effects Worker Manager
 *
 * Central manager for all effect workers.
 * Add new effect workers here as needed.
 */
export const effectsWorkerManager = {
  halftone: new HalftoneEffectWorker(),

  // Future effects:
  // blur: new BlurEffectWorker(),
  // pixelate: new PixelateEffectWorker(),

  /**
   * Dispose all workers (call on app unmount)
   */
  disposeAll(): void {
    this.halftone.dispose();
  },
};
