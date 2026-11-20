import { Colors, Fonts, MinFontSize, Radius, Spacing, Type, type ThemeColor } from '@/constants/theme';

function relativeLuminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5]
    .map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const MINIMUM_TEXT_CONTRAST = 4.5;
const MINIMUM_CONTROL_EDGE_CONTRAST = 3;

describe('theme colours', () => {
  // Every pair of text and background that design v3 uses (docs/design/v3/design-spec.md, section 2).
  const textPairs: [text: ThemeColor, background: ThemeColor][] = [
    ['ink', 'bg'],
    ['ink', 'surface'],
    ['ink', 'fill'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['muted', 'fill'],
    ['primary', 'bg'],
    ['primary', 'surface'],
    ['onPrimary', 'primary'],
    ['onInk', 'ink'],
    ['primaryPressed', 'primaryTint'],
    ['ink', 'badge'],
    ['danger', 'bg'],
    ['danger', 'surface'],
    ['danger', 'dangerTint'],
  ];

  it.each(textPairs)('%s text is readable on %s', (text, background) => {
    expect(contrastRatio(Colors[text], Colors[background])).toBeGreaterThanOrEqual(
      MINIMUM_TEXT_CONTRAST,
    );
  });

  // A field or a box to tick is edged with ink or muted: `line` alone is too faint to mark one.
  const controlEdges: [edge: ThemeColor, background: ThemeColor][] = [
    ['ink', 'surface'],
    ['ink', 'bg'],
    ['muted', 'surface'],
    ['muted', 'bg'],
  ];

  it.each(controlEdges)('a control edged with %s stands out on %s', (edge, background) => {
    expect(contrastRatio(Colors[edge], Colors[background])).toBeGreaterThanOrEqual(
      MINIMUM_CONTROL_EDGE_CONTRAST,
    );
  });
});

describe('theme type', () => {
  const titleAndNumberRoles = [
    'screenTitle',
    'sectionTitle',
    'smallTitle',
    'bigNumber',
    'summaryValue',
    'offerNumber',
    'heroPrice',
    'priceCurrency',
  ];

  it('draws no text below the 12-point floor', () => {
    for (const style of Object.values(Type)) {
      expect(style.fontSize).toBeGreaterThanOrEqual(MinFontSize);
    }
  });

  it('uses two faces only: Space Grotesk and Inter', () => {
    for (const font of Object.values(Fonts)) {
      expect(font).toMatch(/^(SpaceGrotesk|Inter)-/);
    }
  });

  it('keeps Space Grotesk for titles and big numbers, and Inter for everything else', () => {
    const displayRoles = Object.entries(Type)
      .filter(([, style]) => style.fontFamily === Fonts.display)
      .map(([role]) => role);

    expect(displayRoles.sort()).toEqual([...titleAndNumberRoles].sort());
  });

  it('spaces the letters of the wordmark at 32% of its size', () => {
    expect(Type.wordmark.letterSpacing).toBeCloseTo(Type.wordmark.fontSize * 0.32);
  });

  it('sets prices in figures of one width, so stacked amounts line up', () => {
    for (const role of ['rowPrice', 'bigNumber', 'offerNumber', 'heroPrice'] as const) {
      expect(Type[role].fontVariant).toEqual(['tabular-nums']);
    }
  });
});

describe('theme shape', () => {
  it('rounds each element with its own radius: seal 8, control 10, field and button 14, card 16', () => {
    expect(Radius).toMatchObject({ seal: 8, control: 10, field: 14, card: 16 });
  });

  it('has no other radius than those, a full round for pills, and the tile behind the wave', () => {
    const { pill: _pill, waveTile: _waveTile, ...elementRadii } = Radius;

    expect(Object.values(elementRadii).sort((a, b) => a - b)).toEqual([8, 10, 14, 16]);
  });
});

describe('theme spacing', () => {
  it('keeps every step on the 4-point grid', () => {
    for (const step of Object.values(Spacing)) {
      expect(step % 4).toBe(0);
    }
  });

  it('has the 20-point step used as the screen margin', () => {
    expect(Spacing.x5).toBe(20);
  });
});
