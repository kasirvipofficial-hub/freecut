import { Signal } from './types/index.js';

/**
 * Extracts metadata signals from a media file.
 * This is a mock implementation that simulates reading video/audio metadata.
 *
 * @param filePath - Path to the media file
 * @returns Promise resolving to a Signal object containing metadata
 */
export async function extractSignals(filePath: string): Promise<Signal> {
  // SIMULATION: In a real app, this would use ffprobe or similar tools
  console.log(`[Mock] Extracting signals from: ${filePath}`);

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const isAudio = filePath.match(/\.(mp3|wav|aac)$/i);

  // Default to video if unknown or mixed, for simplicity in this mock
  const type = isAudio ? 'audio' : 'video';

  // Mock metadata based on file type
  return {
    id: `sig-${Math.random().toString(36).substr(2, 9)}`,
    type,
    duration: 300, // Mock duration: 5 minutes
    metadata: {
      filename: filePath,
      format: filePath.split('.').pop() || 'unknown',
      resolution: type === 'video' ? { width: 1920, height: 1080 } : undefined,
      fps: type === 'video' ? 30 : undefined,
      sampleRate: 48000,
      channels: 2,
    },
  };
}
