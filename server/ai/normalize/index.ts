import { SignalData, NormalizedTimeline, AudioSignals } from '../types/index.js';

/**
 * Normalizes raw signals into a unified timeline.
 * Aligns audio and video timestamps, smooths energy curves, and maps metadata.
 */
export function normalizeSignals(signals: SignalData): NormalizedTimeline {
  console.log("Normalizing signals...");

  const { audio, video, duration } = signals;

  // Create a timeline with 1-second intervals for simplicity in this mock
  // In a real scenario, this might be frame-accurate (e.g., 30fps)
  const timePoints: NormalizedTimeline['timePoints'] = [];

  for (let t = 0; t <= duration; t++) {
    // Interpolate or find nearest energy level
    const audioEnergy = getInterpolatedEnergy(t, audio);

    // Check if this time point falls within a speech segment
    const isSpeech = checkIsSpeech(t, audio.transcription);

    // Check if a scene change occurs near this time
    const isSceneChange = checkIsSceneChange(t, video.sceneChanges);

    timePoints.push({
      time: t,
      audioEnergy,
      isSpeech,
      isSceneChange,
    });
  }

  return {
    timePoints,
    totalDuration: duration,
  };
}

/**
 * Helper: Get energy level at a specific time.
 * Uses a simple nearest-neighbor approach for the mock.
 */
function getInterpolatedEnergy(time: number, audio: AudioSignals): number {
  if (!audio.timestamps || audio.timestamps.length === 0) return 0;

  // Find the closest timestamp index
  // Timestamps are assumed sorted
  const index = audio.timestamps.findIndex(ts => ts >= time);

  if (index === -1) {
    // If time is beyond the last timestamp, use the last known energy
    return audio.energy[audio.energy.length - 1] || 0;
  }

  if (index === 0) {
    return audio.energy[0] || 0;
  }

  // Linear interpolation could be done here, but nearest neighbor is fine for mock
  return audio.energy[index] || 0;
}

/**
 * Helper: Check if time falls within a speech segment.
 */
function checkIsSpeech(time: number, transcription: AudioSignals['transcription']): boolean {
  if (!transcription) return false;
  return transcription.some(seg => time >= seg.startTime && time <= seg.endTime);
}

/**
 * Helper: Check if a scene change occurs near this time.
 */
function checkIsSceneChange(time: number, sceneChanges: number[]): boolean {
  // Allow a small window (e.g., +/- 0.5s) for scene changes
  return sceneChanges.some(change => Math.abs(change - time) < 0.5);
}
