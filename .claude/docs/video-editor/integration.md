# Integration Guide

External integrations for video rendering, processing, and media sources.

## Overview

The video editor integrates with:
- **Remotion** - Server-side video composition and rendering
- **mediabunny** - Video processing and encoding (browser-side)
- **Media Adaptors** - External media sources (cloud storage, stock footage, etc.)

## Remotion - Server-side Rendering

### Architecture

The video editor uses **server-side rendering** with `@remotion/renderer` (not client-side). This provides:
- Full HTML/CSS support (no limitations)
- FFmpeg encoding (industry-standard codecs)
- Production-ready reliability
- Faster rendering for complex compositions

```
Browser (React Video Editor) → API → Node.js Server → @remotion/renderer → FFmpeg → Video File
```

### Installation

```bash
npm install remotion @remotion/renderer
```

### Basic Setup

#### 1. Remotion Composition

```typescript
// src/remotion/composition.tsx
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'

export const MyComposition: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const opacity = Math.min(1, frame / 30)

  return (
    <AbsoluteFill
      style={{
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <h1 style={{ opacity, fontSize: 100 }}>{text}</h1>
    </AbsoluteFill>
  )
}
```

#### 2. Remotion Root

```typescript
// src/remotion/root.tsx
import { Composition } from 'remotion'
import { MyComposition } from './composition'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyComposition"
        component={MyComposition}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: 'Hello World',
        }}
      />
    </>
  )
}
```

#### 3. Server-side Rendering API

```typescript
// server/render.ts (Node.js backend)
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'

export async function renderVideo(compositionId: string, inputProps: any) {
  // Step 1: Bundle the Remotion project
  const bundleLocation = await bundle({
    entryPoint: path.resolve('./src/remotion/index.ts'),
    webpackOverride: (config) => config,
  })

  // Step 2: Select composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: compositionId,
    inputProps,
  })

  // Step 3: Render video
  const outputPath = path.resolve(`./output/${compositionId}-${Date.now()}.mp4`)

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
  })

  return outputPath
}
```

#### 4. Express API Endpoint

```typescript
// server/routes/render.ts
import express from 'express'
import { renderVideo } from './render'

const router = express.Router()

router.post('/render', async (req, res) => {
  try {
    const { compositionId, inputProps } = req.body

    // Render video (this takes time!)
    const outputPath = await renderVideo(compositionId, inputProps)

    // Return file path or URL
    res.json({
      success: true,
      videoUrl: `/videos/${path.basename(outputPath)}`,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    })
  }
})

export default router
```

#### 5. Client-side API Call

```typescript
// src/api/render.ts
import { apiClient } from './client'

export const renderApi = {
  async renderVideo(compositionId: string, inputProps: any) {
    const { data } = await apiClient.post<{ success: boolean; videoUrl: string }>('/render', {
      compositionId,
      inputProps,
    })
    return data
  },

  async getRenderStatus(jobId: string) {
    const { data } = await apiClient.get(`/render/${jobId}/status`)
    return data
  },
}
```

### Advanced: Progress Tracking

```typescript
// server/render.ts
import { renderMedia } from '@remotion/renderer'

export async function renderVideoWithProgress(
  compositionId: string,
  inputProps: any,
  onProgress: (progress: number) => void
) {
  const outputPath = path.resolve(`./output/${compositionId}-${Date.now()}.mp4`)

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    onProgress: ({ progress }) => {
      onProgress(progress) // 0 to 1
    },
  })

  return outputPath
}
```

### Advanced: WebSockets for Real-time Progress

```typescript
// server/websocket.ts
import { Server } from 'socket.io'
import { renderVideoWithProgress } from './render'

export function setupRenderWebSocket(io: Server) {
  io.on('connection', (socket) => {
    socket.on('render:start', async ({ compositionId, inputProps }) => {
      try {
        const outputPath = await renderVideoWithProgress(
          compositionId,
          inputProps,
          (progress) => {
            socket.emit('render:progress', { progress })
          }
        )

        socket.emit('render:complete', { videoUrl: `/videos/${path.basename(outputPath)}` })
      } catch (error) {
        socket.emit('render:error', { error: error.message })
      }
    })
  })
}
```

