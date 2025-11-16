## Usage Examples

### Timeline Component

The Timeline is a drop-in component for multi-track video editing with drag-and-drop, magnetic snapping, and keyboard shortcuts.

```tsx
import React from 'react';
import Timeline from '@/components/editor/components/advanced-timeline/timeline';
import { TimelineTrack } from '@/components/editor/components/advanced-timeline/types';

const VideoEditor = () => {
  const [tracks, setTracks] = React.useState<TimelineTrack[]>([
    {
      id: 'track-1',
      name: 'Video Track',
      items: [
        {
          id: 'item-1',
          trackId: 'track-1',
          start: 0,
          end: 10,
          type: 'video',
          label: 'Video Clip 1',
          color: '#3b82f6'
        }
      ]
    }
  ]);

  const [currentFrame, setCurrentFrame] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

  return (
    <Timeline
      tracks={tracks}
      totalDuration={30}
      currentFrame={currentFrame}
      fps={30}
      onFrameChange={setCurrentFrame}
      onTracksChange={setTracks}
      selectedItemIds={selectedItems}
      onSelectedItemsChange={setSelectedItems}
      isPlaying={isPlaying}
      onPlay={() => setIsPlaying(true)}
      onPause={() => setIsPlaying(false)}
      showPlaybackControls={true}
      showZoomControls={true}
      showTimelineGuidelines={true}
      enableTrackDrag={true}
      enableMagneticTrack={true}
      onItemMove={(itemId, newStart, newEnd, newTrackId) => {
        console.log('Item moved:', { itemId, newStart, newEnd, newTrackId });
      }}
      onItemResize={(itemId, newStart, newEnd) => {
        console.log('Item resized:', { itemId, newStart, newEnd });
      }}
      onDeleteItems={(itemIds) => {
        console.log('Delete items:', itemIds);
      }}
    />
  );
};
```

### VideoEditor Component (Client-Side Rendering)

The VideoEditor provides a complete editor shell with Remotion player, sidebar, timeline, autosave, and theming. This example uses **client-side rendering** with `@remotion/player` and `@remotion/renderer`.

```tsx
import React from 'react';
import { Player } from '@remotion/player';
import { VideoEditor } from '@/app/videoeditor/pro/components/video-editor';
import { useEditorStore } from '@/stores/editorStore';

export default function VideoEditorPage() {
  // Zustand store for editor state
  const { composition, updateComposition } = useEditorStore();

  return (
    <div className="w-full h-screen">
      <VideoEditor
        projectId="MyComposition"
        fps={30}
        videoWidth={1280}
        videoHeight={720}
        showSidebar={true}
        autoSaveInterval={10000}
        onSaving={(saving) => {
          console.log('Saving:', saving);
        }}
        onSaved={(timestamp) => {
          // Save to localStorage for client-side persistence
          localStorage.setItem('project-autosave', JSON.stringify({
            timestamp,
            composition,
          }));
          console.log('Saved at:', timestamp);
        }}
        initialRows={5}
        maxRows={8}
        enablePushOnDrag={false}
      />
    </div>
  );
}
```

### Zustand Store Example (v5)

Example of a Zustand v5 store for editor state with re-render optimization:

