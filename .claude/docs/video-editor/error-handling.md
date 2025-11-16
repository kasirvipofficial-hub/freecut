## Error Handling & Recovery

Robust error handling is critical for OPFS and IndexedDB storage to ensure data integrity and provide good user experience.

### Common Storage Errors

#### 1. QuotaExceededError

Occurs when storage quota is exceeded. Handle gracefully with user feedback and cleanup options:

```typescript
// services/mediaLibraryService.ts
export class MediaLibraryService {
  async addMedia(file: File): Promise<MediaMetadata> {
    try {
      // Check available quota before upload
      const estimate = await navigator.storage.estimate();
      const available = (estimate.quota || 0) - (estimate.usage || 0);

      if (file.size > available) {
        throw new Error('QUOTA_EXCEEDED');
      }

      // Proceed with upload...
      return await this.uploadToOPFS(file);
    } catch (error) {
      if (error.name === 'QuotaExceededError' || error.message === 'QUOTA_EXCEEDED') {
        // Trigger cleanup UI
        throw new QuotaExceededError(
          'Storage quota exceeded. Please delete some files or request more storage.',
          { availableSpace: available, requiredSpace: file.size }
        );
      }
      throw error;
    }
  }

  async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      const isPersisted = await navigator.storage.persist();
      if (isPersisted) {
        console.log('Storage will not be cleared except by explicit user action');
      }
      return isPersisted;
    }
    return false;
  }
}
```

**UI Component for Quota Management:**

```typescript
// components/panels/StorageQuotaManager.tsx
import { useMediaLibraryStore } from '@/stores/mediaLibraryStore';
import { mediaLibraryService } from '@/services/mediaLibraryService';

export function StorageQuotaManager() {
  const { used, quota } = useStorageQuota();
  const mediaItems = useMediaItems();
  const deleteMedia = useMediaLibraryStore((s) => s.deleteMedia);

  const usagePercent = (used / quota) * 100;
  const isNearLimit = usagePercent > 80;

  const handleRequestPersistence = async () => {
    const granted = await mediaLibraryService.requestPersistentStorage();
    if (granted) {
      toast.success('Persistent storage granted!');
    } else {
      toast.info('Persistent storage not available');
    }
  };

  const handleCleanup = async () => {
    // Sort by oldest and largest files
    const sortedItems = [...mediaItems]
      .sort((a, b) => a.createdAt - b.createdAt);

    // Delete oldest files until under 70% quota
    const targetUsage = quota * 0.7;
    let currentUsage = used;

    for (const item of sortedItems) {
      if (currentUsage <= targetUsage) break;

      await deleteMedia(item.id);
      currentUsage -= item.fileSize;
      toast.info(`Deleted ${item.fileName}`);
    }
  };

  return (
    <div className={`storage-manager ${isNearLimit ? 'warning' : ''}`}>
      <h3>Storage: {formatBytes(used)} / {formatBytes(quota)}</h3>
      <progress value={used} max={quota} />
      <span>{usagePercent.toFixed(1)}%</span>

      {isNearLimit && (
        <div className="warning-message">
          <p>⚠️ Storage is nearly full</p>
          <button onClick={handleCleanup}>Auto Cleanup</button>
          <button onClick={handleRequestPersistence}>Request Persistent Storage</button>
        </div>
      )}
    </div>
  );
}
```

#### 2. Sync Validation Errors

Validate that OPFS and IndexedDB are in sync, and repair orphaned entries:

```typescript
// services/syncValidationService.ts
export class SyncValidationService {
  async validateSync(): Promise<ValidationResult> {
    const errors: SyncError[] = [];

    // Get all metadata from IndexedDB
    const allMetadata = await indexedDBService.getAllMedia();

    for (const metadata of allMetadata) {
      try {
        // Check if OPFS file exists
        const exists = await opfsService.fileExists(metadata.opfsPath);

        if (!exists) {
          errors.push({
            type: 'ORPHANED_METADATA',
            mediaId: metadata.id,
            message: `Metadata exists but OPFS file missing: ${metadata.opfsPath}`,
          });
        }
      } catch (error) {
        errors.push({
          type: 'VALIDATION_ERROR',
          mediaId: metadata.id,
          message: `Failed to validate: ${error.message}`,
        });
      }
    }

    // Check for orphaned OPFS files (files without metadata)
    const opfsFiles = await opfsService.listAllFiles();
    const metadataPaths = new Set(allMetadata.map(m => m.opfsPath));

    for (const opfsPath of opfsFiles) {
      if (!metadataPaths.has(opfsPath)) {
        errors.push({
          type: 'ORPHANED_FILE',
          opfsPath,
          message: `OPFS file exists without metadata: ${opfsPath}`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      timestamp: Date.now(),
    };
  }

  async repairSync(errors: SyncError[]): Promise<RepairResult> {
    const repaired: string[] = [];
    const failed: string[] = [];

    for (const error of errors) {
      try {
        switch (error.type) {
          case 'ORPHANED_METADATA':
            // Remove metadata without OPFS file
            await indexedDBService.deleteMetadata(error.mediaId);
            repaired.push(error.mediaId);
            break;

          case 'ORPHANED_FILE':
            // Remove OPFS file without metadata
            await opfsService.deleteFile(error.opfsPath);
            repaired.push(error.opfsPath);
            break;

          default:
            failed.push(error.mediaId || error.opfsPath);
        }
      } catch (err) {
        console.error('Repair failed:', err);
        failed.push(error.mediaId || error.opfsPath);
      }
    }

    return { repaired, failed };
  }
}

export const syncValidationService = new SyncValidationService();
```

