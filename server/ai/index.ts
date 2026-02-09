import { extractSignals } from './extractSignals.js';
import { normalizeSignals } from './normalizeSignals.js';
import { buildSegments } from './buildSegments.js';
import { scoreSegments } from './scoreSegments.js';
import { applyDirectorLogic } from './applyDirectorLogic.js';
import { buildEditPlan } from './buildEditPlan.js';
import { ProcessingOptions, EditPlan } from './types/index.js';

/**
 * Main Orchestrator for the AI Video Processing Pipeline.
 *
 * Flow:
 * 1. extractSignals: Reads metadata from input files.
 * 2. normalizeSignals: Aligns timestamps and formats.
 * 3. buildSegments: Slices signals into logical clips (VAD/Scene Detection).
 * 4. scoreSegments: Assigns quality scores to each segment.
 * 5. applyDirectorLogic: Selects and orders segments to tell a story.
 * 6. buildEditPlan: Generates the final JSON instructions for rendering.
 *
 * @param filePaths - Array of paths to source media files
 * @param options - Configuration options (e.g. target duration)
 * @returns Promise resolving to the final EditPlan
 */
export async function processVideo(filePaths: string[], options: ProcessingOptions = {}): Promise<EditPlan> {
  console.log(`[AI Orchestrator] Starting processing for ${filePaths.length} files...`);
  const startTime = Date.now();

  try {
    // Stage 1: Extraction
    console.log('[Step 1/6] Extracting signals...');
    const signals = await Promise.all(filePaths.map(path => extractSignals(path)));

    // Stage 2: Normalization
    console.log('[Step 2/6] Normalizing signals...');
    const normalizedSignals = await normalizeSignals(signals);

    // Stage 3: Segmentation
    console.log('[Step 3/6] Building segments...');
    const segments = await buildSegments(normalizedSignals);
    console.log(`           Found ${segments.length} raw segments.`);

    // Stage 4: Scoring
    console.log('[Step 4/6] Scoring segments...');
    const scoredSegments = await scoreSegments(segments);

    // Stage 5: Decision Making
    console.log('[Step 5/6] Applying director logic...');
    const selectedSegments = await applyDirectorLogic(scoredSegments, options);
    console.log(`           Selected ${selectedSegments.length} segments for final cut.`);

    // Stage 6: Output Generation
    console.log('[Step 6/6] Building edit plan...');
    const editPlan = await buildEditPlan(selectedSegments);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[AI Orchestrator] Processing complete in ${elapsed}s.`);

    return editPlan;

  } catch (error) {
    console.error('[AI Orchestrator] Processing failed:', error);
    throw error;
  }
}

// Export all types and sub-modules for flexibility/testing
export * from './types/index.js';
export * from './extractSignals.js';
export * from './normalizeSignals.js';
export * from './buildSegments.js';
export * from './scoreSegments.js';
export * from './applyDirectorLogic.js';
export * from './buildEditPlan.js';