```typescript
// src/hooks/use-render.ts
import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export function useRender() {
  const [progress, setProgress] = useState(0)
  const [isRendering, setIsRendering] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const socket = io('http://localhost:3000')

  useEffect(() => {
    socket.on('render:progress', ({ progress }) => {
      setProgress(progress)
    })

    socket.on('render:complete', ({ videoUrl }) => {
      setVideoUrl(videoUrl)
      setIsRendering(false)
      setProgress(1)
    })

    socket.on('render:error', ({ error }) => {
      setError(error)
      setIsRendering(false)
    })

    return () => {
      socket.disconnect()
    }
  }, [])

  const startRender = (compositionId: string, inputProps: any) => {
    setIsRendering(true)
    setProgress(0)
    setError(null)
    setVideoUrl(null)
    socket.emit('render:start', { compositionId, inputProps })
  }

  return { progress, isRendering, videoUrl, error, startRender }
}
```

### Codec Options

```typescript
await renderMedia({
  composition,
  serveUrl: bundleLocation,
  codec: 'h264', // or 'h265', 'vp8', 'vp9', 'prores'
  outputLocation: outputPath,
  inputProps,
  videoBitrate: '8M', // Higher quality
  audioBitrate: '320k',
  crf: 18, // Lower = higher quality (h264/h265)
})
```

### Integration with Timeline

```typescript
// src/components/editor/video-editor.tsx
import { useRender } from '@/hooks/use-render'
import { useTimelineStore } from '@/stores/timeline-store'

export function VideoEditor() {
  const { progress, isRendering, videoUrl, startRender } = useRender()
  const timeline = useTimelineStore((s) => s.timeline)
  const fps = useTimelineStore((s) => s.fps) // Get FPS from timeline state

  const handleExport = () => {
    // Convert timeline to Remotion composition props
    // CRITICAL: Convert seconds → frames for Remotion!
    const inputProps = {
      clips: timeline.clips.map((clip) => ({
        src: clip.src,                                    // Media source URL
        from: Math.round(clip.start * fps),              // ✅ Convert seconds → frames
        durationInFrames: Math.round(clip.duration * fps), // ✅ Convert seconds → frames
        offset: clip.offset ? Math.round(clip.offset * fps) : undefined, // ✅ Trim offset in frames
        effects: clip.effects,
      })),
      transitions: timeline.transitions,
      fps, // ✅ Pass FPS to Remotion composition
    }

    startRender('VideoComposition', inputProps)
  }

  return (
    <div>
      <Timeline />

      <Button onClick={handleExport} disabled={isRendering}>
        {isRendering ? `Exporting ${Math.round(progress * 100)}%` : 'Export Video'}
      </Button>

      {videoUrl && (
        <div>
          <video src={videoUrl} controls />
          <a href={videoUrl} download>
            Download
          </a>
        </div>
      )}
    </div>
  )
}
```

## mediabunny - Video Processing

**mediabunny** is used for browser-side video processing (not rendering final output). Use it for:
- Extracting video metadata (duration, dimensions, fps)
- Generating thumbnails
- Processing uploaded video files
- Pre-encoding before upload

### Installation

```bash
npm install mediabunny
```

### Usage with `import defer`

**CRITICAL:** Always use `import defer` for mediabunny (heavy library):

```typescript
// src/utils/video-processing.ts
import defer * as mediabunny from 'mediabunny'

export async function extractVideoMetadata(file: File) {
  const mb = await mediabunny // Await the deferred import

  const video = await mb.loadVideo(file)

  return {
    duration: video.duration,
    width: video.width,
    height: video.height,
    fps: video.fps,
  }
}

export async function generateThumbnail(file: File, time: number = 0) {
  const mb = await mediabunny

  const thumbnail = await mb.extractFrame(file, time)
  return thumbnail // Blob
}
```

### Integration with File Upload

```typescript
// src/components/upload/video-upload.tsx
import { extractVideoMetadata, generateThumbnail } from '@/utils/video-processing'
import { useProjectStore } from '@/stores/project-store'

export function VideoUpload() {
  const addMedia = useProjectStore((s) => s.addMedia)

  const handleFileUpload = async (file: File) => {
    // Extract metadata
    const metadata = await extractVideoMetadata(file)

    // Generate thumbnail
    const thumbnail = await generateThumbnail(file, metadata.duration / 2)

    // Store in OPFS
    const mediaId = await storeMediaFile(file)
    const thumbnailUrl = await storeThumbnail(thumbnail)

    // Add to project
    addMedia({
      id: mediaId,
      type: 'video',
      src: mediaId,
      thumbnailUrl,
      duration: metadata.duration,
      metadata,
    })
  }

  return <input type="file" accept="video/*" onChange={(e) => handleFileUpload(e.target.files[0])} />
}
```

