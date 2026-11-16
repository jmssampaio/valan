import { Colors, Spacing } from '@/constants/theme';

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

describe('theme colours', () => {
  const textColours = ['ink', 'muted', 'accent', 'success', 'error'] as const;
  const backgrounds = ['paper', 'surface'] as const;

  it.each(textColours.flatMap((text) => backgrounds.map((background) => [text, background] as const)))(
    '%s text is readable on %s',
    (text, background) => {
      expect(contrastRatio(Colors[text], Colors[background])).toBeGreaterThanOrEqual(
        MINIMUM_TEXT_CONTRAST,
      );
    },
  );

  it('text on the accent colour is readable', () => {
    expect(contrastRatio(Colors.onAccent, Colors.accent)).toBeGreaterThanOrEqual(
      MINIMUM_TEXT_CONTRAST,
    );
  });

  it('text on the ink colour is readable', () => {
    expect(contrastRatio(Colors.onInk, Colors.ink)).toBeGreaterThanOrEqual(MINIMUM_TEXT_CONTRAST);
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
