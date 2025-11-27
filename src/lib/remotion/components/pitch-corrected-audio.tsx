import React, { useEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig, Internals, getRemotionEnvironment, Audio } from 'remotion';

interface PitchCorrectedAudioProps {
  src: string;
  volume?: number;
  playbackRate?: number;
  trimBefore?: number;
  muted?: boolean;
}

/**
 * Audio component with pitch-preserved playback for rate-stretched audio.
 *
 * During preview: Uses HTML5 audio element with preservesPitch (native browser feature)
 * During render: Uses Remotion's Audio component with playbackRate (uses FFmpeg atempo filter
 *                which preserves pitch automatically)
 *
 * Note: We use Audio from 'remotion' directly instead of '@remotion/media' Audio because:
 * - @remotion/media Audio shows "Unknown container format" warnings for MP3 files
 * - The standard Audio component works reliably with all formats
 */
export const PitchCorrectedAudio: React.FC<PitchCorrectedAudioProps> = ({
  src,
  volume = 1,
  playbackRate = 1,
  trimBefore = 0,
  muted = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const environment = getRemotionEnvironment();
  const [playing] = Internals.Timeline.usePlayingState();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSyncTimeRef = useRef<number>(0);

  // During rendering, use Remotion's Audio component
  // Remotion's playbackRate uses FFmpeg's atempo filter which already preserves pitch
  // So we don't need to apply toneFrequency for pitch correction
  if (environment.isRendering) {
    return (
      <Audio
        src={src}
        volume={muted ? 0 : volume}
        playbackRate={playbackRate}
        trimBefore={trimBefore > 0 ? trimBefore : undefined}
      />
    );
  }

  // Preview mode: Use HTML5 audio with native preservesPitch

  // Create and manage audio element
  useEffect(() => {
    const audio = new window.Audio();
    audio.src = src;
    audio.preload = 'auto';
    // preservesPitch is true by default in browsers, but set explicitly
    audio.preservesPitch = true;
    // @ts-expect-error - webkit prefix for older Safari
    audio.webkitPreservesPitch = true;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, [src]);

  // Update playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Update volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : Math.max(0, Math.min(1, volume));
      audioRef.current.muted = muted;
    }
  }, [volume, muted]);

  // Sync playback with Remotion timeline
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Calculate target time in the source audio
    // frame is the current frame in the composition
    // We need to convert to source time accounting for trim and speed
    const compositionTimeSeconds = frame / fps;
    const sourceTimeSeconds = (trimBefore / fps) + (compositionTimeSeconds * playbackRate);

    if (playing) {
      // Check if we need to seek
      const currentTime = audio.currentTime;
      const timeDiff = Math.abs(currentTime - sourceTimeSeconds);

      // Seek if drift is more than 0.15 seconds (acceptable sync threshold)
      if (timeDiff > 0.15 || lastSyncTimeRef.current === 0) {
        audio.currentTime = sourceTimeSeconds;
        lastSyncTimeRef.current = Date.now();
      }

      // Play if paused
      if (audio.paused) {
        audio.play().catch(() => {
          // Autoplay might be blocked
        });
      }
    } else {
      // Pause and seek to current position
      if (!audio.paused) {
        audio.pause();
      }
      audio.currentTime = sourceTimeSeconds;
      lastSyncTimeRef.current = 0;
    }
  }, [frame, fps, playing, playbackRate, trimBefore]);

  // This component renders nothing visually
  return null;
};
