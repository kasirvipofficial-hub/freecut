# Timeline Filmstrip Feature

Comprehensive guide to implementing and using the timeline filmstrip feature for displaying sequential video frame thumbnails in timeline clips.

## Overview

The **filmstrip feature** displays a sequence of video frame thumbnails along the length of timeline clips, providing visual context for video content at a glance. This feature is inspired by professional video editing applications like DaVinci Resolve, Premiere Pro, and Final Cut Pro.

### What is the Filmstrip Feature?

Instead of showing a single thumbnail preview for a clip, the filmstrip displays multiple sequential frame thumbnails that tile horizontally across the clip's width. As you zoom in on the timeline, more thumbnails appear, giving you finer visual detail of the video content.

**Visual Example:**
```
Single Thumbnail Mode (zoomed out):
┌─────────────────────┐
│   [thumbnail]       │  "Interview.mp4"
└─────────────────────┘

Filmstrip Mode (zoomed in):
┌─────────────────────────────────────────────┐
│ [frame1][frame2][frame3][frame4][frame5]... │  "Interview.mp4"
└─────────────────────────────────────────────┘
```

### Purpose and Benefits

1. **Visual Context** - Quickly identify specific moments in video clips without scrubbing
2. **Efficient Editing** - Find the exact frame you need for trimming or splitting
3. **Content Recognition** - Identify scene changes, action, or specific subjects
4. **Professional Workflow** - Matches the UX of industry-standard video editors
5. **Zoom-Responsive** - Automatically adjusts thumbnail density based on timeline zoom level

### When Filmstrips are Displayed

The filmstrip feature uses **conditional rendering** based on clip width:

- **Clip width < 150px** → Single thumbnail (fallback)
- **Clip width ≥ 150px** → Filmstrip with sequential frames
- **Zoom level** → Determines thumbnail density (more frames when zoomed in)

## Architecture

### Component Hierarchy

```
Timeline
└── TimelineContent
    └── TimelineTrack (multiple)
        └── TimelineClip (multiple)
            ├── ClipFilmstrip ← NEW
            │   └── ThumbnailFrame (multiple) ← NEW
            └── SingleThumbnail (fallback)
```

**Integration Point**: The filmstrip extends the existing `timeline-item/timeline-clip.tsx` component with conditional rendering logic.

### File Structure

**New Files to Create:**

```
src/
├── components/
│   └── timeline/
│       └── components/
│           └── timeline-item/
│               ├── clip-filmstrip.tsx           ← NEW: Main filmstrip component
│               ├── thumbnail-frame.tsx          ← NEW: Individual thumbnail
│               └── filmstrip-skeleton.tsx       ← NEW: Loading placeholder
├── services/
│   └── thumbnail-service.ts                     ← NEW: Thumbnail generation
├── utils/
│   ├── thumbnail-cache.ts                       ← NEW: LRU cache implementation
│   └── filmstrip-utils.ts                       ← NEW: Density calculations
└── types/
    └── filmstrip.ts                             ← NEW: Filmstrip type definitions
```

**Files to Modify:**

```
src/
├── components/
│   └── timeline/
│       ├── components/
│       │   └── timeline-item/
│       │       └── timeline-clip.tsx            ← MODIFY: Add filmstrip rendering
│       ├── stores/
│       │   └── use-timeline-store.ts            ← MODIFY: Add filmstrip state
│       └── constants.ts                         ← MODIFY: Add filmstrip constants
├── services/
│   ├── media-library-service.ts                 ← MODIFY: Add filmstrip metadata
│   └── indexed-db-service.ts                    ← MODIFY: Add filmstrip schema
└── types/
    └── storage.ts                               ← MODIFY: Extend MediaMetadata
```

## Frame-Based vs Second-Based Systems

### Current Time Unit Architecture

The filmstrip feature currently uses a **hybrid seconds + frames system**:

**Primary Storage: Seconds**
- Timeline clips store positions in **seconds**: `start`, `end`, `duration`, `offset`
- Timeline calculations use seconds as the base unit
- Pixel conversion: `timeToPixels(seconds)` → pixel position

**Frame Calculations: Derived**
- Frames are calculated from seconds: `frameIndex = timestamp * fps`
- Thumbnail generation: `const timestamp = frameIndex / fps`
- Frame indices for display: `Math.round(clip.start * fps)`

**Example:**
```typescript
// Current approach (seconds-based)
const clip: TimelineClip = {
  start: 5.5,          // 5.5 seconds
  end: 10.75,          // 10.75 seconds
  duration: 5.25,      // 5.25 seconds
  offset: 2.0,         // 2.0 seconds trim offset
  fps: 30,
};

// Frame calculations happen at render time
const startFrame = Math.round(clip.start * 30);    // 165
const endFrame = Math.round(clip.end * 30);        // 323
const thumbnailTimestamp = frameIndex / 30;        // Convert back to seconds
```

### Pure Frame-Based System

Alternatively, the timeline could store all positions as **frame numbers**:

**Advantages:**
1. **Frame Precision** - No floating-point rounding errors (frame 150 stays exactly frame 150)
2. **Simpler Math** - Eliminates constant `* fps` and `/ fps` conversions (~30% fewer calculations)
3. **Remotion Alignment** - Matches Remotion's frame-based composition model
4. **Industry Standard** - Professional video editors (Premiere, DaVinci, FCP) are all frame-based
5. **Guaranteed Alignment** - All positions naturally align to frame boundaries

**Example:**
```typescript
// Frame-based approach
const clip: TimelineClip = {
  start: 165,          // Frame 165 (= 5.5s at 30fps)
  end: 323,            // Frame 323 (= 10.75s at 30fps)
  duration: 158,       // 158 frames (= 5.25s at 30fps)
  offset: 60,          // 60 frames trim offset (= 2.0s at 30fps)
  fps: 30,
};

// No conversion needed for thumbnail generation
const thumbnailFrameIndex = clip.start + offset;  // Direct frame index
```

**Disadvantages:**
1. **FPS Dependency** - Changing project FPS requires recalculating all clip positions
2. **UI Conversion** - Must convert frames → time for user-facing displays (e.g., "00:05:30")
3. **Breaking Change** - Requires migrating all existing timeline data
4. **API Compatibility** - Some third-party tools may expect time in seconds

### Filmstrip Impact of Frame-Based System

**Components That Would Change:**

1. **`generateFrameIndices()` Simplification:**
```typescript
// BEFORE (seconds-based)
export function generateFrameIndices(
  duration: number,     // IN SECONDS
  fps: number,
  interval: number,     // IN FRAMES
  offset: number = 0    // IN SECONDS
): number[] {
  const totalFrames = Math.floor(duration * fps);  // Convert seconds → frames
  const startFrame = Math.floor(offset * fps);     // Convert seconds → frames

  const indices: number[] = [];
  for (let frame = startFrame; frame < startFrame + totalFrames; frame += interval) {
    indices.push(frame);
  }
  return indices;
}

// AFTER (frame-based)
export function generateFrameIndices(
  durationFrames: number,  // IN FRAMES (no conversion!)
  interval: number,        // IN FRAMES
  offsetFrames: number = 0 // IN FRAMES (no conversion!)
): number[] {
  const indices: number[] = [];
  for (let frame = offsetFrames; frame < offsetFrames + durationFrames; frame += interval) {
    indices.push(frame);
  }
  return indices;  // ✅ 30% less calculation overhead
}
```