**Automatic Validation on App Start:**

```typescript
// App.tsx
import { useEffect } from 'react';
import { syncValidationService } from '@/services/syncValidationService';

export function App() {
  useEffect(() => {
    async function validateOnStart() {
      const result = await syncValidationService.validateSync();

      if (!result.isValid) {
        console.warn('Sync validation found issues:', result.errors);

        // Auto-repair if errors are minor
        if (result.errors.length < 10) {
          const repairResult = await syncValidationService.repairSync(result.errors);
          console.log('Auto-repair completed:', repairResult);
          toast.info(`Repaired ${repairResult.repaired.length} storage inconsistencies`);
        } else {
          // Too many errors - prompt user
          toast.warning('Storage validation found issues. Check console for details.');
        }
      }
    }

    validateOnStart();
  }, []);

  return <div className="app">...</div>;
}
```

#### 3. Multi-Tab Coordination

Prevent conflicts when the same app is open in multiple tabs using Broadcast Channel API:

```typescript
// services/multiTabCoordinator.ts
export class MultiTabCoordinator {
  private channel: BroadcastChannel;

  constructor() {
    this.channel = new BroadcastChannel('video-editor-storage');
    this.setupListeners();
  }

  private setupListeners() {
    this.channel.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'MEDIA_ADDED':
          // Another tab added media, refresh local state
          useMediaLibraryStore.getState().loadMediaItems();
          break;

        case 'MEDIA_DELETED':
          // Another tab deleted media, update local state
          useMediaLibraryStore.setState((state) => ({
            mediaItems: state.mediaItems.filter(m => m.id !== payload.mediaId),
          }));
          break;

        case 'STORAGE_LOCK':
          // Another tab is performing critical operation
          this.handleStorageLock(payload);
          break;

        default:
          console.warn('Unknown message type:', type);
      }
    };
  }

  notifyMediaAdded(metadata: MediaMetadata) {
    this.channel.postMessage({
      type: 'MEDIA_ADDED',
      payload: { metadata },
    });
  }

  notifyMediaDeleted(mediaId: string) {
    this.channel.postMessage({
      type: 'MEDIA_DELETED',
      payload: { mediaId },
    });
  }

  async acquireStorageLock(operation: string): Promise<() => void> {
    // Notify other tabs
    this.channel.postMessage({
      type: 'STORAGE_LOCK',
      payload: { operation, lockId: crypto.randomUUID() },
    });

    // Return release function
    return () => {
      this.channel.postMessage({
        type: 'STORAGE_UNLOCK',
        payload: { operation },
      });
    };
  }

  private handleStorageLock(payload: { operation: string }) {
    // Disable write operations while another tab has lock
    console.log('Storage locked by another tab:', payload.operation);
  }

  dispose() {
    this.channel.close();
  }
}

export const multiTabCoordinator = new MultiTabCoordinator();
```

**Usage in Service:**

```typescript
// services/mediaLibraryService.ts
export class MediaLibraryService {
  async addMedia(file: File): Promise<MediaMetadata> {
    // Acquire lock
    const releaseLock = await multiTabCoordinator.acquireStorageLock('addMedia');

    try {
      const metadata = await this.uploadToOPFS(file);
      await this.saveMetadata(metadata);

      // Notify other tabs
      multiTabCoordinator.notifyMediaAdded(metadata);

      return metadata;
    } finally {
      // Always release lock
      releaseLock();
    }
  }

  async deleteMedia(id: string): Promise<void> {
    const releaseLock = await multiTabCoordinator.acquireStorageLock('deleteMedia');

    try {
      await this.deleteFromOPFS(id);
      await this.deleteMetadata(id);

      multiTabCoordinator.notifyMediaDeleted(id);
    } finally {
      releaseLock();
    }
  }
}
```

#### 4. Corrupted File Recovery

Handle corrupted files with retry logic and fallback mechanisms:

```typescript
// utils/fileRecovery.ts
export async function readFileWithRetry(
  mediaId: string,
  maxRetries: number = 3
): Promise<File> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const file = await mediaLibraryService.getMediaFile(mediaId);

      // Validate file integrity
      if (file.size === 0) {
        throw new Error('File is empty');
      }

      // For videos, try to parse basic headers
      if (file.type.startsWith('video/')) {
        await validateVideoFile(file);
      }

      return file;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw new Error(`Failed to read file after ${maxRetries} attempts: ${lastError.message}`);
}

async function validateVideoFile(file: File): Promise<void> {
  const video = document.createElement('video');
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Video validation timeout'));
    }, 5000);

    video.addEventListener('loadedmetadata', () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve();
    });

    video.addEventListener('error', (e) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Video file is corrupted'));
    });

    video.src = url;
  });
}
```

