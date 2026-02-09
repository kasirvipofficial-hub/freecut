import { ScoredSegment, EditPlan, UserConfig, VideoInput, AssetMap } from '../types/index.js';

/**
 * Builds the final JSON Edit Plan for the renderer.
 * Converts selected segments into render-ready instructions.
 */
export function buildEditPlan(segments: ScoredSegment[], config: UserConfig, input?: VideoInput): EditPlan {
  console.log("Building edit plan...");

  // Sort segments by start time to maintain narrative flow
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  const clips: EditPlan['clips'] = sortedSegments.map(segment => ({
    sourceId: segment.sourceVideoId,
    start: segment.startTime,
    end: segment.endTime,
    volume: 1.0,
    // Add zoom intent based on score
    zoom: segment.score > 80
  }));

  const transitions: EditPlan['transitions'] = [];
  let currentTime = 0;

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipDuration = clip.end - clip.start;

    // Simple transition logic
    if (i < clips.length - 1) {
       const type = config.mood === 'calm' ? 'fade' : 'cut';
       if (type !== 'cut') {
           transitions.push({
               type: type as any,
               duration: 0.5,
               atTime: currentTime + clipDuration
           });
       }
    }
    currentTime += clipDuration;
  }

  // Build Asset Map if input is provided
  const assetMap: AssetMap = {};
  if (input) {
      // Map the main video source
      assetMap[input.id] = {
          type: 'video',
          src: input.filePath
      };
  }

  return {
    clips,
    transitions,
    metadata: {
      totalDuration: currentTime,
      fps: 30,
      resolution: { width: 1920, height: 1080 }
    },
    branding: undefined,
    captions: false,
    decisionTrace: segments.map(s => s.explain),
    assetMap,
    debug: true
  };
}