## Time Unit Consistency

### Critical: FPS Must Be Consistent

For seamless integration between Timeline, Remotion, and Player, **FPS must be consistent** across all systems.

**Single Source of Truth:**

```typescript
// src/constants/timeline.ts
export const TIMELINE_FPS = 30; // Single source of truth

// Use everywhere
import { TIMELINE_FPS } from '@/constants/timeline';

// Timeline store
useTimelineStore.setState({ fps: TIMELINE_FPS });

// Remotion composition
<Composition
  id="Main"
  component={MainComposition}
  fps={TIMELINE_FPS}  // ✅ Same FPS
  durationInFrames={600}
  width={1920}
  height={1080}
/>

// Remotion Player
<Player
  component={MainComposition}
  fps={TIMELINE_FPS}  // ✅ Same FPS
  durationInFrames={600}
  compositionWidth={1920}
  compositionHeight={1080}
/>
```

### Conversion Rules

**Timeline (Seconds) → Remotion (Frames):**

```typescript
// Adapter layer - create this in src/utils/timeline-to-remotion.ts
import { TIMELINE_FPS } from '@/constants/timeline';
import type { TimelineClip, TimelineTrack } from '@/types/timeline';
import type { RemotionItem, RemotionTrack } from '@/types/remotion';

export function convertTimelineToRemotion(
  tracks: TimelineTrack[],
  fps: number = TIMELINE_FPS
) {
  return {
    fps,
    tracks: tracks.map(track => ({
      name: track.name,
      items: track.clips.map(clip => ({
        id: clip.id,
        from: Math.round(clip.start * fps),                    // Seconds → Frames
        durationInFrames: Math.round(clip.duration * fps),     // Seconds → Frames
        offset: clip.offset ? Math.round(clip.offset * fps) : 0, // Seconds → Frames
        type: clip.type,
        src: getMediaUrl(clip.mediaId), // Resolve mediaId to actual URL
      })),
    })),
  };
}

// Helper to resolve media URLs
function getMediaUrl(mediaId: string): string {
  // For browser preview: Use OPFS blob URL
  const file = await mediaStorage.getFile(mediaId);
  return URL.createObjectURL(file);

  // For server-side rendering: Use server URL
  // return `/api/media/${mediaId}`;
}
```

**Remotion (Frames) → Timeline (Seconds):**

```typescript
// For importing Remotion compositions/templates
export function convertRemotionToTimeline(
  remotionTracks: RemotionTrack[],
  fps: number = TIMELINE_FPS
): TimelineTrack[] {
  return remotionTracks.map((track, index) => ({
    id: generateId(),
    name: track.name,
    type: inferTrackType(track.items), // Infer from item types
    height: 80,
    locked: false,
    muted: false,
    solo: false,
    color: '#3b82f6',
    order: index,
    clips: track.items.map(item => ({
      id: item.id,
      trackId: '', // Set after track creation
      start: item.from / fps,                         // Frames → Seconds
      end: (item.from + item.durationInFrames) / fps, // Frames → Seconds
      duration: item.durationInFrames / fps,          // Frames → Seconds
      offset: item.offset ? item.offset / fps : 0,   // Frames → Seconds
      label: extractFileName(item.src),
      color: '#3b82f6',
      mediaId: '', // Would need to import media first
      type: item.type,
    })),
  }));
}
```

### Common Integration Patterns

**Pattern 1: Export Timeline to Remotion**

```typescript
// Export handler with proper conversion
async function handleExportVideo() {
  const timeline = useTimelineStore.getState();
  const fps = useTimelineStore.getState().fps;

  // Convert to Remotion format
  const remotionData = convertTimelineToRemotion(timeline.tracks, fps);

  // Send to server for rendering
  const response = await fetch('/api/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      compositionId: 'Main',
      inputProps: remotionData,
      fps,
      durationInFrames: Math.round(timeline.duration * fps),
    }),
  });

  const { videoUrl } = await response.json();
  return videoUrl;
}
```