2. **`ThumbnailFrame` Component:**
```typescript
// BEFORE (seconds-based)
useEffect(() => {
  const timestamp = frameIndex / fps;  // Convert frame → seconds
  thumbnailService.generateThumbnail(mediaId, timestamp);
}, [frameIndex, fps]);

// AFTER (frame-based)
useEffect(() => {
  thumbnailService.generateThumbnail(mediaId, frameIndex);  // ✅ Direct frame usage
}, [frameIndex]);
```

3. **Zoom Calculations:**
```typescript
// BEFORE (seconds-based)
const pixelsPerSecond = zoomLevel * BASE_PIXELS_PER_SECOND;
const clipWidthPx = clip.duration * pixelsPerSecond;

// AFTER (frame-based)
const pixelsPerFrame = zoomLevel * BASE_PIXELS_PER_FRAME;
const clipWidthPx = clip.duration * pixelsPerFrame;  // ✅ No fps conversion needed
```

### Migration Strategy

If migrating to frame-based system:

```typescript
// Migration utility
function migrateSecondsToFrames(clip: TimelineClip, fps: number): TimelineClip {
  return {
    ...clip,
    start: Math.round(clip.start * fps),
    end: Math.round(clip.end * fps),
    duration: Math.round(clip.duration * fps),
    offset: Math.round(clip.offset * fps),
  };
}

// Reverse migration (for export/display)
function migrateFramesToSeconds(clip: TimelineClip, fps: number): TimelineClip {
  return {
    ...clip,
    start: clip.start / fps,
    end: clip.end / fps,
    duration: clip.duration / fps,
    offset: clip.offset / fps,
  };
}
```

### Recommendation

**For new projects:** Use **frame-based system** from the start
- Matches Remotion's architecture (see `.claude/docs/remotion/building-a-timeline.md`)
- Eliminates precision issues
- Simpler calculations throughout

**For existing projects:** Consider migration if:
- Experiencing floating-point precision bugs
- Need tighter Remotion integration
- Performance is critical (30% calculation reduction helps)

**Stick with seconds-based if:**
- Already have significant timeline data
- Need to integrate with second-based APIs
- FPS changes frequently in your workflow

### Files Requiring Updates for Frame-Based Migration

**Core Timeline:**
- `src/types/timeline.ts` - Change `TimelineClip` interface
- `src/components/timeline/stores/use-timeline-store.ts` - Update state structure
- `src/components/timeline/hooks/use-timeline-zoom.ts` - Change pixel conversion logic
- `src/utils/timeline-to-remotion.ts` - Simplify conversion (already frame-based on Remotion side)

**Filmstrip Components:**
- `src/utils/filmstrip-utils.ts` - Remove second→frame conversions
- `src/services/thumbnail-service.ts` - Use frame indices directly
- `src/components/timeline/components/timeline-item/clip-filmstrip.tsx` - Update props and calculations

**Display/UI:**
- `src/components/timeline/components/timeline-markers.tsx` - Add frame→time formatting
- `src/components/timeline/components/timeline-header/time-display.tsx` - Convert frames for display

## Component Design

### ClipFilmstrip Component

Main component that renders the filmstrip thumbnail strip.

**Location:** `src/components/timeline/components/timeline-item/clip-filmstrip.tsx`

**Props Interface:**

```typescript
interface ClipFilmstripProps {
  clip: TimelineClip;          // Clip data with media reference
  widthPx: number;             // Clip width in pixels
  heightPx: number;            // Clip height in pixels
  zoomLevel: number;           // Current timeline zoom level
  showFrameNumbers?: boolean;  // Display frame numbers on thumbnails
  quality?: 'low' | 'medium' | 'high'; // Thumbnail quality
}
```

**Implementation:**

```typescript
// src/components/timeline/components/timeline-item/clip-filmstrip.tsx
import React, { useMemo } from 'react';
import { ThumbnailFrame } from './thumbnail-frame';
import { calculateThumbnailInterval, generateFrameIndices } from '@/utils/filmstrip-utils';
import type { TimelineClip } from '@/types/timeline';

export const ClipFilmstrip: React.FC<ClipFilmstripProps> = ({
  clip,
  widthPx,
  heightPx,
  zoomLevel,
  showFrameNumbers = false,
  quality = 'medium',
}) => {
  // Calculate how many frames apart each thumbnail should be
  const thumbnailInterval = useMemo(() =>
    calculateThumbnailInterval(zoomLevel, clip.fps || 30),
    [zoomLevel, clip.fps]
  );

  // Generate array of frame indices to display
  const frameIndices = useMemo(() =>
    generateFrameIndices(
      clip.duration,
      clip.fps || 30,
      thumbnailInterval,
      clip.offset || 0
    ),
    [clip.duration, clip.fps, thumbnailInterval, clip.offset]
  );

  // Calculate thumbnail dimensions
  const thumbnailWidth = useMemo(() => {
    const count = frameIndices.length;
    return count > 0 ? Math.floor(widthPx / count) : widthPx;
  }, [widthPx, frameIndices.length]);

  return (
    <div
      className="clip-filmstrip"
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {frameIndices.map((frameIndex, i) => (
        <ThumbnailFrame
          key={`${clip.mediaId}-${frameIndex}`}
          mediaId={clip.mediaId}
          frameIndex={frameIndex}
          width={thumbnailWidth}
          height={heightPx}
          quality={quality}
          showFrameNumber={showFrameNumbers}
        />
      ))}
    </div>
  );
};
```

### ThumbnailFrame Component

Renders individual thumbnail with lazy loading and caching.

**Location:** `src/components/timeline/components/timeline-item/thumbnail-frame.tsx`

**Props Interface:**

```typescript
interface ThumbnailFrameProps {
  mediaId: string;             // Media file identifier
  frameIndex: number;          // Frame number to display
  width: number;               // Thumbnail width in pixels
  height: number;              // Thumbnail height in pixels
  quality?: 'low' | 'medium' | 'high';
  showFrameNumber?: boolean;   // Display frame number overlay
}
```

**Implementation:**

```typescript
// src/components/timeline/components/timeline-item/thumbnail-frame.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { thumbnailCache } from '@/utils/thumbnail-cache';
import { thumbnailService } from '@/services/thumbnail-service';

export const ThumbnailFrame = React.memo<ThumbnailFrameProps>(
  ({ mediaId, frameIndex, width, height, quality = 'medium', showFrameNumber = false }) => {
    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    // Only load thumbnail when visible (lazy loading)
    const isVisible = useIntersectionObserver(ref, {
      threshold: 0.1,
      rootMargin: '50px',
    });

    useEffect(() => {
      if (!isVisible) return;

      const cacheKey = `${mediaId}-${frameIndex}-${quality}`;

      // Check cache first
      const cached = thumbnailCache.get(cacheKey);
      if (cached) {
        setThumbnail(cached);
        return;
      }

      // Generate thumbnail
      setIsLoading(true);
      setError(null);

      thumbnailService
        .generateThumbnail(mediaId, frameIndex, quality)
        .then((url) => {
          thumbnailCache.set(cacheKey, url);
          setThumbnail(url);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error(`Failed to generate thumbnail for frame ${frameIndex}:`, err);
          setError(err);
          setIsLoading(false);
        });
    }, [mediaId, frameIndex, quality, isVisible]);

    return (
      <div
        ref={ref}
        className="thumbnail-frame"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#1a1a1a',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {isLoading && (
          <div className="thumbnail-skeleton" style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }} />
        )}

        {error && (
          <div className="thumbnail-error" style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            color: '#666',
          }}>
            ⚠
          </div>
        )}

        {thumbnail && !error && (
          <>
            <img
              src={thumbnail}
              alt={`Frame ${frameIndex}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              draggable={false}
            />
            {showFrameNumber && (
              <div
                className="frame-number"
                style={{
                  position: 'absolute',
                  bottom: '2px',
                  right: '2px',
                  fontSize: '10px',
                  color: 'white',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: '1px 4px',
                  borderRadius: '2px',
                }}
              >
                {frameIndex}
              </div>
            )}
          </>
        )}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.mediaId === nextProps.mediaId &&
    prevProps.frameIndex === nextProps.frameIndex &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.quality === nextProps.quality
);

