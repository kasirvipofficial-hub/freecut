export interface UsePlaybackOptions {
  fps?: number;
  totalFrames?: number;
  onFrameChange?: (frame: number) => void;
}

export function usePlayback(options: UsePlaybackOptions = {}) {
  // TODO: Implement playback hook
  return {
    currentFrame: 0,
    isPlaying: false,
    play: () => {},
    pause: () => {},
    seek: (frame: number) => {},
    togglePlayPause: () => {},
  };
}
