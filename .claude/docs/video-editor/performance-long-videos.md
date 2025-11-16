# Performance Optimization for Long Videos

Comprehensive guide for handling long-form video content (1+ hour) in the timeline editor with professional-grade performance.

## Overview

Long-form video content (documentaries, interviews, live streams, feature films) presents unique performance challenges that require specialized optimization strategies beyond standard timeline features.

**This guide covers:**
- Scale analysis and performance metrics
- Critical optimization techniques
- Implementation patterns
- Troubleshooting and monitoring
- Best practices for production deployments

**Target Audience:** Developers building video editors that need to handle 1+ hour videos smoothly.

## Scale Analysis

### Video Duration Breakdown

| Duration | Frames @ 30fps | Typical Use Case | Performance Challenge |
|----------|----------------|------------------|----------------------|
| **30 seconds** | 900 | Social media clips | ✅ No special optimization needed |
| **5 minutes** | 9,000 | YouTube videos | ⚠️ Consider virtual scrolling |
| **30 minutes** | 54,000 | TV episodes | 🟡 Virtual scrolling required |
| **1 hour** | 108,000 | Documentaries | 🟡 Full optimization suite |
| **3 hours** | 324,000 | Feature films, live streams | 🔴 Critical optimizations mandatory |

### 3-Hour Video: The Ultimate Stress Test

A 3-hour video at 30fps generates **324,000 frames**. Here's what that means for different timeline components:

**Thumbnail Requirements by Zoom Level:**

| Zoom Level | Interval | Thumbnails | Storage | Memory | DOM Nodes | Browser Impact |
|------------|----------|------------|---------|--------|-----------|----------------|
| Very Low (0.2x) | 5 sec | 2,160 | 11 MB | 10 MB | 2,160 | ✅ Manageable |
| Low (0.5x) | 2 sec | 5,400 | 27 MB | 25 MB | 5,400 | ⚠️ Noticeable lag |
| Medium (1.0x) | 1 sec | 10,800 | 54 MB | 50 MB | 10,800 | 🟡 Severe lag |
| High (2.0x) | 0.5 sec | 21,600 | 108 MB | 100 MB | 21,600 | 🔴 Browser freeze |
| Very High (5.0x) | 1 frame | 324,000 | 1.6 GB | 1.5 GB | 324,000 | 💥 **Crash** |

**Performance Breaking Points:**
- **1,000+ thumbnails** → UI becomes sluggish (< 30fps scrolling)
- **5,000+ thumbnails** → Severe performance degradation (< 10fps scrolling)
- **20,000+ thumbnails** → Browser freeze or crash

### Memory Footprint Analysis

**Per-Thumbnail Overhead:**
- Image data: ~5KB (JPEG @ 80×45 pixels, 75% quality)
- DOM node: ~200 bytes (div + img + event listeners)
- React fiber: ~100 bytes
- **Total per thumbnail: ~5.3KB**

**3-Hour Video Memory Usage:**

| Zoom | Thumbnails | Image Data | DOM Overhead | React Overhead | Total Memory |
|------|------------|------------|--------------|----------------|--------------|
| Low | 2,160 | 11 MB | 432 KB | 216 KB | **~12 MB** ✅ |
| Medium | 10,800 | 54 MB | 2.16 MB | 1.08 MB | **~57 MB** ⚠️ |
| High | 21,600 | 108 MB | 4.32 MB | 2.16 MB | **~115 MB** 🔴 |
| Very High | 324,000 | 1.6 GB | 65 MB | 32 MB | **~1.7 GB** 💥 |

## Critical Performance Optimizations

### 1. Virtual Scrolling (MANDATORY)

**Status:** 🔴 **REQUIRED for videos > 30 minutes**

Without virtual scrolling, rendering 21,600+ DOM nodes will freeze or crash the browser.

**Impact:**
- 3-hour video at high zoom: 21,600 thumbnails → **only 20-30 rendered**
- **1000x reduction** in DOM nodes
- Constant 60fps performance regardless of video length
- Memory usage: 115MB → **~150KB**

**Implementation:**

```bash
npm install @tanstack/react-virtual
```

