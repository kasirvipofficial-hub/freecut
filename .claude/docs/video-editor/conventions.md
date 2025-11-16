## Project Conventions

### File Naming
- **Components**: PascalCase (e.g., `VideoPreview.tsx`)
- **Utilities/Hooks**: kebab-case (e.g., `use-playback.ts`, `time-utils.ts`)
- **Types**: PascalCase (e.g., `timeline.ts` containing `TimelineClip` type)
- **Stores**: kebab-case with "-store" suffix (e.g., `playback-store.ts`, `timeline-store.ts`)

### Component Structure
```tsx
// 1. Imports (React, libraries, local)
// 2. Types/Interfaces
// 3. Component definition
// 4. Zustand store hooks (with selectors)
// 5. Event handlers
// 6. Render logic
// 7. Export
```

### State Management Guidelines (Zustand)
- Create stores in `stores/` directory with descriptive names
- **Use granular selectors** to prevent unnecessary re-renders
  ```tsx
  // ❌ Bad - selects entire state, causes re-renders on any change
  const state = useEditorStore();

  // ✅ Good - only re-renders when currentFrame changes
  const currentFrame = useEditorStore((state) => state.currentFrame);
  ```
- **Export custom selector hooks** for commonly used values
  ```tsx
  export const useCurrentFrame = () => useEditorStore(s => s.currentFrame);
  export const useIsPlaying = () => usePlaybackStore(s => s.isPlaying);
  ```
- **Use `useShallow` for selecting multiple primitives (v5 recommended)**
  ```tsx
  import { useShallow } from 'zustand/react/shallow';

  const { width, height, fps } = useEditorStore(
    useShallow((state) => ({
      width: state.videoWidth,
      height: state.videoHeight,
      fps: state.fps
    }))
  );
  ```

  **Backward compatible (also works in v5):**
  ```tsx
  import { shallow } from 'zustand/shallow';

  const { width, height, fps } = useEditorStore(
    (state) => ({ width: state.width, height: state.height, fps: state.fps }),
    shallow
  );
  ```
- **Leverage middleware** for cross-cutting concerns
  - `persist` for localStorage/sessionStorage
  - `devtools` for Redux DevTools integration
  - `immer` for immutable state updates
  - `temporal` (zundo) for undo/redo
- Keep stores focused on specific domains (timeline, playback, selection)
- Actions should be co-located with state in the same store

### Import Organization (v5)
```tsx
// 1. React and external libraries
import React from 'react';
import { Button } from '@/components/ui/button';
import { useShallow } from 'zustand/react/shallow'; // v5 recommended

// 2. Stores and selectors
import { usePlaybackStore, useCurrentFrame } from '@/stores/playback-store';
import { useTimelineStore } from '@/stores/timeline-store';

// 3. Components
import { Clip } from './Clip';

// 4. Utilities and types
import { formatTime } from '@/utils/time-utils';
import type { TimelineClip } from '@/types/clip';
```

### TypeScript Guidelines (v5.9.3)

#### General Best Practices
- Always define prop types for components
- Use `type` for object shapes, `interface` for extensible contracts
- Avoid `any` - use `unknown` if type is truly unknown
- Export types from dedicated files in `types/` directory
- Type your Zustand stores with interfaces
  ```tsx
  interface PlaybackState {
    currentFrame: number;
    isPlaying: boolean;
    setCurrentFrame: (frame: number) => void;
  }

  export const usePlaybackStore = create<PlaybackState>()(...);
  ```

#### TypeScript 5.9 Features for Video Editors

**1. Import Defer for Large Video Processing Modules**

Use `import defer` to optimize loading of heavy video processing libraries:

```tsx
// Deferred import - loads only when actually used
import defer * as mediabunny from 'mediabunny';

function VideoProcessor() {
  const processVideo = async () => {
    // mediabunny is loaded only when this function is called
    const result = await mediabunny.encode({ /* options */ });
    return result;
  };

  return <button onClick={processVideo}>Process Video</button>;
}
```

**Benefits:**
- Faster initial page load
- Video processing libraries loaded on-demand
- Smaller initial bundle size

**2. Improved Type Safety for Remotion Components**

TypeScript 5.9 provides better inference for complex component props:

```tsx
import { AbsoluteFill } from 'remotion';

interface CompositionProps {
  clips: Clip[];
  currentFrame: number;
}

// Better type inference in TS 5.9
const MyComposition: React.FC<CompositionProps> = ({ clips, currentFrame }) => {
  return (
    <AbsoluteFill>
      {clips.map(clip => (
        <ClipRenderer key={clip.id} clip={clip} frame={currentFrame} />
      ))}
    </AbsoluteFill>
  );
};
```

**3. Enhanced Module Resolution (Node.js v20)**

Configure `tsconfig.json` for optimal module resolution:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**4. Type-Safe Event Handlers with Inference**

Better type inference for video player events:

```tsx
import { Player, PlayerRef } from '@remotion/player';

function VideoPlayer() {
  const handleFrameChange = (frame: number) => {
    // TypeScript 5.9 correctly infers frame type from Player component
    console.log('Current frame:', frame);
  };

  return (
    <Player
      onFrameChange={handleFrameChange} // Fully type-checked
      // ...
    />
  );
}
```

**5. Strict Null Checks for Video Processing**

Use strict null checks to prevent runtime errors:

```tsx
interface VideoClip {
  id: string;
  videoUrl?: string; // Optional
  duration: number;
}

function renderClip(clip: VideoClip) {
  // TS 5.9 catches this - videoUrl might be undefined
  // const url = clip.videoUrl.toLowerCase(); // ❌ Error

  // Proper null handling
  const url = clip.videoUrl?.toLowerCase() ?? 'no-video'; // ✅ Safe
  return url;
}
```

#### TypeScript Configuration Best Practices

**Recommended `tsconfig.json` for Video Editor:**

```json
{
  "compilerOptions": {
    // Modern JavaScript
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    // Type checking
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,

    // React
    "jsx": "react-jsx",

    // Paths
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@components/*": ["./src/components/*"],
      "@stores/*": ["./src/stores/*"],
      "@types/*": ["./src/types/*"]
    },

    // Performance
    "skipLibCheck": true,
    "incremental": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "build"]
}
```