ThumbnailFrame.displayName = 'ThumbnailFrame';
```

### Modified timeline-clip.tsx

Extend the existing timeline clip component with conditional filmstrip rendering.

**Location:** `src/components/timeline/components/timeline-item/timeline-clip.tsx`

```typescript
// Add to timeline-clip.tsx
import { ClipFilmstrip } from './clip-filmstrip';
import { FILMSTRIP_WIDTH_THRESHOLD } from '@/components/timeline/constants';

export const TimelineClip: React.FC<TimelineClipProps> = ({
  clip,
  zoomLevel,
  selected,
  // ... other props
}) => {
  const { timeToPixels } = useTimelineZoom();

  // Calculate clip dimensions
  const clipWidthPx = useMemo(() =>
    timeToPixels(clip.duration),
    [clip.duration, timeToPixels]
  );

  const clipHeightPx = DEFAULT_TRACK_HEIGHT - 10; // Padding

  // Decide whether to show filmstrip or single thumbnail
  const showFilmstrip = clipWidthPx >= FILMSTRIP_WIDTH_THRESHOLD;

  return (
    <div
      className="timeline-clip"
      style={{
        position: 'absolute',
        left: `${timeToPixels(clip.start)}px`,
        width: `${clipWidthPx}px`,
        height: `${clipHeightPx}px`,
        backgroundColor: clip.color,
        borderRadius: '4px',
        overflow: 'hidden',
        // ... other styles
      }}
    >
      {/* Filmstrip or single thumbnail */}
      {showFilmstrip ? (
        <ClipFilmstrip
          clip={clip}
          widthPx={clipWidthPx}
          heightPx={clipHeightPx}
          zoomLevel={zoomLevel}
        />
      ) : (
        <img
          src={clip.thumbnailUrl}
          alt={clip.label}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* Clip label overlay */}
      <div className="clip-label">
        {clip.label}
      </div>

      {/* Trim handles, etc. */}
    </div>
  );
};
```

## State Management

### Timeline Store Extensions

Extend the timeline store to include filmstrip preferences.

```typescript
// src/components/timeline/stores/use-timeline-store.ts

interface TimelineState {
  // ... existing state

  // Filmstrip settings
  filmstripEnabled: boolean;
  filmstripQuality: 'low' | 'medium' | 'high';
  showFrameNumbers: boolean;

  // Actions
  setFilmstripEnabled: (enabled: boolean) => void;
  setFilmstripQuality: (quality: 'low' | 'medium' | 'high') => void;
  toggleFrameNumbers: () => void;
}

export const useTimelineStore = create<TimelineState>()(
  devtools(
    temporal(
      (set) => ({
        // ... existing state

        filmstripEnabled: true,
        filmstripQuality: 'medium',
        showFrameNumbers: false,

        setFilmstripEnabled: (enabled) => set({ filmstripEnabled: enabled }),
        setFilmstripQuality: (quality) => set({ filmstripQuality: quality }),
        toggleFrameNumbers: () => set((state) => ({
          showFrameNumbers: !state.showFrameNumbers
        })),
      }),
      {
        // ... temporal config
      }
    )
  )
);

// Selectors
export const useFilmstripEnabled = () => useTimelineStore((s) => s.filmstripEnabled);
export const useFilmstripQuality = () => useTimelineStore((s) => s.filmstripQuality);
export const useShowFrameNumbers = () => useTimelineStore((s) => s.showFrameNumbers);
```

### MediaMetadata Extensions

Extend the media metadata type to store filmstrip thumbnail references.

```typescript
// src/types/storage.ts

interface MediaMetadata {
  id: string;
  opfsPath: string;
  fileName: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  thumbnailId?: string;              // Primary thumbnail

  // Filmstrip additions
  filmstripThumbnails?: ThumbnailData[];  // Array of pre-generated thumbnails
  filmstripInterval?: number;             // Frames between thumbnails
  filmstripLastGenerated?: number;        // Timestamp of last generation
}

interface ThumbnailData {
  id: string;
  mediaId: string;
  frameIndex: number;              // Frame number in video
  timestamp: number;               // Time in seconds
  blob: Blob;                      // JPEG blob
  width: number;
  height: number;
  quality: 'low' | 'medium' | 'high';
  generatedAt: number;             // Timestamp
}
```

### New Types

```typescript
// src/types/filmstrip.ts

export interface FilmstripConfig {
  enabled: boolean;
  widthThreshold: number;          // Min clip width to show filmstrip
  quality: 'low' | 'medium' | 'high';
  showFrameNumbers: boolean;
  maxThumbnailsPerClip: number;    // Performance safeguard
  cacheSize: number;               // Max cached thumbnails
}

export type FilmstripDensity = 'sparse' | 'normal' | 'dense' | 'very-dense';

export interface ThumbnailGenerationOptions {
  quality: 'low' | 'medium' | 'high';
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png' | 'webp';
  jpegQuality?: number;            // 0-100
}
```

## Thumbnail Generation

### Strategy 1: On-Demand Generation (Recommended)

Generate thumbnails dynamically as clips are displayed and scrolled into view.

**Advantages:**
- No storage overhead for unused thumbnails
- Adapts to any zoom level
- Fast initial load
- LRU cache keeps frequently used thumbnails

**Implementation:**

```typescript
// src/services/thumbnail-service.ts
import defer * as mediabunny from 'mediabunny';
import { mediaLibraryService } from './media-library-service';
import { ThumbnailGenerationOptions } from '@/types/filmstrip';

class ThumbnailService {
  private worker: Worker | null = null;

  constructor() {
    // Initialize Web Worker for non-blocking generation
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(
        new URL('../workers/thumbnail-worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
  }

  /**
   * Generate a single thumbnail for a specific frame
   */
  async generateThumbnail(
    mediaId: string,
    frameIndex: number,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<string> {
    try {
      // Get media file from OPFS
      const mediaFile = await mediaLibraryService.getMediaFile(mediaId);

      if (!mediaFile) {
        throw new Error(`Media file not found: ${mediaId}`);
      }

      // Get media metadata for FPS
      const metadata = await mediaLibraryService.getMetadata(mediaId);
      const fps = metadata?.fps || 30;

      // Convert frame index to timestamp
      const timestamp = frameIndex / fps;

      // Generate thumbnail using mediabunny
      const mb = await mediabunny;
      const blob = await mb.extractFrame(mediaFile, timestamp);

      // Convert blob to data URL
      return await this.blobToDataURL(blob);
    } catch (error) {
      console.error('Thumbnail generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate multiple thumbnails in batch
   */
  async generateBatch(
    mediaId: string,
    frameIndices: number[],
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<Map<number, string>> {
    const results = new Map<number, string>();

    // Use Promise.allSettled to continue even if some fail
    const promises = frameIndices.map(async (frameIndex) => {
      try {
        const url = await this.generateThumbnail(mediaId, frameIndex, quality);
        results.set(frameIndex, url);
      } catch (error) {
        console.error(`Failed to generate frame ${frameIndex}:`, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Convert blob to data URL for img src
   */
  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const thumbnailService = new ThumbnailService();
```

### Strategy 2: Pre-Generation on Upload

Generate a set of thumbnails when media is first uploaded.

**Advantages:**
- Instant filmstrip display (no generation delay)
- Predictable performance
- Works offline after initial generation

**Disadvantages:**
- Storage overhead (IndexedDB space)
- Fixed thumbnail interval (may not match zoom level)
- Longer upload time

**Implementation:**

```typescript
// src/services/media-library-service.ts

async addMedia(file: File, onProgress?: (progress: number) => void): Promise<MediaMetadata> {
  // ... existing upload logic

  // Generate filmstrip thumbnails
  const filmstripThumbnails = await this.generateFilmstripThumbnails(
    id,
    file,
    metadata.fps,
    metadata.duration
  );

  // Store thumbnails in IndexedDB
  await indexedDBService.saveThumbnails(filmstripThumbnails);

  // Update metadata with filmstrip references
  metadata.filmstripThumbnails = filmstripThumbnails.map(t => t.id);
  metadata.filmstripInterval = 150; // frames
  metadata.filmstripLastGenerated = Date.now();

  await indexedDBService.saveMetadata(metadata);

  return metadata;
}

private async generateFilmstripThumbnails(
  mediaId: string,
  file: File,
  fps: number,
  duration: number
): Promise<ThumbnailData[]> {
  const mb = await mediabunny;
  const thumbnails: ThumbnailData[] = [];

  // Generate thumbnail every 5 seconds
  const intervalSeconds = 5;
  const intervalFrames = intervalSeconds * fps;

  for (let frame = 0; frame < duration * fps; frame += intervalFrames) {
    const timestamp = frame / fps;
    const blob = await mb.extractFrame(file, timestamp);

    thumbnails.push({
      id: crypto.randomUUID(),
      mediaId,
      frameIndex: frame,
      timestamp,
      blob,
      width: 160,
      height: 90,
      quality: 'medium',
      generatedAt: Date.now(),
    });
  }

  return thumbnails;
}
```

### Thumbnail Generation with Web Worker

Offload thumbnail generation to a Web Worker to prevent UI blocking.

```typescript
// src/workers/thumbnail-worker.ts
import defer * as mediabunny from 'mediabunny';

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'GENERATE_THUMBNAIL') {
    const { file, frameIndex, fps } = payload;

    try {
      const mb = await mediabunny;
      const timestamp = frameIndex / fps;
      const blob = await mb.extractFrame(file, timestamp);

      // Convert blob to transferable ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      self.postMessage({
        type: 'THUMBNAIL_READY',
        payload: { frameIndex, arrayBuffer, mimeType: blob.type },
      }, [arrayBuffer]); // Transfer ownership
    } catch (error) {
      self.postMessage({
        type: 'THUMBNAIL_ERROR',
        payload: { frameIndex, error: error.message },
      });
    }
  }
};
```

## Integration with Remotion Player

**Important Architecture Clarification**: The filmstrip feature is part of the **Timeline UI layer** and is architecturally separate from the Remotion Player.

### Two Distinct Layers

**1. Timeline UI Layer (Filmstrip)**
- **Purpose**: Visual editing interface
- **Shows**: Raw source media thumbnails
- **Technology**: mediabunny for frame extraction
- **User Interaction**: Scrubbing, trimming, clip selection

**2. Remotion Player Layer (Preview)**
- **Purpose**: Composition preview
- **Shows**: Rendered output with effects, transitions, overlays
- **Technology**: Remotion's rendering engine
- **User Interaction**: Playback, preview of final result

### How They Work Together

From the [Remotion building-a-timeline guide](https://www.remotion.dev/docs/building-a-timeline):

```typescript
const VideoEditor = () => {
  const [tracks, setTracks] = useState<Track[]>([
    { name: 'Track 1', items: [] },
    { name: 'Track 2', items: [] },
  ]);

  const inputProps = useMemo(() => ({ tracks }), [tracks]);

  return (
    <div className="editor-layout">
      {/* Remotion Player - shows edited composition */}
      <Player
        component={Main}
        inputProps={inputProps}
        fps={30}
        durationInFrames={600}
        compositionWidth={1280}
        compositionHeight={720}
      />

      {/* Timeline with Filmstrip - shows source media for editing */}
      <Timeline tracks={tracks} setTracks={setTracks} />
    </div>
  );
};
```

**Key Points**:
- Both components share the same `tracks` state
- Timeline filmstrip shows **source media** (what you're editing)
- Player shows **rendered composition** (what you're creating)
- No conflicts between the two systems

### ⚠️ Important: Do NOT Use Remotion's `<Thumbnail>` for Filmstrip

**Incorrect Approach**:
```typescript
// ❌ DON'T DO THIS for filmstrip thumbnails
import { Thumbnail } from '@remotion/player';

<Thumbnail
  component={MyComposition}
  frameToDisplay={30}
  compositionWidth={600}
  compositionHeight={600}
/>
```

**Why This Is Wrong**: Remotion's `<Thumbnail>` component renders the **edited composition** at a specific frame, not the raw source video. This would show effects, overlays, and other composition elements - not the original media.

**Correct Approach**:
```typescript
// ✅ DO THIS for filmstrip thumbnails
import defer * as mediabunny from 'mediabunny';

export async function generateThumbnail(file: File, timestamp: number) {
  const mb = await mediabunny;
  const thumbnail = await mb.extractFrame(file, timestamp);
  return thumbnail; // Raw video frame as Blob
}
```

**Why This Is Correct**: mediabunny extracts frames directly from the source video file stored in OPFS, giving you the unmodified original footage.

### Use Case Comparison

| Feature | Timeline Filmstrip | Remotion Thumbnail |
|---------|-------------------|-------------------|
| **Purpose** | Show source media for editing | Preview rendered composition |
| **Source** | Raw video file (OPFS) | Remotion composition |
| **Technology** | mediabunny.extractFrame() | Remotion's `<Thumbnail>` |
| **Shows** | Unedited original frames | Edited output with effects |
| **Use Case** | Timeline clip preview | Composition frame export |
| **Performance** | Cached, lazy-loaded | Rendered on-demand |

### When to Use Each

**Use mediabunny (Filmstrip)**:
- Timeline clip thumbnails ✅
- Media library previews ✅
- Clip trim indicators ✅
- Source media browsing ✅

**Use Remotion `<Thumbnail>`**:
- Composition snapshots
- Export preview frames
- Social media thumbnails
- Marketing materials

### Data Flow

```
User uploads video
    ↓
mediabunny extracts metadata + frames
    ↓
Frames stored in IndexedDB (filmstrip)
    ↓
User arranges clips on Timeline
    ↓
Timeline state passed to Remotion Player
    ↓
Player renders composition with effects
    ↓
Final output exported via @remotion/renderer
```

See `.claude/docs/remotion/building-a-timeline.md` for complete Remotion Player integration patterns.

## Storage Architecture

### IndexedDB Schema Extensions

Add a new object store for filmstrip thumbnails.

```typescript
// src/services/indexed-db-service.ts

const DB_NAME = 'video-editor-db';
const DB_VERSION = 2; // Increment version

const STORES = {
  MEDIA_METADATA: 'mediaMetadata',
  THUMBNAILS: 'thumbnails',           // Existing
  FILMSTRIP_THUMBNAILS: 'filmstripThumbnails',  // NEW
};

function createObjectStores(db: IDBDatabase) {
  // ... existing stores

  // Filmstrip thumbnails store
  if (!db.objectStoreNames.contains(STORES.FILMSTRIP_THUMBNAILS)) {
    const filmstripStore = db.createObjectStore(STORES.FILMSTRIP_THUMBNAILS, {
      keyPath: 'id',
    });

    // Index by mediaId for efficient queries
    filmstripStore.createIndex('mediaId', 'mediaId', { unique: false });

    // Index by frameIndex for quick lookups
    filmstripStore.createIndex('mediaId_frameIndex', ['mediaId', 'frameIndex'], {
      unique: true,
    });
  }
}

// CRUD operations
async saveThumbnail(thumbnail: ThumbnailData): Promise<void> {
  const db = await this.getDB();
  const tx = db.transaction([STORES.FILMSTRIP_THUMBNAILS], 'readwrite');
  const store = tx.objectStore(STORES.FILMSTRIP_THUMBNAILS);

  await store.put(thumbnail);
  await tx.done;
}

async getThumbnail(mediaId: string, frameIndex: number): Promise<ThumbnailData | null> {
  const db = await this.getDB();
  const tx = db.transaction([STORES.FILMSTRIP_THUMBNAILS], 'readonly');
  const store = tx.objectStore(STORES.FILMSTRIP_THUMBNAILS);
  const index = store.index('mediaId_frameIndex');

  const result = await index.get([mediaId, frameIndex]);
  return result || null;
}

async getThumbnailsForMedia(mediaId: string): Promise<ThumbnailData[]> {
  const db = await this.getDB();
  const tx = db.transaction([STORES.FILMSTRIP_THUMBNAILS], 'readonly');
  const store = tx.objectStore(STORES.FILMSTRIP_THUMBNAILS);
  const index = store.index('mediaId');

  const results = await index.getAll(mediaId);
  return results;
}

async deleteThumbnailsForMedia(mediaId: string): Promise<void> {
  const db = await this.getDB();
  const tx = db.transaction([STORES.FILMSTRIP_THUMBNAILS], 'readwrite');
  const store = tx.objectStore(STORES.FILMSTRIP_THUMBNAILS);
  const index = store.index('mediaId');

  const keys = await index.getAllKeys(mediaId);

  for (const key of keys) {
    await store.delete(key);
  }

  await tx.done;
}
```

### Caching Layer

Implement an LRU (Least Recently Used) cache for thumbnail URLs.

```typescript
// src/utils/thumbnail-cache.ts

class ThumbnailCache {
  private cache = new Map<string, string>();
  private accessOrder: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 200) {
    this.maxSize = maxSize;
  }

  /**
   * Get cached thumbnail URL
   */
  get(key: string): string | null {
    const value = this.cache.get(key);

    if (value !== undefined) {
      // Update access order (move to end)
      this.updateAccessOrder(key);
      return value;
    }

    return null;
  }

  /**
   * Set thumbnail URL in cache
   */
  set(key: string, value: string): void {
    // If key exists, remove from access order
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add to cache and access order
    this.cache.set(key, value);
    this.accessOrder.push(key);
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    // Revoke all object URLs to free memory
    for (const url of this.cache.values()) {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }

    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    const lruKey = this.accessOrder.shift()!;
    const url = this.cache.get(lruKey);

    // Revoke object URL to free memory
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }

    this.cache.delete(lruKey);
  }

  /**
   * Update access order (move to end)
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order array
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }
}

export const thumbnailCache = new ThumbnailCache(200);
```

## Performance Optimization

### Responsive Thumbnail Density

Calculate thumbnail interval based on zoom level for optimal visual density.

```typescript
// src/utils/filmstrip-utils.ts

/**
 * Calculate frame interval between thumbnails based on zoom level
 * Returns number of frames to skip between each thumbnail
 */
export function calculateThumbnailInterval(
  zoomLevel: number,
  fps: number = 30
): number {
  const pixelsPerSecond = zoomLevel * BASE_PIXELS_PER_SECOND;

  // Very high zoom - show every frame or every few frames
  if (pixelsPerSecond > 200) {
    return Math.ceil(fps / 30); // ~1 frame (for 30fps)
  }

  // High zoom - show thumbnails every 0.5 seconds
  if (pixelsPerSecond > 100) {
    return Math.ceil(fps * 0.5);
  }

  // Medium zoom - show thumbnails every 1 second
  if (pixelsPerSecond > 50) {
    return Math.ceil(fps * 1);
  }

  // Low zoom - show thumbnails every 2 seconds
  if (pixelsPerSecond > 25) {
    return Math.ceil(fps * 2);
  }

  // Very low zoom - show thumbnails every 5 seconds
  return Math.ceil(fps * 5);
}

/**
 * Generate array of frame indices to display as thumbnails
 */
export function generateFrameIndices(
  duration: number,
  fps: number,
  interval: number,
  offset: number = 0,
  maxThumbnails: number = 100
): number[] {
  const totalFrames = Math.floor(duration * fps);
  const startFrame = Math.floor(offset * fps);
  const indices: number[] = [];

  for (let frame = startFrame; frame < startFrame + totalFrames; frame += interval) {
    indices.push(frame);

    // Safety limit to prevent performance issues
    if (indices.length >= maxThumbnails) {
      break;
    }
  }

  return indices;
}
```

### Virtual Scrolling for Long Clips

For very long clips, use virtualization to only render visible thumbnails.

```typescript
// src/components/timeline/components/timeline-item/clip-filmstrip-virtualized.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const ClipFilmstripVirtualized: React.FC<ClipFilmstripProps> = ({
  clip,
  widthPx,
  heightPx,
  zoomLevel,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const frameIndices = useMemo(() =>
    generateFrameIndices(clip.duration, clip.fps || 30, thumbnailInterval),
    [clip.duration, clip.fps, thumbnailInterval]
  );

  const thumbnailWidth = 80; // Fixed width for virtualization

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: frameIndices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => thumbnailWidth,
    horizontal: true,
    overscan: 5, // Render 5 extra items on each side
  });

  return (
    <div
      ref={parentRef}
      className="clip-filmstrip-virtualized"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        style={{
          width: `${virtualizer.getTotalSize()}px`,
          height: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${virtualItem.size}px`,
              transform: `translateX(${virtualItem.start}px)`,
            }}
          >
            <ThumbnailFrame
              mediaId={clip.mediaId}
              frameIndex={frameIndices[virtualItem.index]}
              width={thumbnailWidth}
              height={heightPx}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Lazy Loading with Intersection Observer

Custom hook for detecting when thumbnails are visible.

```typescript
// src/hooks/use-intersection-observer.ts

export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isVisible;
}
```

### Handling Very Long Videos (3+ Hours)

For professional-grade long-form content (documentaries, interviews, live streams), special performance considerations are required.

#### Scale Analysis

**3-Hour Video at 30fps:**
```
3 hours × 60 min × 60 sec × 30fps = 324,000 frames
```

**Thumbnail Requirements by Zoom Level:**

| Zoom Level | Pixels/Second | Interval | Thumbnails (3hr) | Storage @ 5KB/thumb | DOM Nodes |
|------------|---------------|----------|------------------|---------------------|-----------|
| **Very Low (0.2)** | 20 px/s | 5 sec (150 frames) | 2,160 | 10.8 MB | 2,160 |
| **Low (0.5)** | 50 px/s | 2 sec (60 frames) | 5,400 | 27 MB | 5,400 |
| **Medium (1.0)** | 100 px/s | 1 sec (30 frames) | 10,800 | 54 MB | 10,800 |
| **High (2.0)** | 200 px/s | 0.5 sec (15 frames) | 21,600 | 108 MB | 21,600 |
| **Very High (5.0)** | 500 px/s | 1 frame | 324,000 | 1.6 GB | 324,000 💥 |

**Performance Breaking Points:**
- **1,000+ thumbnails in DOM** → Noticeable UI lag
- **5,000+ thumbnails** → Severe performance degradation
- **20,000+ thumbnails** → Browser freeze/crash

#### Critical Performance Solutions

**🔴 CRITICAL: Virtual Scrolling (REQUIRED for videos > 30 minutes)**

Without virtual scrolling, rendering 21,600+ DOM nodes will **freeze or crash the browser**. Virtual scrolling is **not optional** for long videos.

```typescript
// Install @tanstack/react-virtual
npm install @tanstack/react-virtual

// Always use for clips > 5 minutes
const shouldUseVirtualization = clip.duration > 300; // 5 minutes

{shouldUseVirtualization ? (
  <ClipFilmstripVirtualized {...props} />
) : (
  <ClipFilmstrip {...props} />
)}
```

**Impact:**
- 3-hour video at high zoom: 21,600 thumbnails → **only 20-30 rendered**
- **1000x reduction** in DOM nodes
- Constant 60fps performance regardless of video length

**🟡 HIGH PRIORITY: Adaptive Decimation**

Only calculate and generate thumbnails for the visible area of the timeline.

```typescript
// Enhanced generateFrameIndices with viewport awareness
export function generateAdaptiveFrameIndices(
  duration: number,
  fps: number,
  zoomLevel: number,
  scrollPosition: number,    // Current scroll position in pixels
  viewportWidth: number,      // Visible timeline width
  offset: number = 0
): number[] {
  const pixelsPerSecond = zoomLevel * BASE_PIXELS_PER_SECOND;
  const interval = calculateThumbnailInterval(zoomLevel, fps);

  // Calculate visible time range
  const visibleStartTime = scrollPosition / pixelsPerSecond;
  const visibleEndTime = (scrollPosition + viewportWidth) / pixelsPerSecond;

  // Add overscan (50% on each side for smooth scrolling)
  const overscan = viewportWidth * 0.5;
  const startTime = Math.max(0, visibleStartTime - overscan / pixelsPerSecond);
  const endTime = Math.min(duration, visibleEndTime + overscan / pixelsPerSecond);

  // Generate indices only for visible + overscan range
  const startFrame = Math.floor((offset + startTime) * fps);
  const endFrame = Math.ceil((offset + endTime) * fps);

  const indices: number[] = [];
  for (let frame = startFrame; frame < endFrame; frame += interval) {
    indices.push(frame);
  }

  return indices; // ✅ Typically 30-50 indices instead of 21,600
}
```

**Impact:**
- 3-hour video: Calculates **30-50 frame indices** instead of 21,600
- **1000x reduction** in calculation time
- Updates dynamically as user scrolls

**🟡 HIGH PRIORITY: Multi-Resolution Thumbnail Strategy**

Generate different quality levels based on zoom to reduce storage and improve performance.

```typescript
// Quality tiers based on zoom level
export function getThumbnailResolution(zoomLevel: number): ThumbnailResolution {
  if (zoomLevel < 0.5) {
    return 'low';    // 60×34 @ 50% quality = ~2KB
  }
  if (zoomLevel < 2.0) {
    return 'medium'; // 80×45 @ 75% quality = ~5KB
  }
  return 'high';     // 160×90 @ 85% quality = ~15KB
}

// Cache key includes resolution
const cacheKey = `${mediaId}-${frameIndex}-${getThumbnailResolution(zoomLevel)}`;
```

**Storage Savings:**

| Zoom | Thumbnails (3hr) | Quality | Size/Thumb | Total Storage | Savings |
|------|------------------|---------|------------|---------------|---------|
| Low | 2,160 | Low | 2 KB | **4.3 MB** | 70% ✅ |
| Medium | 10,800 | Medium | 5 KB | **54 MB** | Baseline |
| High | 21,600 | High | 15 KB | **324 MB** | -500% |

**🟢 RECOMMENDED: Progressive Loading with Priority Queue**

Load thumbnails in priority order to make visible content appear instantly.

```typescript
class ThumbnailPriorityQueue {
  private queue: Map<number, ThumbnailRequest> = new Map();

  addRequests(frameIndices: number[], priority: number) {
    frameIndices.forEach(index => {
      if (!this.queue.has(index) || this.queue.get(index).priority > priority) {
        this.queue.set(index, { frameIndex: index, priority });
      }
    });
  }

  async processQueue(concurrency: number = 3) {
    // Sort by priority (1 = highest)
    const sorted = Array.from(this.queue.values())
      .sort((a, b) => a.priority - b.priority);

    // Process in batches
    for (let i = 0; i < sorted.length; i += concurrency) {
      const batch = sorted.slice(i, i + concurrency);

      // Generate concurrently
      await Promise.all(
        batch.map(req => thumbnailService.generateThumbnail(req.frameIndex))
      );

      // Yield to main thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// Usage in filmstrip component
useEffect(() => {
  const queue = new ThumbnailPriorityQueue();

  // Priority 1: Current playhead position
  queue.addRequests([currentFrame], 1);

  // Priority 2: Visible thumbnails
  queue.addRequests(visibleFrameIndices, 2);

  // Priority 3: Nearby (overscan)
  queue.addRequests(nearbyFrameIndices, 3);

  // Priority 4: Rest of clip (background generation)
  requestIdleCallback(() => {
    queue.addRequests(restOfClipIndices, 4);
  });

  queue.processQueue(3); // Process 3 at a time
}, [currentFrame, visibleFrameIndices]);
```

**Impact:**
- Visible thumbnails load in **< 100ms**
- Background thumbnails fill in during idle time
- **No UI blocking**

**🟢 RECOMMENDED: Enhanced Quota Management**

Prevent `QuotaExceededError` by monitoring storage and automatically cleaning up.

```typescript
class QuotaAwareThumbnailCache {
  private readonly warningThreshold = 0.85;  // 85% of quota
  private readonly criticalThreshold = 0.95; // 95% of quota

  async set(key: string, blob: Blob): Promise<void> {
    // Check quota before storing
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const usageRatio = usage / quota;

    if (usageRatio > this.criticalThreshold) {
      // Critical: Clear 50% of thumbnails
      await this.clearOldestThumbnails(0.5);
    } else if (usageRatio > this.warningThreshold) {
      // Warning: Clear 25% of thumbnails
      await this.clearOldestThumbnails(0.25);
    }

    await indexedDB.put(key, blob);
  }

  async clearOldestThumbnails(fraction: number): Promise<void> {
    const all = await this.getAllThumbnails();

    // Sort by last access time (oldest first)
    const sorted = all.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Delete oldest fraction
    const toDelete = sorted.slice(0, Math.floor(all.length * fraction));

    await Promise.all(toDelete.map(t => this.delete(t.id)));

    console.log(`Cleared ${toDelete.length} thumbnails to free up space`);
  }

  async getStorageStatus(): Promise<StorageStatus> {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      usageRatio: (estimate.usage || 0) / (estimate.quota || 1),
      available: (estimate.quota || 0) - (estimate.usage || 0),
    };
  }
}
```

**Impact:**
- Prevents storage errors
- Automatically maintains optimal storage levels
- Keeps most frequently used thumbnails

#### Performance Benchmarks

**Target Metrics for 3-Hour Video:**

| Metric | Target | Without Optimization | With All Optimizations |
|--------|--------|---------------------|------------------------|
| **Initial Load** | < 500ms | 3-6 minutes ⚠️ | **< 200ms** ✅ |
| **Scroll FPS** | 60fps | < 10fps (freeze) 💥 | **60fps** ✅ |
| **Visible Thumbnails Load** | < 100ms | N/A (crash) 💥 | **< 100ms** ✅ |
| **Memory Usage** | < 100MB | > 2GB 💥 | **< 50MB** ✅ |
| **Storage (Medium Zoom)** | < 100MB | 108 MB ⚠️ | **27 MB** ✅ (multi-res) |

#### Implementation Checklist for Long Videos

**Phase 1: Critical (MUST HAVE for 1+ hour videos)**
- [ ] Implement virtual scrolling with `@tanstack/react-virtual`
- [ ] Add adaptive decimation (viewport-aware index generation)
- [ ] Set conditional rendering: clips > 5min use virtualized component

**Phase 2: High Priority (Strongly recommended for 3+ hour videos)**
- [ ] Implement multi-resolution thumbnail strategy
- [ ] Add progressive loading with priority queue
- [ ] Enhance quota management with auto-cleanup

**Phase 3: Optimization (Nice to have)**
- [ ] Add Web Worker batch generation
- [ ] Implement thumbnail prefetching on scroll direction
- [ ] Add storage usage monitoring UI

#### Troubleshooting Long Videos

**Problem: Browser freezes when opening 3-hour video**
- **Cause:** Virtual scrolling not enabled
- **Solution:** Check `clip.duration > 300` condition, ensure `ClipFilmstripVirtualized` is used

**Problem: `QuotaExceededError` after adding several long videos**
- **Cause:** Storage quota filled with thumbnails
- **Solution:** Implement quota-aware cache with auto-cleanup
- **Quick fix:** Clear IndexedDB thumbnails: `indexedDB.delete('filmstripThumbnails')`

**Problem: Thumbnails not loading at high zoom**
- **Cause:** Too many thumbnail requests overwhelming service
- **Solution:** Implement priority queue, limit concurrent generation to 3-5 at a time

**Problem: Slow scroll performance with long clip**
- **Cause:** Generating too many thumbnails outside viewport
- **Solution:** Use adaptive decimation to only generate visible + overscan area

**Problem: Memory leak with long videos**
- **Cause:** Not revoking blob URLs after use
- **Solution:** Ensure LRU cache calls `URL.revokeObjectURL()` on eviction

#### Best Practices for Long Videos

1. **Always use virtual scrolling for clips > 5 minutes** ⚡
2. **Implement adaptive decimation** - Don't calculate thumbnails for off-screen content
3. **Use multi-resolution strategy** - Lower quality when zoomed out
4. **Monitor storage quota** - Auto-cleanup before hitting limits
5. **Limit concurrent generation** - Max 3-5 thumbnails at once
6. **Use priority queue** - Visible content loads first
7. **Test with real long-form content** - Not just short test clips
8. **Profile memory usage** - Watch for leaks with Chrome DevTools
9. **Set realistic maxThumbnails** - 100 is good default, never exceed 500

See `.claude/docs/video-editor/performance-long-videos.md` for comprehensive long video optimization guide.

## Configuration

### Constants

```typescript
// src/components/timeline/constants.ts

// Filmstrip Configuration
export const FILMSTRIP_WIDTH_THRESHOLD = 150; // Min clip width (px) to show filmstrip
export const FILMSTRIP_MAX_THUMBNAILS = 100;  // Max thumbnails per clip (performance)
export const THUMBNAIL_CACHE_SIZE = 200;       // Max cached thumbnails in memory

// Thumbnail Dimensions
export const THUMBNAIL_WIDTH = 80;             // Default thumbnail width
export const THUMBNAIL_HEIGHT = 45;            // Default thumbnail height (16:9)

// Quality Settings
export const THUMBNAIL_QUALITY = {
  low: { width: 60, height: 34, jpegQuality: 60 },
  medium: { width: 80, height: 45, jpegQuality: 75 },
  high: { width: 120, height: 68, jpegQuality: 90 },
};

// Density Thresholds (pixels per second)
export const FILMSTRIP_DENSITY_THRESHOLDS = {
  veryDense: 200,   // Every frame
  dense: 100,       // Every 0.5s
  normal: 50,       // Every 1s
  sparse: 25,       // Every 2s
  verySparse: 0,    // Every 5s
};
```

## Usage Examples

### Basic Filmstrip Integration

```typescript
// src/pages/editor.tsx
import { Timeline } from '@/components/timeline';
import { useTimelineStore } from '@/components/timeline/stores/use-timeline-store';

export function EditorPage() {
  const filmstripEnabled = useTimelineStore((s) => s.filmstripEnabled);
  const setFilmstripEnabled = useTimelineStore((s) => s.setFilmstripEnabled);

  return (
    <div className="editor">
      <div className="toolbar">
        <button onClick={() => setFilmstripEnabled(!filmstripEnabled)}>
          {filmstripEnabled ? 'Hide' : 'Show'} Filmstrip
        </button>
      </div>

      <Timeline />
    </div>
  );
}
```

### Custom Quality Settings

```typescript
import { useTimelineStore } from '@/components/timeline/stores/use-timeline-store';

export function FilmstripSettings() {
  const quality = useTimelineStore((s) => s.filmstripQuality);
  const setQuality = useTimelineStore((s) => s.setFilmstripQuality);

  return (
    <div className="filmstrip-settings">
      <label>Thumbnail Quality:</label>
      <select value={quality} onChange={(e) => setQuality(e.target.value)}>
        <option value="low">Low (faster)</option>
        <option value="medium">Medium</option>
        <option value="high">High (slower)</option>
      </select>
    </div>
  );
}
```

## Edge Cases & Error Handling

### Storage Quota Exceeded

```typescript
// src/services/thumbnail-service.ts

async generateThumbnail(mediaId: string, frameIndex: number): Promise<string> {
  try {
    // Check storage quota before generating
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;

      // If using > 90% of quota, clear old thumbnails
      if (usage / quota > 0.9) {
        await this.clearOldThumbnails();
      }
    }

    // Generate thumbnail...

  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Fallback: return placeholder or cached thumbnail
      return this.getPlaceholderThumbnail();
    }
    throw error;
  }
}

private async clearOldThumbnails(): Promise<void> {
  // Delete thumbnails older than 7 days
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thumbnails = await indexedDBService.getAllThumbnails();

  for (const thumb of thumbnails) {
    if (thumb.generatedAt < sevenDaysAgo) {
      await indexedDBService.deleteThumbnail(thumb.id);
    }
  }
}
```

### Thumbnail Generation Failures

```typescript
// Graceful degradation with placeholder
function ThumbnailFrame({ mediaId, frameIndex }) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    thumbnailService
      .generateThumbnail(mediaId, frameIndex)
      .then(setThumbnail)
      .catch(() => {
        setError(true);
        // Use placeholder or solid color
        setThumbnail('data:image/svg+xml,...'); // SVG placeholder
      });
  }, [mediaId, frameIndex]);

  return (
    <div className="thumbnail-frame">
      {thumbnail && <img src={thumbnail} />}
      {error && <div className="thumbnail-placeholder">⚠</div>}
    </div>
  );
}
```

### Very Long Clips

```typescript
// Limit maximum thumbnails for performance
export function generateFrameIndices(
  duration: number,
  fps: number,
  interval: number,
  offset: number = 0
): number[] {
  const MAX_THUMBNAILS = 100;
  const indices: number[] = [];

  // If clip would generate too many thumbnails, increase interval
  const estimatedCount = Math.floor((duration * fps) / interval);

  if (estimatedCount > MAX_THUMBNAILS) {
    interval = Math.ceil((duration * fps) / MAX_THUMBNAILS);
  }

  // Generate indices with adjusted interval
  for (let frame = offset; frame < duration * fps; frame += interval) {
    indices.push(frame);
    if (indices.length >= MAX_THUMBNAILS) break;
  }

  return indices;
}
```

## Best Practices

### General Filmstrip Best Practices

1. **Always use `import defer` for mediabunny** - Prevents bundle bloat
2. **Implement LRU cache with size limits** - Prevents memory leaks
3. **Use Intersection Observer for lazy loading** - Only generate visible thumbnails
4. **Memoize thumbnail components with React.memo** - Prevents unnecessary re-renders
5. **Check storage quota before generation** - Graceful degradation when full
6. **Use responsive density based on zoom** - Better UX at all zoom levels
7. **Debounce thumbnail generation requests** - Reduces server load
8. **Handle errors gracefully with placeholders** - Never break the UI

### Long Video Best Practices (Critical for 1+ hour videos)

9. **ALWAYS use virtual scrolling for clips > 5 minutes** ⚡ - Required to prevent browser freeze
10. **Implement adaptive decimation** - Only calculate/generate thumbnails for visible viewport
11. **Use multi-resolution thumbnail strategy** - Lower quality when zoomed out (70% storage savings)
12. **Monitor and manage storage quota** - Auto-cleanup before hitting browser limits
13. **Implement progressive loading** - Priority queue ensures visible content loads first
14. **Limit concurrent thumbnail generation** - Max 3-5 at a time to prevent overwhelming CPU
15. **Test with real long-form content** - Don't just test with 30-second clips
16. **Profile memory usage regularly** - Use Chrome DevTools to detect leaks early
17. **Set realistic maxThumbnails limits** - 100 is good default, never exceed 500

### Frame-Based System Best Practices

19. **Store positions as frames for new projects** - Eliminates floating-point precision issues
20. **Use frame-to-time conversion only for display** - Keep calculations in frames throughout
21. **Maintain single FPS source of truth** - Shared constant across Timeline, Remotion, Player
22. **Implement migration utilities if switching** - Provide `secondsToFrames()` and `framesToSeconds()`

## Testing Strategies

### Unit Tests

```typescript
// src/utils/__tests__/filmstrip-utils.test.ts
import { describe, it, expect } from 'vitest';
import { calculateThumbnailInterval, generateFrameIndices } from '../filmstrip-utils';

describe('filmstrip-utils', () => {
  describe('calculateThumbnailInterval', () => {
    it('should return 1 frame at very high zoom', () => {
      const interval = calculateThumbnailInterval(3, 30);
      expect(interval).toBe(1);
    });

    it('should return 15 frames at medium zoom', () => {
      const interval = calculateThumbnailInterval(0.75, 30);
      expect(interval).toBe(30); // 1 second
    });

    it('should return 150 frames at low zoom', () => {
      const interval = calculateThumbnailInterval(0.2, 30);
      expect(interval).toBe(150); // 5 seconds
    });
  });

  describe('generateFrameIndices', () => {
    it('should generate correct number of indices', () => {
      const indices = generateFrameIndices(10, 30, 30, 0); // 10s, 30fps, 1s interval
      expect(indices.length).toBe(10);
    });

    it('should respect max thumbnails limit', () => {
      const indices = generateFrameIndices(1000, 30, 1, 0, 100);
      expect(indices.length).toBe(100);
    });

    it('should handle offset correctly', () => {
      const indices = generateFrameIndices(10, 30, 30, 5); // Start at 5s
      expect(indices[0]).toBe(150); // 5 * 30fps
    });
  });
});
```

### Integration Tests

```typescript
// src/components/timeline/__tests__/clip-filmstrip.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { ClipFilmstrip } from '../components/timeline-item/clip-filmstrip';

describe('ClipFilmstrip', () => {
  it('should render thumbnails based on clip duration', async () => {
    const clip = {
      id: 'clip-1',
      mediaId: 'media-1',
      duration: 10,
      fps: 30,
      // ...
    };

    render(<ClipFilmstrip clip={clip} widthPx={500} heightPx={80} zoomLevel={1} />);

    await waitFor(() => {
      const thumbnails = screen.getAllByRole('img');
      expect(thumbnails.length).toBeGreaterThan(0);
    });
  });

  it('should handle empty media gracefully', () => {
    const clip = {
      id: 'clip-1',
      mediaId: 'invalid-media',
      duration: 10,
      fps: 30,
    };

    expect(() => {
      render(<ClipFilmstrip clip={clip} widthPx={500} heightPx={80} zoomLevel={1} />);
    }).not.toThrow();
  });
});
```

## Future Enhancements

1. **Thumbnail Hover Preview** - Show larger preview on hover
2. **Filmstrip Scrubbing** - Click/drag filmstrip to seek to specific frame
3. **Quality Levels** - User-selectable thumbnail resolution
4. **Background Pre-generation** - Generate thumbnails during idle time
5. **Smart Thumbnail Selection** - Use scene detection to pick representative frames
6. **Filmstrip Zoom** - Independent zoom control for thumbnails
7. **Thumbnail Annotations** - Mark frames with notes or markers
8. **GPU-Accelerated Generation** - Use WebGL for faster frame extraction
9. **Adaptive Quality** - Lower quality during playback, high quality when paused
10. **Multi-resolution Thumbnails** - Generate multiple sizes for different zoom levels

## See Also

- `timeline-architecture.md` - Complete timeline component structure
- `components-usage.md` - Timeline and VideoEditor usage examples
- `integration.md` - Remotion and mediabunny integration patterns
- `storage.md` - OPFS and IndexedDB architecture
- `state-management.md` - Zustand best practices and optimization
- `performance.md` - General performance optimization strategies