**Pattern 2: Sync Timeline with Player**

```typescript
// Timeline and Player stay in sync via shared state
import { Player } from '@remotion/player';
import { useTimelineStore } from '@/stores/timeline-store';

function VideoEditor() {
  const currentFrame = useTimelineStore(s => s.currentFrame);
  const setCurrentFrame = useTimelineStore(s => s.setCurrentFrame);
  const isPlaying = useTimelineStore(s => s.isPlaying);
  const fps = useTimelineStore(s => s.fps);
  const tracks = useTimelineStore(s => s.tracks);

  const playerRef = useRef<PlayerRef>(null);

  // Timeline → Player synchronization
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.seekTo(currentFrame);
    }
  }, [currentFrame]);

  // Player → Timeline synchronization
  const handlePlayerTimeUpdate = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, [setCurrentFrame]);

  return (
    <div>
      {/* Remotion Player */}
      <Player
        ref={playerRef}
        component={MainComposition}
        inputProps={{ tracks: convertTimelineToRemotion(tracks, fps) }}
        fps={fps}  // ✅ Same FPS as timeline
        durationInFrames={Math.round(duration * fps)}
        compositionWidth={1920}
        compositionHeight={1080}
        playing={isPlaying}
        onTimeUpdate={(e) => handlePlayerTimeUpdate(e.detail.frame)}
      />

      {/* Timeline UI */}
      <Timeline />
    </div>
  );
}
```

**Pattern 3: Validate FPS Consistency**

```typescript
// Add validation to catch FPS mismatches
export function validateFpsConsistency(
  timelineFps: number,
  remotionFps: number,
  playerFps: number
): void {
  if (timelineFps !== remotionFps || remotionFps !== playerFps) {
    console.error('FPS Mismatch Detected!', {
      timeline: timelineFps,
      remotion: remotionFps,
      player: playerFps,
    });

    throw new Error(
      `FPS mismatch: Timeline=${timelineFps}, Remotion=${remotionFps}, Player=${playerFps}. ` +
      `All systems must use the same FPS value.`
    );
  }
}

// Use in export handler
function handleExport() {
  const fps = useTimelineStore.getState().fps;

  validateFpsConsistency(
    fps,
    REMOTION_COMPOSITION_FPS,
    PLAYER_FPS
  );

  // Proceed with export...
}
```

### Type Definitions

Create type definitions for Remotion data structures:

```typescript
// src/types/remotion.ts

export interface RemotionItem {
  id: string;
  from: number;              // Frame number (not seconds!)
  durationInFrames: number;  // Duration in frames
  offset?: number;           // Trim offset in frames
  type: 'video' | 'audio' | 'image';
  src: string;               // Media URL
}

export interface RemotionTrack {
  name: string;
  items: RemotionItem[];
}

export interface RemotionInputProps {
  fps: number;
  tracks: RemotionTrack[];
}
```

### Media URL Resolution Strategy

**Problem:** Timeline uses `mediaId` (references OPFS), but Remotion needs actual URLs.

**Solution 1: Client-Side (Browser Preview)**

```typescript
// Convert mediaId → blob URL for browser preview
async function getMediaUrl(mediaId: string): Promise<string> {
  const file = await mediaLibraryService.getMediaFile(mediaId);
  return URL.createObjectURL(file); // blob:http://localhost:5173/...
}
```

**Solution 2: Server-Side (Rendering)**

```typescript
// Upload media to server before rendering
async function prepareMediaForRendering(mediaId: string): Promise<string> {
  const file = await mediaLibraryService.getMediaFile(mediaId);

  // Upload to temporary server location
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/media/upload-temp', {
    method: 'POST',
    body: formData,
  });

  const { url } = await response.json();
  return url; // https://yourserver.com/temp-media/abc123.mp4
}
```

**Solution 3: Hybrid (Cloud Storage)**

