import { VideoInput, UserConfig, EditPlan, TemplateConfig } from './types/index.js';
import { extractSignals } from './extract/index.js';
import { normalizeSignals } from './normalize/index.js';
import { buildSegments } from './segment/index.js';
import { scoreSegments } from './score/index.js';
import { TemplateEngine } from './template/TemplateEngine.js';

const templateEngine = new TemplateEngine();

function createDefaultTemplate(config: UserConfig): TemplateConfig {
  return {
    name: 'default',
    rules: {
      minSegmentDuration: config.minSegmentDuration,
      maxSegmentDuration: config.maxSegmentDuration,
      targetDuration: config.targetDuration,
      transitions: {
        type: config.mood === 'calm' ? 'fade' : 'cut',
        duration: 0.5
      }
    },
    scoring: {
      keywordBoost: 1.0,
      silencePenalty: 0.5
    },
    branding: {
      intro: 'assets/intro.mp4',
      outro: 'assets/outro.mp4',
      watermark: 'assets/watermark.png',
      music: config.mood === 'energetic' ? 'assets/music-upbeat.mp3' : 'assets/music-calm.mp3'
    }
  };
}

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

    // 5. Apply Template Engine
    console.log(`[AI] Step 5: Applying Template Engine...`);
    const templateConfig = createDefaultTemplate(config);
    const editPlan = templateEngine.run(scoredSegments, templateConfig);

    const endTime = Date.now();
    console.log(`[AI] Processing complete in ${(endTime - startTime) / 1000}s.`);

    return editPlan;

  } catch (error) {
    console.error(`[AI] Error processing video:`, error);
    throw error;
  }
}
