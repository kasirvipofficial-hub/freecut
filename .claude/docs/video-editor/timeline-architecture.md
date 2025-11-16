# Timeline Architecture

Comprehensive guide to the Timeline component's internal architecture, state management, and implementation patterns.

## Overview

The Timeline is a modular, high-performance multi-track video editor component built with React 19, TypeScript 5.9, and Zustand 5. It provides professional editing features including drag-and-drop, magnetic snapping, keyboard shortcuts, undo/redo, and real-time playback synchronization.

## Directory Structure

```
Timeline/
├── components/                      # UI Components
│   ├── timeline-header/             # Header with controls
│   ├── timeline-content.tsx         # Main timeline area
│   ├── timeline-track.tsx           # Individual track
│   ├── timeline-item/               # Clip/item components
│   ├── timeline-markers.tsx         # Time ruler
│   ├── timeline-guidelines.tsx      # Drag guidelines
│   └── timeline-track-handles.tsx   # Track controls
├── hooks/                           # Timeline hooks
│   ├── use-timeline-zoom.ts         # Zoom functionality
│   ├── use-timeline-tracks.ts       # Track management
│   ├── use-timeline-shortcuts.ts    # Keyboard shortcuts
│   ├── use-timeline-history.ts      # Undo/redo
│   └── use-timeline-*.ts            # Other hooks
├── stores/                          # State management
│   ├── use-timeline-store.ts        # Main timeline state
│   └── use-zoom-store.ts            # Zoom persistence
├── utils/                           # Utilities
│   └── gap-utils.ts                 # Gap calculations
├── types.ts                         # TypeScript definitions
└── constants.ts                     # Configuration
```

## State Management

### Main Timeline Store (use-timeline-store.ts)

Central state for all timeline data and operations.

**Store Design Pattern:**
- **Domain-specific store** - Only contains timeline-related state
- **Granular selectors** - Exports selector hooks to prevent unnecessary re-renders
- **Immutable updates** - Uses Zustand's immutability patterns
- **DevTools integration** - Includes Zustand DevTools middleware for debugging
- **Temporal middleware (Recommended)** - Use Zundo for automatic undo/redo tracking

**State Structure:**

```typescript
interface TimelineState {
  // Data - Core timeline content
  tracks: TimelineTrack[];           // All timeline tracks
  clips: TimelineClip[];             // All clips (normalized)

  // Playback - Current playback state
  currentFrame: number;              // Current playhead position (frame number)
  isPlaying: boolean;                // Whether timeline is playing
  fps: number;                       // Frames per second (default: 30)
  duration: number;                  // Total timeline duration (seconds)

  // UI State - Visual and interaction state
  zoomLevel: number;                 // Current zoom (0.1 to 10)
  scrollPosition: number;            // Horizontal scroll position (pixels)
  snapEnabled: boolean;              // Magnetic snapping on/off
  snapThreshold: number;             // Snap distance threshold (pixels)

  // Selection - Currently selected items
  selectedItemIds: string[];         // Selected clip IDs
  selectedTrackId: string | null;    // Selected track ID

  // Actions - State modifiers
  setTracks: (tracks: TimelineTrack[]) => void;
  addTrack: (track: TimelineTrack) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<TimelineTrack>) => void;

  addClip: (clip: TimelineClip) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  removeClips: (clipIds: string[]) => void;
  moveClip: (clipId: string, newStart: number, newTrackId?: string) => void;

  setCurrentFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;

  setZoom: (level: number) => void;
  setScrollPosition: (position: number) => void;
  toggleSnap: () => void;

  selectItems: (itemIds: string[]) => void;
  selectTrack: (trackId: string | null) => void;
  clearSelection: () => void;
}
```

**Selector Hooks (Re-render Optimization):**

```typescript
// ✅ Granular selectors - Only re-render when specific value changes
export const useCurrentFrame = () => useTimelineStore(s => s.currentFrame);
export const useIsPlaying = () => useTimelineStore(s => s.isPlaying);
export const useZoomLevel = () => useTimelineStore(s => s.zoomLevel);
export const useSnapEnabled = () => useTimelineStore(s => s.snapEnabled);
export const useTracks = () => useTimelineStore(s => s.tracks);
export const useClips = () => useTimelineStore(s => s.clips);
export const useSelectedItems = () => useTimelineStore(s => s.selectedItemIds);

// ✅ Derived selectors - Compute values from state
export const useClipsByTrack = (trackId: string) =>
  useTimelineStore(s => s.clips.filter(clip => clip.trackId === trackId));

export const useSelectedClips = () =>
  useTimelineStore(s =>
    s.clips.filter(clip => s.selectedItemIds.includes(clip.id))
  );

export const useDuration = () =>
  useTimelineStore(s => {
    const lastClip = s.clips.reduce((max, clip) =>
      clip.end > max ? clip.end : max, 0
    );
    return Math.max(lastClip, s.duration);
  });
```

