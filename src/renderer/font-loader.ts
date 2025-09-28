import type { TypographyStyle } from '../types/section';

const loadedFonts = new Set<string>();

function fontKey(family: string, style: string) {
  return `${family}__${style}`;
}

export async function loadFont(family: string, style: string) {
  const key = fontKey(family, style);
  if (loadedFonts.has(key)) {
    return;
  }
  await figma.loadFontAsync({ family, style });
  loadedFonts.add(key);
}

const TYPOGRAPHY_TO_FONT: Record<TypographyStyle, { family: string; style: string }> = {
  h1: { family: 'Inter', style: 'Bold' },
  h2: { family: 'Inter', style: 'Semi Bold' },
  h3: { family: 'Inter', style: 'Semi Bold' },
  body: { family: 'Inter', style: 'Regular' },
  small: { family: 'Inter', style: 'Regular' }
};

export async function ensureTypographyFont(style: TypographyStyle) {
  const mapping = TYPOGRAPHY_TO_FONT[style] ?? { family: 'Roboto', style: 'Regular' };
  try {
    await loadFont(mapping.family, mapping.style);
  } catch (error) {
    if (mapping.family !== 'Roboto') {
      await loadFont('Roboto', 'Regular');
    } else {
      throw error;
    }
  }
}
