import { useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Link2Off } from 'lucide-react';
import { NumberInput } from './number-input';
import { cn } from '@/lib/utils';

type MixedValue = number | 'mixed';

interface LinkedDimensionsProps {
  width: MixedValue;
  height: MixedValue;
  aspectLocked: boolean;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onAspectLockToggle: () => void;
  disabled?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

/**
 * Width/Height inputs with aspect ratio lock toggle.
 * When locked, changing one dimension proportionally changes the other.
 */
export function LinkedDimensions({
  width,
  height,
  aspectLocked,
  onWidthChange,
  onHeightChange,
  onAspectLockToggle,
  disabled = false,
  minWidth = 1,
  minHeight = 1,
  maxWidth = 7680,
  maxHeight = 7680,
  className,
}: LinkedDimensionsProps) {
  // Store aspect ratio when lock is engaged
  const aspectRatioRef = useRef<number>(1);

  // Update aspect ratio when either dimension changes while unlocked
  // or when lock is first engaged
  useEffect(() => {
    if (width !== 'mixed' && height !== 'mixed' && height > 0) {
      aspectRatioRef.current = width / height;
    }
  }, [width, height]);

  const handleWidthChange = useCallback(
    (newWidth: number) => {
      onWidthChange(newWidth);
      if (aspectLocked && aspectRatioRef.current > 0) {
        const newHeight = Math.round(newWidth / aspectRatioRef.current);
        onHeightChange(Math.max(minHeight, Math.min(maxHeight, newHeight)));
      }
    },
    [aspectLocked, onWidthChange, onHeightChange, minHeight, maxHeight]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      onHeightChange(newHeight);
      if (aspectLocked && aspectRatioRef.current > 0) {
        const newWidth = Math.round(newHeight * aspectRatioRef.current);
        onWidthChange(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      }
    },
    [aspectLocked, onWidthChange, onHeightChange, minWidth, maxWidth]
  );

  return (
    <div className={cn('flex items-center gap-1 min-w-0', className)}>
      <NumberInput
        value={width}
        onChange={handleWidthChange}
        label="W"
        unit="px"
        min={minWidth}
        max={maxWidth}
        step={1}
        disabled={disabled}
        className="flex-1 min-w-0"
      />

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-7 w-7 flex-shrink-0',
          aspectLocked && 'text-primary'
        )}
        onClick={onAspectLockToggle}
        disabled={disabled}
      >
        {aspectLocked ? (
          <Link2 className="w-3.5 h-3.5" />
        ) : (
          <Link2Off className="w-3.5 h-3.5" />
        )}
      </Button>

      <NumberInput
        value={height}
        onChange={handleHeightChange}
        label="H"
        unit="px"
        min={minHeight}
        max={maxHeight}
        step={1}
        disabled={disabled}
        className="flex-1 min-w-0"
      />
    </div>
  );
}