**Usage in Components:**

```typescript
// ✅ Good - Subscribe to specific values only
function Playhead() {
  const currentFrame = useCurrentFrame(); // Only re-renders when currentFrame changes
  const zoomLevel = useZoomLevel();       // Only re-renders when zoomLevel changes

  return <div style={{ left: `${currentFrame * zoomLevel}px` }} />;
}

// ❌ Bad - Subscribe to entire store
function Playhead() {
  const store = useTimelineStore(); // Re-renders on ANY state change!

  return <div style={{ left: `${store.currentFrame * store.zoomLevel}px` }} />;
}
```

### Zoom Store (use-zoom-store.ts)

Persists zoom preferences across sessions and projects.

**Features:**
- LocalStorage persistence
- Per-project zoom levels
- Scroll position restoration
- Global default zoom

**State Structure:**

```typescript
interface ZoomState {
  zoomLevel: number;                                    // Current global zoom
  scrollPosition: number;                               // Current scroll position
  projectZoomLevels: Record<string, number>;            // Per-project zoom levels
  projectScrollPositions: Record<string, number>;       // Per-project scroll positions

  setZoomLevel: (level: number) => void;
  setScrollPosition: (position: number) => void;
  saveProjectZoom: (projectId: string, level: number) => void;
  restoreProjectZoom: (projectId: string) => number;
  saveProjectScroll: (projectId: string, position: number) => void;
  restoreProjectScroll: (projectId: string) => number;
}
```

**Persistence Middleware:**

```typescript
export const useZoomStore = create<ZoomState>()(
  persist(
    (set, get) => ({
      // State and actions...
    }),
    {
      name: 'timeline-zoom-storage',
      partialize: (state) => ({
        zoomLevel: state.zoomLevel,
        projectZoomLevels: state.projectZoomLevels,
        projectScrollPositions: state.projectScrollPositions,
      }),
    }
  )
);
```

## Key Components

### timeline-header/

**Responsibility:** Timeline controls and settings interface

**Features:**
- Playback controls (play/pause/skip)
- Zoom controls (in/out/fit)
- Snap toggle
- Time display
- Timeline settings menu

**Component Structure:**

```
timeline-header/
├── index.tsx                    # Main header container
├── playback-controls.tsx        # Play/pause/skip buttons
├── zoom-controls.tsx            # Zoom buttons
├── snap-toggle.tsx              # Snap on/off switch
└── time-display.tsx             # Current time readout
```

**State Dependencies:**
- `useIsPlaying()` - Playback state
- `useCurrentFrame()` - Current time
- `useZoomLevel()` - Zoom level
- `useSnapEnabled()` - Snap state

### timeline-content.tsx

**Responsibility:** Main timeline rendering area

**Features:**
- Renders all tracks
- Manages horizontal scrolling
- Handles timeline-wide interactions
- Virtual scrolling for performance

**Key Interactions:**
- Click on empty space → deselect all
- Drag on empty space → marquee selection
- Scroll horizontally → pan timeline
- Click on track background → select track

**Performance Optimizations:**
- Virtual scrolling for 100+ tracks
- Debounced scroll events
- React.memo for track components
- useMemo for clip position calculations

### timeline-track.tsx

**Responsibility:** Individual track rendering

**Features:**
- Track background
- Clip rendering
- Track selection state
- Track type styling (video/audio/subtitle)

**Visual States:**
- Default
- Selected
- Locked
- Muted

**Props:**

```typescript
interface TimelineTrackProps {
  track: TimelineTrack;
  selected: boolean;
  zoomLevel: number;
  onSelect: () => void;
  onClipDrop: (clip: TimelineClip, position: number) => void;
}
```

### timeline-item/

**Responsibility:** Clip/item rendering with interaction handles

**Component Types:**
- `timeline-clip.tsx` - Video/audio clips
- `timeline-effect.tsx` - Effect overlays
- `timeline-transition.tsx` - Transitions between clips

**Clip Features:**
- Thumbnail preview
- Duration label
- Trim handles (start/end)
- Drag handle
- Selection state
- Waveform (audio clips)

**Interaction States:**
- Idle
- Hovered
- Selected
- Dragging
- Trimming

**Trim Handle Logic:**

```typescript
function handleTrimStart(e: React.MouseEvent) {
  const startX = e.clientX;
  const originalStart = clip.start;

  const handleMouseMove = (e: MouseEvent) => {
    const deltaX = e.clientX - startX;
    const deltaTime = pixelsToTime(deltaX);
    const newStart = Math.max(0, originalStart + deltaTime);

    // Snap to nearest clip edge if snap enabled
    const snapPoint = snapEnabled
      ? findSnapPoint(newStart, track)
      : null;

    updateClip(clip.id, {
      start: snapPoint !== null ? snapPoint : newStart
    });
  };

  const handleMouseUp = () => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}
```

