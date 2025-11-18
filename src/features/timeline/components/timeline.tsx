import { useEffect } from 'react';
import { TimelineHeader } from './timeline-header';
import { TimelineContent } from './timeline-content';
import { TrackHeader } from './track-header';
import { useTimelineTracks } from '../hooks/use-timeline-tracks';
import { useSelectionStore } from '@/features/editor/stores/selection-store';

export interface TimelineProps {
  duration: number; // Total timeline duration in seconds
}

/**
 * Complete Timeline Component
 *
 * Combines:
 * - TimelineHeader (controls, zoom, snap)
 * - Track Headers Sidebar (track labels and controls)
 * - TimelineContent (markers, playhead, tracks, items)
 *
 * Follows modular architecture with granular Zustand selectors
 */
export function Timeline({ duration }: TimelineProps) {
  const { tracks, toggleTrackLock, toggleTrackVisibility, toggleTrackMute, toggleTrackSolo } = useTimelineTracks();

  // Selection state - use granular selectors
  const activeTrackId = useSelectionStore((s) => s.activeTrackId);
  const selectedTrackIds = useSelectionStore((s) => s.selectedTrackIds);
  const setActiveTrack = useSelectionStore((s) => s.setActiveTrack);
  const toggleTrackSelection = useSelectionStore((s) => s.toggleTrackSelection);
  const selectTracks = useSelectionStore((s) => s.selectTracks);

  // Set first track as active on mount
  useEffect(() => {
    if (tracks.length > 0 && !activeTrackId) {
      setActiveTrack(tracks[0].id);
    }
  }, [tracks, activeTrackId, setActiveTrack]);

  return (
    <div className="timeline-bg h-72 border-t border-border flex flex-col flex-shrink-0">
      {/* Timeline Header */}
      <TimelineHeader />

      {/* Timeline Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers Sidebar */}
        <div className="w-48 border-r border-border panel-bg flex-shrink-0">
          {/* Tracks label */}
          <div className="h-11 flex items-center px-3 border-b border-border bg-secondary/20">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
              Tracks
            </span>
          </div>

          {/* Track labels */}
          <div className="space-y-px">
            {tracks.map((track) => (
              <TrackHeader
                key={track.id}
                track={track}
                isActive={activeTrackId === track.id}
                isSelected={selectedTrackIds.includes(track.id)}
                onToggleLock={() => toggleTrackLock(track.id)}
                onToggleVisibility={() => toggleTrackVisibility(track.id)}
                onToggleMute={() => toggleTrackMute(track.id)}
                onToggleSolo={() => toggleTrackSolo(track.id)}
                onSelect={(e) => {
                  if (e.metaKey || e.ctrlKey) {
                    // Multi-select with Cmd/Ctrl
                    toggleTrackSelection(track.id);
                  } else {
                    // Single select - set as active
                    setActiveTrack(track.id);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Timeline Canvas */}
        <TimelineContent duration={duration} />
      </div>
    </div>
  );
}
