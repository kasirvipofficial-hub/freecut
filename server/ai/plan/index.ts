import { ScoredSegment, EditPlan, UserConfig } from '../types/index.js';

/**
 * Builds the final JSON Edit Plan for the renderer.
 * Converts selected segments into render-ready instructions.
 */
export function buildEditPlan(segments: ScoredSegment[], config: UserConfig): EditPlan {
  console.log("Building edit plan...");

  let currentTime = 0;
  const clips: EditPlan['clips'] = [];
  const transitions: EditPlan['transitions'] = [];

  // Sort segments by start time to maintain narrative flow
  // (Assuming director already sorted, but safe to ensure)
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < sortedSegments.length; i++) {
    const segment = sortedSegments[i];

    // Add clip
    clips.push({
      sourceId: segment.sourceVideoId,
      start: segment.startTime,
      end: segment.endTime,
      volume: 1.0, // Default volume
    });

    // Add transition (except for the last clip)
    if (i < sortedSegments.length - 1) {
      // Simple logic: fade between clips if mood is calm, cut otherwise
      const transitionType = config.mood === 'calm' ? 'fade' : 'cut';
      const duration = transitionType === 'fade' ? 0.5 : 0; // 0.5s fade

      if (duration > 0) {
        transitions.push({
          type: transitionType,
          duration,
          atTime: currentTime + segment.duration, // Transition happens at the end of this clip
        });
      }
    }

    currentTime += segment.duration;
  }

  // Add metadata
  const metadata = {
    totalDuration: currentTime,
    fps: 30, // Standard FPS
    resolution: { width: 1920, height: 1080 }, // Default HD
  };

  return {
    clips,
    transitions,
    metadata,
  };
}
