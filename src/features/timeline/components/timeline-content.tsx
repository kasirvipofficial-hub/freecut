import { useMemo, useRef, useEffect, useState } from 'react';

// Stores and selectors
import { useTimelineStore } from '../stores/timeline-store';
import { useTimelineZoom } from '../hooks/use-timeline-zoom';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';

// Components
import { TimelineMarkers } from './timeline-markers';
import { TimelinePlayhead } from './timeline-playhead';
import { TimelineTrack } from './timeline-track';

export interface TimelineContentProps {
  duration: number; // Total timeline duration in seconds
}

/**
 * Timeline Content Component
 *
 * Main timeline rendering area that composes:
 * - TimelineMarkers (time ruler)
 * - TimelinePlayhead (in ruler)
 * - TimelineTracks (all tracks with items)
 * - TimelinePlayhead (through tracks)
 *
 * Dynamically calculates width based on furthest item
 */
export function TimelineContent({ duration }: TimelineContentProps) {
  // Use granular selectors - Zustand v5 best practice
  const tracks = useTimelineStore((s) => s.tracks);
  const items = useTimelineStore((s) => s.items);
  const fps = useTimelineStore((s) => s.fps);
  const { timeToPixels, pixelsToTime, frameToPixels, setZoom, zoomLevel } = useTimelineZoom({
    minZoom: 0.1,
    maxZoom: 2, // Match slider range
  });
  const currentFrame = usePlaybackStore((s) => s.currentFrame);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width - run after render and on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Measure immediately
    updateWidth();

    // Also measure after a short delay to ensure DOM is ready
    const timer = setTimeout(updateWidth, 0);

    // Measure on resize
    window.addEventListener('resize', updateWidth);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  // Also remeasure when items change (timeline might resize)
  useEffect(() => {
    if (containerRef.current) {
      const width = containerRef.current.clientWidth;
      if (width > 0 && width !== containerWidth) {
        setContainerWidth(width);
      }
    }
  }, [items, containerWidth]);

  // Calculate the actual timeline duration and width based on content
  const { actualDuration, timelineWidth } = useMemo(() => {
    // Find the furthest item end position
    const furthestItemEnd = items.reduce((max, item) => {
      const itemEnd = (item.from + item.durationInFrames) / fps; // Convert to seconds
      return Math.max(max, itemEnd);
    }, duration); // Use duration as minimum

    // Calculate how much duration the viewport represents
    // Use measured containerWidth or fallback to 1920px (typical desktop width)
    const effectiveContainerWidth = containerWidth > 0 ? containerWidth : 1920;
    const viewportDuration = pixelsToTime(effectiveContainerWidth);

    // Add generous padding: at least viewport width + 20 seconds buffer
    // This ensures when scrolled to the end, there's still content visible
    const padding = viewportDuration + 20;
    const totalDuration = Math.max(duration, furthestItemEnd + padding);

    // Convert to pixels and add extra 200px buffer for scrollbar and edge cases
    const width = Math.max(timeToPixels(totalDuration), effectiveContainerWidth) + 200;

    return { actualDuration: totalDuration, timelineWidth: width };
  }, [items, duration, fps, timeToPixels, pixelsToTime, containerWidth]);

  // Handle Ctrl+Scroll zoom with playhead anchoring
  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    // Only handle zoom when Ctrl (Windows/Linux) or Cmd (Mac) is pressed
    if (!event.ctrlKey && !event.metaKey) {
      return; // Allow normal scrolling
    }

    // Note: preventDefault is handled globally in App.tsx
    const container = containerRef.current;
    if (!container) return;

    // Calculate playhead position before zoom
    const playheadPixelsBefore = frameToPixels(currentFrame);
    const scrollLeft = container.scrollLeft;
    const playheadRelativeToViewport = playheadPixelsBefore - scrollLeft;

    // Calculate zoom delta with medium sensitivity
    // Negative deltaY = scroll up = zoom in, Positive deltaY = scroll down = zoom out
    const zoomFactor = 1 - event.deltaY * 0.001;

    // Apply zoom (setZoom handles min/max bounds internally)
    const newZoomLevel = zoomLevel * zoomFactor;
    setZoom(newZoomLevel);

    // Schedule scroll adjustment after zoom is applied and DOM updates
    requestAnimationFrame(() => {
      if (!containerRef.current) return;

      // Calculate new playhead position after zoom
      const playheadPixelsAfter = frameToPixels(currentFrame);

      // Adjust scroll to keep playhead in same visual position
      const newScrollLeft = playheadPixelsAfter - playheadRelativeToViewport;
      containerRef.current.scrollLeft = Math.max(0, newScrollLeft);
    });
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-x-auto overflow-y-hidden relative bg-background/30 timeline-container"
      onWheel={handleWheel}
    >
      {/* Time Ruler */}
      <div className="relative timeline-ruler" style={{ width: `${timelineWidth}px` }}>
        <TimelineMarkers duration={actualDuration} width={timelineWidth} />
        <TimelinePlayhead inRuler />
      </div>

      {/* Track lanes */}
      <div className="relative timeline-tracks" style={{ width: `${timelineWidth}px` }}>
        {tracks.map((track) => (
          <TimelineTrack key={track.id} track={track} items={items} timelineWidth={timelineWidth} />
        ))}

        {/* Playhead line through all tracks */}
        <TimelinePlayhead />
      </div>
    </div>
  );
}
