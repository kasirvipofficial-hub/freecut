import { Button } from '@/components/ui/button';
import { Eye, Lock, GripVertical, Volume2, VolumeX, Radio } from 'lucide-react';
import type { TimelineTrack } from '@/types/timeline';
import { useTrackDrag } from '../hooks/use-track-drag';

export interface TrackHeaderProps {
  track: TimelineTrack;
  isActive: boolean;
  isSelected: boolean;
  onToggleLock: () => void;
  onToggleVisibility: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onSelect: (e: React.MouseEvent) => void;
}

/**
 * Track Header Component
 *
 * Displays track name, controls, and handles selection.
 * Shows active state with background color.
 */
export function TrackHeader({
  track,
  isActive,
  isSelected,
  onToggleLock,
  onToggleVisibility,
  onToggleMute,
  onToggleSolo,
  onSelect,
}: TrackHeaderProps) {
  // Use track drag hook
  const { isDragging, dragOffset, handleDragStart } = useTrackDrag(track);
  return (
    <div
      className={`
        flex items-center justify-between px-2 border-b border-border
        cursor-pointer transition-colors relative
        ${isActive ? 'bg-primary/10' : 'hover:bg-secondary/50'}
        ${isSelected ? 'border-l-3 border-l-primary' : 'border-l-3 border-l-transparent'}
        ${isDragging ? 'opacity-50 pointer-events-none' : ''}
      `}
      style={{
        height: `${track.height}px`,
        transform: isDragging ? `translateY(${dragOffset}px)` : undefined,
        transition: isDragging ? 'none' : undefined,
      }}
      onClick={onSelect}
      data-track-id={track.id}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center gap-1 flex-1 min-w-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleDragStart}
      >
        <GripVertical className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="text-xs font-medium font-mono whitespace-nowrap">
          {track.name}
        </span>
      </div>

      <div className="flex items-center gap-0.2 shrink-0">
        {/* Visibility Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
        >
          <Eye
            className={`w-1 h-1 ${!track.visible ? 'opacity-30' : ''}`}
          />
        </Button>

        {/* Audio Mute Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMute();
          }}
        >
          {track.muted ? (
            <VolumeX className="w-1 h-1 text-muted-foreground" />
          ) : (
            <Volume2 className="w-1 h-1" />
          )}
        </Button>

        {/* Solo Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSolo();
          }}
        >
          <Radio
            className={`w-1 h-1 ${track.solo ? 'text-primary' : ''}`}
          />
        </Button>

        {/* Lock Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation();
            onToggleLock();
          }}
        >
          <Lock
            className={`w-1 h-1 ${track.locked ? 'text-primary' : ''}`}
          />
        </Button>
      </div>
    </div>
  );
}
