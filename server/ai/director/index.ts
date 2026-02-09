import { ScoredSegment, UserConfig } from '../types/index.js';

/**
 * Sorts segments based on score and director preferences (e.g., mood).
 */
export function orderByPreference(segments: ScoredSegment[], config: UserConfig): ScoredSegment[] {
  // Clone array to avoid mutating input
  const sorted = [...segments];

  // Single sort function handling score and mood logic
  sorted.sort((a, b) => {
    const scoreDiff = b.score - a.score;

    // If scores are significantly different, prioritize score
    if (Math.abs(scoreDiff) >= 5) {
      return scoreDiff;
    }

    // If scores are similar, use mood as tie-breaker
    if (config.mood === 'energetic') {
      // Prefer shorter segments for energetic mood
      return a.duration - b.duration;
    } else if (config.mood === 'calm') {
      // Prefer longer segments for calm mood
      return b.duration - a.duration;
    }

    // Default: strict score ordering
    return scoreDiff;
  });

  return sorted;
}

/**
 * Selects the best segments to fit the target duration.
 * Uses a greedy approach to fill the timeline with high-scoring segments.
 */
export function selectByTargetDuration(segments: ScoredSegment[], targetDuration: number): ScoredSegment[] {
  const selected: ScoredSegment[] = [];
  let currentDuration = 0;

  // Iterate through prioritized segments
  for (const segment of segments) {
    // Check if adding this segment would exceed target duration significantly
    // Allow a small buffer (e.g., 5s over target is okay, but generally try to fit)
    // Actually, knapsack problem is hard. Greedy is fine.
    // If we exceed target, skip unless it's the very first segment and target is small?

    if (currentDuration + segment.duration <= targetDuration * 1.05) {
      selected.push(segment);
      currentDuration += segment.duration;
    }

    // Stop if we are within 90% of target duration
    if (currentDuration >= targetDuration * 0.9) {
      break;
    }
  }

  // Re-sort selected segments by time to maintain chronological narrative flow
  return selected.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Main director logic to select final segments.
 */
export function applyDirectorLogic(segments: ScoredSegment[], config: UserConfig): ScoredSegment[] {
  console.log("Applying director logic...");

  // 1. Order segments by preference (score + mood)
  const prioritized = orderByPreference(segments, config);

  // 2. Select segments to fill target duration
  const selected = selectByTargetDuration(prioritized, config.targetDuration);

  return selected;
}