```tsx
// stores/editorStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface EditorState {
  // Timeline state
  tracks: TimelineTrack[];
  clips: Clip[];

  // Playback state
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;

  // Selection state
  selectedClipIds: string[];
  selectedTrackId: string | null;

  // Project state
  projectId: string;
  fps: number;
  duration: number;

  // Actions
  setTracks: (tracks: TimelineTrack[]) => void;
  addClip: (clip: Clip) => void;
  removeClip: (clipId: string) => void;
  setCurrentFrame: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  selectClip: (clipId: string) => void;
  deselectAll: () => void;
}

export const useEditorStore = create<EditorState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        tracks: [],
        clips: [],
        currentFrame: 0,
        isPlaying: false,
        playbackRate: 1,
        selectedClipIds: [],
        selectedTrackId: null,
        projectId: '',
        fps: 30,
        duration: 0,

        // Actions
        setTracks: (tracks) => set({ tracks }),
        addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
        removeClip: (clipId) => set((state) => ({
          clips: state.clips.filter(c => c.id !== clipId),
        })),
        setCurrentFrame: (frame) => set({ currentFrame: frame }),
        setIsPlaying: (playing) => set({ isPlaying: playing }),
        selectClip: (clipId) => set({ selectedClipIds: [clipId] }),
        deselectAll: () => set({ selectedClipIds: [] }),
      }),
      {
        name: 'editor-storage',
        partialize: (state) => ({
          // Only persist these fields
          tracks: state.tracks,
          clips: state.clips,
          projectId: state.projectId,
        }),
      }
    )
  )
);

// Optimized selectors to prevent re-renders
export const useCurrentFrame = () => useEditorStore((state) => state.currentFrame);
export const useIsPlaying = () => useEditorStore((state) => state.isPlaying);
export const useSelectedClips = () => useEditorStore((state) => state.selectedClipIds);
export const useTracks = () => useEditorStore((state) => state.tracks);
```

## Component API Reference

### Timeline Props

#### Data Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tracks` | `TimelineTrack[]` | Required | Array of timeline tracks containing items |
| `totalDuration` | `number` | Required | Total timeline duration in seconds |
| `currentFrame` | `number` | `0` | Current playhead position frame |
| `fps` | `number` | `30` | Frames per second for calculations |

#### Event Handlers
| Prop | Type | Description |
|------|------|-------------|
| `onFrameChange` | `(frame: number) => void` | Playhead position changes |
| `onItemMove` | `(itemId, newStart, newEnd, newTrackId) => void` | Item moved between tracks/positions |
| `onItemResize` | `(itemId, newStart, newEnd) => void` | Item duration modified |
| `onItemSelect` | `(itemId: string) => void` | Item selection change |
| `onDeleteItems` | `(itemIds: string[]) => void` | Items removed |
| `onDuplicateItems` | `(itemIds: string[]) => void` | Items duplicated |
| `onSplitItems` | `(itemId, splitTime) => void` | Item split at time |
| `onTracksChange` | `(tracks: TimelineTrack[]) => void` | Track structure modified |

#### UI Control Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showZoomControls` | `boolean` | `false` | Display zoom buttons |
| `showPlaybackControls` | `boolean` | `false` | Display play/pause controls |
| `showTimelineGuidelines` | `boolean` | `true` | Show alignment helpers |
| `enableTrackDrag` | `boolean` | `true` | Allow dragging between tracks |
| `enableMagneticTrack` | `boolean` | `true` | Enable magnetic snapping |

#### Playback Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isPlaying` | `boolean` | `false` | Current playback state |
| `onPlay` | `() => void` | — | Play triggered |
| `onPause` | `() => void` | — | Pause triggered |
| `playbackRate` | `number` | `1` | Playback speed multiplier |

### Timeline Internal Components

The Timeline component is modular with specialized sub-components for different responsibilities.

#### timeline-header/

Header component containing timeline controls and settings.

**Location:** `components/Timeline/components/timeline-header/`

**Features:**
- Playback controls (play, pause, skip forward/backward)
- Zoom controls (zoom in, zoom out, zoom to fit)
- Snap settings toggle (magnetic snapping on/off)
- Timeline settings menu
- Current time display

**Usage:**
```tsx
import { TimelineHeader } from '@/components/Timeline/components/timeline-header';

<TimelineHeader
  isPlaying={isPlaying}
  onPlay={handlePlay}
  onPause={handlePause}
  zoomLevel={zoomLevel}
  onZoomIn={handleZoomIn}
  onZoomOut={handleZoomOut}
  snapEnabled={snapEnabled}
  onToggleSnap={toggleSnap}
/>
```

#### timeline-content.tsx

Main timeline rendering area that displays all tracks, clips, and the playhead scrubber.

**Location:** `components/Timeline/components/timeline-content.tsx`

**Responsibilities:**
- Renders all timeline tracks
- Manages horizontal scrolling for large timelines
- Handles timeline-wide mouse events (clicks, drag selection)
- Coordinates with playhead for scrubbing
- Manages virtual scrolling for performance with many tracks

