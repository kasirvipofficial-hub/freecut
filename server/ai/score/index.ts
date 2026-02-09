import { Segment, ScoredSegment, UserConfig, NormalizedTimeline } from '../types/index.js';

/**
 * Calculates a quality score and details for a segment.
 */
export function calculateScore(segment: Segment, timeline: NormalizedTimeline, config: UserConfig): { score: number, details: ScoredSegment['scoreDetails'] } {
  let score = 50; // Base score

  // 1. Calculate average energy
  let totalEnergy = 0;
  let count = 0;

  // Find relevant timeline points
  // Optimized: Since points are sorted by time, we can filter efficiently or just iterate
  // For simplicity: iteration
  for (const point of timeline.timePoints) {
    if (point.time >= segment.startTime && point.time < segment.endTime) {
      totalEnergy += point.audioEnergy;
      count++;
    }
  }

  const avgEnergy = count > 0 ? totalEnergy / count : 0;
  const energyScore = avgEnergy * 30; // Max +30
  score += energyScore;

  // Use deterministic pseudo-randomness based on segment properties
  const seed = (segment.startTime * 13 + segment.duration * 7) % 100 / 100;

  // 2. Keyword matching (simulated)
  // Deterministic mock based on seed > 0.7
  const keywordMatchScore = config.keywords.length > 0 ? (seed > 0.7 ? 20 : 0) : 0;
  score += keywordMatchScore;

  // 3. Word Density (simulated)
  // Higher density usually means more content
  // Deterministic mock based on inverse seed
  const wordDensityScore = (1 - seed) * 20; // Max +20
  score += wordDensityScore;

  // 4. Penalties
  // Filler words (simulated)
  // Deterministic mock based on seed > 0.8
  const penalty = seed > 0.8 ? -10 : 0;
  score += penalty;

  // Clamp score
  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    details: {
      wordDensity: wordDensityScore,
      energyLevel: energyScore,
      keywordMatch: keywordMatchScore,
      penalty: penalty
    }
  };
}

/**
 * Assigns scores to all segments.
 */
export function scoreSegments(segments: Segment[], timeline: NormalizedTimeline, config: UserConfig): ScoredSegment[] {
  console.log("Scoring segments...");

  return segments.map(segment => {
    const { score, details } = calculateScore(segment, timeline, config);

    return {
      ...segment,
      score,
      scoreDetails: details
    };
  });
}
