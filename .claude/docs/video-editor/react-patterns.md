## React 19 Features for Video Editing

React 19.2 introduces powerful features that enhance video editor performance and developer experience.

### Activity Component for Timeline Performance

The Activity component efficiently hides/shows timeline sections without unmounting:

```tsx
import { Activity } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';

function TimelineSection({ trackId, children }) {
  const isTrackHidden = useTimelineStore((s) => s.hiddenTrackIds.includes(trackId));

  return (
    <Activity mode={isTrackHidden ? 'hidden' : 'visible'}>
      {children}
    </Activity>
  );
}
```

**Benefits for video editing:**
- Hidden mode: Pauses effects, defers updates, saves resources
- Visible mode: Resumes effects and updates
- Faster timeline navigation with many tracks
- Preserves component state when toggling track visibility

### Effect Events for Video Playback Synchronization

Effect Events separate event logic from reactive effects:

```tsx
import { useEffect, useEffectEvent } from 'react';
import { Player } from '@remotion/player';
import { usePlaybackStore } from '@/stores/playbackStore';

function VideoPlayer() {
  const currentFrame = usePlaybackStore((s) => s.currentFrame);
  const playerRef = useRef<PlayerRef>(null);

  // Effect Event - doesn't re-subscribe when dependencies change
  const syncPlayerToFrame = useEffectEvent((frame: number) => {
    playerRef.current?.seekTo(frame);
    console.log('Synced to frame:', frame);
  });

  // Effect only re-runs when currentFrame changes
  useEffect(() => {
    syncPlayerToFrame(currentFrame);
  }, [currentFrame]);

  return <Player ref={playerRef} {...otherProps} />;
}
```

**Why this matters:**
- Prevents unnecessary effect re-subscriptions
- Cleaner code for event-driven updates
- Better performance for real-time playback sync

### Enhanced Concurrent Rendering

React 19 improves concurrent rendering for smooth video preview:

```tsx
import { useDeferredValue, useTransition } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';

function TimelineWithSmoothUpdates() {
  const clips = useTimelineStore((s) => s.clips);
  const [isPending, startTransition] = useTransition();

  // Defer heavy re-renders during playback
  const deferredClips = useDeferredValue(clips);

  const updateClipPosition = (clipId: string, newStart: number) => {
    startTransition(() => {
      // This update won't block user input
      timelineStore.getState().moveClip(clipId, newStart);
    });
  };

  return (
    <div className={isPending ? 'opacity-70' : ''}>
      {deferredClips.map(clip => (
        <Clip key={clip.id} {...clip} />
      ))}
    </div>
  );
}
```

**Performance benefits:**
- Smooth UI updates during video scrubbing
- Non-blocking clip transformations
- Responsive timeline even with many clips

### React 19 Best Practices for Video Editors

1. **Use Activity for large component trees**
   - Timeline tracks with many clips
   - Effect panels that aren't always visible
   - Media library with thousands of assets

2. **Use Effect Events for synchronization**
   - Syncing timeline with video preview
   - Audio waveform updates
   - Export progress callbacks

3. **Use Transitions for heavy updates**
   - Applying effects to multiple clips
   - Timeline zoom operations
   - Batch clip operations

4. **Leverage automatic batching**
   - React 19 automatically batches all state updates
   - No need for manual `unstable_batchedUpdates`
   - Smoother performance out of the box

