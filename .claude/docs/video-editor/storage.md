## Storage Architecture

### Overview

The video editor uses a two-tier storage architecture combining **OPFS** (Origin Private File System) for large media files and **IndexedDB** for metadata, providing optimal performance for professional video editing workflows.

**Performance Benefits:**
- **3-4x faster** file operations compared to IndexedDB-only solutions
- Random access for video seeking without loading entire files
- Efficient storage of projects with 1000+ media files
- Minimal memory footprint during playback and scrubbing

**Architecture Diagram:**
```
┌──────────────────────────────────────────────────────┐
│              React Application (UI)                   │
│  ┌────────────────────────────────────────────────┐ │
│  │         Zustand Store (UI State)               │ │
│  └──────────────────┬─────────────────────────────┘ │
│                     │                                 │
│  ┌──────────────────▼─────────────────────────────┐ │
│  │      Media Library Service (Coordinator)       │ │
│  └─────┬──────────────────────────┬────────────────┘│
│        │                          │                  │
│  ┌─────▼──────────┐     ┌─────────▼────────────┐   │
│  │  IndexedDB     │     │  OPFS Web Worker     │   │
│  │  - Metadata    │     │  - Video files       │   │
│  │  - Projects    │     │  - Audio files       │   │
│  │  - Thumbnails  │     │  - Images            │   │
│  │  - Clips       │     │  - Sync access       │   │
│  └────────────────┘     └──────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### OPFS for Media Files

**What is OPFS?**

OPFS (Origin Private File System) is a modern browser API providing fast, private file system access. It's optimized for large files and powers professional applications like Photoshop on the Web.

**Key Features:**
- **High Performance**: 3-4x faster than IndexedDB for file operations
- **Synchronous API**: Available in Web Workers for maximum speed
- **Random Access**: Read/write any byte range without loading entire file
- **No Security Prompts**: Origin-private means no user permissions needed
- **Large File Support**: Handle multi-GB video files efficiently

**Browser Support (2025):**

| Browser | Version | Quota |
|---------|---------|-------|
| Chrome/Edge | 102+ | Up to 60% of total disk space |
| Safari | macOS 12.2+ | ~1GB (expandable) |
| Firefox | Full support | 2GB per eTLD+1 group |

**Storage Quotas:**
- **Chrome/Chromium**: Browser can use up to 80% of total disk, single origin up to 60%
- **Firefox**: Up to 50% of free disk space, 2GB per domain group (e.g., example.com, www.example.com)
- **Safari**: ~1GB default, prompts user for expansion in 200MB increments
- **Check quota**: `await navigator.storage.estimate()`
- **Request persistence**: `await navigator.storage.persist()`

**OPFS Web Worker Pattern:**

```typescript
// opfs-worker.ts
let opfsRoot: FileSystemDirectoryHandle;

async function initOPFS() {
  if (!opfsRoot) {
    opfsRoot = await navigator.storage.getDirectory();
  }
  return opfsRoot;
}

async function writeFile(path: string, data: ArrayBuffer) {
  const root = await initOPFS();

  // Navigate to directory (create if needed)
  const parts = path.split('/').filter(p => p);
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i], { create: true });
  }

  // Get file handle
  const fileName = parts[parts.length - 1];
  const fileHandle = await dir.getFileHandle(fileName, { create: true });

  // Use synchronous API for performance (Web Worker only!)
  const syncHandle = await fileHandle.createSyncAccessHandle();

  const buffer = new Uint8Array(data);
  syncHandle.write(buffer, { at: 0 });
  syncHandle.flush(); // Persist to disk
  syncHandle.close();

  return { success: true };
}

async function readChunk(path: string, start: number, end: number) {
  const root = await initOPFS();

  // Navigate to file
  const parts = path.split('/').filter(p => p);
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }

  const fileName = parts[parts.length - 1];
  const fileHandle = await dir.getFileHandle(fileName);
  const syncHandle = await fileHandle.createSyncAccessHandle();

  // Random access read - perfect for video seeking!
  const size = Math.min(end, syncHandle.getSize()) - start;
  const buffer = new ArrayBuffer(size);
  syncHandle.read(buffer, { at: start });
  syncHandle.close();

  return { buffer };
}

// Worker message handler
self.onmessage = async (event) => {
  const { action, path, data, start, end } = event.data;
  const port = event.ports[0];

  let result;
  switch (action) {
    case 'writeFile':
      result = await writeFile(path, data);
      break;
    case 'readChunk':
      result = await readChunk(path, start, end);
      break;
    default:
      result = { error: 'Unknown action' };
  }

  port.postMessage(result);
};
```

**Benefits for Video Editing:**
- **Fast Seeking**: Read specific byte ranges for video scrubbing
- **Streaming**: Process videos in chunks without loading entire file
- **Background Processing**: Web Workers don't block UI
- **Memory Efficient**: No need to hold entire video in RAM

### IndexedDB for Metadata

**What Goes in IndexedDB?**

IndexedDB stores structured data and small blobs:
- **Media Metadata**: Duration, resolution, codec, file size, etc.
- **Project Data**: Timeline configuration, settings, export settings
- **Timeline Clips**: References to media with trim points, effects, transitions
- **Thumbnails**: Small image blobs (~50KB) for media library preview

**Schema Design:**

```typescript
// Database schema
const DB_NAME = 'VideoEditorDB';
const DB_VERSION = 1;