**Usage:**
```tsx
import { TimelineContent } from '@/components/Timeline/components/timeline-content';

<TimelineContent
  tracks={tracks}
  currentFrame={currentFrame}
  duration={totalDuration}
  fps={fps}
  zoomLevel={zoomLevel}
  onFrameChange={handleFrameChange}
/>
```

#### timeline-track.tsx

Individual track component that renders a single timeline track with its clips.

**Location:** `components/Timeline/components/timeline-track.tsx`

**Responsibilities:**
- Renders track background and boundaries
- Displays all items/clips within the track
- Handles track-level interactions (click to select, drag to reorder)
- Manages track height and visual styling
- Distinguishes track types (video, audio, subtitle)

**Props:**
- `track: TimelineTrack` - Track data with items
- `selected: boolean` - Whether track is selected
- `zoomLevel: number` - Current zoom for proper clip positioning
- `onSelect: () => void` - Track selection handler
- `onItemDrop: (item, position) => void` - Handle item drops

#### timeline-item/

Components for rendering timeline items (clips, effects, transitions).

**Location:** `components/Timeline/components/timeline-item/`

**Includes:**
- `timeline-clip.tsx` - Video/audio clip rendering
- `timeline-effect.tsx` - Effect overlay indicators
- `timeline-transition.tsx` - Transition between clips

**Features:**
- Clip thumbnail previews
- Trim handles (start and end)
- Duration display
- Visual effects indicators
- Drag handles for repositioning
- Resize handles for duration adjustment

**Usage:**
```tsx
import { TimelineClip } from '@/components/Timeline/components/timeline-item';

<TimelineClip
  clip={clip}
  zoomLevel={zoomLevel}
  selected={isSelected}
  onSelect={handleSelect}
  onMove={handleMove}
  onResize={handleResize}
  onTrim={handleTrim}
/>
```

#### timeline-markers.tsx

Time ruler component showing frame numbers, seconds, and time markers.

**Location:** `components/Timeline/components/timeline-markers.tsx`

**Features:**
- Dynamic marker intervals based on zoom level
- Frame number display
- Second/minute markers
- Current time indicator
- Click to seek functionality

**Rendering Logic:**
- Adjusts marker density based on zoom (more markers when zoomed in)
- Shows frames at high zoom, seconds at medium zoom, minutes at low zoom
- Highlights important intervals (every 5s, 10s, etc.)

#### timeline-guidelines.tsx

Visual drag-and-drop feedback with snap indicators and drop zones.

**Location:** `components/Timeline/components/timeline-guidelines.tsx`

**Features:**
- Snap lines when clips align
- Drop zone highlights
- Magnetic snap indicators
- Gap detection visuals
- Collision warnings

**Snap Behavior:**
- Shows vertical line when clip edge aligns with another clip
- Highlights gaps that match clip duration
- Indicates playhead snap position
- Visual feedback for track boundaries

#### timeline-track-handles.tsx

Track control handles for resizing, reordering, and track settings.

**Location:** `components/Timeline/components/timeline-track-handles.tsx`

**Controls:**
- **Height resize** - Drag to adjust track height
- **Reorder handle** - Drag to change track order
- **Lock/unlock** - Prevent accidental edits
- **Mute/unmute** - Audio control (for audio tracks)
- **Solo** - Isolate single track
- **Track color picker** - Visual organization

**Usage:**
```tsx
import { TrackHandles } from '@/components/Timeline/components/timeline-track-handles';

<TrackHandles
  track={track}
  onHeightChange={handleHeightChange}
  onReorder={handleReorder}
  onToggleLock={toggleLock}
  onToggleMute={toggleMute}
/>
```

### Timeline Hooks

Specialized hooks for Timeline functionality.

#### use-timeline-zoom.ts

Manages timeline zoom level and pixel-to-time conversions.

**Location:** `components/Timeline/hooks/use-timeline-zoom.ts`

