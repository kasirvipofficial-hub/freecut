export interface PreviewControlsProps {
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (frame: number) => void;
}

export function PreviewControls(props: PreviewControlsProps) {
  // TODO: Implement preview controls
  return null;
}
