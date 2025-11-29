/**
 * Font loading utilities for Remotion compositions.
 * Uses @remotion/google-fonts for type-safe font loading.
 * Uses @remotion/layout-utils for text measurement and validation.
 *
 * IMPORTANT: loadFont() automatically blocks rendering until the font is ready,
 * ensuring fonts are available during both preview and server-side rendering.
 */

// Import fonts from @remotion/google-fonts
// Each font is tree-shakeable and only loads what's needed
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadRoboto } from '@remotion/google-fonts/Roboto';
import { loadFont as loadOpenSans } from '@remotion/google-fonts/OpenSans';
import { loadFont as loadLato } from '@remotion/google-fonts/Lato';
import { loadFont as loadMontserrat } from '@remotion/google-fonts/Montserrat';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadPoppins } from '@remotion/google-fonts/Poppins';
import { loadFont as loadPlayfairDisplay } from '@remotion/google-fonts/PlayfairDisplay';
import { loadFont as loadBebasNeue } from '@remotion/google-fonts/BebasNeue';
import { loadFont as loadAnton } from '@remotion/google-fonts/Anton';
import { measureText } from '@remotion/layout-utils';

// Font weight CSS value mapping
export const FONT_WEIGHT_MAP: Record<string, number> = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

// Cache for loaded fonts - maps user-friendly name to actual CSS fontFamily
const loadedFontFamilies = new Map<string, string>();

// List of available fonts
const AVAILABLE_FONTS = [
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Poppins',
  'Playfair Display',
  'Bebas Neue',
  'Anton',
] as const;

// Common font loading options - only load weights we use and latin subset
const defaultFontOptions = {
  weights: ['400', '500', '600', '700'] as const,
  subsets: ['latin'] as const,
};

/**
 * Load a Google Font for use in Remotion compositions.
 * This should be called before rendering text that uses the font.
 * The font loader automatically blocks rendering until the font is ready.
 *
 * Only loads weights 400, 500, 600, 700 and latin subset to minimize network requests.
 *
 * @param fontName - The font name (e.g., 'Inter', 'Roboto')
 * @returns The CSS font-family value to use in styles
 */
export function loadFont(fontName: string): string {
  // Check if font is already loaded and return cached fontFamily
  const cached = loadedFontFamilies.get(fontName);
  if (cached) {
    return cached;
  }

  let result: { fontFamily: string };

  // Load each font with optimized options (only needed weights/subsets)
  switch (fontName) {
    case 'Inter':
      result = loadInter('normal', defaultFontOptions);
      break;
    case 'Roboto':
      result = loadRoboto('normal', defaultFontOptions);
      break;
    case 'Open Sans':
      result = loadOpenSans('normal', defaultFontOptions);
      break;
    case 'Lato':
      result = loadLato('normal', defaultFontOptions);
      break;
    case 'Montserrat':
      result = loadMontserrat('normal', defaultFontOptions);
      break;
    case 'Oswald':
      result = loadOswald('normal', { weights: ['400', '500', '600', '700'] as const, subsets: ['latin'] as const });
      break;
    case 'Poppins':
      result = loadPoppins('normal', defaultFontOptions);
      break;
    case 'Playfair Display':
      result = loadPlayfairDisplay('normal', defaultFontOptions);
      break;
    case 'Bebas Neue':
      // Bebas Neue only has weight 400
      result = loadBebasNeue('normal', { weights: ['400'] as const, subsets: ['latin'] as const });
      break;
    case 'Anton':
      // Anton only has weight 400
      result = loadAnton('normal', { weights: ['400'] as const, subsets: ['latin'] as const });
      break;
    default:
      // Fallback for unsupported fonts
      console.warn(`Font "${fontName}" not available in @remotion/google-fonts, using system fallback`);
      return fontName;
  }

  // Cache the actual CSS fontFamily
  loadedFontFamilies.set(fontName, result.fontFamily);
  return result.fontFamily;
}

/**
 * Load all fonts needed for a set of text items.
 * Call this at the composition level to ensure fonts are loaded before rendering.
 *
 * @param fontNames - Array of font names to load
 * @returns Array of CSS fontFamily values
 */
export function loadFonts(fontNames: string[]): string[] {
  const uniqueFonts = [...new Set(fontNames)];
  return uniqueFonts.map(loadFont);
}

/**
 * Get the CSS fontFamily for a loaded font.
 * Returns the font name as-is if not loaded yet.
 *
 * @param fontName - The font name
 * @returns The CSS fontFamily value
 */
export function getFontFamily(fontName: string): string {
  return loadedFontFamilies.get(fontName) ?? fontName;
}

/**
 * Get a list of available font names.
 */
export function getAvailableFonts(): string[] {
  return [...AVAILABLE_FONTS];
}

/**
 * Check if a font is available.
 */
export function isFontAvailable(fontName: string): boolean {
  return AVAILABLE_FONTS.includes(fontName as typeof AVAILABLE_FONTS[number]);
}

/**
 * Measure text dimensions with the specified font properties.
 * Uses @remotion/layout-utils for accurate measurement.
 *
 * @param text - The text to measure
 * @param options - Font options (fontFamily, fontSize, fontWeight, letterSpacing)
 * @returns Object with width and height in pixels
 */
export function measureTextDimensions(
  text: string,
  options: {
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    letterSpacing?: number;
  }
): { width: number; height: number } {
  const { fontFamily, fontSize, fontWeight = 'normal', letterSpacing = 0 } = options;

  // Ensure font is loaded first
  loadFont(fontFamily);

  try {
    return measureText({
      text,
      fontFamily,
      fontSize,
      fontWeight: String(FONT_WEIGHT_MAP[fontWeight] ?? 400),
      letterSpacing: letterSpacing !== 0 ? `${letterSpacing}px` : undefined,
      validateFontIsLoaded: true,
    });
  } catch (error) {
    // If font validation fails, return approximate dimensions
    console.warn(`Font validation failed for "${fontFamily}":`, error);
    // Approximate: average character width is ~0.6x fontSize
    return {
      width: text.length * fontSize * 0.6,
      height: fontSize * 1.2,
    };
  }
}

/**
 * Calculate the optimal font size to fit text within a given width.
 * Uses binary search for efficiency.
 *
 * @param text - The text to fit
 * @param maxWidth - Maximum width in pixels
 * @param options - Font options
 * @returns Optimal font size
 */
export function fitTextToWidth(
  text: string,
  maxWidth: number,
  options: {
    fontFamily: string;
    fontWeight?: string;
    letterSpacing?: number;
    minFontSize?: number;
    maxFontSize?: number;
  }
): number {
  const {
    fontFamily,
    fontWeight = 'normal',
    letterSpacing = 0,
    minFontSize = 12,
    maxFontSize = 200,
  } = options;

  // Ensure font is loaded
  loadFont(fontFamily);

  let low = minFontSize;
  let high = maxFontSize;
  let result = minFontSize;

  // Binary search for optimal font size
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const { width } = measureTextDimensions(text, {
      fontFamily,
      fontSize: mid,
      fontWeight,
      letterSpacing,
    });

    if (width <= maxWidth) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}
