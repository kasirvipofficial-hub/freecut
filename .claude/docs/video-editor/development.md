## Development Guidelines

### Installing React & TypeScript

Install the latest recommended versions:

```bash
# Install React 19.2
npm install react@19.2.0 react-dom@19.2.0

# Install TypeScript 5.9.3 as dev dependency
npm install -D typescript@5.9.3

# Install types for React
npm install -D @types/react@19.2.0 @types/react-dom@19.2.0
```

**Peer Dependencies:**
```json
{
  "peerDependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0"
  }
}
```

### Initial Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser to localhost:5173
```

### Running the Project
```bash
# Development mode with HMR
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Building for Production
```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

### Storage Setup & Testing

#### Browser Requirements for Development

OPFS and IndexedDB require specific browser versions:
- **Chrome/Edge**: Version 102+ (recommended for development)
- **Safari**: macOS 12.2+
- **Firefox**: Latest version

**Development Browser Setup:**
```bash
# Check if OPFS is supported in your browser
console.log('OPFS supported:', 'storage' in navigator && 'getDirectory' in navigator.storage);

# Check storage quota
const estimate = await navigator.storage.estimate();
console.log('Quota:', estimate.quota, 'Usage:', estimate.usage);
```

#### Testing Storage Functionality

**1. Manual Testing Checklist:**
- [ ] Upload small media file (< 10MB)
- [ ] Upload large media file (> 100MB)
- [ ] Verify thumbnail generation
- [ ] Test video playback from OPFS
- [ ] Delete media and verify cleanup
- [ ] Test quota exceeded scenario
- [ ] Test multi-tab synchronization
- [ ] Test offline functionality

**2. Automated Storage Tests:**

```typescript
// __tests__/storage/mediaLibrary.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mediaLibraryService } from '@/services/mediaLibraryService';

describe('Media Library Storage', () => {
  beforeEach(async () => {
    // Clear storage before each test
    await mediaLibraryService.clearAll();
  });

  it('should upload and retrieve media file', async () => {
    const file = new File(['test content'], 'test.mp4', { type: 'video/mp4' });
    const metadata = await mediaLibraryService.addMedia(file);

    expect(metadata.id).toBeDefined();
    expect(metadata.fileName).toBe('test.mp4');

    const retrieved = await mediaLibraryService.getMediaFile(metadata.id);
    expect(retrieved.name).toBe('test.mp4');
  });

  it('should handle quota exceeded error', async () => {
    // Create file larger than available quota
    const largeFile = new File(
      [new ArrayBuffer(10 * 1024 * 1024 * 1024)],
      'large.mp4',
      { type: 'video/mp4' }
    );

    await expect(
      mediaLibraryService.addMedia(largeFile)
    ).rejects.toThrow('quota');
  });

  it('should sync OPFS and IndexedDB', async () => {
    const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
    const metadata = await mediaLibraryService.addMedia(file);

    // Verify both storages have the data
    const opfsExists = await opfsService.fileExists(metadata.opfsPath);
    const dbMetadata = await indexedDBService.getMetadata(metadata.id);

    expect(opfsExists).toBe(true);
    expect(dbMetadata).toEqual(metadata);
  });
});
```

**3. E2E Storage Tests with Playwright:**

```typescript
// e2e/storage.spec.ts
import { test, expect } from '@playwright/test';

test('media upload and playback flow', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Upload file
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-fixtures/sample.mp4');

  // Wait for upload to complete
  await expect(page.locator('.media-card')).toBeVisible({ timeout: 10000 });

  // Verify thumbnail is displayed
  await expect(page.locator('.media-card img')).toBeVisible();

  // Click to preview
  await page.locator('.media-card').click();
  await expect(page.locator('video')).toBeVisible();

  // Verify video is playing from OPFS
  const videoSrc = await page.locator('video').getAttribute('src');
  expect(videoSrc).toContain('blob:');
});

test('storage quota warning', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // Check storage quota indicator
  const quotaIndicator = page.locator('.storage-quota');
  await expect(quotaIndicator).toBeVisible();

  // Upload files until quota warning appears
  // (test would need to mock quota for reliable testing)
});
```

#### Debugging Storage Issues

**Enable Storage Debugging:**

```typescript
// Add to App.tsx for development
if (import.meta.env.DEV) {
  // Log all storage operations
  window.storageDebug = true;

  // Monitor quota changes
  setInterval(async () => {
    const estimate = await navigator.storage.estimate();
    console.log('Storage:', {
      used: (estimate.usage / 1024 / 1024).toFixed(2) + ' MB',
      quota: (estimate.quota / 1024 / 1024).toFixed(2) + ' MB',
      percent: ((estimate.usage / estimate.quota) * 100).toFixed(1) + '%',
    });
  }, 5000);
}
```

**Browser DevTools Inspection:**

1. **Chrome DevTools → Application → Storage**
   - IndexedDB: Inspect databases and object stores
   - OPFS: View under "File System" (experimental)

2. **Clear storage during development:**
   ```javascript
   // Run in console to clear all storage
   await indexedDB.databases().then(dbs => {
     dbs.forEach(db => indexedDB.deleteDatabase(db.name));
   });

   const root = await navigator.storage.getDirectory();
   for await (const entry of root.values()) {
     await root.removeEntry(entry.name, { recursive: true });
   }
   ```

#### Cross-Browser Testing

Test storage functionality across different browsers:

```bash
# Run Playwright tests on all browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

**Browser-Specific Considerations:**
- **Firefox**: Different quota calculation, test 2GB limit
- **Chrome**: Best OPFS performance, use for development

### Testing Approach
- Component testing with Vitest + React Testing Library
- E2E testing with Playwright for critical user flows
- Visual regression testing for timeline UI
- Unit tests for utilities and complex logic

### Code Quality
- Use ESLint for code linting
- Use Prettier for code formatting
- Run type checking before commits
- Follow conventional commits for git messages