### timeline-markers.tsx

**Responsibility:** Time ruler with frame/second markers

**Features:**
- Dynamic marker density based on zoom
- Frame numbers
- Second markers
- Minute markers
- Current time indicator
- Click to seek

**Marker Calculation Logic:**

```typescript
function calculateMarkers(zoomLevel: number, duration: number, fps: number) {
  const pixelsPerSecond = zoomLevel * BASE_PIXELS_PER_SECOND;

  // Determine marker interval based on zoom level
  let markerInterval: number;

  if (pixelsPerSecond > 200) {
    // High zoom - show frame markers
    markerInterval = 1 / fps; // Every frame
  } else if (pixelsPerSecond > 50) {
    // Medium zoom - show second markers
    markerInterval = 1; // Every second
  } else if (pixelsPerSecond > 10) {
    // Low zoom - show 5-second markers
    markerInterval = 5;
  } else {
    // Very low zoom - show 10-second markers
    markerInterval = 10;
  }

  const markers: Marker[] = [];
  for (let time = 0; time <= duration; time += markerInterval) {
    markers.push({
      time,
      position: timeToPixels(time),
      label: formatTime(time),
      major: time % 10 === 0, // Major marker every 10 units
    });
  }

  return markers;
}
```

### timeline-guidelines.tsx

**Responsibility:** Visual feedback during drag operations

**Features:**
- Snap lines (vertical lines when aligned)
- Drop zone highlights
- Gap indicators
- Collision warnings

**Snap Line Rendering:**

```typescript
function SnapLines({ draggingClip, tracks, snapEnabled }: SnapLinesProps) {
  if (!snapEnabled || !draggingClip) return null;

  const snapTargets = getSnapTargets(draggingClip, tracks);

  return (
    <>
      {snapTargets.map(target => (
        <div
          key={target.id}
          className="snap-line"
          style={{
            position: 'absolute',
            left: `${timeToPixels(target.time)}px`,
            top: 0,
            bottom: 0,
            width: '2px',
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}
```

### timeline-track-handles.tsx

**Responsibility:** Track control handles

**Features:**
- Height resize drag handle
- Reorder drag handle
- Lock/unlock toggle
- Mute/unmute toggle (audio tracks)
- Solo toggle
- Track color picker

**Handle Types:**

```typescript
interface TrackHandlesProps {
  track: TimelineTrack;
  onHeightChange: (height: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleLock: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onColorChange: (color: string) => void;
}
```

## Hooks

### use-timeline-zoom.ts

**Responsibility:** Zoom management and pixel-to-time conversions

**Return Values:**

```typescript
interface TimelineZoom {
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setZoom: (level: number) => void;

  // Derived values
  pixelsPerSecond: number;

  // Conversion utilities
  timeToPixels: (time: number) => number;
  pixelsToTime: (pixels: number) => number;
  frameToPixels: (frame: number) => number;
  pixelsToFrame: (pixels: number) => number;
}
```

**Zoom Constraints:**

```typescript
const MIN_ZOOM = 0.1;   // 10% - Very zoomed out
const MAX_ZOOM = 10;    // 1000% - Very zoomed in
const ZOOM_STEP = 1.2;  // 20% per step
```

**Implementation:**

```typescript
export function useTimelineZoom() {
  const zoomLevel = useTimelineStore(s => s.zoomLevel);
  const setZoom = useTimelineStore(s => s.setZoom);
  const duration = useTimelineStore(s => s.duration);
  const fps = useTimelineStore(s => s.fps);

  const zoomIn = useCallback(() => {
    setZoom(Math.min(MAX_ZOOM, zoomLevel * ZOOM_STEP));
  }, [zoomLevel, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(Math.max(MIN_ZOOM, zoomLevel / ZOOM_STEP));
  }, [zoomLevel, setZoom]);

  const zoomToFit = useCallback(() => {
    const containerWidth = document.querySelector('.timeline-content')?.clientWidth || 1000;
    const targetZoom = containerWidth / (duration * BASE_PIXELS_PER_SECOND);
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom)));
  }, [duration, setZoom]);

  const pixelsPerSecond = useMemo(() =>
    zoomLevel * BASE_PIXELS_PER_SECOND,
    [zoomLevel]
  );

  const timeToPixels = useCallback((time: number) =>
    time * pixelsPerSecond,
    [pixelsPerSecond]
  );

  const pixelsToTime = useCallback((pixels: number) =>
    pixels / pixelsPerSecond,
    [pixelsPerSecond]
  );

  return {
    zoomLevel,
    zoomIn,
    zoomOut,
    zoomToFit,
    setZoom,
    pixelsPerSecond,
    timeToPixels,
    pixelsToTime,
    frameToPixels: (frame: number) => timeToPixels(frame / fps),
    pixelsToFrame: (pixels: number) => Math.round(pixelsToTime(pixels) * fps),
  };
}
```

