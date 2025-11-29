import { useCallback, useMemo, useState, useRef, useEffect, memo } from 'react';
import { Type, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HexColorPicker } from 'react-colorful';
import type { TextItem, TimelineItem } from '@/types/timeline';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import {
  PropertySection,
  PropertyRow,
  NumberInput,
} from '../components';

// Available Google Fonts (subset for initial implementation)
const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Anton', label: 'Anton' },
] as const;

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Regular' },
  { value: 'medium', label: 'Medium' },
  { value: 'semibold', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
] as const;

const TEXT_ALIGN_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
] as const;

interface TextSectionProps {
  items: TimelineItem[];
}

/**
 * Color picker component for text properties.
 */
const TextColorPicker = memo(function TextColorPicker({
  label,
  color,
  onChange,
  onReset,
  defaultColor,
}: {
  label: string;
  color: string;
  onChange: (color: string) => void;
  onReset?: () => void;
  defaultColor?: string;
}) {
  const [localColor, setLocalColor] = useState(color);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalColor(color);
  }, [color]);

  const handleColorChange = useCallback((newColor: string) => {
    setLocalColor(newColor);
  }, []);

  const handleCommit = useCallback(() => {
    onChange(localColor);
  }, [localColor, onChange]);

  const handleClose = useCallback(() => {
    handleCommit();
    setIsOpen(false);
  }, [handleCommit]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  return (
    <PropertyRow label={label}>
      <div ref={containerRef} className="relative flex items-center gap-1 flex-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 flex-1"
        >
          <div
            className="w-6 h-6 rounded border border-border flex-shrink-0"
            style={{ backgroundColor: localColor }}
          />
          <span className="text-xs font-mono text-muted-foreground uppercase">
            {localColor}
          </span>
        </button>

        {onReset && defaultColor && color !== defaultColor && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={onReset}
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        )}

        {isOpen && (
          <div className="absolute top-8 left-0 z-50 p-2 bg-popover border border-border rounded-lg shadow-lg">
            <HexColorPicker color={localColor} onChange={handleColorChange} />
          </div>
        )}
      </div>
    </PropertyRow>
  );
});

/**
 * Text section - properties for text items (font, color, alignment, etc.)
 */