```typescript
// src/components/timeline/components/timeline-item/clip-filmstrip-virtualized.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef, useMemo } from 'react';
import { ThumbnailFrame } from './thumbnail-frame';
import { generateFrameIndices, calculateThumbnailInterval } from '@/utils/filmstrip-utils';

export const ClipFilmstripVirtualized: React.FC<ClipFilmstripProps> = ({
  clip,
  widthPx,
  heightPx,
  zoomLevel,
  quality = 'medium',
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate thumbnail interval and frame indices
  const thumbnailInterval = useMemo(
    () => calculateThumbnailInterval(zoomLevel, clip.fps || 30),
    [zoomLevel, clip.fps]
  );

  const frameIndices = useMemo(
    () => generateFrameIndices(
      clip.duration,
      clip.fps || 30,
      thumbnailInterval,
      clip.offset || 0
    ),
    [clip.duration, clip.fps, thumbnailInterval, clip.offset]
  );

  const thumbnailWidth = 80; // Fixed width for performance

  // Create virtualizer instance
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
        width: `${widthPx}px`,
        height: `${heightPx}px`,
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
              quality={quality}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

**Conditional Usage:**

```typescript
// src/components/timeline/components/timeline-item/timeline-clip.tsx
const VIRTUALIZATION_THRESHOLD = 300; // 5 minutes in seconds

const shouldVirtualize = clip.duration > VIRTUALIZATION_THRESHOLD;

{shouldVirtualize ? (
  <ClipFilmstripVirtualized
    clip={clip}
    widthPx={clipWidthPx}
    heightPx={clipHeightPx}
    zoomLevel={zoomLevel}
  />
) : (
  <ClipFilmstrip
    clip={clip}
    widthPx={clipWidthPx}
    heightPx={clipHeightPx}
    zoomLevel={zoomLevel}
  />
)}
```

### 2. Adaptive Decimation (HIGH PRIORITY)

**Status:** 🟡 **Strongly recommended for 1+ hour videos**

Only calculate and generate thumbnails for the visible area of the timeline.

**Impact:**
- 3-hour video: Calculates **30-50 frame indices** instead of 21,600
- **1000x reduction** in calculation time
- Updates dynamically as user scrolls
- Significantly reduces initial load time

**Implementation:**

```typescript
// src/utils/filmstrip-utils.ts

export function generateAdaptiveFrameIndices(
  duration: number,
  fps: number,
  zoomLevel: number,
  scrollPosition: number,    // Current horizontal scroll position (pixels)
  viewportWidth: number,      // Visible timeline width (pixels)
  offset: number = 0,         // Clip trim offset (seconds)
  maxThumbnails: number = 100
): number[] {
  const pixelsPerSecond = zoomLevel * BASE_PIXELS_PER_SECOND;
  const interval = calculateThumbnailInterval(zoomLevel, fps);

  // Calculate visible time range
  const visibleStartTime = scrollPosition / pixelsPerSecond;
  const visibleEndTime = (scrollPosition + viewportWidth) / pixelsPerSecond;

  // Add overscan (50% on each side for smooth scrolling)
  const overscanWidth = viewportWidth * 0.5;
  const startTime = Math.max(0, visibleStartTime - (overscanWidth / pixelsPerSecond));
  const endTime = Math.min(duration, visibleEndTime + (overscanWidth / pixelsPerSecond));

  // Generate indices only for visible + overscan range
  const startFrame = Math.floor((offset + startTime) * fps);
  const endFrame = Math.ceil((offset + endTime) * fps);

  const indices: number[] = [];
  for (let frame = startFrame; frame < endFrame; frame += interval) {
    indices.push(frame);

    // Safety limit
    if (indices.length >= maxThumbnails) {
      break;
    }
  }

  return indices;
}
```

**Usage in Component:**

```typescript
const frameIndices = useMemo(() => {
  const scrollPos = useTimelineStore(s => s.scrollPosition);
  const viewportWidth = containerRef.current?.clientWidth || 1920;

  return generateAdaptiveFrameIndices(
    clip.duration,
    clip.fps || 30,
    zoomLevel,
    scrollPos,
    viewportWidth,
    clip.offset || 0
  );
}, [clip, zoomLevel, scrollPosition]);
```

### 3. Multi-Resolution Thumbnail Strategy (HIGH PRIORITY)

**Status:** 🟡 **Strongly recommended for 3+ hour videos**

Generate different quality levels based on zoom to reduce storage and improve performance.

**Storage Savings:**

| Zoom | Quality | Size/Thumb | Thumbnails (3hr) | Total Storage | Savings vs Medium |
|------|---------|------------|------------------|---------------|-------------------|
| Low (< 0.5x) | Low (60×34 @ 50%) | 2 KB | 2,160 | **4.3 MB** | 70% ✅ |
| Medium (0.5-2x) | Medium (80×45 @ 75%) | 5 KB | 10,800 | **54 MB** | Baseline |
| High (> 2x) | High (160×90 @ 85%) | 15 KB | 21,600 | **324 MB** | -500% |

**Implementation:**

```typescript
// src/types/filmstrip.ts
export type ThumbnailResolution = 'low' | 'medium' | 'high';

