import { useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Toolbar } from './toolbar';
import { MediaSidebar } from './media-sidebar';
import { PropertiesSidebar } from './properties-sidebar';
import { PreviewArea } from './preview-area';
import { Timeline } from '@/features/timeline/components/timeline';
import { useTimelineShortcuts } from '@/features/timeline/hooks/use-timeline-shortcuts';
import { useEditorHotkeys } from '@/hooks/use-editor-hotkeys';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import type { TimelineTrack } from '@/types/timeline';

export interface EditorProps {
  projectId: string;
  project: {
    id: string;
    name: string;
    width: number;
    height: number;
    fps: number;
  };
}

/**
 * Video Editor Component
 *
 * Modular architecture following CLAUDE.md guidelines:
 * - Uses Zustand stores with granular selectors (not local useState)
 * - Composed of specialized components (toolbar, sidebars, preview, timeline)
 * - React 19 optimizations with Activity components in sidebars
 * - Zundo temporal middleware for undo/redo in timeline
 * - Comprehensive keyboard shortcuts
 */
export function Editor({ projectId, project }: EditorProps) {
  const setTracks = useTimelineStore((s) => s.setTracks);

  // Initialize timeline with sample tracks (only runs when projectId changes)
  useEffect(() => {
    // Create sample tracks (generic containers - items have colors)
    const sampleTracks: TimelineTrack[] = [
      {
        id: 'track-1',
        name: 'Track 1',
        height: 64,
        locked: false,
        muted: false,
        solo: false,
        order: 0,
        items: [],
      },
      {
        id: 'track-2',
        name: 'Track 2',
        height: 64,
        locked: false,
        muted: false,
        solo: false,
        order: 1,
        items: [],
      },
      {
        id: 'track-3',
        name: 'Track 3',
        height: 56,
        locked: false,
        muted: false,
        solo: false,
        order: 2,
        items: [],
      },
    ];

    setTracks(sampleTracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // Only re-initialize when projectId changes

  // Enable keyboard shortcuts
  useEditorHotkeys(); // Global editor shortcuts (save, export, etc.)
  useTimelineShortcuts({
    onPlay: () => console.log('Playing'),
    onPause: () => console.log('Paused'),
    onSplit: () => console.log('Split item'),
    onDelete: () => console.log('Delete items'),
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
  });

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export video for project:', projectId);
  };

  // TODO: Get actual timeline duration from project/timeline store
  const timelineDuration = 30; // 30 seconds placeholder

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <Toolbar
          projectId={projectId}
          project={project}
          onExport={handleExport}
        />

        {/* Resizable Layout: Main Content + Timeline */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* Main Content Area */}
          <ResizablePanel defaultSize={70} minSize={50} maxSize={85}>
            <div className="h-full flex overflow-hidden">
              {/* Left Sidebar - Media Library */}
              <MediaSidebar />

              {/* Center - Preview */}
              <PreviewArea project={project} />

              {/* Right Sidebar - Properties */}
              <PropertiesSidebar />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Bottom - Timeline */}
          <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
            <Timeline duration={timelineDuration} />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </TooltipProvider>
  );
}
