# Waveform Visualizer Feature

Comprehensive guide for implementing static waveform thumbnails in timeline clips, optimized for long videos (3+ hours).

## Overview

### Feature Description

Display audio waveform visualizations as background thumbnails in timeline clips for all video/audio files. Provides visual feedback for audio content, enabling precise editing, synchronization, and identification of audio events.

**Key Capabilities:**
- Static waveform thumbnails visible in all timeline clips with audio
- Optimized for videos of any length (3+ hours supported)
- Low memory footprint (~2MB for 3-hour stereo video)
- Zoom-aware rendering (more detail when zoomed in)
- Respects clip trimming and offset
- Server-side WAV conversion for HTTP Range request compatibility

**Visual Example:**
```
┌────────────────────────────────────────┐
│ Clip Label                        3:45 │
│ ▁▂▃▅▇█▇▅▃▂▁▁▂▃▅▇█▇▅▃▂▁▁▂▃▅▇█▇▅▃▂▁ │ ← Waveform
│                                        │
└────────────────────────────────────────┘
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Media Upload Flow                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  1. Store original video in OPFS      │
        │  2. Extract metadata with mediabunny  │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  3. Server: Extract audio to WAV      │
        │     (ffmpeg/mediabunny)                │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  4. Client: Load WAV with Remotion    │
        │     getAudioData()                     │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  5. Generate downsampled waveform     │
        │     (48kHz → 20-50 samples/sec)       │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  6. Store in IndexedDB                │
        │     (WaveformData object store)        │
        └───────────────────────────────────────┘
                            ↓
        ┌───────────────────────────────────────┐
        │  7. Render in Timeline clips          │
        │     (<WaveformBackground> component)   │
        └───────────────────────────────────────┘
```

### Performance Characteristics

**Storage Size (3-hour stereo video):**

| Strategy | Memory (RAM) | IndexedDB Size | Notes |
|----------|--------------|----------------|-------|
| Full waveform (48kHz) | 518 MB | Too large ❌ | Uncompressed Float32Array |
| Downsampled (10 samples/sec) | 432 KB | ✅ Excellent | Recommended for timeline |
| Downsampled (20 samples/sec) | 864 KB | ✅ Good | Better detail |
| Downsampled (50 samples/sec) | 2.16 MB | ✅ Acceptable | High detail |

**Rendering Performance:**

| Video Length | Downsampled Size | Render Time (60fps) | Canvas Draw Calls |
|--------------|------------------|---------------------|-------------------|
| 10 min | 24 KB | < 1ms | ~120-600 |
| 1 hour | 144 KB | < 2ms | ~720-3600 |
| 3 hours | 432 KB | < 5ms | ~2160-10800 |

**Recommendation**: Use 20 samples/sec for balanced detail and performance.

---

## Storage Schema Extension

### IndexedDB Schema

**New Object Store: `waveform-data`**

```typescript
interface WaveformData {
  id: string;                    // Same as mediaId (primary key)
  mediaId: string;               // Foreign key to media-metadata
  sampleRate: number;            // Original sample rate (e.g., 48000)
  numberOfChannels: number;      // 1 (mono) or 2 (stereo)
  durationInSeconds: number;     // Total audio duration

  // Downsampled waveform for timeline display
  downsampledWaveform: number[]; // Amplitude values (0 to 1)
  downsampleRate: number;        // Samples per second (e.g., 20)

  // Metadata
  wavPath?: string;              // OPFS path to extracted WAV file
  createdAt: number;             // Unix timestamp
  updatedAt: number;             // Unix timestamp
}
```

**Updated Object Store: `media-metadata`**

```typescript
interface MediaMetadata {
  // Existing fields
  id: string;
  opfsPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  thumbnailId?: string;

  // NEW: Waveform reference
  waveformId?: string;           // Reference to WaveformData
  hasAudio: boolean;             // Whether file contains audio track
  audioFormat?: 'wav' | 'mp4' | 'aac' | 'other'; // Original audio format
}
```

**Migration Script:**

```typescript
// db/migrations/add-waveform-store.ts
import { IDBPDatabase } from 'idb';

export async function migrateToWaveformSchema(
  db: IDBPDatabase,
  oldVersion: number,
  newVersion: number
) {
  if (oldVersion < 2) {
    // Create waveform-data object store
    const waveformStore = db.createObjectStore('waveform-data', {
      keyPath: 'id',
    });

    waveformStore.createIndex('mediaId', 'mediaId', { unique: true });
    waveformStore.createIndex('createdAt', 'createdAt');

    console.log('Created waveform-data object store');
  }
}
```

### Storage Size Calculation Utility

```typescript
// utils/waveform-storage.ts

/**
 * Calculate storage size for downsampled waveform
 */
export function calculateWaveformSize(
  durationInSeconds: number,
  samplesPerSecond: number,
  numberOfChannels: number
): number {
  // Each sample is stored as a float64 (8 bytes) in IndexedDB
  const totalSamples = durationInSeconds * samplesPerSecond * numberOfChannels;
  const bytes = totalSamples * 8;

  return bytes;
}

/**
 * Format storage size for display
 */
export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Example usage:
 * const size = calculateWaveformSize(10800, 20, 2); // 3 hours, 20 samples/sec, stereo
 * console.log(formatStorageSize(size)); // "864 KB"
 */
```