export const THUMBNAIL_RESOLUTIONS: Record<ThumbnailResolution, {
  width: number;
  height: number;
  jpegQuality: number;
}> = {
  low: { width: 60, height: 34, jpegQuality: 50 },
  medium: { width: 80, height: 45, jpegQuality: 75 },
  high: { width: 160, height: 90, jpegQuality: 85 },
};
```

```typescript
// src/utils/thumbnail-resolution.ts

export function getThumbnailResolution(zoomLevel: number): ThumbnailResolution {
  if (zoomLevel < 0.5) {
    return 'low';    // Zoomed way out - use small, low-quality thumbnails
  }
  if (zoomLevel < 2.0) {
    return 'medium'; // Normal viewing - use standard quality
  }
  return 'high';     // Zoomed in - use high-quality for detail
}
```

```typescript
// src/services/thumbnail-service.ts

async generateThumbnail(
  mediaId: string,
  frameIndex: number,
  resolution: ThumbnailResolution = 'medium'
): Promise<string> {
  const config = THUMBNAIL_RESOLUTIONS[resolution];

  // Cache key includes resolution
  const cacheKey = `${mediaId}-${frameIndex}-${resolution}`;

  const cached = thumbnailCache.get(cacheKey);
  if (cached) return cached;

  // Generate with specific resolution
  const file = await mediaLibraryService.getMediaFile(mediaId);
  const timestamp = frameIndex / (metadata?.fps || 30);

  const mb = await mediabunny;
  const blob = await mb.extractFrame(file, timestamp, {
    width: config.width,
    height: config.height,
    quality: config.jpegQuality,
  });

  const url = URL.createObjectURL(blob);
  thumbnailCache.set(cacheKey, url);

  return url;
}
```

### 4. Progressive Loading with Priority Queue (RECOMMENDED)

**Status:** 🟢 **Recommended for best user experience**

Load thumbnails in priority order to make visible content appear instantly.

**Impact:**
- Visible thumbnails load in **< 100ms**
- Background thumbnails fill in during idle time
- No UI blocking during scroll
- Perceived performance improvement: instant

**Implementation:**

```typescript
// src/utils/thumbnail-priority-queue.ts

interface ThumbnailRequest {
  mediaId: string;
  frameIndex: number;
  priority: number; // 1 = highest
  resolution: ThumbnailResolution;
}

export class ThumbnailPriorityQueue {
  private queue: Map<string, ThumbnailRequest> = new Map();
  private processing = false;

  addRequest(request: ThumbnailRequest): void {
    const key = `${request.mediaId}-${request.frameIndex}-${request.resolution}`;

    // Update priority if this request already exists with lower priority
    const existing = this.queue.get(key);
    if (!existing || existing.priority > request.priority) {
      this.queue.set(key, request);
    }
  }

  addBatch(
    mediaId: string,
    frameIndices: number[],
    priority: number,
    resolution: ThumbnailResolution
  ): void {
    frameIndices.forEach(frameIndex => {
      this.addRequest({ mediaId, frameIndex, priority, resolution });
    });
  }

  async processQueue(concurrency: number = 3): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      // Sort by priority (1 = highest)
      const sorted = Array.from(this.queue.values())
        .sort((a, b) => a.priority - b.priority);

