import type { TimelineTrack, TimelineClip } from '@/types/timeline';
import type { RemotionTrack, RemotionItem, RemotionInputProps } from '@/types/export';
import { secondsToFrames } from '@/utils/time-utils';

export function convertTimelineToRemotion(
  tracks: TimelineTrack[],
  clips: TimelineClip[],
  fps: number
): RemotionInputProps {
  // TODO: Implement timeline to Remotion conversion
  // IMPORTANT: Convert seconds to frames using secondsToFrames utility!
  return {
    fps,
    tracks: [],
  };
}