```typescript
// Use cloud storage URLs from the start
async function addMedia(file: File): Promise<MediaMetadata> {
  // 1. Upload to cloud storage (S3, GCS, etc.)
  const cloudUrl = await uploadToCloud(file);

  // 2. Store BOTH in OPFS (for offline editing) and cloud URL (for rendering)
  const metadata = {
    id: generateId(),
    opfsPath: `/media/${id}`,
    cloudUrl, // ✅ Use this for Remotion rendering
    fileName: file.name,
    duration: await getVideoDuration(file),
  };

  await mediaLibraryService.saveMetadata(metadata);
  return metadata;
}

// Export uses cloud URLs directly
function getMediaUrl(mediaId: string): string {
  const metadata = mediaLibraryService.getMetadata(mediaId);
  return metadata.cloudUrl; // No conversion needed!
}
```

### Troubleshooting

**Problem: "Frame 150 doesn't align with expected timestamp"**
- **Cause:** FPS mismatch between Timeline and Remotion
- **Solution:** Ensure all systems use the same FPS constant

**Problem: "Video positions are slightly off in rendered output"**
- **Cause:** Floating-point precision errors in seconds → frames conversion
- **Solution:** Use `Math.round()` consistently when converting

**Problem: "Server rendering fails with 404 for media URLs"**
- **Cause:** Using client-side blob URLs for server-side rendering
- **Solution:** Upload media to server or use cloud storage URLs

**Problem: "Clip appears at wrong position after export"**
- **Cause:** Forgot to convert `start` to `from` (seconds → frames)
- **Solution:** Use `convertTimelineToRemotion()` adapter consistently

See `.claude/docs/remotion/building-a-timeline.md` for complete Remotion integration patterns and `.claude/docs/video-editor/filmstrip-feature.md` for frame-based system details.

## Media Adaptors

External media sources for the video editor.

### Cloud Storage (AWS S3, Google Cloud Storage)

```typescript
// src/adaptors/cloud-storage.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

export async function fetchFromS3(bucket: string, key: string) {
  const client = new S3Client({ region: 'us-east-1' })

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await client.send(command)
  const blob = await response.Body.transformToByteArray()

  return new Blob([blob])
}
```

### Stock Footage APIs (Pexels, Unsplash)

```typescript
// src/adaptors/pexels.ts
const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY

export async function searchPexelsVideos(query: string) {
  const response = await fetch(`https://api.pexels.com/videos/search?query=${query}&per_page=10`, {
    headers: {
      Authorization: PEXELS_API_KEY,
    },
  })

  const data = await response.json()

  return data.videos.map((video: any) => ({
    id: video.id,
    thumbnail: video.image,
    videoFiles: video.video_files.map((file: any) => ({
      url: file.link,
      quality: file.quality,
      width: file.width,
      height: file.height,
    })),
  }))
}
```

### YouTube (for preview/reference)

```typescript
// src/adaptors/youtube.ts
export function getYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube.com/embed/${videoId}`
}

export function parseYouTubeUrl(url: string): string | null {
  const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/
  const match = url.match(regex)
  return match ? match[1] : null
}
```

## Best Practices

1. **Remotion:** Use server-side rendering for final exports (not client-side)
2. **mediabunny:** Always use `import defer` to avoid bundle bloat
3. **Progress:** Use WebSockets for real-time render progress
4. **Thumbnails:** Generate thumbnails on upload for better UX
5. **Media Adaptors:** Cache fetched media in OPFS to avoid re-fetching
6. **Error Handling:** Handle codec/format errors gracefully
7. **Quotas:** Check backend disk space before rendering

## Deployment Considerations

### Server Requirements

- **Node.js 18+** for Remotion server
- **FFmpeg** installed on server
- **Adequate disk space** for temporary render files
- **Memory:** 2GB+ for HD rendering, 4GB+ for 4K

### Environment Variables

```bash
# .env
VITE_API_BASE_URL=https://api.example.com
VITE_PEXELS_API_KEY=your_pexels_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

## External Resources

- [Remotion Server Rendering Docs](https://www.remotion.dev/docs/renderer)
- [Remotion renderMedia() API](https://www.remotion.dev/docs/renderer/render-media)
- [mediabunny Docs](https://github.com/mediabunny/mediabunny)
- [Pexels API](https://www.pexels.com/api/)
- [AWS S3 SDK](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-example-creating-buckets.html)

## See Also

- `storage.md` - OPFS/IndexedDB for media files
- `components-usage.md` - Timeline and VideoEditor usage
- `error-handling.md` - Handling render errors
