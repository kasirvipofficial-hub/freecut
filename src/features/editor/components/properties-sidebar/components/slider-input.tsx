import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type MixedValue = number | 'mixed';

interface SliderInputProps {
  value: MixedValue;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

/**
 * Slider with value display on the right side.
 * Supports custom formatting and 'mixed' state.
 */
export function SliderInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  formatValue,
  disabled = false,
  className,
}: SliderInputProps) {
  const isMixed = value === 'mixed';
  const numericValue = isMixed ? (min + max) / 2 : value;

  const displayValue = isMixed
    ? 'Mixed'
    : formatValue
      ? formatValue(numericValue)
      : `${numericValue}${unit || ''}`;

  return (
    <div className={cn('flex items-center gap-2 min-w-0', className)}>
      <Slider
        value={[numericValue]}
        onValueChange={(values) => onChange(values[0]!)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn('flex-1 min-w-0', isMixed && 'opacity-50')}
      />
      <span
        className={cn(
          'text-xs font-mono text-muted-foreground w-12 text-right flex-shrink-0',
          isMixed && 'italic'
        )}
      >
        {displayValue}
      </span>
    </div>
  );
}