### use-timeline-tracks.ts

**Responsibility:** Track CRUD operations

**Operations:**
- Add track
- Remove track
- Reorder tracks
- Update track properties
- Duplicate track
- Lock/unlock track

### use-timeline-shortcuts.ts

**Responsibility:** Keyboard command handling

**Keyboard Mappings:**

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `←` / `→` | Previous/Next Frame |
| `Shift + ←` / `→` | Jump 10 Frames |
| `Home` | Jump to Start |
| `End` | Jump to End |
| `I` | Mark In Point |
| `O` | Mark Out Point |
| `Delete` | Delete Selected |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + C` | Copy |
| `Cmd/Ctrl + V` | Paste |
| `Cmd/Ctrl + D` | Duplicate |
| `+` / `-` | Zoom In/Out |

**Implementation Pattern:**

```typescript
export function useTimelineShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { key, metaKey, ctrlKey, shiftKey } = e;
      const cmdOrCtrl = metaKey || ctrlKey;

      if (key === ' ') {
        e.preventDefault();
        handlers.onTogglePlay();
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        handlers.onFrameBack(shiftKey ? 10 : 1);
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        handlers.onFrameForward(shiftKey ? 10 : 1);
      } else if (key === 'Delete' || key === 'Backspace') {
        e.preventDefault();
        handlers.onDelete();
      } else if (cmdOrCtrl && key === 'z' && shiftKey) {
        e.preventDefault();
        handlers.onRedo();
      } else if (cmdOrCtrl && key === 'z') {
        e.preventDefault();
        handlers.onUndo();
      }
      // ... more shortcuts
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
```

### use-timeline-history.ts

**Responsibility:** Undo/redo functionality

**Recommended Approach: Zundo Temporal Middleware**

Use Zundo middleware on the timeline store for automatic history tracking:

```typescript
// stores/timelineStore.ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import { devtools } from 'zustand/middleware';

export const useTimelineStore = create<TimelineState>()(
  devtools(
    temporal(
      (set) => ({
        tracks: [],
        clips: [],

        // All mutations automatically tracked
        addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
        updateClip: (id, updates) => set((state) => ({
          clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c)
        })),
        removeClips: (ids) => set((state) => ({
          clips: state.clips.filter(c => !ids.includes(c.id))
        })),
      }),
      {
        limit: 50,
        partialize: (state) => ({
          tracks: state.tracks,
          clips: state.clips,
          // Exclude UI state from history
        }),
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      }
    ),
    { name: 'TimelineStore' }
  )
);

// Export temporal selectors
export const useUndo = () => useTimelineStore.temporal.getState().undo;
export const useRedo = () => useTimelineStore.temporal.getState().redo;
export const useCanUndo = () =>
  useTimelineStore.temporal((state) => state.pastStates.length > 0);
export const useCanRedo = () =>
  useTimelineStore.temporal((state) => state.futureStates.length > 0);
```

**Hook Wrapper:**

```typescript
// hooks/useTimelineHistory.ts
import { useUndo, useRedo, useCanUndo, useCanRedo } from '@/stores/timelineStore';

export function useTimelineHistory() {
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    clear: useTimelineStore.temporal.getState().clear,
  };
}
```

**Usage in Timeline:**

```typescript
import { useTimelineHistory } from '@/hooks/useTimelineHistory';

