import { ScoredSegment, EditPlan, EditPlanClip } from './types/index.js';

/**
 * Constructs the final Edit Plan (JSON) from the selected segments.
 * The Edit Plan is a declarative instruction set for the rendering engine.
 *
 * @param segments - Ordered list of segments to include in the video
 * @returns Promise resolving to the complete EditPlan
 */
export async function buildEditPlan(segments: ScoredSegment[]): Promise<EditPlan> {
  console.log('[Mock] Building edit plan (generating JSON instructions)...');

  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 20));

  let currentTimelineTime = 0;
  const clips: EditPlanClip[] = [];

  for (const segment of segments) {
    const duration = segment.endTime - segment.startTime;

    clips.push({
      id: `clip-${Math.random().toString(36).substring(2, 10)}`,
      sourceId: segment.signalId,
      sourceStartTime: segment.startTime,
      sourceEndTime: segment.endTime,
      targetStartTime: currentTimelineTime,
      duration,
    });

    currentTimelineTime += duration;
  }

  // Construct final plan
  const plan: EditPlan = {
    projectId: `proj-${Date.now().toString(36)}`,
    totalDuration: currentTimelineTime,
    clips,
    generatedAt: new Date().toISOString(),
    metadata: {
      resolution: { width: 1920, height: 1080 }, // Default assumption
      fps: 30, // Default assumption
    },
  };

  return plan;
}