**Returns:**
```typescript
{
  zoomLevel: number;              // Current zoom level (0.1 to 10)
  zoomIn: () => void;             // Zoom in one step
  zoomOut: () => void;            // Zoom out one step
  zoomToFit: () => void;          // Fit entire timeline in view
  setZoom: (level: number) => void; // Set specific zoom level
  pixelsPerSecond: number;        // Derived: pixels per second at current zoom
  timeToPixels: (time: number) => number;  // Convert time to pixel position
  pixelsToTime: (pixels: number) => number; // Convert pixel position to time
}
```

**Usage:**
```tsx
import { useTimelineZoom } from '@/components/Timeline/hooks/use-timeline-zoom';

function TimelineControls() {
  const { zoomLevel, zoomIn, zoomOut, zoomToFit } = useTimelineZoom();

  return (
    <div>
      <button onClick={zoomIn}>Zoom In</button>
      <button onClick={zoomOut}>Zoom Out</button>
      <button onClick={zoomToFit}>Fit</button>
      <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
    </div>
  );
}
```

#### use-timeline-tracks.ts

Track management (add, remove, reorder, resize).

**Location:** `components/Timeline/hooks/use-timeline-tracks.ts`

**Returns:**
```typescript
{
  tracks: TimelineTrack[];
  addTrack: (type: 'video' | 'audio' | 'subtitle') => void;
  removeTrack: (trackId: string) => void;
  reorderTrack: (trackId: string, newIndex: number) => void;
  updateTrackHeight: (trackId: string, height: number) => void;
  duplicateTrack: (trackId: string) => void;
  lockTrack: (trackId: string) => void;
  unlockTrack: (trackId: string) => void;
}
```

**Usage:**
```tsx
import { useTimelineTracks } from '@/components/Timeline/hooks/use-timeline-tracks';

function TrackManager() {
  const { tracks, addTrack, removeTrack } = useTimelineTracks();

  return (
    <div>
      <button onClick={() => addTrack('video')}>Add Video Track</button>
      {tracks.map(track => (
        <div key={track.id}>
          {track.name}
          <button onClick={() => removeTrack(track.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}
```

#### use-timeline-shortcuts.ts

Keyboard shortcut handling for timeline operations.

**Location:** `components/Timeline/hooks/use-timeline-shortcuts.ts`

**Keyboard Mappings:**
- `Space` - Play/pause
- `Arrow Left/Right` - Frame by frame navigation
- `Shift + Arrow Left/Right` - Jump 10 frames
- `Home/End` - Jump to start/end
- `I` - Mark in point
- `O` - Mark out point
- `Delete/Backspace` - Delete selected items
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Cmd/Ctrl + C` - Copy
- `Cmd/Ctrl + V` - Paste
- `Cmd/Ctrl + D` - Duplicate

**Usage:**
```tsx
import { useTimelineShortcuts } from '@/components/Timeline/hooks/use-timeline-shortcuts';

function Timeline() {
  useTimelineShortcuts({
    onPlay: handlePlay,
    onPause: handlePause,
    onFrameBack: () => setFrame(f => f - 1),
    onFrameForward: () => setFrame(f => f + 1),
    onDelete: handleDelete,
    onUndo: handleUndo,
    onRedo: handleRedo,
  });

  // Timeline renders...
}
```

#### use-timeline-history.ts

Undo/redo management for timeline operations. **Recommended approach: Use Zundo temporal middleware** (see below) for automatic state tracking. Alternatively, use a custom command pattern hook for advanced requirements.

**Location:** `components/Timeline/hooks/use-timeline-history.ts`

##### Approach 1: Zundo Temporal Middleware (Recommended)

Use Zundo middleware on the timeline store for automatic undo/redo with minimal code:

**Store Setup:**
```tsx
// stores/timelineStore.ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import { devtools } from 'zustand/middleware';

interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  zoomLevel: number; // UI state
  // ... actions
}

export const useTimelineStore = create<TimelineState>()(
  devtools(
    temporal(
      (set) => ({
        tracks: [],
        clips: [],
        zoomLevel: 1,

        // All mutations are automatically tracked
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
          // Only track these fields
          tracks: state.tracks,
          clips: state.clips,
          // Exclude UI state like zoomLevel
        }),
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      }
    ),
    { name: 'TimelineStore' }
  )
);

