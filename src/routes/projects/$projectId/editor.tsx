import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Upload,
  MousePointer2,
  Scissors,
  Type,
  Undo2,
  Redo2,
  Settings2,
  ZoomIn,
  ZoomOut,
  Volume2,
} from 'lucide-react';

export const Route = createFileRoute('/projects/$projectId/editor')({
  component: EditorPage,
  loader: async ({ params }) => {
    // TODO: Load project data for editor
    return {
      project: {
        id: params.projectId,
        name: 'Untitled Project',
        width: 1920,
        height: 1080,
        fps: 30,
      },
    };
  },
});

function EditorPage() {
  const { project } = Route.useLoaderData();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [zoom, setZoom] = useState([1]);
  const [volume, setVolume] = useState([75]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // TODO: Integrate with actual timeline and playback stores
  const totalFrames = 300; // 10 seconds at 30fps
  const duration = totalFrames / (project?.fps || 30);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <div className="panel-header h-14 border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
          {/* Project Info */}
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link to="/projects">
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>Back to Projects</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-6" />

            <div className="flex flex-col -space-y-0.5">
              <h1 className="text-sm font-medium leading-none">
                {project?.name || 'Untitled Project'}
              </h1>
              <span className="text-xs text-muted-foreground font-mono">
                {project?.width}×{project?.height} • {project?.fps}fps
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Tool Buttons */}
          <div className="flex items-center gap-1 px-1.5 py-1 bg-secondary/50 rounded-md border border-border">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-state="active">
                  <MousePointer2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Selection Tool (V)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Scissors className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Razor Tool (C)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Type className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Text Tool (T)</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* History */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Export */}
          <Button size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Export
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Media Library */}
          <div
            className={`panel-bg border-r border-border transition-all duration-200 flex-shrink-0 ${
              leftSidebarOpen ? 'w-64' : 'w-0'
            }`}
          >
            {leftSidebarOpen && (
              <div className="h-full flex flex-col w-64">
                {/* Sidebar Header */}
                <div className="h-11 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
                  <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Media
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setLeftSidebarOpen(false)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>

                {/* Media Items */}
                <div className="flex-1 overflow-y-auto p-3">
                  {/* Empty state */}
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      No media files
                    </p>
                    <Button size="sm" variant="outline" className="text-xs">
                      Import Media
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Sidebar Toggle */}
          {!leftSidebarOpen && (
            <button
              onClick={() => setLeftSidebarOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-16 bg-secondary/50 hover:bg-secondary border border-border rounded-r-md flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
          )}

          {/* Center - Preview */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Preview Area */}
            <div className="flex-1 flex items-center justify-center p-6">
              <div
                className="relative w-full max-w-5xl"
                style={{ aspectRatio: `${project?.width || 16}/${project?.height || 9}` }}
              >
                {/* Video Preview Canvas */}
                <div className="absolute inset-0 rounded-lg overflow-hidden bg-black border border-border shadow-2xl">
                  {/* Placeholder */}
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-background flex items-center justify-center">
                    <div className="text-center">
                      <Play className="w-16 h-16 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-mono">Preview Canvas</p>
                    </div>
                  </div>
                </div>

                {/* Frame Counter */}
                <div className="absolute -bottom-6 right-0 font-mono text-xs text-primary tabular-nums">
                  {String(currentFrame).padStart(5, '0')} / {String(totalFrames).padStart(5, '0')}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="h-16 border-t border-border panel-header flex items-center justify-center gap-6 px-6 flex-shrink-0">
              {/* Transport Controls */}
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <SkipBack className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go to Start (Home)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous Frame (←)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setIsPlaying(!isPlaying)}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isPlaying ? 'Pause' : 'Play'} (Space)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next Frame (→)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Go to End (End)</TooltipContent>
                </Tooltip>
              </div>

              {/* Timecode Display */}
              <div className="px-4 py-2 bg-secondary/50 rounded-md border border-border">
                <div className="flex items-center gap-2 font-mono text-sm tabular-nums">
                  <span className="text-primary font-medium">
                    {Math.floor(currentFrame / (project?.fps || 30)).toString().padStart(2, '0')}:
                    {Math.floor(((currentFrame % (project?.fps || 30)) / (project?.fps || 30)) * 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span className="text-muted-foreground">
                    {Math.floor(duration).toString().padStart(2, '0')}:
                    {Math.floor((duration % 1) * 60)
                      .toString()
                      .padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={volume}
                  onValueChange={setVolume}
                  max={100}
                  step={1}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Properties */}
          <div
            className={`panel-bg border-l border-border transition-all duration-200 flex-shrink-0 ${
              rightSidebarOpen ? 'w-80' : 'w-0'
            }`}
          >
            {rightSidebarOpen && (
              <div className="h-full flex flex-col w-80">
                {/* Sidebar Header */}
                <div className="h-11 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
                  <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Properties
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setRightSidebarOpen(false)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Properties Panel */}
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Empty state */}
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-lg bg-secondary border border-border flex items-center justify-center mb-3">
                      <Settings2 className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No clip selected
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar Toggle */}
          {!rightSidebarOpen && (
            <button
              onClick={() => setRightSidebarOpen(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-5 h-16 bg-secondary/50 hover:bg-secondary border border-border rounded-l-md flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Bottom - Timeline */}
        <div className="timeline-bg h-64 border-t border-border flex flex-col flex-shrink-0">
          {/* Timeline Header */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-4">
              <h2 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Timeline
              </h2>

              {/* Zoom Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom([Math.max(0.1, zoom[0] - 0.1)])}
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  min={0.1}
                  max={2}
                  step={0.1}
                  className="w-20"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setZoom([Math.min(2, zoom[0] + 0.1)])}
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
                <span className="text-xs text-muted-foreground font-mono w-12 text-right">
                  {Math.round(zoom[0] * 100)}%
                </span>
              </div>
            </div>

            {/* Timeline Tools */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Snap
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs">
                Magnet
              </Button>
            </div>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Track Headers */}
            <div className="w-32 border-r border-border panel-bg flex-shrink-0">
              <div className="h-10 flex items-center px-3 border-b border-border">
                <span className="text-xs text-muted-foreground font-mono uppercase">Tracks</span>
              </div>
              {/* Track labels */}
              <div>
                <div className="h-14 flex items-center px-3 video-track border-b border-border">
                  <span className="text-xs font-medium font-mono">Video 1</span>
                </div>
                <div className="h-14 flex items-center px-3 audio-track border-b border-border">
                  <span className="text-xs font-medium font-mono">Audio 1</span>
                </div>
                <div className="h-12 flex items-center px-3 subtitle-track border-b border-border">
                  <span className="text-xs font-medium font-mono">Subtitles</span>
                </div>
              </div>
            </div>

            {/* Timeline Canvas */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-background/50">
              {/* Ruler */}
              <div className="h-10 bg-secondary/30 border-b border-border relative">
                {/* Time markers */}
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 border-l border-border/50 relative"
                      style={{ width: `${zoom[0] * 100}px` }}
                    >
                      <span className="absolute top-2 left-2 font-mono text-xs text-muted-foreground tabular-nums">
                        {i}s
                      </span>
                      {/* Frame ticks */}
                      <div className="absolute top-6 left-0 right-0 flex justify-between px-0.5">
                        {Array.from({ length: 10 }).map((_, j) => (
                          <div key={j} className="w-px h-1.5 bg-border/50" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Playhead */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 playhead pointer-events-none z-10"
                  style={{
                    left: `${(currentFrame / totalFrames) * duration * zoom[0] * 100}px`,
                  }}
                >
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 playhead rotate-45" />
                </div>
              </div>

              {/* Track lanes */}
              <div className="relative">
                {/* Video track */}
                <div className="h-14 border-b border-border video-track relative" />

                {/* Audio track */}
                <div className="h-14 border-b border-border audio-track relative" />

                {/* Subtitle track */}
                <div className="h-12 border-b border-border subtitle-track relative" />

                {/* Playhead line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 playhead pointer-events-none z-10"
                  style={{
                    left: `${(currentFrame / totalFrames) * duration * zoom[0] * 100}px`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
