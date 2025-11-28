import { useCallback, useMemo } from 'react';
import { Droplet } from 'lucide-react';
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
  SliderInput,
} from '../components';

interface FillSectionProps {
  items: TimelineItem[];
  canvas: CanvasSettings;
  onTransformChange: (ids: string[], updates: Partial<TransformProperties>) => void;
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
  return values.every((v) => Math.abs(v - firstValue) < 0.01) ? firstValue : 'mixed';
}

/**
 * Fill section - opacity and corner radius.
 */
export function FillSection({
  items,
  canvas,
  onTransformChange,
}: FillSectionProps) {
  const itemIds = useMemo(() => items.map((item) => item.id), [items]);

  // Get current values (opacity is 0-1, display as 0-100%)
  const opacityRaw = getMixedValue(items, canvas, (r) => r.opacity);
  const opacity = opacityRaw === 'mixed' ? 'mixed' : Math.round(opacityRaw * 100);
  const cornerRadius = getMixedValue(items, canvas, (r) => r.cornerRadius);

  const handleOpacityChange = useCallback(
    (value: number) => {
      // Convert from 0-100 to 0-1
      onTransformChange(itemIds, { opacity: value / 100 });
    },
    [itemIds, onTransformChange]
  );

  const handleCornerRadiusChange = useCallback(
    (value: number) => onTransformChange(itemIds, { cornerRadius: value }),
    [itemIds, onTransformChange]
  );

  return (
    <PropertySection title="Fill" icon={Droplet} defaultOpen={true}>
      {/* Opacity */}
      <PropertyRow label="Opacity">
        <SliderInput
          value={opacity}
          onChange={handleOpacityChange}
          min={0}
          max={100}
          step={1}
          unit="%"
        />
      </PropertyRow>

      {/* Corner Radius */}
      <PropertyRow label="Radius">
        <NumberInput
          value={cornerRadius}
          onChange={handleCornerRadiusChange}
          unit="px"
          min={0}
          max={500}
          step={1}
        />
      </PropertyRow>
    </PropertySection>
  );
}