---

## Server-Side Audio Extraction

### Requirements

For optimal performance with long videos, extract audio to WAV format on the server side. This enables:
- HTTP Range requests for streaming large audio files
- Compatibility with Remotion's `useWindowedAudioData()` (future enhancement)
- Faster audio data loading (no video decoding overhead)

### ffmpeg Pipeline

**Extract audio to WAV:**

```bash
# Extract first audio stream to 48kHz stereo WAV
ffmpeg -i input.mp4 \
  -vn \
  -acodec pcm_s16le \
  -ar 48000 \
  -ac 2 \
  output.wav
```

**Server Implementation (Node.js):**

```typescript
// server/services/audio-extraction.ts
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

export interface AudioExtractionResult {
  wavPath: string;
  sampleRate: number;
  numberOfChannels: number;
  durationInSeconds: number;
  fileSizeBytes: number;
}

/**
 * Extract audio from video to WAV format
 */
export async function extractAudioToWav(
  videoPath: string,
  outputDir: string
): Promise<AudioExtractionResult> {
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const wavPath = path.join(outputDir, `${videoName}.wav`);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', videoPath,
      '-vn',                    // No video
      '-acodec', 'pcm_s16le',   // PCM 16-bit
      '-ar', '48000',           // 48kHz sample rate
      '-ac', '2',               // Stereo
      '-y',                     // Overwrite
      wavPath
    ]);

    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpeg.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error(`ffmpeg failed: ${stderr}`));
      }

      try {
        const stats = await fs.stat(wavPath);

        // Parse duration from ffmpeg output
        const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}.\d+)/);
        let duration = 0;

        if (durationMatch) {
          const [, hours, minutes, seconds] = durationMatch;
          duration =
            parseInt(hours) * 3600 +
            parseInt(minutes) * 60 +
            parseFloat(seconds);
        }

        resolve({
          wavPath,
          sampleRate: 48000,
          numberOfChannels: 2,
          durationInSeconds: duration,
          fileSizeBytes: stats.size,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
```

**API Endpoint:**

```typescript
// server/routes/media.ts
import express from 'express';
import { extractAudioToWav } from '../services/audio-extraction';

const router = express.Router();

router.post('/media/:id/extract-audio', async (req, res) => {
  try {
    const { id } = req.params;

    // Get video path from storage
    const videoPath = await getMediaPath(id);
    const outputDir = path.join(process.env.AUDIO_CACHE_DIR, id);

    await fs.mkdir(outputDir, { recursive: true });

    // Extract audio
    const result = await extractAudioToWav(videoPath, outputDir);

    // Store WAV path in metadata
    await updateMediaMetadata(id, {
      wavPath: result.wavPath,
      hasAudio: true,
    });

    res.json({
      success: true,
      wavPath: result.wavPath,
      sampleRate: result.sampleRate,
      numberOfChannels: result.numberOfChannels,
      duration: result.durationInSeconds,
    });
  } catch (error) {
    console.error('Audio extraction failed:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### CORS Configuration

For HTTP Range requests to work with Remotion's `useWindowedAudioData()`, configure CORS headers:

```typescript
// server/middleware/cors.ts
import cors from 'cors';

export const corsConfig = cors({
  origin: process.env.CLIENT_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
  credentials: true,
});
```

**Static file serving with Range support:**

```typescript
// server/routes/audio-files.ts
import express from 'express';
import { promises as fs } from 'fs';

const router = express.Router();

