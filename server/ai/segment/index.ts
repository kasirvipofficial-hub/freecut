import { NormalizedTimeline, Segment, UserConfig } from '../types/index.js';

/**
 * Identify potential cut points in the timeline.
 * Cut points are typically where:
 * 1. Significant silence occurs (energy drops below threshold)
 * 2. A scene change is detected
 */
function findCutPoints(timeline: NormalizedTimeline, minDuration: number): number[] {
  const cutPoints = [0]; // Always start at 0
  let lastCut = 0;

  for (let i = 1; i < timeline.timePoints.length; i++) {
    const point = timeline.timePoints[i];

    // Simple logic:
    // If energy drops below 0.1 (silence)
    // Or scene change occurs
    const isSilence = point.audioEnergy < 0.1;
    const isSceneChange = point.isSceneChange;

    // Ensure minimum segment duration is respected before adding a cut
    // This prevents creating segments shorter than minDuration
    if ((point.time - lastCut) >= minDuration) {
      if (isSilence || isSceneChange) {
        cutPoints.push(point.time);
        lastCut = point.time;
      }
    }
  }

  // Ensure the end of the video is a cut point
  // But only if the last segment is long enough, otherwise merge it or extend last cut
  if (lastCut < timeline.totalDuration) {
    if (timeline.totalDuration - lastCut >= minDuration) {
      cutPoints.push(timeline.totalDuration);
    } else {
      // If the last chunk is too short, extend the previous segment (remove the last cut point and set end to totalDuration)
      // Exception: if only 0 exists, we just push totalDuration (making one short segment if video is very short)
      if (cutPoints.length > 1) {
        cutPoints.pop();
        cutPoints.push(timeline.totalDuration);
      } else {
        cutPoints.push(timeline.totalDuration);
      }
    }
  }

  return cutPoints;
}

/**
 * Assembles segments from cut points.
 * Handles max duration constraints by splitting long segments.
 */
function assembleSegments(cutPoints: number[], sourceVideoId: string, maxDuration: number): Segment[] {
  const segments: Segment[] = [];
  let segmentCount = 0;

  for (let i = 0; i < cutPoints.length - 1; i++) {
    const start = cutPoints[i];
    const end = cutPoints[i + 1];
    const duration = end - start;

    // Check max duration constraint
    if (duration > maxDuration) {
      // Split long segment into smaller chunks
      const numChunks = Math.ceil(duration / maxDuration);
      const chunkDuration = duration / numChunks;

      for (let j = 0; j < numChunks; j++) {
        const chunkStart = start + j * chunkDuration;
        const chunkEnd = Math.min(start + (j + 1) * chunkDuration, end);

        segments.push({
          id: `${sourceVideoId}_seg_${segmentCount++}`,
          sourceVideoId,
          startTime: chunkStart,
          endTime: chunkEnd,
          duration: chunkEnd - chunkStart,
        });
      }
    } else {
      segments.push({
        id: `${sourceVideoId}_seg_${segmentCount++}`,
        sourceVideoId,
        startTime: start,
        endTime: end,
        duration,
      });
    }
  }

  return segments;
}

/**
 * Main function to build logical segments from normalized timeline.
 */
export function buildSegments(timeline: NormalizedTimeline, config: UserConfig, sourceVideoId: string): Segment[] {
  console.log("Building segments...");

  // Step 1: Find potential cut points based on silence and scene changes
  const cutPoints = findCutPoints(timeline, config.minSegmentDuration);

  // Step 2: Assemble these into valid segments, handling max duration constraints
  const segments = assembleSegments(cutPoints, sourceVideoId, config.maxSegmentDuration);

  return segments;
}