function Timeline() {
  const { canUndo, canRedo, undo, redo } = useTimelineHistory();

  return (
    <div className="timeline-header">
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic tracking - no manual `pushAction` calls
- ✅ Type-safe with TypeScript
- ✅ Minimal boilerplate
- ✅ Performance optimized with `partialize`
- ✅ Granular selectors prevent re-renders

**Alternative: Custom Command Pattern**

For advanced requirements (action descriptions, grouping, validation):

**History Stack:**

```typescript
interface TimelineAction {
  type: string;
  timestamp: number;
  undo: () => void;
  redo: () => void;
  payload?: any;
}

interface HistoryState {
  past: TimelineAction[];
  future: TimelineAction[];
}
```

**Action Types:**
- `MOVE_ITEM` - Clip moved
- `RESIZE_ITEM` - Clip trimmed/resized
- `DELETE_ITEMS` - Clips deleted
- `ADD_ITEM` - Clip added
- `ADD_TRACK` - Track added
- `REMOVE_TRACK` - Track removed
- `REORDER_TRACKS` - Tracks reordered

**Usage Pattern:**

```typescript
const { pushAction } = useTimelineHistory();

function moveClip(clipId: string, oldStart: number, newStart: number) {
  // Perform the action
  updateClip(clipId, { start: newStart });

  // Record for undo/redo
  pushAction({
    type: 'MOVE_ITEM',
    timestamp: Date.now(),
    undo: () => updateClip(clipId, { start: oldStart }),
    redo: () => updateClip(clipId, { start: newStart }),
    payload: { clipId, oldStart, newStart },
  });
}
```

**Installation:**
```bash
npm install zundo
```

See `.claude/docs/state-management.md` for comprehensive Zundo configuration and performance patterns.

## Utilities

### gap-utils.ts

**Responsibility:** Gap detection and snap calculations

**Key Functions:**

#### findGaps()

Finds gaps between clips on a track.

```typescript
export function findGaps(track: TimelineTrack): Gap[] {
  const sortedClips = track.clips.sort((a, b) => a.start - b.start);
  const gaps: Gap[] = [];

  for (let i = 0; i < sortedClips.length - 1; i++) {
    const currentClip = sortedClips[i];
    const nextClip = sortedClips[i + 1];

    if (currentClip.end < nextClip.start) {
      gaps.push({
        start: currentClip.end,
        end: nextClip.start,
        duration: nextClip.start - currentClip.end,
      });
    }
  }

  return gaps;
}
```

#### findSnapPoint()

Finds nearest snap point for magnetic alignment.

```typescript
export function findSnapPoint(
  position: number,
  track: TimelineTrack,
  allTracks: TimelineTrack[],
  threshold: number = 5
): number | null {
  const snapTargets: number[] = [];

  // Add clip edges from all tracks
  allTracks.forEach(t => {
    t.clips.forEach(clip => {
      snapTargets.push(clip.start);
      snapTargets.push(clip.end);
    });
  });

  // Add playhead position
  snapTargets.push(currentFrame);

  // Find nearest target within threshold
  let nearestTarget: number | null = null;
  let minDistance = threshold;

  snapTargets.forEach(target => {
    const distance = Math.abs(position - target);
    if (distance < minDistance) {
      nearestTarget = target;
      minDistance = distance;
    }
  });

  return nearestTarget;
}
```

#### calculateRippleDelete()

Calculates clip positions after ripple delete.

```typescript
export function calculateRippleDelete(
  clipId: string,
  track: TimelineTrack
): TimelineClip[] {
  const deletedClip = track.clips.find(c => c.id === clipId);
  if (!deletedClip) return track.clips;

  const gapDuration = deletedClip.end - deletedClip.start;

  return track.clips
    .filter(c => c.id !== clipId)
    .map(clip => {
      // Shift clips after deleted clip
      if (clip.start >= deletedClip.end) {
        return {
          ...clip,
          start: clip.start - gapDuration,
          end: clip.end - gapDuration,
        };
      }
      return clip;
    });
}
```

## Types

### Core Types (types.ts)

```typescript
// Timeline Track
export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle';
  height: number;              // Track height in pixels
  locked: boolean;             // Prevent editing
  muted: boolean;              // Audio tracks only
  solo: boolean;               // Isolate track
  color: string;               // Track color
  order: number;               // Track order index
  clips: TimelineClip[];       // Clips on this track
}

// Timeline Clip
export interface TimelineClip {
  id: string;
  trackId: string;
  start: number;               // Start time (seconds)
  end: number;                 // End time (seconds)
  duration: number;            // Clip duration (seconds)
  offset: number;              // Trim offset from source (seconds)
  label: string;               // Clip label
  color: string;               // Clip color
  mediaId: string;             // Reference to media in MediaLibrary
  type: 'video' | 'audio' | 'image';
  thumbnailUrl?: string;       // Thumbnail preview URL
  waveformData?: number[];     // Audio waveform data
}

/**
 * NOTE: Time Units - Seconds vs Frames
 *
 * The current interface uses SECONDS for all time values (start, end, duration, offset).
 * This is a design decision with trade-offs:
 *
 * **Current Approach (Seconds):**
 * - ✅ Intuitive for users and API consumers
 * - ✅ Works with second-based APIs (some media libraries)
 * - ✅ FPS-independent (changing project FPS doesn't require data migration)
 * - ❌ Floating-point precision issues (5.00000001 vs 5.0)
 * - ❌ Requires conversion to frames for Remotion (see integration.md)
 * - ❌ Extra calculations: `frame = Math.round(seconds * fps)` throughout
 *
 * **Alternative: Frame-Based System:**
 * - ✅ Frame-perfect precision (no floating-point errors)
 * - ✅ Direct compatibility with Remotion (no conversion needed)
 * - ✅ ~30% fewer calculations (eliminates constant fps conversions)
 * - ✅ Industry standard (Premiere, DaVinci, FCP all use frames)
 * - ❌ FPS-dependent (changing FPS requires recalculating all positions)
 * - ❌ Requires frame→time conversion for user-facing displays
 * - ❌ Breaking change for existing projects
 *
 * **Recommendation:**
 * - For NEW projects: Consider frame-based from the start
 * - For EXISTING projects: Stick with seconds unless precision bugs occur
 *
 * **Migration Path:**
 * ```typescript
 * // Convert seconds → frames
 * const frameClip = {
 *   ...clip,
 *   start: Math.round(clip.start * fps),
 *   end: Math.round(clip.end * fps),
 *   duration: Math.round(clip.duration * fps),
 *   offset: Math.round(clip.offset * fps),
 * };
 * ```
 *
 * See `.claude/docs/video-editor/filmstrip-feature.md` for detailed frame-based system impact analysis.
 */

// Gap between clips
export interface Gap {
  start: number;
  end: number;
  duration: number;
}

// Snap target for magnetic snapping
export interface SnapTarget {
  id: string;
  time: number;
  type: 'clip-start' | 'clip-end' | 'playhead' | 'marker';
  label?: string;
}

// Timeline marker
export interface Marker {
  time: number;
  position: number;
  label: string;
  major: boolean;
}

// Timeline action (for undo/redo)
export interface TimelineAction {
  type: string;
  timestamp: number;
  undo: () => void;
  redo: () => void;
  payload?: any;
}
```

## Constants

### Configuration (constants.ts)

```typescript
// Zoom
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;
export const DEFAULT_ZOOM = 1;
export const ZOOM_STEP = 1.2;
export const BASE_PIXELS_PER_SECOND = 100;

// Snap
export const SNAP_THRESHOLD = 5; // pixels
export const DEFAULT_SNAP_ENABLED = true;

// Tracks
export const DEFAULT_TRACK_HEIGHT = 80; // pixels
export const MIN_TRACK_HEIGHT = 40;
export const MAX_TRACK_HEIGHT = 200;

// Timeline
export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION = 60; // seconds

// Colors
export const TRACK_COLORS = {
  video: '#3b82f6',
  audio: '#10b981',
  subtitle: '#f59e0b',
};

// History
export const MAX_HISTORY_SIZE = 50;
```

## Performance Optimization

### Re-render Prevention

**1. Granular Zustand Selectors:**

```typescript
// ✅ Good - Only re-renders when currentFrame changes
const currentFrame = useTimelineStore(s => s.currentFrame);

// ❌ Bad - Re-renders on any state change
const store = useTimelineStore();
```

**2. React.memo for Track Components:**

```typescript
export const TimelineTrack = React.memo(
  ({ track, selected, zoomLevel }: TimelineTrackProps) => {
    // Component implementation...
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if these changed
    return (
      prevProps.track.id === nextProps.track.id &&
      prevProps.selected === nextProps.selected &&
      prevProps.zoomLevel === nextProps.zoomLevel &&
      prevProps.track.clips.length === nextProps.track.clips.length
    );
  }
);
```

**3. useMemo for Expensive Calculations:**

```typescript
const clipPositions = useMemo(() =>
  clips.map(clip => ({
    id: clip.id,
    left: timeToPixels(clip.start),
    width: timeToPixels(clip.end - clip.start),
  })),
  [clips, timeToPixels]
);
```

### Virtual Scrolling

For timelines with 100+ tracks, implement virtual scrolling:

```typescript
function VirtualTrackList({ tracks, trackHeight }: VirtualTrackListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleTracks = useMemo(() => {
    const startIndex = Math.floor(scrollTop / trackHeight);
    const endIndex = Math.ceil((scrollTop + window.innerHeight) / trackHeight);
    return tracks.slice(startIndex, endIndex + 1);
  }, [tracks, scrollTop, trackHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      {visibleTracks.map(track => (
        <TimelineTrack key={track.id} track={track} />
      ))}
    </div>
  );
}
```

### Frame-Based Calculation Performance

Using frame-based time units instead of seconds can improve performance through simpler calculations.

**Performance Comparison:**

| Operation | Seconds-Based | Frame-Based | Improvement |
|-----------|---------------|-------------|-------------|
| **Pixel Positioning** | `clip.start * pixelsPerSecond` | `clip.start * pixelsPerFrame` | Same |
| **Snap Calculation** | `snapPoint * fps` → round → `/fps` | `snapPoint` (direct) | **~30% faster** |
| **Duration Check** | `(clip.end - clip.start) * fps` | `clip.end - clip.start` | **~30% faster** |
| **Remotion Export** | `start * fps`, `duration * fps` | Direct copy | **~50% faster** |
| **Precision** | Floating-point errors | Integer-exact | **Perfect** |

**Seconds-Based Calculation Example:**

```typescript
// Current approach - multiple fps conversions
function moveClipWithSnap(clip: TimelineClip, newStart: number, fps: number) {
  // Convert to frames for snap calculation
  const newStartFrame = Math.round(newStart * fps);        // Conversion 1
  const snapTargetFrame = findNearestFrame(newStartFrame); // Frame-based logic
  const snappedStart = snapTargetFrame / fps;              // Conversion 2

  // Update clip
  updateClip(clip.id, {
    start: snappedStart,
    end: snappedStart + clip.duration,  // Seconds-based arithmetic
  });
}

// Performance: 2 fps conversions + floating-point arithmetic
```

**Frame-Based Calculation Example:**

```typescript
// Frame-based approach - no conversions needed
function moveClipWithSnap(clip: TimelineClip, newStartFrame: number) {
  const snapTargetFrame = findNearestFrame(newStartFrame); // Direct frame usage

  // Update clip
  updateClip(clip.id, {
    start: snapTargetFrame,                         // No conversion!
    end: snapTargetFrame + clip.duration,           // Integer arithmetic
  });
}

// Performance: 0 fps conversions + integer arithmetic (faster & more precise)
```

**Timeline Zoom Performance:**

```typescript
// Seconds-based zoom
const pixelsPerSecond = zoomLevel * BASE_PIXELS_PER_SECOND;
const clipWidth = (clip.end - clip.start) * pixelsPerSecond;  // Floating-point
const clipStart = clip.start * pixelsPerSecond;                // Floating-point

// Frame-based zoom (Alternative)
const pixelsPerFrame = (zoomLevel * BASE_PIXELS_PER_SECOND) / fps;
const clipWidth = clip.duration * pixelsPerFrame;  // Same number of operations
const clipStart = clip.start * pixelsPerFrame;

// Note: Zoom calculations are similar in complexity, but frame-based
// eliminates precision issues with sub-pixel positioning
```

**Gap Calculation Performance:**

```typescript
// Seconds-based
function findGap(clips: TimelineClip[], fps: number) {
  const sorted = clips.sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    const gapDuration = gapEnd - gapStart;

    // Need fps conversion for frame-accurate gap detection
    const gapFrames = Math.round(gapDuration * fps);

    if (gapFrames > 0) {
      return { start: gapStart, end: gapEnd, duration: gapDuration };
    }
  }
}

// Frame-based
function findGap(clips: TimelineClip[]) {
  const sorted = clips.sort((a, b) => a.start - b.start);

  for (let i = 0; i < sorted.length - 1; i++) {
    const gapStart = sorted[i].end;
    const gapEnd = sorted[i + 1].start;
    const gapDuration = gapEnd - gapStart;

    if (gapDuration > 0) {  // Direct integer comparison - no conversion!
      return { start: gapStart, end: gapEnd, duration: gapDuration };
    }
  }
}

// ✅ Eliminates fps parameter and rounding - cleaner API
```

**Measurement Results (Theoretical):**

Based on typical timeline operations:

| Timeline State | Operations/Second | Seconds-Based Overhead | Frame-Based Overhead | Savings |
|----------------|-------------------|------------------------|----------------------|---------|
| **Idle** | ~60 (render loop) | 180 fps conversions | 0 | **100%** |
| **Playback** | ~30 (frame updates) | 90 fps conversions | 0 | **100%** |
| **Dragging Clip** | ~60 (position updates) | 360 fps conversions | 0 | **100%** |
| **Snap Calculation** | ~10 (per drag) | 20-40 conversions | 0 | **100%** |

**When to Use Each:**

**Use Frame-Based for:**
- New projects starting from scratch ✅
- Projects requiring frame-perfect precision (music videos, VFX) ✅
- Heavy Remotion integration ✅
- Performance-critical applications ✅

**Use Seconds-Based for:**
- Existing projects with data ✅
- Projects with variable FPS workflows ✅
- Integration with second-based external APIs ✅
- Simpler mental model for developers ✅

**Hybrid Approach:**

Some projects use a hybrid:
- **Internal storage:** Frames (precise, fast)
- **API/Display:** Seconds (user-friendly)
- **Conversion layer:** Centralized utilities

```typescript
// Utility layer for hybrid approach
export function toSeconds(frames: number, fps: number): number {
  return frames / fps;
}

export function toFrames(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

// Internal operations use frames
const clip = { start: 165, end: 323 }; // Frames

// Display converts to seconds
const displayTime = formatTime(toSeconds(clip.start, 30)); // "00:05.5"
```

See `.claude/docs/video-editor/filmstrip-feature.md` for frame-based system implementation details.

## Integration Points

### With VideoEditor

Timeline integrates with VideoEditor for playback synchronization:

```typescript
// VideoEditor passes playback state to Timeline
<Timeline
  currentFrame={currentFrame}
  isPlaying={isPlaying}
  onFrameChange={(frame) => {
    setCurrentFrame(frame);
    remotionPlayer.seekTo(frame);
  }}
/>
```

### With Remotion Player

Bidirectional sync between Timeline and Remotion Player:

```typescript
// Timeline → Player
const handleTimelineSeek = (frame: number) => {
  setCurrentFrame(frame);
  remotionPlayerRef.current?.seekTo(frame);
};

// Player → Timeline
const handlePlayerTimeUpdate = (frame: number) => {
  setCurrentFrame(frame);
};

<Player
  component={MyComposition}
  ref={remotionPlayerRef}
  inputProps={{ currentFrame }}
  onTimeUpdate={handlePlayerTimeUpdate}
/>
```

### With MediaLibrary

Timeline clips reference media from MediaLibrary:

```typescript
// When adding clip to timeline
const handleAddMedia = async (mediaId: string) => {
  const media = await mediaLibraryService.getMedia(mediaId);

  addClip({
    id: generateId(),
    trackId: selectedTrack,
    start: currentFrame / fps,
    end: currentFrame / fps + media.duration,
    duration: media.duration,
    mediaId: media.id,
    label: media.fileName,
    type: media.type,
    thumbnailUrl: media.thumbnailUrl,
  });
};
```

## Testing Strategies

### Unit Tests

Test individual utilities and hooks:

```typescript
describe('gap-utils', () => {
  it('should find gaps between clips', () => {
    const track = {
      clips: [
        { start: 0, end: 5 },
        { start: 8, end: 12 },
      ],
    };

    const gaps = findGaps(track);

    expect(gaps).toEqual([
      { start: 5, end: 8, duration: 3 },
    ]);
  });

  it('should find snap point within threshold', () => {
    const track = { clips: [{ start: 10, end: 15 }] };

    const snapPoint = findSnapPoint(10.3, track, [], 0.5);

    expect(snapPoint).toBe(10);
  });
});
```

### Integration Tests

Test component interactions:

```typescript
describe('Timeline', () => {
  it('should update playhead on click', () => {
    const { getByTestId } = render(<Timeline />);

    const timeline = getByTestId('timeline-content');
    fireEvent.click(timeline, { clientX: 500 });

    const currentFrame = useTimelineStore.getState().currentFrame;
    expect(currentFrame).toBeGreaterThan(0);
  });
});
```

## Common Patterns

### Adding a Clip

```typescript
function addClipToTimeline(mediaId: string, trackId: string) {
  const media = getMediaById(mediaId);
  const currentFrame = useTimelineStore.getState().currentFrame;
  const fps = useTimelineStore.getState().fps;

  const clip: TimelineClip = {
    id: generateId(),
    trackId,
    start: currentFrame / fps,
    end: currentFrame / fps + media.duration,
    duration: media.duration,
    offset: 0,
    label: media.fileName,
    color: TRACK_COLORS.video,
    mediaId: media.id,
    type: media.type,
  };

  useTimelineStore.getState().addClip(clip);

  // Record for undo
  pushAction({
    type: 'ADD_ITEM',
    undo: () => useTimelineStore.getState().removeClips([clip.id]),
    redo: () => useTimelineStore.getState().addClip(clip),
  });
}
```

### Moving a Clip with Snap

```typescript
function moveClipWithSnap(
  clipId: string,
  newStart: number,
  newTrackId?: string
) {
  const clip = getClipById(clipId);
  const track = getTrackById(newTrackId || clip.trackId);
  const snapEnabled = useTimelineStore.getState().snapEnabled;

  // Find snap point
  const snapPoint = snapEnabled
    ? findSnapPoint(newStart, track, getAllTracks(), SNAP_THRESHOLD)
    : null;

  const finalStart = snapPoint !== null ? snapPoint : newStart;

  // Update clip
  useTimelineStore.getState().updateClip(clipId, {
    start: finalStart,
    end: finalStart + clip.duration,
    trackId: newTrackId || clip.trackId,
  });
}
```

### Ripple Delete

```typescript
function rippleDeleteClip(clipId: string) {
  const clip = getClipById(clipId);
  const track = getTrackById(clip.trackId);

  const updatedClips = calculateRippleDelete(clipId, track);

  useTimelineStore.getState().setClips(updatedClips);

  // Record for undo
  pushAction({
    type: 'DELETE_ITEMS',
    undo: () => {
      useTimelineStore.getState().addClip(clip);
      // Restore original positions...
    },
    redo: () => rippleDeleteClip(clipId),
  });
}
```

## Best Practices

1. **Always use granular selectors** - Prevents unnecessary re-renders
2. **Record all mutations for undo/redo** - Better user experience
3. **Validate clip positions** - Prevent overlaps and negative times
4. **Debounce expensive operations** - Like scroll and resize handlers
5. **Use React.memo judiciously** - Only for expensive components
6. **Keep store actions pure** - No side effects in state updates
7. **Normalize clip data** - Store clips separately from tracks for flexibility
8. **Implement virtual scrolling** - For large track counts (100+)
9. **Cache computed values** - Use useMemo for derived data
10. **Test edge cases** - Empty tracks, single frames, zero duration clips
