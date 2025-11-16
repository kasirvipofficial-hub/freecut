## Project Tree Structure

```
video-editor-refactor/
├── src/
│   ├── components/
│   │   ├── timeline/                     # See "Timeline Internal Organization" below for complete structure
│   │   ├── preview/
│   │   │   ├── video-preview.tsx         # Main video canvas/preview
│   │   │   ├── preview-controls.tsx      # Play, pause, skip controls
│   │   │   └── preview-overlay.tsx       # UI overlays (safe zones, etc.)
│   │   ├── editor/
│   │   │   ├── editor.tsx                # Main editor layout container
│   │   │   ├── toolbar.tsx               # Top toolbar with actions
│   │   │   └── sidebar.tsx               # Properties/assets panel
│   │   ├── panels/
│   │   │   ├── media-library.tsx         # Asset browser/uploader
│   │   │   ├── effects-panel.tsx         # Video effects and filters
│   │   │   ├── properties-panel.tsx      # Selected item properties
│   │   │   └── export-panel.tsx          # Export settings/dialog
│   │   └── ui/
│   │       └── ...                       # ShadCN components (button, dialog, etc.)
│   ├── stores/
│   │   ├── editor-store.ts               # Main editor store (Zustand)
│   │   ├── timeline-store.ts             # Timeline state (clips, tracks)
│   │   ├── playback-store.ts             # Playback state (time, playing)
│   │   ├── project-store.ts              # Project metadata
│   │   ├── selection-store.ts            # Current selection state
│   │   └── media-library-store.ts        # Media library state (OPFS/IndexedDB)
│   ├── services/
│   │   ├── media-library-service.ts      # Coordination layer (OPFS + IndexedDB)
│   │   ├── opfs-service.ts               # OPFS operations wrapper
│   │   └── indexed-db-service.ts         # IndexedDB operations wrapper
│   ├── workers/
│   │   ├── opfs-worker.ts                # OPFS Web Worker (synchronous API)
│   │   └── video-processing-worker.ts    # Video processing in background
│   ├── hooks/
│   │   ├── use-timeline.ts               # Timeline manipulation logic
│   │   ├── use-playback.ts               # Playback control logic
│   │   ├── use-keyboard-shortcuts.ts     # Keyboard command handling
│   │   ├── use-video-processing.ts       # Mediabunny integration
│   │   └── use-media-library.ts          # Media library operations hook
│   ├── utils/
│   │   ├── time-utils.ts                 # Time/frame conversions
│   │   ├── clip-utils.ts                 # Clip manipulation helpers
│   │   ├── export-utils.ts               # Export/render helpers
│   │   └── validators.ts                 # Input validation
│   ├── types/
│   │   ├── timeline.ts                   # Timeline-related types
│   │   ├── clip.ts                       # Clip and media types
│   │   ├── project.ts                    # Project configuration types
│   │   ├── export.ts                     # Export settings types
│   │   └── storage.ts                    # OPFS & IndexedDB types
│   ├── lib/
│   │   ├── mediabunny.ts                 # Mediabunny wrapper/config
│   │   └── video-engine.ts               # Core video processing engine
│   ├── app.tsx                           # Root application component
│   ├── main.tsx                          # Application entry point
│   └── index.css                         # Global styles
├── public/
│   └── assets/                           # Static assets (icons, etc.)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── CLAUDE.MD                             # This file
```

## Architecture Overview

### Component Hierarchy
```
App
└── VideoEditor
    ├── EditorProvider (context)
    ├── Toolbar
    ├── Sidebar
    │   ├── MediaLibrary
    │   ├── EffectsPanel
    │   └── PropertiesPanel
    ├── VideoPreview (Remotion-powered player)
    │   ├── PreviewControls
    │   └── PreviewOverlay
    └── Timeline
        ├── TimelineControls
        ├── Track (multiple)
        │   └── Clip (multiple)
        └── Playhead
```

### Internal Component Structures

