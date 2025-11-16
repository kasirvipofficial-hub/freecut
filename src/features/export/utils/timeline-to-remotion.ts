import type { TimelineTrack, TimelineClip } from '@/types/timeline';
import type { RemotionTrack, RemotionItem, RemotionInputProps } from '@/types/export';

export function convertTimelineToRemotion(
  tracks: TimelineTrack[],
  clips: TimelineClip[],
  fps: number
): RemotionInputProps {
  // TODO: Implement timeline to Remotion conversion
  // IMPORTANT: Convert seconds to frames!
  return {
    fps,
    tracks: [],
  };
}

export function secondsToFrames(seconds: number, fps: number): number {
  // TODO: Implement seconds to frames conversion
  return Math.round(seconds * fps);
}