      // Process in batches
      for (let i = 0; i < sorted.length; i += concurrency) {
        const batch = sorted.slice(i, i + concurrency);

        // Generate thumbnails concurrently
        await Promise.all(
          batch.map(req =>
            thumbnailService.generateThumbnail(
              req.mediaId,
              req.frameIndex,
              req.resolution
            )
          )
        );

        // Yield to main thread between batches
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Clear processed queue
      this.queue.clear();
    } finally {
      this.processing = false;
    }
  }

  clear(): void {
    this.queue.clear();
  }
}

export const thumbnailQueue = new ThumbnailPriorityQueue();
```

**Usage in Filmstrip Component:**

```typescript
// src/components/timeline/components/timeline-item/clip-filmstrip.tsx

useEffect(() => {
  const currentFrame = useTimelineStore.getState().currentFrame;
  const resolution = getThumbnailResolution(zoomLevel);

  // Priority 1: Current playhead frame (most important)
  if (frameIndices.includes(currentFrame)) {
    thumbnailQueue.addRequest({
      mediaId: clip.mediaId,
      frameIndex: currentFrame,
      priority: 1,
      resolution,
    });
  }

  // Priority 2: Visible thumbnails
  thumbnailQueue.addBatch(
    clip.mediaId,
    visibleFrameIndices,
    2,
    resolution
  );

  // Priority 3: Nearby (overscan) thumbnails
  thumbnailQueue.addBatch(
    clip.mediaId,
    overscanFrameIndices,
    3,
    resolution
  );

  // Priority 4: Rest of clip (background generation during idle time)
  requestIdleCallback(() => {
    thumbnailQueue.addBatch(
      clip.mediaId,
      restOfClipIndices,
      4,
      resolution
    );
  });

  // Start processing
  thumbnailQueue.processQueue(3); // 3 concurrent generations

}, [clip.mediaId, frameIndices, zoomLevel, currentFrame]);
```

### 5. Enhanced Quota Management (CRITICAL)

**Status:** 🔴 **Required to prevent storage errors**

Monitor browser storage and automatically clean up to prevent `QuotaExceededError`.

**Typical Browser Quotas:**
- Chrome/Edge: ~50% of available disk space (up to several GB)
- Firefox: ~50% of available disk space
- Safari: 1GB default (can request more)

**Implementation:**

```typescript
// src/services/quota-aware-cache.ts

interface StorageStatus {
  usage: number;      // Bytes used
  quota: number;      // Total bytes available
  usageRatio: number; // 0.0 - 1.0
  available: number;  // Bytes available
}

export class QuotaAwareThumbnailCache {
  private readonly warningThreshold = 0.85;   // 85% of quota
  private readonly criticalThreshold = 0.95;  // 95% of quota

  async set(key: string, blob: Blob): Promise<void> {
    // Check quota before storing
    const status = await this.getStorageStatus();

    if (status.usageRatio > this.criticalThreshold) {
      console.warn('Storage critical:', status);
      // Critical: Clear 50% of thumbnails
      await this.clearOldestThumbnails(0.5);
    } else if (status.usageRatio > this.warningThreshold) {
      console.warn('Storage warning:', status);
      // Warning: Clear 25% of thumbnails
      await this.clearOldestThumbnails(0.25);
    }

    // Store in IndexedDB
    await indexedDBService.saveThumbnail({
      id: key,
      blob,
      lastAccessed: Date.now(),
      generatedAt: Date.now(),
    });
  }

  async clearOldestThumbnails(fraction: number): Promise<void> {
    const all = await indexedDBService.getAllThumbnails();

    // Sort by last access time (oldest first)
    const sorted = all.sort((a, b) => a.lastAccessed - b.lastAccessed);

    // Delete oldest fraction
    const toDelete = sorted.slice(0, Math.floor(all.length * fraction));

    await Promise.all(toDelete.map(t => indexedDBService.deleteThumbnail(t.id)));

    console.log(`Cleared ${toDelete.length} thumbnails to free up space`);
  }

  async getStorageStatus(): Promise<StorageStatus> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      // Fallback for browsers without Storage API
      return {
        usage: 0,
        quota: Infinity,
        usageRatio: 0,
        available: Infinity,
      };
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;