router.get('/audio/:id/:filename', async (req, res) => {
  const { id, filename } = req.params;
  const filePath = path.join(process.env.AUDIO_CACHE_DIR, id, filename);

  try {
    const stat = await fs.stat(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Parse Range header
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      // Set partial content headers
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'audio/wav',
      });

      // Stream the range
      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      // Send full file
      res.set({
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav',
        'Accept-Ranges': 'bytes',
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error) {
    res.status(404).json({ error: 'Audio file not found' });
  }
});

export default router;
```

---

## Waveform Generation Process

### Remotion Integration

**Using `getAudioData()` and `getWaveformPortion()`:**

```typescript
// services/waveform-generator.ts
import { getAudioData, getWaveformPortion } from '@remotion/media-utils';
import type { WaveformData } from '../types/waveform';

export interface WaveformGenerationOptions {
  samplesPerSecond?: number;  // Default: 20
  normalize?: boolean;         // Default: true
  channel?: number;            // 0 (left), 1 (right), or average both
}

/**
 * Generate downsampled waveform from audio file
 */
export async function generateWaveform(
  audioUrl: string,
  mediaId: string,
  options: WaveformGenerationOptions = {}
): Promise<WaveformData> {
  const {
    samplesPerSecond = 20,
    normalize = true,
    channel = 0,
  } = options;

  // Load full audio data
  const audioData = await getAudioData(audioUrl);

  if (!audioData) {
    throw new Error('Failed to load audio data');
  }

  const { sampleRate, numberOfChannels, durationInSeconds } = audioData;

  // Calculate total samples needed
  const totalSamples = Math.ceil(durationInSeconds * samplesPerSecond);

  // Generate downsampled waveform
  const bars = await getWaveformPortion({
    audioData,
    startTimeInSeconds: 0,
    durationInSeconds,
    numberOfSamples: totalSamples,
    channel,
    outputRange: 'zero-to-one',
    normalize,
  });

  // Extract amplitude values
  const downsampledWaveform = bars.map(bar => bar.amplitude);

  return {
    id: mediaId,
    mediaId,
    sampleRate,
    numberOfChannels,
    durationInSeconds,
    downsampledWaveform,
    downsampleRate: samplesPerSecond,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
```

### Background Processing

For long videos (> 30 minutes), use Web Workers to prevent blocking the main thread:

```typescript
// workers/waveform-worker.ts
import { getAudioData, getWaveformPortion } from '@remotion/media-utils';

self.addEventListener('message', async (event) => {
  const { type, payload } = event.data;

  if (type === 'GENERATE_WAVEFORM') {
    try {
      const { audioUrl, mediaId, options } = payload;

      // Report progress
      self.postMessage({ type: 'PROGRESS', progress: 0 });

      // Load audio data
      const audioData = await getAudioData(audioUrl);
      self.postMessage({ type: 'PROGRESS', progress: 50 });

      // Generate waveform
      const totalSamples = Math.ceil(
        audioData.durationInSeconds * (options.samplesPerSecond || 20)
      );

      const bars = await getWaveformPortion({
        audioData,
        startTimeInSeconds: 0,
        durationInSeconds: audioData.durationInSeconds,
        numberOfSamples: totalSamples,
        channel: options.channel || 0,
        outputRange: 'zero-to-one',
        normalize: options.normalize !== false,
      });

      self.postMessage({ type: 'PROGRESS', progress: 90 });

      const waveformData = {
        id: mediaId,
        mediaId,
        sampleRate: audioData.sampleRate,
        numberOfChannels: audioData.numberOfChannels,
        durationInSeconds: audioData.durationInSeconds,
        downsampledWaveform: bars.map(b => b.amplitude),
        downsampleRate: options.samplesPerSecond || 20,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      self.postMessage({
        type: 'COMPLETE',
        waveformData,
        progress: 100,
      });
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        error: error.message
      });
    }
  }
});
```

**Worker Manager:**

```typescript
// services/waveform-worker-manager.ts

export class WaveformWorkerManager {
  private worker: Worker | null = null;

  async generateWaveform(
    audioUrl: string,
    mediaId: string,
    options: WaveformGenerationOptions = {},
    onProgress?: (progress: number) => void
  ): Promise<WaveformData> {
    return new Promise((resolve, reject) => {
      this.worker = new Worker(
        new URL('../workers/waveform-worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.addEventListener('message', (event) => {
        const { type, waveformData, progress, error } = event.data;

        if (type === 'PROGRESS' && onProgress) {
          onProgress(progress);
        } else if (type === 'COMPLETE') {
          this.worker?.terminate();
          this.worker = null;
          resolve(waveformData);
        } else if (type === 'ERROR') {
          this.worker?.terminate();
          this.worker = null;
          reject(new Error(error));
        }
      });

      this.worker.postMessage({
        type: 'GENERATE_WAVEFORM',
        payload: { audioUrl, mediaId, options },
      });
    });
  }

  cancel() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
```

### Integration with MediaLibraryService

**Updated upload flow:**

```typescript
// services/media-library-service.ts
import { WaveformWorkerManager } from './waveform-worker-manager';
import { saveWaveformData } from '../db/waveform-db';

export class MediaLibraryService {
  private waveformWorker = new WaveformWorkerManager();

  async uploadMedia(file: File): Promise<MediaMetadata> {
    // 1. Store original file in OPFS
    const opfsPath = await this.storeInOPFS(file);

    // 2. Extract metadata with mediabunny
    const metadata = await this.extractMetadata(file);

    // 3. Generate thumbnail
    const thumbnailId = await this.generateThumbnail(file);

    // 4. Check if file has audio
    const hasAudio = await this.checkHasAudio(file);

    const mediaMetadata: MediaMetadata = {
      id: crypto.randomUUID(),
      opfsPath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      duration: metadata.duration,
      width: metadata.width,
      height: metadata.height,
      fps: metadata.fps,
      codec: metadata.codec,
      thumbnailId,
      hasAudio,
      audioFormat: this.detectAudioFormat(file),
    };

    // 5. Save metadata
    await this.saveMediaMetadata(mediaMetadata);

    // 6. Generate waveform in background (if has audio)
    if (hasAudio) {
      this.generateWaveformAsync(mediaMetadata.id, opfsPath);
    }

    return mediaMetadata;
  }

  private async generateWaveformAsync(mediaId: string, videoPath: string) {
    try {
      // Request server to extract audio to WAV
      const response = await fetch(`/api/media/${mediaId}/extract-audio`, {
        method: 'POST',
      });

      const { wavPath } = await response.json();

      // Generate waveform with worker
      const waveformData = await this.waveformWorker.generateWaveform(
        `/api/audio/${mediaId}/${path.basename(wavPath)}`,
        mediaId,
        { samplesPerSecond: 20, normalize: true },
        (progress) => {
          console.log(`Waveform generation: ${progress}%`);
          // Could emit progress event here
        }
      );

      // Store waveform in IndexedDB
      await saveWaveformData(waveformData);

      // Update media metadata with waveform reference
      await this.updateMediaMetadata(mediaId, {
        waveformId: waveformData.id,
      });

      console.log(`Waveform generated for media ${mediaId}`);
    } catch (error) {
      console.error('Waveform generation failed:', error);
      // Could emit error event here
    }
  }

  private detectAudioFormat(file: File): string {
    if (file.type.includes('wav')) return 'wav';
    if (file.type.includes('mp4')) return 'mp4';
    if (file.type.includes('aac')) return 'aac';
    return 'other';
  }
}
```

---

## Timeline Integration

### WaveformBackground Component

**Component API:**

```typescript
// components/Timeline/components/waveform-background.tsx
import React, { useMemo } from 'react';
import type { TimelineClip } from '../types';
import type { WaveformData } from '@/types/waveform';

export interface WaveformBackgroundProps {
  waveform: WaveformData;
  clip: TimelineClip;
  width: number;           // Clip width in pixels
  height: number;          // Clip height in pixels
  zoomLevel: number;       // Current timeline zoom
  color?: string;          // Waveform color
  backgroundColor?: string; // Background color
}

export const WaveformBackground: React.FC<WaveformBackgroundProps> = ({
  waveform,
  clip,
  width,
  height,
  zoomLevel,
  color = 'rgba(59, 130, 246, 0.4)',
  backgroundColor = 'transparent',
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Calculate which portion of the waveform to show
  const visibleWaveform = useMemo(() => {
    const { downsampledWaveform, downsampleRate, durationInSeconds } = waveform;
    const { start, end, offset } = clip;

    // Account for clip offset (trimming)
    const actualStart = start + offset;
    const actualEnd = actualStart + (end - start);

    // Convert to sample indices
    const startSample = Math.floor(actualStart * downsampleRate);
    const endSample = Math.ceil(actualEnd * downsampleRate);

    // Extract visible portion
    return downsampledWaveform.slice(startSample, endSample);
  }, [waveform, clip]);

  // Render waveform to canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw waveform
    ctx.fillStyle = color;

    const barWidth = width / visibleWaveform.length;
    const centerY = height / 2;

    visibleWaveform.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * height;
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
    });
  }, [visibleWaveform, width, height, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className="waveform-background"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};
```

### Integration into timeline-clip.tsx

**Updated TimelineClip component:**

```typescript
// components/Timeline/components/timeline-item/timeline-clip.tsx
import React from 'react';
import { WaveformBackground } from '../waveform-background';
import { useWaveformData } from '@/hooks/use-waveform-data';
import { useTimelineStore } from '@/stores/timeline-store';
import type { TimelineClip } from '../../types';

export interface TimelineClipProps {
  clip: TimelineClip;
  trackId: string;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  trackId,
  selected,
  onSelect,
  onDragStart,
}) => {
  const zoomLevel = useTimelineStore(s => s.zoomLevel);
  const waveformData = useWaveformData(clip.mediaId);

  // Calculate clip dimensions
  const clipWidth = (clip.end - clip.start) * zoomLevel * 100; // pixels
  const clipHeight = 80; // Track height

  return (
    <div
      className={`timeline-clip ${selected ? 'selected' : ''}`}
      style={{
        position: 'absolute',
        left: `${clip.start * zoomLevel * 100}px`,
        width: `${clipWidth}px`,
        height: `${clipHeight}px`,
      }}
      onClick={onSelect}
      onMouseDown={onDragStart}
    >
      {/* Waveform Background */}
      {waveformData && (
        <WaveformBackground
          waveform={waveformData}
          clip={clip}
          width={clipWidth}
          height={clipHeight}
          zoomLevel={zoomLevel}
          color="rgba(59, 130, 246, 0.3)"
        />
      )}

      {/* Clip Content */}
      <div className="clip-content">
        <span className="clip-label">{clip.label}</span>
        <span className="clip-duration">
          {formatDuration(clip.end - clip.start)}
        </span>
      </div>

      {/* Trim Handles */}
      <div className="trim-handle-left" />
      <div className="trim-handle-right" />
    </div>
  );
};
```

### useWaveformData Hook

**Hook for loading waveform data:**

```typescript
// hooks/use-waveform-data.ts
import { useState, useEffect } from 'react';
import { getWaveformData } from '@/db/waveform-db';
import type { WaveformData } from '@/types/waveform';

/**
 * Load waveform data for a media item
 */
export function useWaveformData(mediaId: string): WaveformData | null {
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadWaveform() {
      try {
        setLoading(true);
        const data = await getWaveformData(mediaId);

        if (!cancelled) {
          setWaveformData(data);
        }
      } catch (error) {
        console.error('Failed to load waveform:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (mediaId) {
      loadWaveform();
    }

    return () => {
      cancelled = true;
    };
  }, [mediaId]);

  return waveformData;
}
```

### IndexedDB CRUD Operations

**Waveform database operations:**

```typescript
// db/waveform-db.ts
import { openDB, IDBPDatabase } from 'idb';
import type { WaveformData } from '@/types/waveform';

const DB_NAME = 'video-editor-db';
const WAVEFORM_STORE = 'waveform-data';

/**
 * Save waveform data to IndexedDB
 */
export async function saveWaveformData(data: WaveformData): Promise<void> {
  const db = await openDB(DB_NAME, 2);

  await db.put(WAVEFORM_STORE, data);

  console.log(`Saved waveform for media ${data.mediaId}`);
}

/**
 * Get waveform data by media ID
 */
export async function getWaveformData(mediaId: string): Promise<WaveformData | null> {
  const db = await openDB(DB_NAME, 2);

  const data = await db.get(WAVEFORM_STORE, mediaId);

  return data || null;
}

/**
 * Delete waveform data
 */
export async function deleteWaveformData(mediaId: string): Promise<void> {
  const db = await openDB(DB_NAME, 2);

  await db.delete(WAVEFORM_STORE, mediaId);

  console.log(`Deleted waveform for media ${mediaId}`);
}

/**
 * Get all waveform data
 */
export async function getAllWaveformData(): Promise<WaveformData[]> {
  const db = await openDB(DB_NAME, 2);

  return await db.getAll(WAVEFORM_STORE);
}

/**
 * Check if waveform exists
 */
export async function hasWaveform(mediaId: string): Promise<boolean> {
  const db = await openDB(DB_NAME, 2);

  const data = await db.get(WAVEFORM_STORE, mediaId);

  return !!data;
}
```

---

## Implementation Steps

### Phase 1: Storage Foundation

**Step 1: Update TypeScript Types**

Create `src/types/waveform.ts`:

```typescript
export interface WaveformData {
  id: string;
  mediaId: string;
  sampleRate: number;
  numberOfChannels: number;
  durationInSeconds: number;
  downsampledWaveform: number[];
  downsampleRate: number;
  wavPath?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WaveformGenerationOptions {
  samplesPerSecond?: number;
  normalize?: boolean;
  channel?: number;
}
```

**Step 2: Update IndexedDB Schema**

Modify `src/db/schema.ts`:

```typescript
import { openDB, IDBPDatabase } from 'idb';

export async function initDatabase(): Promise<IDBPDatabase> {
  return await openDB('video-editor-db', 2, {
    upgrade(db, oldVersion, newVersion, transaction) {
      // Existing stores...

      // Version 2: Add waveform-data store
      if (oldVersion < 2) {
        const waveformStore = db.createObjectStore('waveform-data', {
          keyPath: 'id',
        });

        waveformStore.createIndex('mediaId', 'mediaId', { unique: true });
        waveformStore.createIndex('createdAt', 'createdAt');
      }
    },
  });
}
```

**Step 3: Create Database Operations**

Create `src/db/waveform-db.ts` (see "IndexedDB CRUD Operations" section above).

### Phase 2: Server-Side Audio Extraction

**Step 4: Set Up ffmpeg Pipeline**

Follow "Server-Side Audio Extraction" section to:
- Install ffmpeg on server
- Create audio extraction endpoint
- Configure CORS for Range requests
- Set up static file serving

**Step 5: Test Audio Extraction**

```bash
# Manual test
curl -X POST http://localhost:3000/api/media/test-id/extract-audio

# Verify WAV file created
curl -I http://localhost:3000/api/audio/test-id/test-video.wav
# Should return: Accept-Ranges: bytes
```

### Phase 3: Waveform Generation

**Step 6: Create Waveform Generator Service**

Create `src/services/waveform-generator.ts` (see "Waveform Generation Process" section).

**Step 7: Create Web Worker**

Create `src/workers/waveform-worker.ts` and `src/services/waveform-worker-manager.ts`.

**Step 8: Integrate with Media Upload**

Update `MediaLibraryService.uploadMedia()` to trigger waveform generation.

**Step 9: Test Waveform Generation**

```typescript
// Test script
import { generateWaveform } from './services/waveform-generator';

const waveform = await generateWaveform(
  'http://localhost:3000/api/audio/test-id/test.wav',
  'test-id',
  { samplesPerSecond: 20 }
);

console.log('Waveform samples:', waveform.downsampledWaveform.length);
console.log('Duration:', waveform.durationInSeconds);
```

### Phase 4: UI Integration

**Step 10: Create WaveformBackground Component**

Create `src/components/Timeline/components/waveform-background.tsx`.

**Step 11: Create useWaveformData Hook**

Create `src/hooks/use-waveform-data.ts`.

**Step 12: Update TimelineClip Component**

Modify `src/components/Timeline/components/timeline-item/timeline-clip.tsx`.

**Step 13: Add Styling**

```css
/* timeline-clip.css */
.timeline-clip {
  position: relative;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.timeline-clip.selected {
  outline: 2px solid #3b82f6;
  outline-offset: -2px;
}

.waveform-background {
  opacity: 0.6;
}

.timeline-clip:hover .waveform-background {
  opacity: 0.8;
}

.clip-content {
  position: relative;
  z-index: 1;
  padding: 8px;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
```

### Phase 5: Testing & Optimization

**Step 14: Unit Tests**

```typescript
// __tests__/waveform-generator.test.ts
import { generateWaveform } from '@/services/waveform-generator';

describe('Waveform Generator', () => {
  it('should generate waveform for short audio', async () => {
    const waveform = await generateWaveform(
      '/test-audio.wav',
      'test-id',
      { samplesPerSecond: 10 }
    );

    expect(waveform.downsampledWaveform.length).toBeGreaterThan(0);
    expect(waveform.downsampleRate).toBe(10);
  });

  it('should normalize waveform values', async () => {
    const waveform = await generateWaveform(
      '/test-audio.wav',
      'test-id',
      { normalize: true }
    );

    const maxValue = Math.max(...waveform.downsampledWaveform);
    expect(maxValue).toBeLessThanOrEqual(1);
    expect(maxValue).toBeGreaterThan(0);
  });
});
```

**Step 15: Integration Tests**

```typescript
// __tests__/timeline-waveform.test.tsx
import { render, screen } from '@testing-library/react';
import { TimelineClip } from '@/components/Timeline/components/timeline-item/timeline-clip';

describe('Timeline Waveform Integration', () => {
  it('should render waveform when data is available', async () => {
    const clip = {
      id: 'clip-1',
      mediaId: 'media-1',
      start: 0,
      end: 10,
      offset: 0,
      // ...other props
    };

    render(<TimelineClip clip={clip} />);

    // Wait for waveform to load
    await screen.findByClassName('waveform-background');

    const canvas = screen.getByClassName('waveform-background');
    expect(canvas).toBeInTheDocument();
  });
});
```

**Step 16: Performance Testing**

```typescript
// __tests__/waveform-performance.test.ts
describe('Waveform Performance', () => {
  it('should handle 3-hour video efficiently', async () => {
    const startTime = performance.now();

    const waveform = await generateWaveform(
      '/3-hour-video.wav',
      'long-video',
      { samplesPerSecond: 20 }
    );

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Generation time: ${duration}ms`);
    console.log(`Waveform size: ${waveform.downsampledWaveform.length} samples`);

    // Should complete in reasonable time (< 10 seconds)
    expect(duration).toBeLessThan(10000);

    // Should have correct sample count
    const expectedSamples = 10800 * 20; // 3 hours * 20 samples/sec
    expect(waveform.downsampledWaveform.length).toBeCloseTo(expectedSamples, -2);
  });
});
```

---

## Performance Optimization

### Caching Strategy

**In-Memory LRU Cache:**

```typescript
// utils/waveform-cache.ts

interface CacheEntry {
  waveform: WaveformData;
  timestamp: number;
  size: number;
}

export class WaveformCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;
  private currentSize = 0;

  constructor(maxSizeMB: number = 50) {
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  }

  set(mediaId: string, waveform: WaveformData) {
    // Calculate size
    const size = waveform.downsampledWaveform.length * 8; // 8 bytes per number

    // Evict old entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    this.cache.set(mediaId, {
      waveform,
      timestamp: Date.now(),
      size,
    });

    this.currentSize += size;
  }

  get(mediaId: string): WaveformData | null {
    const entry = this.cache.get(mediaId);

    if (entry) {
      // Update timestamp (LRU)
      entry.timestamp = Date.now();
      return entry.waveform;
    }

    return null;
  }

  has(mediaId: string): boolean {
    return this.cache.has(mediaId);
  }

  private evictOldest() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.currentSize -= entry.size;
      this.cache.delete(oldestKey);
    }
  }

  clear() {
    this.cache.clear();
    this.currentSize = 0;
  }
}

// Global cache instance
export const waveformCache = new WaveformCache(50); // 50MB cache
```

**Updated useWaveformData with caching:**

```typescript
// hooks/use-waveform-data.ts
import { waveformCache } from '@/utils/waveform-cache';

export function useWaveformData(mediaId: string): WaveformData | null {
  const [waveformData, setWaveformData] = useState<WaveformData | null>(null);

  useEffect(() => {
    // Check cache first
    const cached = waveformCache.get(mediaId);
    if (cached) {
      setWaveformData(cached);
      return;
    }

    // Load from IndexedDB
    async function loadWaveform() {
      const data = await getWaveformData(mediaId);

      if (data) {
        waveformCache.set(mediaId, data);
        setWaveformData(data);
      }
    }

    loadWaveform();
  }, [mediaId]);

  return waveformData;
}
```

### Lazy Loading for Off-Screen Clips

**Intersection Observer for lazy rendering:**

```typescript
// components/Timeline/components/timeline-clip.tsx
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';

export const TimelineClip: React.FC<TimelineClipProps> = ({ clip, ...props }) => {
  const clipRef = useRef<HTMLDivElement>(null);
  const isVisible = useIntersectionObserver(clipRef, {
    threshold: 0,
    rootMargin: '200px', // Load 200px before visible
  });

  const waveformData = useWaveformData(clip.mediaId);

  return (
    <div ref={clipRef} className="timeline-clip">
      {/* Only render waveform if visible */}
      {isVisible && waveformData && (
        <WaveformBackground waveform={waveformData} clip={clip} />
      )}

      {/* Clip content always rendered */}
      <div className="clip-content">...</div>
    </div>
  );
};
```

### Canvas vs SVG Rendering

**Performance comparison:**

| Rendering Method | Pros | Cons | Best For |
|------------------|------|------|----------|
| **Canvas** | Fast rendering, good for animation | Not scalable, pixelated when zoomed | Real-time updates, large datasets |
| **SVG** | Crisp at any zoom, styleable with CSS | Slower for large datasets | Static waveforms, print quality |

**Canvas Implementation (Current):**
- Best for timeline waveforms (60fps scrolling)
- Renders quickly even with thousands of samples
- Use `requestAnimationFrame` for smooth updates

**SVG Alternative (Optional):**

```typescript
// components/Timeline/components/waveform-background-svg.tsx
export const WaveformBackgroundSVG: React.FC<WaveformBackgroundProps> = ({
  waveform,
  clip,
  width,
  height,
  color,
}) => {
  const path = useMemo(() => {
    const { downsampledWaveform } = waveform;
    const barWidth = width / downsampledWaveform.length;
    const centerY = height / 2;

    let d = '';

    downsampledWaveform.forEach((amplitude, index) => {
      const x = index * barWidth;
      const barHeight = amplitude * height;
      const y1 = centerY - barHeight / 2;
      const y2 = centerY + barHeight / 2;

      d += `M ${x} ${y1} L ${x} ${y2} `;
    });

    return d;
  }, [waveform, width, height]);

  return (
    <svg width={width} height={height} className="waveform-background">
      <path d={path} stroke={color} strokeWidth="2" fill="none" />
    </svg>
  );
};
```

### Zoom-Aware Rendering

**Adaptive detail level based on zoom:**

```typescript
// components/Timeline/components/waveform-background.tsx

const visibleWaveform = useMemo(() => {
  const { downsampledWaveform, downsampleRate, durationInSeconds } = waveform;

  // Calculate pixels per sample at current zoom
  const clipDuration = clip.end - clip.start;
  const pixelsPerSecond = width / clipDuration;
  const pixelsPerSample = pixelsPerSecond / downsampleRate;

  // If zoomed out too far, skip samples for performance
  if (pixelsPerSample < 0.5) {
    const skipFactor = Math.ceil(0.5 / pixelsPerSample);
    return downsampledWaveform.filter((_, i) => i % skipFactor === 0);
  }

  // If zoomed in, show all samples
  return downsampledWaveform;
}, [waveform, clip, width]);
```

### Memory Management

**Monitor and cleanup:**

```typescript
// utils/waveform-memory-monitor.ts

export class WaveformMemoryMonitor {
  private checkInterval: number | null = null;

  start() {
    this.checkInterval = window.setInterval(() => {
      if ('memory' in performance) {
        const { usedJSHeapSize, jsHeapSizeLimit } = (performance as any).memory;
        const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

        if (usagePercent > 80) {
          console.warn('High memory usage detected, clearing waveform cache');
          waveformCache.clear();
        }
      }
    }, 10000); // Check every 10 seconds
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Usage in app initialization
const memoryMonitor = new WaveformMemoryMonitor();
memoryMonitor.start();
```

---

## Future Enhancements

### Real-Time Playback Waveform

Use `useWindowedAudioData()` for detailed waveform during playback:

```typescript
// components/Timeline/components/playback-waveform.tsx
import { useWindowedAudioData, visualizeAudioWaveform } from '@remotion/media-utils';

export const PlaybackWaveform: React.FC = () => {
  const currentFrame = useTimelineStore(s => s.currentFrame);
  const currentClip = useCurrentAudioClip();
  const fps = useTimelineStore(s => s.fps);

  const { audioData, dataOffsetInSeconds } = useWindowedAudioData({
    src: currentClip?.wavPath || '',
    frame: currentFrame,
    fps,
    windowInSeconds: 10,
  });

  const waveform = audioData
    ? visualizeAudioWaveform({
        audioData,
        frame: currentFrame,
        fps,
        numberOfSamples: 128,
        windowInSeconds: 1 / fps,
        dataOffsetInSeconds,
      })
    : null;

  if (!waveform) return null;

  return (
    <div className="playback-waveform">
      {waveform.map((amplitude, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{ height: `${amplitude * 100}%` }}
        />
      ))}
    </div>
  );
};
```

### Interactive Waveform Scrubbing

Click waveform to seek:

```typescript
// Add to WaveformBackground component
const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percentageX = clickX / rect.width;

  const clipDuration = clip.end - clip.start;
  const seekTime = clip.start + (clipDuration * percentageX);

  // Update playhead
  useTimelineStore.getState().setCurrentFrame(seekTime * fps);
};

return (
  <canvas
    ref={canvasRef}
    onClick={handleClick}
    style={{ cursor: 'pointer' }}
  />
);
```

### Waveform-Based Clip Detection

Auto-detect silence for clip splitting:

```typescript
// utils/silence-detection.ts

export function detectSilence(
  waveform: number[],
  threshold: number = 0.1,
  minDurationSamples: number = 10
): Array<{ start: number; end: number }> {
  const silenceRanges: Array<{ start: number; end: number }> = [];
  let silenceStart: number | null = null;

  waveform.forEach((amplitude, index) => {
    if (amplitude < threshold) {
      if (silenceStart === null) {
        silenceStart = index;
      }
    } else {
      if (silenceStart !== null) {
        const duration = index - silenceStart;
        if (duration >= minDurationSamples) {
          silenceRanges.push({
            start: silenceStart,
            end: index,
          });
        }
        silenceStart = null;
      }
    }
  });

  return silenceRanges;
}
```

### Frequency Spectrum Visualization

Use `visualizeAudio()` for music:

```typescript
import { visualizeAudio } from '@remotion/media-utils';

export const FrequencySpectrum: React.FC = () => {
  const currentFrame = useTimelineStore(s => s.currentFrame);
  const audioData = useAudioData(currentClip?.src);
  const fps = useTimelineStore(s => s.fps);

  const spectrum = audioData
    ? visualizeAudio({
        audioData,
        frame: currentFrame,
        fps,
        numberOfSamples: 32, // 32 frequency bands
        optimizeFor: 'speed',
      })
    : null;

  return (
    <div className="frequency-spectrum">
      {spectrum?.map((amplitude, i) => (
        <div
          key={i}
          className="frequency-bar"
          style={{
            height: `${amplitude * 100}%`,
            backgroundColor: getFrequencyColor(i),
          }}
        />
      ))}
    </div>
  );
};
```

---

## Summary

### Implementation Checklist

- [ ] **Phase 1: Storage Foundation**
  - [ ] Create TypeScript types (`waveform.ts`)
  - [ ] Update IndexedDB schema (add `waveform-data` store)
  - [ ] Create database operations (`waveform-db.ts`)

- [ ] **Phase 2: Server-Side Audio Extraction**
  - [ ] Set up ffmpeg pipeline
  - [ ] Create audio extraction endpoint
  - [ ] Configure CORS for Range requests
  - [ ] Set up static file serving

- [ ] **Phase 3: Waveform Generation**
  - [ ] Create waveform generator service
  - [ ] Create Web Worker for background processing
  - [ ] Integrate with MediaLibraryService
  - [ ] Test with short and long videos

- [ ] **Phase 4: UI Integration**
  - [ ] Create `WaveformBackground` component
  - [ ] Create `useWaveformData` hook
  - [ ] Update `TimelineClip` component
  - [ ] Add CSS styling

- [ ] **Phase 5: Testing & Optimization**
  - [ ] Write unit tests
  - [ ] Write integration tests
  - [ ] Performance testing with 3+ hour videos
  - [ ] Implement caching strategy
  - [ ] Add lazy loading for off-screen clips

### Key Takeaways

1. **Storage**: Use downsampled waveforms (20 samples/sec) in IndexedDB for timeline thumbnails
2. **Performance**: ~2MB storage and < 5ms render time for 3-hour videos
3. **Server**: Extract audio to WAV format for HTTP Range request compatibility
4. **Client**: Use Remotion's `getAudioData()` and `getWaveformPortion()` for generation
5. **Optimization**: LRU cache, lazy loading, zoom-aware rendering

### Next Steps

1. Start with Phase 1 (Storage Foundation)
2. Set up server-side audio extraction
3. Implement basic waveform generation
4. Build UI components
5. Optimize for long videos
6. Consider future enhancements (real-time, scrubbing, detection)

For questions or issues, refer to:
- [Remotion Media Utils Docs](https://www.remotion.dev/docs/media-utils)
- `.claude/docs/video-editor/storage.md` for IndexedDB patterns
- `.claude/docs/video-editor/timeline-architecture.md` for Timeline integration