#### Timeline Internal Organization
```
Timeline/
├── components/                      # UI elements
│   ├── timeline-header/             # Header with playback controls, zoom, snap settings
│   ├── timeline-content.tsx         # Main timeline rendering area with tracks and scrubber
│   ├── timeline-track.tsx           # Individual track component (video/audio/subtitle)
│   ├── timeline-item/               # Timeline item components (clips, effects, transitions)
│   ├── timeline-markers.tsx         # Time ruler and markers (seconds, frames)
│   ├── timeline-guidelines.tsx      # Drag-and-drop guidelines and snap indicators
│   └── timeline-track-handles.tsx   # Track control handles (resize, reorder, lock, mute)
├── hooks/                           # Timeline-specific functionality
│   ├── use-timeline-zoom.ts         # Zoom in/out, zoom to fit, pixel-to-time calculations
│   ├── use-timeline-tracks.ts       # Track management (add, remove, reorder, resize)
│   ├── use-timeline-shortcuts.ts    # Keyboard shortcuts (space, arrow keys, undo/redo)
│   ├── use-timeline-history.ts      # Undo/redo stack management
│   └── use-timeline-*.ts            # Other specialized hooks (drag, snap, playhead, selection)
├── stores/                          # Timeline-specific state
│   ├── use-timeline-store.ts        # Main timeline state (clips, tracks, zoom, snap settings)
│   └── use-zoom-store.ts            # Zoom state persistence (level, scroll position)
├── utils/                           # Timeline utilities
│   └── gap-utils.ts                 # Gap detection and calculation for magnetic snapping
├── types.ts                         # Timeline TypeScript definitions (Track, Clip, TimelineState)
└── constants.ts                     # Timeline configuration (MIN_ZOOM, MAX_ZOOM, SNAP_THRESHOLD, etc.)
```

