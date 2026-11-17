/**
 * Valan design tokens. Source: docs/design/README.md and docs/design/mockups/valan-mockups-v2.html.
 * The app is light-only in v1.0, so there is a single palette.
 */

import type { TextStyle } from 'react-native';

export const Colors = {
  paper: '#FFFFFF',
  /** Slightly warm, so fields and cards still read against the white page. */
  surface: '#FBF8F3',
  ink: '#1E1A17',
  muted: '#6B6259',
  /** Dividers only. Controls are edged with ink: this is too faint (1.6:1) to mark one. */
  line: '#D8CEBF',
  accent: '#B4460F',
  onAccent: '#FFFFFF',
  onInk: '#FFFFFF',
  success: '#2C6A3F',
  error: '#A12A1E',
  /** Ink at 15%: the edge that keeps a pale photo from bleeding into the paper. */
  photoEdge: 'rgba(30, 26, 23, 0.15)',
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
  x30: 120,
} as const;

/** Fixed sizes of drawn or photographic elements. */
export const Size = {
  thumbnail: 56,
  logo: 56,
  /** The long side of the photo on an item's own screen; the short side follows its proportions. */
  detailPhoto: 120,
  wave: 120,
  heroWave: 152,
  /** One segment of the step progress bar in a multi-step flow. */
  progress: 4,
  checkbox: 24,
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
  /** A multi-line text field, before it grows with its text. */
  area: 96,
  large: 52,
  row: 48,
  small: 44,
} as const;

/** Upper limit on system text scaling, for labels that share a fixed width and cannot wrap. */
export const MaxFontScale = {
  tabLabel: 1.3,
  /** For the largest figures, which would leave the screen if they grew much further. */
  display: 1.3,
} as const;

/** No text is drawn smaller than this, whatever shrinks it to fit (docs/standards/ux.md). */
export const MinFontSize = 12;

export const Opacity = {
  pressed: 0.7,
  disabled: 0.4,
} as const;

const tabularFigures: TextStyle['fontVariant'] = ['tabular-nums'];

/** One bundle per text role. Weight comes from the font file, never from fontWeight. */
export const Type = {
  screenTitle: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.64 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  body: { fontFamily: Fonts.textRegular, fontSize: 16, lineHeight: 24 },
  /** The price on an item's own screen: the one figure the seller came to see. */
  heroPrice: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.4 },
  /** The offered price on an offer card: the one number the card is about. */
  offerPrice: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.32 },
  summaryValue: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.28 },
  // Inter, not Fraunces: prices stacked in a list are compared digit by digit, so figures share a width.
  rowPrice: {
    fontFamily: Fonts.textSemiBold,
    fontSize: 17,
    lineHeight: 24,
    fontVariant: tabularFigures,
  },
  rowTitle: { fontFamily: Fonts.textSemiBold, fontSize: 16, lineHeight: 20 },
  rowMeta: { fontFamily: Fonts.textRegular, fontSize: 13, lineHeight: 20 },
  button: { fontFamily: Fonts.textSemiBold, fontSize: 16, lineHeight: 20 },
  buttonSmall: { fontFamily: Fonts.textSemiBold, fontSize: 15, lineHeight: 20 },
  priceInput: { fontFamily: Fonts.display, fontSize: 60, lineHeight: 64, letterSpacing: -0.6 },
  priceCurrency: {
    fontFamily: Fonts.monoRegular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.84,
    textTransform: 'uppercase',
  },
  // The logo's wordmark: Inter Bold with wide tracking (0.32 em), as in docs/design/README.md.
  wordmark: { fontFamily: Fonts.textBold, fontSize: 22, lineHeight: 28, letterSpacing: 7.04 },
  navAction: { fontFamily: Fonts.textMedium, fontSize: 16, lineHeight: 24 },
  step: { fontFamily: Fonts.monoRegular, fontSize: 13, lineHeight: 16 },
  chip: { fontFamily: Fonts.monoMedium, fontSize: 13, lineHeight: 16 },
  tileLabel: { fontFamily: Fonts.textSemiBold, fontSize: 13, lineHeight: 16 },
  option: { fontFamily: Fonts.textMedium, fontSize: 15, lineHeight: 20 },
  optionSelected: { fontFamily: Fonts.textSemiBold, fontSize: 15, lineHeight: 20 },
  tab: { fontFamily: Fonts.textMedium, fontSize: 14, lineHeight: 20 },
  tabSelected: { fontFamily: Fonts.textSemiBold, fontSize: 14, lineHeight: 20 },
  tabBadge: { fontFamily: Fonts.monoMedium, fontSize: 12, lineHeight: 16 },
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