### Recovery Strategies

#### Automatic Cleanup on Error

```typescript
// utils/errorRecovery.ts
export class ErrorRecoveryService {
  async recoverFromError(error: Error, context: { mediaId?: string }): Promise<void> {
    console.error('Recovering from error:', error);

    if (error.name === 'QuotaExceededError') {
      await this.cleanupOldFiles();
    } else if (error.message.includes('corrupted')) {
      await this.removeCorruptedFile(context.mediaId);
    } else if (error.message.includes('sync')) {
      await syncValidationService.validateSync();
    }
  }

  private async cleanupOldFiles(): Promise<void> {
    // Remove files older than 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const allMedia = await indexedDBService.getAllMedia();

    for (const media of allMedia) {
      if (media.createdAt < thirtyDaysAgo) {
        await mediaLibraryService.deleteMedia(media.id);
      }
    }
  }

  private async removeCorruptedFile(mediaId?: string): Promise<void> {
    if (!mediaId) return;

    try {
      await mediaLibraryService.deleteMedia(mediaId);
      toast.info('Removed corrupted file');
    } catch (error) {
      console.error('Failed to remove corrupted file:', error);
    }
  }
}

export const errorRecoveryService = new ErrorRecoveryService();
```

### Storage Best Practices

#### OPFS Best Practices

1. **Always use Web Workers for synchronous API**
   - Main thread only has async API
   - Web Workers enable synchronous access for better performance
   - Keep worker logic minimal and focused

2. **Implement proper cleanup**
   ```typescript
   // Always revoke object URLs when done
   const url = URL.createObjectURL(file);
   videoElement.src = url;
   // Later...
   URL.revokeObjectURL(url);
   ```

3. **Use directory structure for organization**
   ```typescript
   // Good: Organized by media type and ID
   media/{mediaId}/{filename}
   thumbnails/{mediaId}/thumb.jpg

   // Bad: Flat structure
   {filename}
   ```

4. **Check browser support before use**
   ```typescript
   if ('storage' in navigator && 'getDirectory' in navigator.storage) {
     // OPFS is supported
   } else {
     // Fallback to IndexedDB for files
   }
   ```

5. **Handle quota efficiently**
   - Check quota before large uploads
   - Request persistent storage for important data
   - Implement cleanup strategies

#### IndexedDB Best Practices

1. **Use compound indexes for complex queries**
   ```typescript
   // Efficient query for project clips
   clipStore.createIndex('project_track', ['projectId', 'trackId']);
   ```

2. **Batch operations with relaxed durability**
   ```typescript
   const tx = db.transaction('media', 'readwrite', { durability: 'relaxed' });
   // 344% faster for batch inserts
   ```

3. **Close transactions promptly**
   ```typescript
   // Transactions auto-close when completed
   // Don't keep references to completed transactions
   ```

4. **Use proper error handling**
   ```typescript
   request.onerror = () => {
     console.error('IndexedDB error:', request.error);
   };
   ```

5. **Version migrations carefully**
   ```typescript
   const request = indexedDB.open('DB', newVersion);
   request.onupgradeneeded = (event) => {
     // Only create new stores/indexes
     // Never delete data during upgrade
   };
   ```

6. **Optimize blob storage**
   - Store small blobs (< 1MB) in IndexedDB (thumbnails)
   - Store large files (> 1MB) in OPFS
   - Use compression for text/JSON data

#### Performance Tips

1. **Lazy load media library**
   - Load metadata on app start
   - Load thumbnails on demand
   - Stream large files in chunks

2. **Cache frequently accessed data**
   ```typescript
   // In-memory cache for hot metadata
   private metadataCache = new Map<string, MediaMetadata>();
   ```

3. **Use Web Workers for heavy operations**
   - Video encoding/decoding
   - Thumbnail generation
   - File validation

4. **Implement progressive loading**
   ```typescript
   // Load in batches of 50
   async function loadMediaBatch(offset: number, limit: number) {
     const tx = db.transaction('media', 'readonly');
     const store = tx.objectStore('media');
     return store.getAll(null, limit);
   }
   ```

#### Security Considerations

1. **Validate file types and sizes**
   ```typescript
   const allowedTypes = ['video/mp4', 'video/webm', 'image/jpeg'];
   const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
   ```

2. **Sanitize user-provided metadata**
   ```typescript
   const sanitizedTags = tags.map(tag => tag.trim().substring(0, 50));
   ```

3. **Use UUIDs for file paths**
   - Prevents path traversal attacks
   - Ensures unique identifiers

4. **Don't store sensitive data in OPFS/IndexedDB**
   - API keys, passwords, tokens should use secure storage
   - Storage is not encrypted by default

