import { useMemo, useState, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { useProjectStore } from '@/features/projects/stores/project-store';
import type { TransformProperties } from '@/types/transform';

import { SourceSection } from './source-section';
import { LayoutSection } from './layout-section';
import { FillSection } from './fill-section';
import { VideoSection } from './video-section';
import { AudioSection } from './audio-section';
import { TextSection } from './text-section';

/**
 * Clip properties panel - shown when one or more clips are selected.
 * Displays and allows editing of clip transforms and media properties.
 */
export function ClipPanel() {
  // Granular selectors
  const selectedItemIds = useSelectionStore((s) => s.selectedItemIds);
  const items = useTimelineStore((s) => s.items);
  const fps = useTimelineStore((s) => s.fps);
  const updateItemsTransform = useTimelineStore((s) => s.updateItemsTransform);
  const currentProject = useProjectStore((s) => s.currentProject);

  // Local state for aspect lock (persists during session)
  const [aspectLocked, setAspectLocked] = useState(true);

  // Get selected items
  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  // Canvas settings
  const canvas = useMemo(
    () => ({
      width: currentProject?.metadata.width ?? 1920,
      height: currentProject?.metadata.height ?? 1080,
      fps: currentProject?.metadata.fps ?? 30,
    }),
    [currentProject]
  );

  // Check if selection includes visual items (not just audio)
  const hasVisualItems = useMemo(
    () => selectedItems.some((item) => item.type !== 'audio'),
    [selectedItems]
  );

  // Check if selection includes video items
  const hasVideoItems = useMemo(
    () => selectedItems.some((item) => item.type === 'video'),
    [selectedItems]
  );

  // Check if selection includes audio-capable items
  const hasAudioItems = useMemo(
    () =>
      selectedItems.some(
        (item) => item.type === 'video' || item.type === 'audio'
      ),
    [selectedItems]
  );

  // Check if selection includes text items
  const hasTextItems = useMemo(
    () => selectedItems.some((item) => item.type === 'text'),
    [selectedItems]
  );

  // Handle transform changes
  const handleTransformChange = useCallback(
    (ids: string[], updates: Partial<TransformProperties>) => {
      updateItemsTransform(ids, updates);
    },
    [updateItemsTransform]
  );

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Source info - always shown */}
      <SourceSection items={selectedItems} fps={fps} />

      <Separator />

      {/* Layout - only for visual items */}
      {hasVisualItems && (
        <>
          <LayoutSection
            items={selectedItems.filter((item) => item.type !== 'audio')}
            canvas={canvas}
            onTransformChange={handleTransformChange}
            aspectLocked={aspectLocked}
            onAspectLockToggle={() => setAspectLocked(!aspectLocked)}
          />
          <Separator />
        </>
      )}

      {/* Fill - only for visual items */}
      {hasVisualItems && (
        <>
          <FillSection
            items={selectedItems.filter((item) => item.type !== 'audio')}
            canvas={canvas}
            onTransformChange={handleTransformChange}
          />
          <Separator />
        </>
      )}

      {/* Text - only for text items */}
      {hasTextItems && (
        <>
          <TextSection items={selectedItems} />
          <Separator />
        </>
      )}

      {/* Video - only for video items */}
      {hasVideoItems && (
        <>
          <VideoSection items={selectedItems} />
          <Separator />
        </>
      )}

      {/* Audio - for video and audio items */}
      {hasAudioItems && <AudioSection items={selectedItems} />}
    </div>
  );
}
