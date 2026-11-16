/**
 * Valan design tokens. Source: docs/design/README.md and docs/design/mockups/valan-mockups-v2.html.
 * The app is light-only in v1.0, so there is a single palette.
 */

import type { TextStyle } from 'react-native';

export const Colors = {
  paper: '#F5EFE6',
  surface: '#FBF8F3',
  ink: '#1E1A17',
  muted: '#6B6259',
  /** Dividers only. Controls are edged with ink: this is too faint (1.4:1) to mark one. */
  line: '#D8CEBF',
  accent: '#B4460F',
  onAccent: '#FFFFFF',
  onInk: '#F5EFE6',
  success: '#2C6A3F',
  error: '#A12A1E',
  transparent: 'transparent',
} as const;

export type ThemeColor = keyof typeof Colors;

/** iOS selects embedded fonts by PostScript name, one per weight. */
export const Fonts = {
  display: 'Fraunces-SemiBold',
  textRegular: 'Inter-Regular',
  textMedium: 'Inter-Medium',
  textSemiBold: 'Inter-SemiBold',
  textBold: 'Inter-Bold',
  monoRegular: 'IBMPlexMono-Regular',
  monoMedium: 'IBMPlexMono-Medium',
} as const;

/** Each step is named after its multiple of the 4-point grid. */
export const Spacing = {
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x8: 32,
} as const;

export const Radius = {
  control: 10,
  tag: 4,
} as const;

export const BorderWidth = {
  hairline: 1,
  indicator: 2,
} as const;

/** Minimum heights, so controls grow with the system text size instead of clipping. */
export const ControlHeight = {
  large: 52,
  row: 48,
  small: 44,
} as const;

/** Upper limit on system text scaling, for labels that share a fixed width and cannot wrap. */
export const MaxFontScale = {
  tabLabel: 1.3,
} as const;

export const Opacity = {
  pressed: 0.7,
  disabled: 0.4,
} as const;

/** One bundle per text role. Weight comes from the font file, never from fontWeight. */
export const Type = {
  screenTitle: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.64 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  body: { fontFamily: Fonts.textRegular, fontSize: 16, lineHeight: 24 },
  rowTitle: { fontFamily: Fonts.textSemiBold, fontSize: 16, lineHeight: 20 },
  rowMeta: { fontFamily: Fonts.textRegular, fontSize: 13, lineHeight: 20 },
  button: { fontFamily: Fonts.textSemiBold, fontSize: 16, lineHeight: 20 },
  buttonSmall: { fontFamily: Fonts.textSemiBold, fontSize: 15, lineHeight: 20 },
  option: { fontFamily: Fonts.textMedium, fontSize: 15, lineHeight: 20 },
  optionSelected: { fontFamily: Fonts.textSemiBold, fontSize: 15, lineHeight: 20 },
  tab: { fontFamily: Fonts.textMedium, fontSize: 14, lineHeight: 20 },
  tabSelected: { fontFamily: Fonts.textSemiBold, fontSize: 14, lineHeight: 20 },
  tag: { fontFamily: Fonts.monoRegular, fontSize: 12, lineHeight: 16 },
  caption: {
    fontFamily: Fonts.monoRegular,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
  },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof Type;
