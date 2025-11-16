## Zustand Best Practices & Re-Render Optimization (v5)

> **Note**: All examples below are compatible with Zustand v5.0.8 and follow v5 best practices. See the [Migration Notes](#zustand-v5-migration-notes) section for v4 to v5 changes.

### Understanding Re-Renders in Zustand

Zustand components re-render when selected state changes. **The key to performance is selecting only what you need.**

#### Anti-Pattern: Selecting Entire State
```tsx
// ❌ BAD - Component re-renders on ANY state change
function VideoPlayer() {
  const store = useEditorStore(); // Selects everything!
  return <Player currentFrame={store.currentFrame} />;
}
```

#### Best Practice: Granular Selectors
```tsx
// ✅ GOOD - Only re-renders when currentFrame changes
function VideoPlayer() {
  const currentFrame = useEditorStore((state) => state.currentFrame);
  return <Player currentFrame={currentFrame} />;
}
```

### Selector Patterns

#### 1. **Single Primitive Value**
```tsx
const currentFrame = usePlaybackStore((state) => state.currentFrame);
const isPlaying = usePlaybackStore((state) => state.isPlaying);
```

#### 2. **Multiple Primitives with Shallow Equality (v5)**
```tsx
import { useShallow } from 'zustand/react/shallow';

// Re-renders only when width, height, or fps changes
const { width, height, fps } = useEditorStore(
  useShallow((state) => ({
    width: state.videoWidth,
    height: state.videoHeight,
    fps: state.fps,
  }))
);
```

**Alternative (backward compatible):**
```tsx
import { shallow } from 'zustand/shallow';

const { width, height, fps } = useEditorStore(
  (state) => ({ width: state.videoWidth, height: state.videoHeight, fps: state.fps }),
  shallow
);
```

#### 3. **Derived Values**
```tsx
// Compute derived values in selector to avoid extra re-renders
const totalDuration = useTimelineStore((state) =>
  Math.max(...state.clips.map(clip => clip.end))
);
```

#### 4. **Array/Object Selection with Custom Equality**
```tsx
// For selecting arrays or objects, use custom equality
const selectedClips = useTimelineStore(
  (state) => state.clips.filter(c => state.selectedClipIds.includes(c.id)),
  (prev, next) => prev.length === next.length && prev.every((p, i) => p.id === next[i].id)
);
```

### Custom Selector Hooks Pattern

Export reusable selector hooks to keep components clean:

```tsx
// stores/playbackStore.ts
export const usePlaybackStore = create<PlaybackState>()(...);

// Exported selectors
export const useCurrentFrame = () => usePlaybackStore((s) => s.currentFrame);
export const useIsPlaying = () => usePlaybackStore((s) => s.isPlaying);
export const useFPS = () => usePlaybackStore((s) => s.fps);
export const usePlaybackRate = () => usePlaybackStore((s) => s.playbackRate);

// Usage in components
function Timeline() {
  const currentFrame = useCurrentFrame(); // Clean and simple
  const isPlaying = useIsPlaying();
  // ...
}
```

### Store Slicing Pattern

Organize large stores into logical slices:

```tsx
// stores/editorStore.ts
import { create } from 'zustand';

// Slice creators
const createTimelineSlice = (set) => ({
  tracks: [],
  clips: [],
  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  removeClip: (id) => set((state) => ({ clips: state.clips.filter(c => c.id !== id) })),
});

const createPlaybackSlice = (set) => ({
  currentFrame: 0,
  isPlaying: false,
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
});

const createSelectionSlice = (set) => ({
  selectedClipIds: [],
  selectClip: (id) => set({ selectedClipIds: [id] }),
  deselectAll: () => set({ selectedClipIds: [] }),
});

// Combined store
export const useEditorStore = create((set, get) => ({
  ...createTimelineSlice(set, get),
  ...createPlaybackSlice(set, get),
  ...createSelectionSlice(set, get),
}));
```

### Middleware Composition

Combine multiple middleware for powerful features:

```tsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export const useTimelineStore = create<TimelineState>()(
  devtools(
    persist(
      immer((set) => ({
        clips: [],
        // With immer, you can mutate state directly
        addClip: (clip) => set((state) => {
          state.clips.push(clip); // Direct mutation, immer handles immutability
        }),
      })),
      {
        name: 'timeline-storage',
        partialize: (state) => ({ clips: state.clips, tracks: state.tracks }),
      }
    ),
    { name: 'TimelineStore' }
  )
);
```

### Undo/Redo with Zundo Middleware

For undo/redo functionality, use the **Zundo** temporal middleware. This provides automatic state history tracking with minimal boilerplate.

**Installation:**
```bash
npm install zundo
```

#### Basic Setup

Wrap your store with `temporal` middleware to enable automatic history tracking:

```tsx
import { create } from 'zustand';
import { temporal } from 'zundo';
import { devtools } from 'zustand/middleware';

interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
  addClip: (clip: TimelineClip) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClips: (ids: string[]) => void;
  moveClip: (id: string, newStart: number, newTrackId?: string) => void;
}

export const useTimelineStore = create<TimelineState>()(
  devtools(
    temporal(
      (set) => ({
        tracks: [],
        clips: [],

        addClip: (clip) => set((state) => ({
          clips: [...state.clips, clip],
        })),

        updateClip: (id, updates) => set((state) => ({
          clips: state.clips.map(c => c.id === id ? { ...c, ...updates } : c),
        })),

        removeClips: (ids) => set((state) => ({
          clips: state.clips.filter(c => !ids.includes(c.id)),
        })),

        moveClip: (id, newStart, newTrackId) => set((state) => ({
          clips: state.clips.map(c =>
            c.id === id
              ? { ...c, start: newStart, trackId: newTrackId || c.trackId }
              : c
          ),
        })),
      }),
      {
        limit: 50, // Keep last 50 states in history
        equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      }
    ),
    { name: 'TimelineStore' }
  )
);
```

#### Accessing Temporal State

Export selector hooks for undo/redo functionality:

```tsx
// Undo/redo actions
export const useUndo = () => useTimelineStore.temporal.getState().undo;
export const useRedo = () => useTimelineStore.temporal.getState().redo;
export const useClear = () => useTimelineStore.temporal.getState().clear;

// Undo/redo state (use granular selectors to prevent re-renders)
export const useCanUndo = () =>
  useTimelineStore.temporal((state) => state.pastStates.length > 0);

export const useCanRedo = () =>
  useTimelineStore.temporal((state) => state.futureStates.length > 0);

// Optional: History size
export const useHistorySize = () =>
  useTimelineStore.temporal((state) => ({
    past: state.pastStates.length,
    future: state.futureStates.length,
  }));
```

#### Component Usage

```tsx
import { useTimelineStore, useCanUndo, useCanRedo, useUndo, useRedo } from '@/stores/timelineStore';

function TimelineHeader() {
  // ✅ Granular selectors - only re-render when undo/redo state changes
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useUndo();
  const redo = useRedo();

  return (
    <div className="timeline-header">
      <button onClick={undo} disabled={!canUndo}>
        Undo (Cmd+Z)
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo (Cmd+Shift+Z)
      </button>
    </div>
  );
}
```

#### Advanced Configuration

**Partialize - Exclude UI State from History:**

Only track specific fields in history to improve performance and avoid tracking UI-only state:

```tsx
export const useTimelineStore = create<TimelineState>()(
  temporal(
    (set) => ({
      // State and actions...
      tracks: [],
      clips: [],
      zoomLevel: 1,        // UI state - don't track
      scrollPosition: 0,   // UI state - don't track
    }),
    {
      limit: 50,
      partialize: (state) => ({
        // Only these fields are tracked in history
        tracks: state.tracks,
        clips: state.clips,
        // zoomLevel and scrollPosition are excluded
      }),
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }
  )
);
```

**Custom Equality Function:**

Improve performance by using shallow equality for specific cases:

```tsx
import { shallow } from 'zustand/shallow';

temporal(
  (set) => ({ /* state */ }),
  {
    limit: 50,
    partialize: (state) => ({ tracks: state.tracks, clips: state.clips }),
    equality: (a, b) => {
      // Custom comparison logic
      return (
        a.tracks.length === b.tracks.length &&
        a.clips.length === b.clips.length &&
        shallow(a.tracks, b.tracks) &&
        shallow(a.clips, b.clips)
      );
    },
  }
)
```

**Diff-Only Mode (for large states):**

Store only diffs between states instead of full snapshots:

```tsx
import { temporal } from 'zundo';

temporal(
  (set) => ({ /* state */ }),
  {
    limit: 100, // Can keep more states with diffs
    partialize: (state) => ({ tracks: state.tracks, clips: state.clips }),
    equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    handleSet: (handleSet) =>
      throttle((state) => {
        handleSet(state);
      }, 500), // Throttle history snapshots to 500ms
  }
)
```

#### Integration with Keyboard Shortcuts

```tsx
// hooks/useTimelineShortcuts.ts
import { useEffect } from 'react';
import { useUndo, useRedo } from '@/stores/timelineStore';

export function useTimelineShortcuts() {
  const undo = useUndo();
  const redo = useRedo();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (cmdOrCtrl && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      } else if (cmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
```

#### Re-render Optimization

**✅ Best Practice - Use Granular Selectors:**

```tsx
// Good - Only re-renders when canUndo changes
const canUndo = useCanUndo();

// Good - Only re-renders when canRedo changes
const canRedo = useCanRedo();

// ❌ Bad - Re-renders on any temporal state change
const temporalState = useTimelineStore.temporal();
```

**✅ Separate Read and Write:**

```tsx
// Read-only - causes re-renders
const canUndo = useCanUndo();

// Write-only - never causes re-renders
const undo = useUndo();
const redo = useRedo();
```

#### Debugging

Use Zustand DevTools to visualize history:

```tsx
export const useTimelineStore = create<TimelineState>()(
  devtools(
    temporal(/* ... */),
    { name: 'TimelineStore' }
  )
);

// Install Redux DevTools extension to see:
// - Current state
// - Past states
// - Future states
// - Undo/redo actions
```

#### Performance Tips

1. **Use `partialize`** - Only track essential state, exclude UI state
2. **Limit history size** - 50 states is usually sufficient
3. **Throttle snapshots** - For real-time updates (e.g., dragging), throttle history snapshots
4. **Custom equality** - Use shallow equality for large arrays/objects
5. **Granular selectors** - Prevent unnecessary re-renders with specific selectors

#### When to Use Temporal Middleware

| ✅ Use Temporal | ❌ Don't Use |
|----------------|--------------|
| Timeline editing (clips, tracks) | Playback frame updates |
| Project-level changes | Zoom level changes |
| User-initiated actions | Scroll position |
| Data mutations | Read-only derived state |

#### Alternative: Custom Command Pattern

For advanced undo/redo requirements (e.g., custom action descriptions, action grouping), implement a custom command pattern:

```tsx
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

export function useTimelineHistory() {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    future: [],
  });

  const pushAction = (action: TimelineAction) => {
    setHistory((prev) => ({
      past: [...prev.past, action].slice(-50), // Keep last 50
      future: [], // Clear future on new action
    }));
  };

  const undo = () => {
    if (history.past.length === 0) return;

    const action = history.past[history.past.length - 1];
    action.undo();

    setHistory({
      past: history.past.slice(0, -1),
      future: [action, ...history.future],
    });
  };

  const redo = () => {
    if (history.future.length === 0) return;

    const action = history.future[0];
    action.redo();

    setHistory({
      past: [...history.past, action],
      future: history.future.slice(1),
    });
  };

  return {
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    pushAction,
  };
}
```

**Use custom command pattern when:**
- Need action descriptions for UI display
- Need to group multiple actions (batch undo/redo)
- Need to skip certain actions
- Need action-specific validation

**Use Zundo temporal middleware when:**
- Standard undo/redo functionality is sufficient
- Want automatic tracking with minimal code
- Don't need custom action metadata
- Prefer declarative over imperative approach

### Performance Tips

1. **Avoid object/array creation in selectors**
   ```tsx
   // ❌ Creates new array every render
   const clips = useStore((s) => s.clips.filter(c => c.type === 'video'));

   // ✅ Use custom equality or useMemo
   const clips = useMemo(
     () => useStore.getState().clips.filter(c => c.type === 'video'),
     [useStore((s) => s.clips)]
   );

   // ✅ Or use a custom equality function
   const clips = useStore(
     (s) => s.clips.filter(c => c.type === 'video'),
     (prev, next) => prev.length === next.length
   );
   ```

2. **Use actions for complex updates**
   ```tsx
   // Keep logic in the store, not components
   moveClipToTrack: (clipId, trackId) => set((state) => ({
     clips: state.clips.map(clip =>
       clip.id === clipId ? { ...clip, trackId } : clip
     ),
   })),
   ```

3. **Separate read-only and write-only hooks**
   ```tsx
   const currentFrame = usePlaybackStore((s) => s.currentFrame); // Read
   const setCurrentFrame = usePlaybackStore((s) => s.setCurrentFrame); // Write
   // Now updates to actions don't cause re-renders
   ```

4. **Use `subscribe` for side effects outside React**
   ```tsx
   useEffect(() => {
     const unsubscribe = usePlaybackStore.subscribe(
       (state) => state.currentFrame,
       (currentFrame) => {
         // Update Remotion player, sync with external systems
         remotionPlayer.seekTo(currentFrame);
       }
     );
     return unsubscribe;
   }, []);
   ```

### Common Pitfalls to Avoid (v5)

| ❌ Don't | ✅ Do |
|---------|------|
| `const store = useStore()` | `const value = useStore(s => s.value)` |
| Create new objects/arrays in selectors | Use equality function or memoization |
| Put all state in one giant store | Split into domain-specific stores |
| Select computed values without memo | Compute in selector or use derived state |
| Forget `useShallow` for multi-select | Use `useShallow` from `zustand/react/shallow` for object selection |

## Zustand v5 Migration Notes

### Requirements
- **React**: 19.2.0+ recommended (minimum: 18.0.0+)
- **TypeScript**: 5.9.3+ recommended (minimum: 4.5.0+)
- **Node**: ES2015+ support (ES5 dropped)

### Key Changes from v4 to v5

#### 1. **No Default Exports**
Zustand v5 only exports named exports. All imports must use named imports:

```tsx
// ✅ Correct (v5)
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

// ❌ Wrong (v4 style)
import create from 'zustand';
```

#### 2. **useShallow Hook (Recommended for v5)**
While `shallow` from `'zustand/shallow'` still works, v5 recommends the `useShallow` hook:

```tsx
// ✅ v5 recommended approach
import { useShallow } from 'zustand/react/shallow';

const { width, height } = useStore(
  useShallow((state) => ({ width: state.width, height: state.height }))
);

// ✅ Still works (backward compatible)
import { shallow } from 'zustand/shallow';

const { width, height } = useStore(
  (state) => ({ width: state.width, height: state.height }),
  shallow
);
```

#### 3. **Persist Middleware Behavioral Change**
In v5 (and v4.5.5+), the persist middleware **no longer stores initial state automatically** during store creation.

```tsx
// v5 behavior - state is NOT persisted on store creation
export const useStore = create(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    { name: 'counter-storage' }
  )
);

// To persist initial state, explicitly call setState after creation:
useStore.setState(useStore.getState()); // Manually trigger persist
```

#### 4. **Stricter TypeScript Types**
When using `setState`'s replace flag, types are now stricter:

```tsx
// v5 enforces complete state replacement when replace=true
store.setState({ count: 5 }, true); // ✅ OK if count is entire state

store.setState({ count: 5 }, true); // ❌ Error if state has other properties
// Must provide complete state when replace=true
```

#### 5. **Custom Equality Functions**
If you need custom equality at the store level (not selector level), use `createWithEqualityFn`:

```tsx
import { createWithEqualityFn } from 'zustand/traditional';

const useStore = createWithEqualityFn(
  (set) => ({
    items: [],
    addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  }),
  Object.is // Custom equality function
);
```

### Migration Checklist

- [ ] Upgrade to React 19.2+ (minimum: 18.0+)
- [ ] Upgrade to TypeScript 5.9.3+ (minimum: 4.5+)
- [ ] Change all imports to named imports (`import { create }`)
- [ ] Replace `shallow` with `useShallow` where applicable
- [ ] Review persist middleware usage (initial state no longer auto-persisted)
- [ ] Update equality functions to use `createWithEqualityFn` if needed
- [ ] Test with `replace` flag in setState (stricter types)
- [ ] Remove UMD/SystemJS builds if used
- [ ] Update bundler config if targeting ES5 (now ES2015+)

### Resources

- [Official v5 Migration Guide](https://zustand.docs.pmnd.rs/migrations/migrating-to-v5)
- [v5 Announcement](https://pmnd.rs/blog/announcing-zustand-v5)
- [GitHub Releases](https://github.com/pmndrs/zustand/releases)

