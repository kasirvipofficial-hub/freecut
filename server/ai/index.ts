import { VideoInput, UserConfig, EditPlan } from './types/index.js';
import { extractSignals } from './extract/index.js';
import { normalizeSignals } from './normalize/index.js';
import { buildSegments } from './segment/index.js';
import { scoreSegments } from './score/index.js';
import { applyDirectorLogic } from './director/index.js';
import { buildEditPlan } from './plan/index.js';

/**
 * Main Orchestrator for the Freecut AI pipeline.
 * Processes a video from input to final edit plan.
 */
export async function processVideo(input: VideoInput, config: UserConfig): Promise<EditPlan> {
  console.log(`[AI] Starting processing for video: ${input.id}`);
  const startTime = Date.now();

  try {
    // 1. Extract Signals
    console.log(`[AI] Step 1: Extracting signals...`);
    const signals = await extractSignals(input);
    console.log(`[AI] Extracted ${signals.audio.timestamps.length} audio points and ${signals.video.sceneChanges.length} scene changes.`);

    // 2. Normalize Signals
    console.log(`[AI] Step 2: Normalizing signals...`);
    const timeline = normalizeSignals(signals);
    console.log(`[AI] Normalized timeline duration: ${timeline.totalDuration}s`);

    // 3. Build Segments
    console.log(`[AI] Step 3: Building segments...`);
    const segments = buildSegments(timeline, config, input.id);
    console.log(`[AI] Found ${segments.length} potential segments.`);

    // 4. Score Segments
    console.log(`[AI] Step 4: Scoring segments...`);
    const scoredSegments = scoreSegments(segments, timeline, config);
    const avgScore = scoredSegments.reduce((sum, s) => sum + s.score, 0) / scoredSegments.length;
    console.log(`[AI] Scored segments. Average score: ${avgScore.toFixed(2)}`);

    // 5. Apply Director Logic
    console.log(`[AI] Step 5: Applying director logic...`);
    const selectedSegments = applyDirectorLogic(scoredSegments, config);
    const totalDuration = selectedSegments.reduce((sum, s) => sum + s.duration, 0);
    console.log(`[AI] Selected ${selectedSegments.length} segments totaling ${totalDuration.toFixed(2)}s.`);

    // 6. Build Edit Plan
    console.log(`[AI] Step 6: Building edit plan...`);
    const editPlan = buildEditPlan(selectedSegments, config, input);

    const endTime = Date.now();
    console.log(`[AI] Processing complete in ${(endTime - startTime) / 1000}s.`);

    return editPlan;

  } catch (error) {
    console.error(`[AI] Error processing video:`, error);
    throw error;
  }
}