    return {
      usage,
      quota,
      usageRatio: usage / quota,
      available: quota - usage,
    };
  }

  async clearOlderThan(days: number): Promise<void> {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const all = await indexedDBService.getAllThumbnails();

    const toDelete = all.filter(t => t.generatedAt < cutoffTime);

    await Promise.all(toDelete.map(t => indexedDBService.deleteThumbnail(t.id)));

    console.log(`Cleared ${toDelete.length} thumbnails older than ${days} days`);
  }
}

export const quotaAwareCache = new QuotaAwareThumbnailCache();
```

**Automatic Cleanup Schedule:**

```typescript
// Run cleanup periodically
useEffect(() => {
  const cleanupInterval = setInterval(async () => {
    // Clear thumbnails older than 7 days
    await quotaAwareCache.clearOlderThan(7);

    // Check storage status
    const status = await quotaAwareCache.getStorageStatus();

    console.log('Storage status:', {
      usage: `${(status.usage / 1024 / 1024).toFixed(2)} MB`,
      quota: `${(status.quota / 1024 / 1024).toFixed(2)} MB`,
      percent: `${(status.usageRatio * 100).toFixed(1)}%`,
    });
  }, 60 * 60 * 1000); // Every hour

  return () => clearInterval(cleanupInterval);
}, []);
```

## Performance Monitoring

### Metrics to Track

```typescript
// src/utils/performance-monitor.ts