export function TextSection({ items }: TextSectionProps) {
  const updateItem = useTimelineStore((s) => s.updateItem);

  // Filter to only text items
  const textItems = useMemo(
    () => items.filter((item): item is TextItem => item.type === 'text'),
    [items]
  );

  // Get shared values across selected text items
  const sharedValues = useMemo(() => {
    if (textItems.length === 0) return null;

    const first = textItems[0]!;
    return {
      text: textItems.every(i => i.text === first.text) ? first.text : undefined,
      fontSize: textItems.every(i => (i.fontSize ?? 60) === (first.fontSize ?? 60)) ? (first.fontSize ?? 60) : 'mixed' as const,
      fontFamily: textItems.every(i => (i.fontFamily ?? 'Inter') === (first.fontFamily ?? 'Inter')) ? (first.fontFamily ?? 'Inter') : undefined,
      fontWeight: textItems.every(i => (i.fontWeight ?? 'normal') === (first.fontWeight ?? 'normal')) ? (first.fontWeight ?? 'normal') : undefined,
      color: textItems.every(i => i.color === first.color) ? first.color : undefined,
      textAlign: textItems.every(i => (i.textAlign ?? 'center') === (first.textAlign ?? 'center')) ? (first.textAlign ?? 'center') : undefined,
      letterSpacing: textItems.every(i => (i.letterSpacing ?? 0) === (first.letterSpacing ?? 0)) ? (first.letterSpacing ?? 0) : 'mixed' as const,
      lineHeight: textItems.every(i => (i.lineHeight ?? 1.2) === (first.lineHeight ?? 1.2)) ? (first.lineHeight ?? 1.2) : 'mixed' as const,
    };
  }, [textItems]);

  // Update all selected text items
  const updateTextItems = useCallback(
    (updates: Partial<TextItem>) => {
      textItems.forEach((item) => {
        updateItem(item.id, updates);
      });
    },
    [textItems, updateItem]
  );

  // Handlers
  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      textItems.forEach((item) => {
        updateItem(item.id, { text: newText, label: newText || 'Text' });
      });
    },
    [textItems, updateItem]
  );

  const handleFontSizeChange = useCallback(
    (value: number) => {
      updateTextItems({ fontSize: value });
    },
    [updateTextItems]
  );

  const handleFontFamilyChange = useCallback(
    (value: string) => {
      updateTextItems({ fontFamily: value });
    },
    [updateTextItems]
  );

  const handleFontWeightChange = useCallback(
    (value: string) => {
      updateTextItems({ fontWeight: value as TextItem['fontWeight'] });
    },
    [updateTextItems]
  );

  const handleColorChange = useCallback(
    (value: string) => {
      updateTextItems({ color: value });
    },
    [updateTextItems]
  );

  const handleTextAlignChange = useCallback(
    (value: string) => {
      updateTextItems({ textAlign: value as TextItem['textAlign'] });
    },
    [updateTextItems]
  );

  const handleLetterSpacingChange = useCallback(
    (value: number) => {
      updateTextItems({ letterSpacing: value });
    },
    [updateTextItems]
  );

  const handleLineHeightChange = useCallback(
    (value: number) => {
      updateTextItems({ lineHeight: value });
    },
    [updateTextItems]
  );

  if (textItems.length === 0 || !sharedValues) {
    return null;
  }

  return (
    <PropertySection title="Text" icon={Type} defaultOpen={true}>
      {/* Text Content */}
      <PropertyRow label="Content">
        <Input
          value={sharedValues.text ?? ''}
          onChange={handleTextChange}
          placeholder={sharedValues.text === undefined ? 'Mixed' : 'Enter text...'}
          className="h-7 text-xs"
        />
      </PropertyRow>

      {/* Font Family */}
      <PropertyRow label="Font">
        <Select
          value={sharedValues.fontFamily}
          onValueChange={handleFontFamilyChange}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={sharedValues.fontFamily === undefined ? 'Mixed' : 'Select font'} />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font.value} value={font.value} className="text-xs">
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Font Size */}
      <PropertyRow label="Size">
        <NumberInput
          value={sharedValues.fontSize}
          onChange={handleFontSizeChange}
          min={8}
          max={500}
          step={1}
          unit="px"
        />
      </PropertyRow>

      {/* Font Weight */}
      <PropertyRow label="Weight">
        <Select
          value={sharedValues.fontWeight}
          onValueChange={handleFontWeightChange}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={sharedValues.fontWeight === undefined ? 'Mixed' : 'Select weight'} />
          </SelectTrigger>
          <SelectContent>
            {FONT_WEIGHT_OPTIONS.map((weight) => (
              <SelectItem key={weight.value} value={weight.value} className="text-xs">
                {weight.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Text Align */}
      <PropertyRow label="Align">
        <Select
          value={sharedValues.textAlign}
          onValueChange={handleTextAlignChange}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={sharedValues.textAlign === undefined ? 'Mixed' : 'Select alignment'} />
          </SelectTrigger>
          <SelectContent>
            {TEXT_ALIGN_OPTIONS.map((align) => (
              <SelectItem key={align.value} value={align.value} className="text-xs">
                {align.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>

      {/* Text Color */}
      <TextColorPicker
        label="Color"
        color={sharedValues.color ?? '#ffffff'}
        onChange={handleColorChange}
        onReset={() => handleColorChange('#ffffff')}
        defaultColor="#ffffff"
      />

      {/* Letter Spacing */}
      <PropertyRow label="Spacing">
        <NumberInput
          value={sharedValues.letterSpacing}
          onChange={handleLetterSpacingChange}
          min={-20}
          max={100}
          step={1}
          unit="px"
        />
      </PropertyRow>

      {/* Line Height */}
      <PropertyRow label="Line H.">
        <NumberInput
          value={sharedValues.lineHeight}
          onChange={handleLineHeightChange}
          min={0.5}
          max={3}
          step={0.1}
        />
      </PropertyRow>
    </PropertySection>
  );
}
