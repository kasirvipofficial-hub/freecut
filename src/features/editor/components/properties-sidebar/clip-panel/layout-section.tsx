import { useCallback, useMemo } from 'react';
import { Move } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { TimelineItem } from '@/types/timeline';
import type { TransformProperties, CanvasSettings } from '@/types/transform';
import {
  resolveTransform,
  getSourceDimensions,
} from '@/lib/remotion/utils/transform-resolver';
import {
  PropertySection,
  PropertyRow,
  NumberInput,
  LinkedDimensions,
  AlignmentButtons,
  type AlignmentType,
} from '../components';

interface LayoutSectionProps {
  items: TimelineItem[];
  canvas: CanvasSettings;
  onTransformChange: (ids: string[], updates: Partial<TransformProperties>) => void;
  aspectLocked: boolean;
  onAspectLockToggle: () => void;
}

type MixedValue = number | 'mixed';

/**
 * Get a value from items, returning 'mixed' if they differ.
 */
function getMixedValue(
  items: TimelineItem[],
  canvas: CanvasSettings,
  getter: (resolved: ReturnType<typeof resolveTransform>) => number
): MixedValue {
  if (items.length === 0) return 0;

  const values = items.map((item) => {
    const sourceDimensions = getSourceDimensions(item);
    const resolved = resolveTransform(item, canvas, sourceDimensions);
    return getter(resolved);
  });

  const firstValue = values[0]!; // Safe: items.length > 0 checked above
  return values.every((v) => Math.abs(v - firstValue) < 0.1) ? firstValue : 'mixed';
}

/**
 * Layout section - position, dimensions, rotation, alignment.
 */
export function LayoutSection({
  items,
  canvas,
  onTransformChange,
  aspectLocked,
  onAspectLockToggle,
}: LayoutSectionProps) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  // Get current values (resolved or mixed)
  const x = getMixedValue(items, canvas, (r) => r.x);
  const y = getMixedValue(items, canvas, (r) => r.y);
  const width = getMixedValue(items, canvas, (r) => r.width);
  const height = getMixedValue(items, canvas, (r) => r.height);
  const rotation = getMixedValue(items, canvas, (r) => r.rotation);

  // Store current aspect ratio for linked dimensions
  const currentAspectRatio = useMemo(() => {
    if (width === 'mixed' || height === 'mixed') return 1;
    return height > 0 ? width / height : 1;
  }, [width, height]);

  const handleXChange = useCallback(
    (value: number) => onTransformChange(itemIds, { x: value }),
    [itemIds, onTransformChange]
  );

  const handleYChange = useCallback(
    (value: number) => onTransformChange(itemIds, { y: value }),
    [itemIds, onTransformChange]
  );

  const handleWidthChange = useCallback(
    (value: number) => {
      if (aspectLocked && height !== 'mixed') {
        const newHeight = Math.round(value / currentAspectRatio);
        onTransformChange(itemIds, { width: value, height: newHeight });
      } else {
        onTransformChange(itemIds, { width: value });
      }
    },
    [itemIds, onTransformChange, aspectLocked, height, currentAspectRatio]
  );

  const handleHeightChange = useCallback(
    (value: number) => {
      if (aspectLocked && width !== 'mixed') {
        const newWidth = Math.round(value * currentAspectRatio);
        onTransformChange(itemIds, { width: newWidth, height: value });
      } else {
        onTransformChange(itemIds, { height: value });
      }
    },
    [itemIds, onTransformChange, aspectLocked, width, currentAspectRatio]
  );

  const handleRotationChange = useCallback(
    (value: number) => onTransformChange(itemIds, { rotation: value }),
    [itemIds, onTransformChange]
  );

  const handleAlign = useCallback(
    (alignment: AlignmentType) => {
      // Calculate new position based on alignment
      const currentWidth = width === 'mixed' ? canvas.width : width;
      const currentHeight = height === 'mixed' ? canvas.height : height;

      let newX: number | undefined;
      let newY: number | undefined;

      switch (alignment) {
        case 'left':
          newX = -canvas.width / 2 + currentWidth / 2;
          break;
        case 'center-h':
          newX = 0;
          break;
        case 'right':
          newX = canvas.width / 2 - currentWidth / 2;
          break;
        case 'top':
          newY = -canvas.height / 2 + currentHeight / 2;
          break;
        case 'center-v':
          newY = 0;
          break;
        case 'bottom':
          newY = canvas.height / 2 - currentHeight / 2;
          break;
      }

      const updates: Partial<TransformProperties> = {};
      if (newX !== undefined) updates.x = newX;
      if (newY !== undefined) updates.y = newY;

      onTransformChange(itemIds, updates);
    },
    [itemIds, onTransformChange, width, height, canvas]
  );

  return (
    <PropertySection title="Layout" icon={Move} defaultOpen={true}>
      {/* Alignment buttons */}
      <AlignmentButtons onAlign={handleAlign} />

      <Separator className="my-2" />

      {/* Position */}
      <PropertyRow label="Position">
        <div className="grid grid-cols-2 gap-1">
          <NumberInput
            value={x}
            onChange={handleXChange}
            label="X"
            unit="px"
            step={1}
          />
          <NumberInput
            value={y}
            onChange={handleYChange}
            label="Y"
            unit="px"
            step={1}
          />
        </div>
      </PropertyRow>

      {/* Dimensions */}
      <PropertyRow label="Size">
        <LinkedDimensions
          width={width}
          height={height}
          aspectLocked={aspectLocked}
          onWidthChange={handleWidthChange}
          onHeightChange={handleHeightChange}
          onAspectLockToggle={onAspectLockToggle}
          minWidth={1}
          minHeight={1}
        />
      </PropertyRow>

      {/* Rotation */}
      <PropertyRow label="Rotation">
        <NumberInput
          value={rotation}
          onChange={handleRotationChange}
          label=""
          unit="deg"
          min={-360}
          max={360}
          step={1}
        />
      </PropertyRow>
    </PropertySection>
  );
}
