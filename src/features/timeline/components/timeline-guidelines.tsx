import type { SnapTarget } from '../types/drag';
import { useTimelineZoom } from '../hooks/use-timeline-zoom';

export interface TimelineGuidelinesProps {
  /** Snap targets to display as guidelines */
  snapTargets: SnapTarget[];
  /** Currently snapped target (highlighted) */
  activeSnapTarget: SnapTarget | null;
}

/**
 * Timeline Guidelines Component
 *
 * Renders vertical snap lines during drag operations
 * - Blue lines for grid snap points
 * - Green lines for magnetic snap (item edges)
 * - Highlighted line for active snap
 *
 * Phase 2 enhancement for visual feedback
 */
export function TimelineGuidelines({ snapTargets, activeSnapTarget }: TimelineGuidelinesProps) {
  const { frameToPixels } = useTimelineZoom();

  if (snapTargets.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {snapTargets.map((target, index) => {
        const left = frameToPixels(target.frame);
        const isActive = activeSnapTarget?.frame === target.frame;
        const isMagnetic = target.type === 'item-start' || target.type === 'item-end';

        return (
          <div
            key={`${target.type}-${target.frame}-${index}`}
            className={`absolute top-0 bottom-0 w-px transition-opacity ${
              isActive
                ? 'bg-primary opacity-90'
                : isMagnetic
                ? 'bg-green-500 opacity-40'
                : 'bg-blue-500 opacity-30'
            }`}
            style={{ left: `${left}px` }}
          />
        );
      })}
    </div>
  );
}
