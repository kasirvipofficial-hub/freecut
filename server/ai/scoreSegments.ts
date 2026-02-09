import { Segment, ScoredSegment } from './types/index.js';

/**
 * Assigns quality scores to segments based on features.
 * Mock implementation that prioritizes speech and visual interest over silence.
 *
 * @param segments - List of raw segments
 * @returns Promise resolving to scored segments
 */
export async function scoreSegments(segments: Segment[]): Promise<ScoredSegment[]> {
  console.log('[Mock] Scoring segments (quality assessment)...');

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 50));

  return segments.map(segment => {
    let score = 0;
    let reason = '';

    // Simple heuristic scoring logic based on type and features
    switch (segment.type) {
      case 'speech': {
        // Favor longer speech segments with good audio levels
        const audioQuality = segment.features?.audioLevel || 0;
        const lengthBonus = (segment.endTime - segment.startTime) > 3 ? 0.2 : 0;
        score = Math.min(0.6 + (audioQuality * 0.3) + lengthBonus, 0.99);
        reason = 'Speech content detected';
        break;
      }

      case 'visual_interest': {
        // Favor segments with high visual activity
        const visualQuality = segment.features?.visualActivity || 0;
        score = Math.min(0.5 + (visualQuality * 0.4), 0.95);
        reason = 'High visual activity';
        break;
      }

      case 'silence':
        // Deprioritize silence, but don't zero it out completely (might be needed for pacing)
        score = 0.1;
        reason = 'Low audio/visual activity';
        break;

      default:
        score = 0.2;
        reason = 'Unknown content type';
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(1, score));

    return {
      ...segment,
      score,
      reason,
    };
  });
}
