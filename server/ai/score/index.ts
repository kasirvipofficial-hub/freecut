import { Segment, ScoredSegment, UserConfig, NormalizedTimeline, DecisionTrace } from '../types/index.js';

const SCORING_WEIGHTS = {
  AUDIO_ENERGY: 30,
  KEYWORD_MATCH: 20,
  WORD_DENSITY: 20,
  SILENCE_PENALTY: -20, // Negative weight for penalty
  EMOTION_BONUS: 10,
};

/**
 * Calculates a quality score and generates a decision trace for a segment.
 */
export function calculateScore(segment: Segment, timeline: NormalizedTimeline, config: UserConfig): { score: number, explain: DecisionTrace } {
  let score = 50; // Base score
  const reasons: string[] = ["Base score of 50"];
  const weights: Record<string, number> = {};

  // 1. Calculate average energy
  let totalEnergy = 0;
  let count = 0;

  for (const point of timeline.timePoints) {
    if (point.time >= segment.startTime && point.time < segment.endTime) {
      totalEnergy += point.audioEnergy;
      count++;
    }
  }

  const avgEnergy = count > 0 ? totalEnergy / count : 0;
  const energyScore = avgEnergy * SCORING_WEIGHTS.AUDIO_ENERGY;
  score += energyScore;

  if (energyScore > 5) {
    reasons.push(`High audio energy (${avgEnergy.toFixed(2)}) contributed +${energyScore.toFixed(0)}`);
    weights['audioEnergy'] = energyScore;
  } else if (energyScore < 2) {
    reasons.push(`Low audio energy (${avgEnergy.toFixed(2)})`);
    weights['audioEnergy'] = energyScore;
  }

  // Use deterministic pseudo-randomness based on segment properties for simulation
  const seed = (segment.startTime * 13 + segment.duration * 7) % 100 / 100;

  // 2. Keyword matching (simulated based on analysis result if available, or mock)
  // Check if keywords from config appear in the segment (simulated)
  // In a real implementation, we would check timeline.analysis.detectedKeywords against segment time
  const hasKeyword = config.keywords.length > 0 && seed > 0.7; // Mock simulation
  const keywordMatchScore = hasKeyword ? SCORING_WEIGHTS.KEYWORD_MATCH : 0;
  score += keywordMatchScore;

  if (hasKeyword) {
    reasons.push(`Contains prioritized keywords (${config.keywords.join(', ')})`);
    weights['keywordMatch'] = keywordMatchScore;
  }

  // 3. Word Density / Activity (simulated)
  const wordDensityScore = (1 - seed) * SCORING_WEIGHTS.WORD_DENSITY;
  score += wordDensityScore;
  weights['wordDensity'] = wordDensityScore;
  if (wordDensityScore > 10) {
    reasons.push(`High speech density`);
  }

  // 4. Penalties (Silence / Filler)
  // Mock: if seed > 0.8, consider it has silence or filler
  const isSilence = avgEnergy < 0.1;
  const penalty = isSilence ? SCORING_WEIGHTS.SILENCE_PENALTY : 0;
  score += penalty;

  if (isSilence) {
    reasons.push(`Penalty for silence/low energy`);
    weights['silencePenalty'] = penalty;
  }

  // Clamp score
  const finalScore = Math.min(100, Math.max(0, score));

  return {
    score: finalScore,
    explain: {
      reasons,
      weights,
      // rejectedBecause is populated by the director later
    }
  };
}

/**
 * Assigns scores to all segments.
 */
export function scoreSegments(segments: Segment[], timeline: NormalizedTimeline, config: UserConfig): ScoredSegment[] {
  console.log("Scoring segments...");

  return segments.map(segment => {
    const { score, explain } = calculateScore(segment, timeline, config);

    return {
      ...segment,
      score,
      explain
    };
  });
}
