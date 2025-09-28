import designTokens from '../../tokens/design-tokens.json';

type RadiusKey = keyof typeof designTokens.radii;
type TypographyKey = keyof typeof designTokens.typography;
type ClampableListKey = 'spacing' | 'sectionPadding' | 'itemSpacing';

type ClampTokenType = ClampableListKey | 'radius' | 'typography';

const clampableLists: Record<ClampableListKey, number[]> = {
  spacing: designTokens.spacing,
  sectionPadding: designTokens.sectionPadding,
  itemSpacing: designTokens.itemSpacing
};

function clampToNearest(value: number, options: number[]): number {
  if (options.length === 0) {
    return value;
  }
  const sorted = [...options].sort((a, b) => a - b);
  return sorted.reduce((closest, candidate) => {
    const candidateDiff = Math.abs(candidate - value);
    const closestDiff = Math.abs(closest - value);
    if (candidateDiff < closestDiff) {
      return candidate;
    }
    if (candidateDiff === closestDiff && candidate < closest) {
      return candidate;
    }
    return closest;
  }, sorted[0]);
}

export function clampToken(value: number, type: ClampTokenType): number {
  if (type === 'radius') {
    return clampToNearest(value, Object.values(designTokens.radii));
  }

  if (type === 'typography') {
    const typographySizes = Object.values(designTokens.typography).map((style) => style.fontSize);
    return clampToNearest(value, typographySizes);
  }

  return clampToNearest(value, clampableLists[type]);
}

export function getRadiusToken(value: number): RadiusKey {
  const nearest = clampToken(value, 'radius');
  const entry = (Object.entries(designTokens.radii) as Array<[RadiusKey, number]>).find(([, radius]) => radius === nearest);
  return entry ? entry[0] : 'md';
}

export function getTypographyKey(value: number): TypographyKey {
  const nearest = clampToken(value, 'typography');
  const entry = (Object.entries(designTokens.typography) as Array<[TypographyKey, { fontSize: number }]>).find(
    ([, style]) => style.fontSize === nearest
  );
  return entry ? entry[0] : 'body';
}

export function getTypography(style: TypographyKey) {
  return designTokens.typography[style];
}

export const tokens = designTokens;
