import { Signal, Segment } from './types/index.js';

/**
 * Segments signals into logical clips based on content analysis.
 * Uses mock logic to simulate VAD (Voice Activity Detection) and scene detection.
 *
 * @param signals - List of normalized signals
 * @returns Promise resolving to a list of Segments
 */
export async function buildSegments(signals: Signal[]): Promise<Segment[]> {
  console.log('[Mock] Building segments (VAD, scene detection)...');

  // Simulate processing delay per signal
  await new Promise(resolve => setTimeout(resolve, signals.length * 100));

  const segments: Segment[] = [];

  for (const signal of signals) {
    let currentTime = 0;
    const duration = signal.duration;

    // Simulate slicing the signal into chunks
    while (currentTime < duration) {
      // Random segment length between 2 and 15 seconds
      const segmentDuration = Math.min(Math.random() * 13 + 2, duration - currentTime);
      const endTime = currentTime + segmentDuration;

      // Randomly assign type based on probability
      const rand = Math.random();
      let type: Segment['type'];

      if (rand > 0.4) type = 'speech';       // 60% speech
      else if (rand > 0.2) type = 'visual_interest'; // 20% visual only
      else type = 'silence';                 // 20% silence/noise

      segments.push({
        id: `seg-${Math.random().toString(36).substring(2, 10)}`,
        signalId: signal.id,
        startTime: currentTime,
        endTime: endTime,
        type,
        features: {
          audioLevel: type === 'silence' ? Math.random() * 0.1 : Math.random() * 0.5 + 0.5,
          wordCount: type === 'speech' ? Math.floor(segmentDuration * 3) : 0,
          visualActivity: type === 'visual_interest' ? Math.random() * 0.5 + 0.5 : Math.random() * 0.4,
        },
      });

      currentTime = endTime;
    }
  }

  return segments;
}