**Key Components:**
- **timeline-header/** - Contains zoom controls, snap toggle, playback buttons, timeline settings
- **timeline-content.tsx** - Main container that renders all tracks, manages scrolling, handles timeline-wide events
- **timeline-track.tsx** - Renders individual track with clips, handles track-level interactions (click, drag)
- **timeline-item/** - Clip rendering, trim handles, effect indicators, transition overlays
- **timeline-markers.tsx** - Time ruler with frame/second markers, current time indicator
- **timeline-guidelines.tsx** - Visual feedback during drag operations (snap lines, drop zones)
- **timeline-track-handles.tsx** - Track controls (height resize, reorder drag handle, lock/unlock, mute/unmute)

**Key Hooks:**
- **use-timeline-zoom** - Manages zoom level, converts between pixels and time units, handles scroll position
- **use-timeline-tracks** - CRUD operations for tracks, track ordering, track height adjustments
- **use-timeline-shortcuts** - Keyboard command mappings (play/pause, navigation, editing, undo/redo)
- **use-timeline-history** - Undo/redo implementation with action history stack

**Key Stores:**
- **use-timeline-store** - Central timeline state (clips array, tracks array, zoom level, snap settings, playhead position)
- **use-zoom-store** - Persists zoom preferences across sessions (zoom level, scroll position restoration)

**Key Utils:**
- **gap-utils** - Detects gaps between clips, calculates snap points for magnetic alignment, ripple delete logic

#### VideoEditor Internal Organization
```
VideoEditor/
├── components/
│   ├── core/
│   │   ├── editor.tsx              # Main editor surface
│   │   └── video-player.tsx        # Remotion-based player
│   ├── shared/
│   │   └── default-sidebar.tsx     # Default sidebar with overlay panels
│   ├── autosave/
│   │   └── autosave-status.tsx     # Autosave UI indicator
│   ├── providers/
│   │   ├── video-editor-provider.tsx  # Top-level provider composition
│   │   └── editor-provider.tsx        # Core editor context wiring
│   └── ui/                         # Sidebar/tooltip/button primitives
├── contexts/
│   ├── editor-context.tsx
│   ├── renderer-context.tsx
│   ├── media-adaptor-context.tsx
│   └── sidebar-context.tsx
├── hooks/
│   ├── use-overlays.tsx
│   └── use-rendering.tsx
├── utils/
│   └── http-renderer.ts            # HTTP renderer implementing VideoRenderer
├── types/
│   ├── renderer.ts                 # VideoRenderer interface
│   ├── overlay-adaptors.ts         # Overlay adaptor interfaces
│   └── index.ts                    # OverlayType, Overlay, etc.
└── constants.ts                    # DEFAULT_OVERLAYS, colors, etc.
```

### State Management with Zustand

**Store-Based Pattern:**
- Modular stores for different feature domains (timeline, playback, selection)
- Selector-based subscriptions to prevent unnecessary re-renders
- Direct store access without providers
- Middleware support for persistence, devtools, and immutability

**Key Stores:**
- `editor-store` - Main editor state (composition, project metadata)
- `timeline-store` - Clips, tracks, zoom level, snap settings
- `playback-store` - Current time, playing state, FPS, playback rate
- `selection-store` - Selected clips/tracks for batch operations
- `project-store` - Project settings, aspect ratio, export config
- `media-library-store` - Media library state with OPFS/IndexedDB integration

**MediaLibraryStore Example:**

```typescript
// stores/media-library-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { mediaLibraryService } from '@/services/media-library-service';
import type { MediaMetadata } from '@/types/storage';

interface MediaLibraryState {
  // Media items from IndexedDB
  mediaItems: MediaMetadata[];

  // UI state
  isLoading: boolean;
  uploadProgress: number;
  selectedMediaIds: string[];

  // Filter/search state
  searchQuery: string;
  filterByType: string | null; // 'video' | 'audio' | 'image' | null
  sortBy: 'name' | 'date' | 'size';

  // Storage quota
  storageUsed: number;
  storageQuota: number;

  // Actions
  loadMediaItems: () => Promise<void>;
  uploadMedia: (file: File) => Promise<MediaMetadata>;
  deleteMedia: (id: string) => Promise<void>;
  updateMediaTags: (id: string, tags: string[]) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterByType: (type: string | null) => void;
  setSortBy: (sortBy: 'name' | 'date' | 'size') => void;
  selectMedia: (id: string) => void;
  deselectMedia: (id: string) => void;
  clearSelection: () => void;
  checkStorageQuota: () => Promise<void>;
}

export const useMediaLibraryStore = create<MediaLibraryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      mediaItems: [],
      isLoading: false,
      uploadProgress: 0,
      selectedMediaIds: [],
      searchQuery: '',
      filterByType: null,
      sortBy: 'date',
      storageUsed: 0,
      storageQuota: 0,

      // Load all media items from IndexedDB
      loadMediaItems: async () => {
        set({ isLoading: true });
        try {
          const items = await mediaLibraryService.getAllMedia();
          set({ mediaItems: items, isLoading: false });
        } catch (error) {
          console.error('Failed to load media:', error);
          set({ isLoading: false });
        }
      },

      // Upload new media file to OPFS + IndexedDB
      uploadMedia: async (file: File) => {
        set({ isLoading: true, uploadProgress: 0 });

        try {
          // Track upload progress
          const metadata = await mediaLibraryService.addMedia(file, (progress) => {
            set({ uploadProgress: progress });
          });

          // Add to local state
          set((state) => ({
            mediaItems: [metadata, ...state.mediaItems],
            isLoading: false,
            uploadProgress: 100,
          }));

          // Update storage quota
          await get().checkStorageQuota();

          return metadata;
        } catch (error) {
          set({ isLoading: false, uploadProgress: 0 });
          throw error;
        }
      },

      // Delete media from both OPFS and IndexedDB
      deleteMedia: async (id: string) => {
        try {
          await mediaLibraryService.deleteMedia(id);

          set((state) => ({
            mediaItems: state.mediaItems.filter(item => item.id !== id),
            selectedMediaIds: state.selectedMediaIds.filter(sid => sid !== id),
          }));

          await get().checkStorageQuota();
        } catch (error) {
          console.error('Failed to delete media:', error);
          throw error;
        }
      },

      // Update media tags in IndexedDB
      updateMediaTags: async (id: string, tags: string[]) => {
        try {
          await mediaLibraryService.updateMetadata(id, { tags });

          set((state) => ({
            mediaItems: state.mediaItems.map(item =>
              item.id === id ? { ...item, tags } : item
            ),
          }));
        } catch (error) {
          console.error('Failed to update tags:', error);
          throw error;
        }
      },

      // UI state actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterByType: (type) => set({ filterByType: type }),
      setSortBy: (sortBy) => set({ sortBy }),

      selectMedia: (id) => set((state) => ({
        selectedMediaIds: [...state.selectedMediaIds, id],
      })),

      deselectMedia: (id) => set((state) => ({
        selectedMediaIds: state.selectedMediaIds.filter(sid => sid !== id),
      })),

      clearSelection: () => set({ selectedMediaIds: [] }),

      // Check storage quota
      checkStorageQuota: async () => {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          set({
            storageUsed: estimate.usage || 0,
            storageQuota: estimate.quota || 0,
          });
        }
      },
    }),
    { name: 'MediaLibraryStore' }
  )
);

// Selector hooks for granular subscriptions
export const useMediaItems = () => useMediaLibraryStore((s) => s.mediaItems);
export const useIsMediaLoading = () => useMediaLibraryStore((s) => s.isLoading);
export const useUploadProgress = () => useMediaLibraryStore((s) => s.uploadProgress);
export const useSelectedMedia = () => useMediaLibraryStore((s) => s.selectedMediaIds);
export const useStorageQuota = () => useMediaLibraryStore((s) => ({
  used: s.storageUsed,
  quota: s.storageQuota,
}));

// Derived selectors
export const useFilteredMedia = () =>
  useMediaLibraryStore((state) => {
    let filtered = state.mediaItems;

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.fileName.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply type filter
    if (state.filterByType) {
      filtered = filtered.filter(item =>
        item.mimeType.startsWith(state.filterByType + '/')
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (state.sortBy) {
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'date':
          return b.createdAt - a.createdAt; // Newest first
        case 'size':
          return b.fileSize - a.fileSize; // Largest first
        default:
          return 0;
      }
    });

    return filtered;
  });
```

**Usage in Components:**

```typescript
// components/panels/media-library.tsx
import { useMediaLibraryStore, useFilteredMedia } from '@/stores/media-library-store';
import { useShallow } from 'zustand/react/shallow';

export function MediaLibrary() {
  const filteredMedia = useFilteredMedia();
  const { uploadMedia, deleteMedia, selectMedia } = useMediaLibraryStore(
    useShallow((state) => ({
      uploadMedia: state.uploadMedia,
      deleteMedia: state.deleteMedia,
      selectMedia: state.selectMedia,
    }))
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        await uploadMedia(file);
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        if (error.message.includes('quota')) {
          toast.error('Storage quota exceeded. Please delete some files.');
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }
    }
  };

  return (
    <div className="media-library">
      <input type="file" onChange={handleFileUpload} multiple />

      <div className="media-grid">
        {filteredMedia.map(media => (
          <MediaCard
            key={media.id}
            media={media}
            onSelect={() => selectMedia(media.id)}
            onDelete={() => deleteMedia(media.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Re-Render Optimization:**
- Use granular selectors: `useEditorStore((state) => state.currentFrame)`
- Export custom selector hooks: `export const useCurrentFrame = () => useEditorStore(s => s.currentFrame)`
- Avoid selecting entire state object
- Use `shallow` equality for selecting multiple primitives
- Leverage middleware like `immer` for complex state updates

### Video Processing Pipeline

1. **Import** - User uploads/selects media files
2. **Decode** - mediabunny decodes video into frames
3. **Timeline** - Clips arranged on timeline tracks
4. **Preview** - Current frame rendered to canvas
5. **Effects** - Filters/effects applied in real-time
6. **Export** - mediabunny encodes final output

### Timeline & Preview Synchronization

- Playhead position stored in `playback-store.currentFrame`
- Timeline subscribes to `useCurrentFrame()` selector to update scrubber position
- Preview (Remotion Player) subscribes to render current frame
- Bidirectional updates (timeline drag → preview, preview play → timeline)
- Selectors prevent re-renders: only components using `currentFrame` re-render when it changes

