import { ScoredSegment, EditPlan, UserConfig, EditSegment } from '../types/index.js';

/**
 * Builds the final JSON Edit Plan for the renderer.
 * Converts selected segments into render-ready instructions.
 */
export function buildEditPlan(segments: ScoredSegment[], config: UserConfig): EditPlan {
  console.log("Building edit plan...");

  // Sort segments by start time to maintain narrative flow
  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  const editSegments: EditSegment[] = sortedSegments.map((segment, index) => {
    const isLast = index === sortedSegments.length - 1;
    let transition: string | undefined;

    if (!isLast) {
      // Simple logic: fade between clips if mood is calm, cut otherwise
      transition = config.mood === 'calm' ? 'fade' : 'cut';
    }

    return {
      id: segment.id,
      start: segment.startTime,
      end: segment.endTime,
      score: segment.score,
      actions: {
        video: [segment.sourceVideoId],
        audio: [segment.sourceVideoId],
        transition,
      },
      explain: segment.explain
    };
  });

  return {
    meta: {
      template: 'default',
      targetDuration: config.targetDuration,
      mood: config.mood,
      fps: 30,
      resolution: { width: 1920, height: 1080 }
    },
    segments: editSegments,
    branding: {
      intro: 'assets/intro.mp4',
      outro: 'assets/outro.mp4',
      watermark: 'assets/watermark.png',
      music: config.mood === 'energetic' ? 'assets/music-upbeat.mp3' : 'assets/music-calm.mp3'
    }
  };
}