// Export selector hooks for undo/redo
export const useUndo = () => useTimelineStore.temporal.getState().undo;
export const useRedo = () => useTimelineStore.temporal.getState().redo;
export const useCanUndo = () =>
  useTimelineStore.temporal((state) => state.pastStates.length > 0);
export const useCanRedo = () =>
  useTimelineStore.temporal((state) => state.futureStates.length > 0);
```

**Hook Wrapper (Optional):**
```tsx
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

**Timeline Component Integration:**
```tsx
import { useTimelineHistory } from '@/hooks/useTimelineHistory';
import { useTimelineShortcuts } from './hooks/use-timeline-shortcuts';

function Timeline(props: TimelineProps) {
  const { canUndo, canRedo, undo, redo } = useTimelineHistory();

  // Connect to keyboard shortcuts
  useTimelineShortcuts({
    onUndo: undo,
    onRedo: redo,
    // ... other handlers
  });

  return (
    <div className="timeline">
      <div className="timeline-header">
        <button onClick={undo} disabled={!canUndo} title="Undo (Cmd+Z)">
          Undo
        </button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
          Redo
        </button>
      </div>
      {/* Timeline content */}
    </div>
  );
}
```

**Benefits:**
- ✅ Automatic tracking - no manual `pushAction` calls needed
- ✅ Type-safe with TypeScript
- ✅ Minimal boilerplate
- ✅ Performance optimized with `partialize`
- ✅ DevTools integration for debugging
- ✅ Granular selectors prevent unnecessary re-renders

##### Approach 2: Custom Command Pattern (Advanced)

For advanced requirements like custom action descriptions or action grouping:

**Returns:**
```typescript
{
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  pushAction: (action: TimelineAction) => void;
  clearHistory: () => void;
  historySize: number;
}
```

**Tracked Actions:**
- Item move
- Item resize/trim
- Item delete
- Track add/remove
- Track reorder
- Batch operations

**Usage:**
```tsx
import { useTimelineHistory } from '@/components/Timeline/hooks/use-timeline-history';

function TimelineEditor() {
  const { canUndo, canRedo, undo, redo, pushAction } = useTimelineHistory();

  const handleMoveItem = (itemId: string, oldPosition: number, newPosition: number) => {
    // Perform the move
    moveItem(itemId, newPosition);

    // Record for undo
    pushAction({
      type: 'MOVE_ITEM',
      timestamp: Date.now(),
      payload: { itemId, oldPosition, newPosition },
      undo: () => moveItem(itemId, oldPosition),
      redo: () => moveItem(itemId, newPosition),
    });
  };

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

**When to use:**
- Need custom action descriptions for display
- Need to group multiple operations into one undo step
- Need action-specific validation
- Need fine-grained control over history management

**Installation (Zundo):**
```bash
npm install zundo
```

See `.claude/docs/state-management.md` for detailed Zundo configuration and optimization patterns.

### Timeline Stores & Utils

#### use-timeline-store.ts

Main Timeline state management with Zustand.

**Location:** `components/Timeline/stores/use-timeline-store.ts`

**State:**
```typescript
interface TimelineState {
  // Data
  tracks: TimelineTrack[];
  clips: TimelineClip[];

  // Playback
  currentFrame: number;
  isPlaying: boolean;
  fps: number;

  // UI State
  zoomLevel: number;
  scrollPosition: number;
  snapEnabled: boolean;

  // Selection
  selectedItemIds: string[];
  selectedTrackId: string | null;

  // Actions
  setTracks: (tracks: TimelineTrack[]) => void;
  addClip: (clip: TimelineClip) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClips: (ids: string[]) => void;
  setCurrentFrame: (frame: number) => void;
  setZoom: (level: number) => void;
  toggleSnap: () => void;
  selectItems: (ids: string[]) => void;
}
```

**Granular Selectors:**
```tsx
// ✅ Good: Subscribe to specific values
const currentFrame = useTimelineStore(s => s.currentFrame);
const zoomLevel = useTimelineStore(s => s.zoomLevel);