export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  measure(name: string, operation: () => void | Promise<void>): void {
    const start = performance.now();

    const result = operation();

    if (result instanceof Promise) {
      result.then(() => {
        const duration = performance.now() - start;
        this.recordMetric(name, duration);
      });
    } else {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    }
  }

  private recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(duration);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getStats(name: string) {
    const values = this.metrics.get(name) || [];

    if (values.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      avg: sum / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  logAllStats(): void {
    console.table(
      Array.from(this.metrics.keys()).map(name => ({
        metric: name,
        ...this.getStats(name),
      }))
    );
  }
}

export const perfMonitor = new PerformanceMonitor();
```

**Usage:**

```typescript
// Monitor thumbnail generation
perfMonitor.measure('thumbnail-generation', async () => {
  await thumbnailService.generateThumbnail(mediaId, frameIndex);
});

// Monitor scroll performance
perfMonitor.measure('timeline-scroll', () => {
  handleTimelineScroll(scrollEvent);
});

// Log stats periodically
setInterval(() => {
  perfMonitor.logAllStats();
}, 30000); // Every 30 seconds
```

### Target Performance Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| **Initial Load (3hr video)** | < 500ms | < 1s | > 2s |
| **Scroll FPS** | 60fps | 30fps | < 15fps |
| **Visible Thumbnail Load** | < 100ms | < 250ms | > 500ms |
| **Memory Usage** | < 100MB | < 250MB | > 500MB |
| **Storage (3hr, medium zoom)** | < 50MB | < 100MB | > 200MB |

## Troubleshooting

### Browser Freezes When Opening 3-Hour Video

**Symptoms:**
- Browser becomes unresponsive when loading long clip
- "Page Unresponsive" dialog appears
- Timeline takes 5+ seconds to render

**Diagnosis:**
```typescript
// Check if virtual scrolling is enabled
const shouldVirtualize = clip.duration > 300;
console.log('Virtualization:', shouldVirtualize ? 'ENABLED' : 'DISABLED');

// Check number of DOM nodes
const thumbnailCount = document.querySelectorAll('.thumbnail-frame').length;
console.log('Thumbnail DOM nodes:', thumbnailCount);
```

**Solutions:**
1. ✅ Enable virtual scrolling for clips > 5 minutes
2. ✅ Implement adaptive decimation
3. ✅ Use conditional rendering based on clip duration

### QuotaExceededError After Adding Several Long Videos

**Symptoms:**
- Error: `QuotaExceededError: The quota has been exceeded`
- New thumbnails fail to generate
- Existing thumbnails disappear

**Diagnosis:**
```typescript
const status = await quotaAwareCache.getStorageStatus();
console.log('Storage:', {
  used: `${(status.usage / 1024 / 1024).toFixed(2)} MB`,
  total: `${(status.quota / 1024 / 1024).toFixed(2)} MB`,
  percent: `${(status.usageRatio * 100).toFixed(1)}%`,
});
```

**Solutions:**
1. ✅ Implement quota-aware cache with auto-cleanup
2. ✅ Clear old thumbnails: `indexedDB.delete('filmstripThumbnails')`
3. ✅ Use multi-resolution strategy to reduce storage
4. ✅ Set up periodic cleanup (delete thumbnails > 7 days old)

### Thumbnails Not Loading at High Zoom

**Symptoms:**
- Blank spaces where thumbnails should be
- Thumbnails load very slowly
- Browser DevTools shows many pending requests

**Diagnosis:**
```typescript
// Check concurrent generation count
const pendingCount = thumbnailService.getPendingCount();
console.log('Pending thumbnails:', pendingCount);

// Check queue size
const queueSize = thumbnailQueue.queue.size;
console.log('Queue size:', queueSize);
```

**Solutions:**
1. ✅ Implement priority queue
2. ✅ Limit concurrent generation to 3-5
3. ✅ Use progressive loading
4. ✅ Increase overscan buffer

### Slow Scroll Performance with Long Clip

**Symptoms:**
- Scrolling feels janky (< 30fps)
- Lag when dragging scrollbar
- Timeline stutters during playback

**Diagnosis:**
```typescript
// Monitor scroll FPS
let lastScrollTime = performance.now();
let scrollCount = 0;

window.addEventListener('scroll', () => {
  scrollCount++;

  const now = performance.now();
  if (now - lastScrollTime > 1000) {
    console.log('Scroll FPS:', scrollCount);
    scrollCount = 0;
    lastScrollTime = now;
  }
});
```

**Solutions:**
1. ✅ Use adaptive decimation
2. ✅ Enable virtual scrolling
3. ✅ Debounce scroll event handlers
4. ✅ Use `will-change: transform` CSS hint

### Memory Leak with Long Videos

**Symptoms:**
- Memory usage grows over time
- Browser becomes slower after 5-10 minutes
- Eventually crashes on long editing sessions

**Diagnosis:**
```typescript
// Monitor memory usage (Chrome DevTools)
if (performance.memory) {
  setInterval(() => {
    console.log('Memory:', {
      used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
    });
  }, 5000);
}
```

**Common Causes & Solutions:**
1. ❌ Not revoking blob URLs
   - ✅ Ensure LRU cache calls `URL.revokeObjectURL()` on eviction
2. ❌ Event listeners not cleaned up
   - ✅ Use cleanup functions in `useEffect`
3. ❌ React components not memoized
   - ✅ Use `React.memo` for thumbnail components
4. ❌ Infinite re-render loops
   - ✅ Check dependency arrays in hooks

## Best Practices

### General Guidelines

1. **Always use virtual scrolling for clips > 5 minutes** ⚡
2. **Implement adaptive decimation** - Don't calculate thumbnails for off-screen content
3. **Use multi-resolution strategy** - Lower quality when zoomed out (70% storage savings)
4. **Monitor storage quota** - Auto-cleanup before hitting browser limits
5. **Limit concurrent generation** - Max 3-5 thumbnails at once
6. **Use priority queue** - Visible content loads first
7. **Test with real long-form content** - Not just 30-second test clips
8. **Profile memory usage regularly** - Use Chrome DevTools to detect leaks early
9. **Set realistic maxThumbnails limits** - 100 is good default, never exceed 500

### Production Deployment

10. **Add telemetry** - Track performance metrics in production
11. **Set up alerts** - Notify when performance degrades
12. **A/B test optimizations** - Measure impact of each change
13. **Provide user controls** - Let users disable filmstrip if needed
14. **Document limitations** - Be transparent about maximum video length

## See Also

- `filmstrip-feature.md` - Complete filmstrip implementation guide
- `timeline-architecture.md` - Timeline component structure and state management
- `storage.md` - OPFS and IndexedDB architecture
- `state-management.md` - Zustand best practices and optimization
- `integration.md` - Remotion and mediabunny integration patterns
