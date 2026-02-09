import { ScoredSegment, ProcessingOptions } from './types/index.js';

/**
 * Selects and orders segments to create a coherent narrative.
 * Filters segments based on score and fits them into the target duration.
 *
 * @param segments - List of scored segments
 * @param options - Configuration for the final cut (e.g. target duration)
 * @returns Promise resolving to the selected list of segments
 */
export async function applyDirectorLogic(
  segments: ScoredSegment[],
  options: ProcessingOptions = {}
): Promise<ScoredSegment[]> {
  console.log('[Mock] Applying director logic (selection, ordering)...');

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));

  const targetDuration = options.targetDuration || 60; // Default to 60s if not specified
  const minScoreThreshold = 0.5;

  // 1. Filter out low-quality segments
  // In a real app, this might be more complex (e.g., ensure continuity, avoid jump cuts)
  const candidates = segments.filter(s => s.score >= minScoreThreshold);

  // 2. Prioritize higher scoring segments
  // Sort by score descending to greedy-pick the best moments
  candidates.sort((a, b) => b.score - a.score);

  const selected: ScoredSegment[] = [];
  let currentDuration = 0;

  // 3. Select segments until we hit the target duration
  for (const segment of candidates) {
    const segmentDuration = segment.endTime - segment.startTime;

    if (currentDuration + segmentDuration <= targetDuration) {
      selected.push(segment);
      currentDuration += segmentDuration;
    }

    if (currentDuration >= targetDuration) break;
  }

  // 4. Re-order chronologically to maintain narrative flow
  // In a more advanced version, this could reorder for dramatic effect
  selected.sort((a, b) => {
    // If from same signal, sort by time. If different signals, sort by signal ID (arbitrary for now)
    if (a.signalId === b.signalId) {
      return a.startTime - b.startTime;
    }
    return a.signalId.localeCompare(b.signalId);
  });

  return selected;
}