// ❌ Bad: Subscribe to entire store (causes unnecessary re-renders)
const store = useTimelineStore();
```

#### use-zoom-store.ts

Persists zoom level and scroll position across sessions.

**Location:** `components/Timeline/stores/use-zoom-store.ts`

**Features:**
- Saves zoom level to localStorage
- Restores scroll position when reopening project
- Per-project zoom preferences
- Remembers last zoom setting globally

**State:**
```typescript
interface ZoomState {
  zoomLevel: number;
  scrollPosition: number;
  projectZoomLevels: Record<string, number>; // Per-project preferences

  setZoomLevel: (level: number) => void;
  setScrollPosition: (position: number) => void;
  saveProjectZoom: (projectId: string, level: number) => void;
  getProjectZoom: (projectId: string) => number;
}
```

#### gap-utils.ts

Utilities for gap detection and magnetic snapping calculations.

**Location:** `components/Timeline/utils/gap-utils.ts`

**Functions:**

```typescript
// Find gaps between clips on a track
export function findGaps(track: TimelineTrack): Gap[] {
  // Returns array of { start, end, duration } for each gap
}

// Check if a clip position would create a gap
export function wouldCreateGap(
  clip: TimelineClip,
  newPosition: number,
  track: TimelineTrack
): boolean {
  // Returns true if moving clip would leave a gap
}

// Find nearest snap point for magnetic snapping
export function findSnapPoint(
  position: number,
  track: TimelineTrack,
  threshold: number = 5 // pixels
): number | null {
  // Returns nearest clip edge within threshold, or null
}

// Calculate ripple delete effect
export function calculateRippleDelete(
  clipId: string,
  track: TimelineTrack
): TimelineClip[] {
  // Returns updated clips with gap closed after deletion
}

// Magnetic snap alignment
export function getSnapTargets(
  draggingClip: TimelineClip,
  tracks: TimelineTrack[],
  currentTrack: TimelineTrack
): SnapTarget[] {
  // Returns all potential snap points (clip edges, playhead, markers)
}
```

**Usage:**
```tsx
import { findSnapPoint, calculateRippleDelete } from '@/components/Timeline/utils/gap-utils';

function handleClipDrag(clip: TimelineClip, newPosition: number) {
  const track = getTrackById(clip.trackId);

  // Check for magnetic snap
  const snapPoint = findSnapPoint(newPosition, track, SNAP_THRESHOLD);
  const finalPosition = snapEnabled && snapPoint !== null ? snapPoint : newPosition;

  // Update clip position
  updateClipPosition(clip.id, finalPosition);
}

function handleClipDelete(clipId: string) {
  const track = getTrackById(clip.trackId);

  // Calculate ripple effect
  const updatedClips = calculateRippleDelete(clipId, track);

  // Apply changes
  setClips(updatedClips);
}
```

### VideoEditor Props

#### Core Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `projectId` | `string` | Yes | Composition/session ID for renders and state |
| `renderer` | `VideoRenderer` | No | Optional backend renderer (not needed for client-side rendering) |
| `fps` | `number` | No | Frames per second (default: 30) |

#### Layout Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoWidth` | `number` | `1280` | Output width |
| `videoHeight` | `number` | `720` | Output height |
| `showSidebar` | `boolean` | `true` | Toggle default sidebar |
| `isPlayerOnly` | `boolean` | `false` | Fullscreen player without editor UI |

#### Autosave Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `autoSaveInterval` | `number` | `10000` | Interval in milliseconds |
| `onSaving` | `(saving: boolean) => void` | — | Called when autosave toggles |
| `onSaved` | `(timestamp: number) => void` | — | Called after save completes |
| `showAutosaveStatus` | `boolean` | `true` | Show autosave indicator |

#### Timeline Configuration
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialRows` | `number` | `5` | Initial timeline rows |
| `maxRows` | `number` | `8` | Maximum rows |
| `enablePushOnDrag` | `boolean` | `false` | Push-on-drag timeline behavior |

#### Media Adaptors
| Prop | Type | Description |
|------|------|-------------|
| `adaptors` | `MediaAdaptors` | Pluggable content sources for video, images, audio, etc. |