interface MediaMetadata {
  id: string; // UUID
  opfsPath: string; // Path in OPFS: 'media/{uuid}/{filename}'
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number; // seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  thumbnailId?: string; // Reference to thumbnail blob
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  duration: number;
  resolution: { width: number; height: number };
  fps: number;
  createdAt: number;
  updatedAt: number;
}

interface TimelineClip {
  id: string;
  projectId: string;
  mediaId: string; // Foreign key to MediaMetadata
  trackId: string;
  startTime: number; // Position on timeline
  duration: number;
  trimStart: number; // Trim from source
  trimEnd: number;
  effects: Effect[];
  transitions: Transition[];
}

interface ThumbnailData {
  id: string;
  mediaId: string;
  blob: Blob; // Small JPEG blob
  timestamp: number; // Frame timestamp
  width: number;
  height: number;
}
```

**Database Setup:**

```typescript
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Media metadata store
      if (!db.objectStoreNames.contains('media')) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
        mediaStore.createIndex('fileName', 'fileName', { unique: false });
        mediaStore.createIndex('createdAt', 'createdAt', { unique: false });
        mediaStore.createIndex('mimeType', 'mimeType', { unique: false });
        mediaStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      }

      // Projects store
      if (!db.objectStoreNames.contains('projects')) {
        const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
        projectStore.createIndex('name', 'name', { unique: false });
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // Timeline clips store
      if (!db.objectStoreNames.contains('clips')) {
        const clipStore = db.createObjectStore('clips', { keyPath: 'id' });
        clipStore.createIndex('projectId', 'projectId', { unique: false });
        clipStore.createIndex('mediaId', 'mediaId', { unique: false });
        // Compound index for efficient project+track queries
        clipStore.createIndex('project_track', ['projectId', 'trackId'], { unique: false });
      }

      // Thumbnails store
      if (!db.objectStoreNames.contains('thumbnails')) {
        const thumbStore = db.createObjectStore('thumbnails', { keyPath: 'id' });
        thumbStore.createIndex('mediaId', 'mediaId', { unique: false });
      }
    };
  });
}
```

**Efficient Query Patterns:**

```typescript
// Compound index query
async function getClipsByProjectAndTrack(projectId: string, trackId: string) {
  const db = await openDatabase();
  const tx = db.transaction('clips', 'readonly');
  const store = tx.objectStore('clips');
  const index = store.index('project_track');

  return new Promise<TimelineClip[]>((resolve, reject) => {
    const request = index.getAll([projectId, trackId]);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Batch operations with relaxed durability (344% faster!)
async function addMediaBatch(mediaItems: MediaMetadata[]) {
  const db = await openDatabase();
  const tx = db.transaction('media', 'readwrite', { durability: 'relaxed' });
  const store = tx.objectStore('media');

  for (const item of mediaItems) {
    store.add(item);
  }

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

**Performance Tips:**
- Use `{ durability: 'relaxed' }` for non-critical batch operations (much faster)
- Batch 500-1000 items per transaction for optimal performance
- Use compound indexes for complex queries
- Close transactions promptly to release locks

### Coordination Layer

**MediaLibraryService** coordinates between OPFS and IndexedDB:

```typescript
// services/mediaLibraryService.ts
class MediaLibraryService {
  private worker: Worker;
  private db: IDBDatabase | null = null;

  constructor() {
    this.worker = new Worker('/opfs-worker.js');
    this.initDatabase();
  }

  async addMedia(file: File): Promise<MediaMetadata> {
    try {
      // 1. Generate unique ID and OPFS path
      const id = crypto.randomUUID();
      const opfsPath = `media/${id}/${file.name}`;

      // 2. Extract metadata using mediabunny
      const metadata = await this.extractMetadata(file);

      // 3. Store file in OPFS (via worker)
      await this.storeInOPFS(opfsPath, file);

      // 4. Generate thumbnail
      const thumbnailId = await this.generateThumbnail(file, id);

      // 5. Save metadata to IndexedDB
      const mediaMetadata: MediaMetadata = {
        id,
        opfsPath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        thumbnailId,
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...metadata
      };

      await this.saveMetadata(mediaMetadata);

      return mediaMetadata;
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please free up space.');
      }
      throw error;
    }
  }

  async getMediaFile(id: string): Promise<File> {
    const metadata = await this.getMetadata(id);

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          const file = new File([event.data.buffer], metadata.fileName, {
            type: metadata.mimeType
          });
          resolve(file);
        }
      };

      this.worker.postMessage({
        action: 'readFile',
        path: metadata.opfsPath
      }, [channel.port2]);
    });
  }

  async getMediaStream(id: string, start: number, end: number): Promise<ArrayBuffer> {
    const metadata = await this.getMetadata(id);

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.buffer);
        }
      };

      this.worker.postMessage({
        action: 'readChunk',
        path: metadata.opfsPath,
        start,
        end
      }, [channel.port2]);
    });
  }

  private async storeInOPFS(path: string, file: File): Promise<void> {
    const arrayBuffer = await file.arrayBuffer();

    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();

      channel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve();
        }
      };

      this.worker.postMessage({
        action: 'writeFile',
        path,
        data: arrayBuffer
      }, [channel.port2]);
    });
  }
}
```

**Key Coordination Principles:**
1. **Single Source of Truth**: IndexedDB metadata contains `opfsPath` reference
2. **Atomic Operations**: Add file to both OPFS and IndexedDB or neither
3. **Error Recovery**: Validate sync and repair orphaned entries
4. **Resource Management**: Clean up object URLs, close handles promptly

