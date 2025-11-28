import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeftRight, RotateCcw, LayoutDashboard, Clock } from 'lucide-react';
import { useProjectStore } from '@/features/projects/stores/project-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import {
  PropertySection,
  PropertyRow,
  LinkedDimensions,
} from '../components';

/**
 * Canvas properties panel - shown when no clip is selected.
 * Displays and allows editing of canvas dimensions and shows project duration.
 */
export function CanvasPanel() {
  // Granular selectors
  const currentProject = useProjectStore((s) => s.currentProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const items = useTimelineStore((s) => s.items);
  const fps = useTimelineStore((s) => s.fps);

  // Calculate timeline duration from rightmost item
  const timelineDuration = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.max(...items.map((item) => item.from + item.durationInFrames));
  }, [items]);

  // Format duration as MM:SS.FF
  const formatDuration = (frames: number): string => {
    const totalSeconds = frames / fps;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const remainingFrames = frames % fps;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(remainingFrames).padStart(2, '0')}`;
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-xs text-muted-foreground">No project loaded</p>
      </div>
    );
  }

  const { width, height } = currentProject.metadata;

  const handleWidthChange = (newWidth: number) => {
    updateProject(currentProject.id, { width: newWidth });
  };

  const handleHeightChange = (newHeight: number) => {
    updateProject(currentProject.id, { height: newHeight });
  };

  const handleSwapDimensions = () => {
    updateProject(currentProject.id, { width: height, height: width });
  };

  const handleResetDimensions = () => {
    updateProject(currentProject.id, { width: 1920, height: 1080 });
  };

  return (
    <div className="space-y-4">
      {/* Canvas Section */}
      <PropertySection title="Canvas" icon={LayoutDashboard} defaultOpen={true}>
        <LinkedDimensions
          width={width}
          height={height}
          aspectLocked={false}
          onWidthChange={handleWidthChange}
          onHeightChange={handleHeightChange}
          onAspectLockToggle={() => {}}
          minWidth={320}
          minHeight={240}
          maxWidth={7680}
          maxHeight={4320}
        />

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleSwapDimensions}
          >
            <ArrowLeftRight className="w-3 h-3 mr-1.5" />
            Swap
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={handleResetDimensions}
          >
            <RotateCcw className="w-3 h-3 mr-1.5" />
            Reset
          </Button>
        </div>
      </PropertySection>

      <Separator />

      {/* Duration Section */}
      <PropertySection title="Duration" icon={Clock} defaultOpen={true}>
        <PropertyRow label="Duration">
          <span className="text-xs font-mono text-foreground">
            {formatDuration(timelineDuration)}
          </span>
        </PropertyRow>

        <PropertyRow label="Frame Rate">
          <span className="text-xs font-mono text-muted-foreground">
            {currentProject.metadata.fps} fps
          </span>
        </PropertyRow>

        <PropertyRow label="Total Frames">
          <span className="text-xs font-mono text-muted-foreground">
            {timelineDuration}
          </span>
        </PropertyRow>
      </PropertySection>
    </div>
  );
}
