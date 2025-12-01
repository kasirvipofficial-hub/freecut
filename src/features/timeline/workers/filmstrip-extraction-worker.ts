/**
 * Filmstrip Extraction Worker
 *
 * Extracts video frames using mediabunny's CanvasSink for hardware-accelerated
 * WebCodecs decoding. Uses canvasesAtTimestamps() for sparse extraction
 * (only decodes frames at requested timestamps, not all frames).
 *
 * Features:
 * - OffscreenCanvas rendering (worker-safe)
 * - Canvas pooling for VRAM optimization
 * - Zero-copy ImageBitmap transfer to main thread
 * - Abort support
 */

// Message types
export interface ExtractRequest {
  type: 'extract';
  requestId: string;
  blobUrl: string;
  timestamps: number[]; // Specific timestamps assigned to this worker
  width: number;
  height: number;
}

export interface AbortRequest {
  type: 'abort';
  requestId: string;
}

export interface FrameResponse {
  type: 'frame';
  requestId: string;
  timestamp: number;
  bitmap: ImageBitmap;
}

export interface CompleteResponse {
  type: 'complete';
  requestId: string;
}

export interface ErrorResponse {
  type: 'error';
  requestId: string;
  error: string;
}

export type WorkerRequest = ExtractRequest | AbortRequest;
export type WorkerResponse = FrameResponse | CompleteResponse | ErrorResponse;

// Track active requests for abort support
const activeRequests = new Map<string, { aborted: boolean }>();

// Dynamically import mediabunny (heavy library)
const loadMediabunny = () => import('mediabunny');

/**
 * Extract frames at specified timestamps using CanvasSink
 */
async function extractFrames(
  request: ExtractRequest,
  state: { aborted: boolean }
): Promise<void> {
  const { requestId, blobUrl, timestamps, width, height } = request;

  // Skip if no timestamps assigned
  if (timestamps.length === 0) {
    self.postMessage({ type: 'complete', requestId } as CompleteResponse);
    return;
  }

  // Load mediabunny
  const { Input, UrlSource, CanvasSink, MP4, WEBM, MATROSKA } = await loadMediabunny();

  let input: InstanceType<typeof Input> | null = null;

  try {
    // Create input from blob URL
    input = new Input({
      source: new UrlSource(blobUrl),
      formats: [MP4, WEBM, MATROSKA],
    });

    // Get primary video track
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error('No video track found');
    }

    // Create CanvasSink with pooling for VRAM optimization
    // Falls back to OffscreenCanvas in worker context
    const sink = new CanvasSink(videoTrack, {
      width,
      height,
      fit: 'cover',
      poolSize: 3, // Ring buffer of 3 canvases
    });

    // Async generator for sparse timestamp extraction
    async function* timestampGenerator(): AsyncGenerator<number> {
      for (const ts of timestamps) {
        // Check abort before yielding each timestamp
        if (state.aborted) return;
        yield ts;
      }
    }

    // Small delay between frames to yield to playback decoder
    const yieldToMainThread = () =>
      new Promise<void>((resolve) => setTimeout(resolve, 0));

    let frameCount = 0;

    // Sparse extraction - only decodes frames at requested timestamps
    for await (const wrapped of sink.canvasesAtTimestamps(timestampGenerator())) {
      if (state.aborted || !wrapped) {
        break;
      }

      // Convert OffscreenCanvas to ImageBitmap for zero-copy transfer
      // wrapped.canvas is an OffscreenCanvas in worker context
      const bitmap = await createImageBitmap(wrapped.canvas as OffscreenCanvas);

      // Transfer ownership to main thread (zero-copy)
      const message: FrameResponse = {
        type: 'frame',
        requestId,
        timestamp: wrapped.timestamp,
        bitmap,
      };
      self.postMessage(message, { transfer: [bitmap] });

      frameCount++;
      // Yield every 5 frames to reduce decoder contention
      if (frameCount % 5 === 0) {
        await yieldToMainThread();
      }
    }

    if (!state.aborted) {
      self.postMessage({ type: 'complete', requestId } as CompleteResponse);
    }
  } finally {
    // Clean up mediabunny input
    input?.dispose();
  }
}

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data;

  try {
    switch (type) {
      case 'extract': {
        const request = event.data as ExtractRequest;
        const { requestId } = request;

        // Track request for abort support
        const state = { aborted: false };
        activeRequests.set(requestId, state);

        try {
          await extractFrames(request, state);
        } finally {
          activeRequests.delete(requestId);
        }
        break;
      }

      case 'abort': {
        const { requestId } = event.data as AbortRequest;
        const state = activeRequests.get(requestId);
        if (state) {
          state.aborted = true;
        }
        break;
      }

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const requestId = (event.data as ExtractRequest).requestId;
    self.postMessage({
      type: 'error',
      requestId,
      error: error instanceof Error ? error.message : String(error),
    } as ErrorResponse);
  }
};

// Export for TypeScript module
export {};
