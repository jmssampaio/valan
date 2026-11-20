/**
 * Valan design tokens, from design v3: docs/design/v3/design-spec.md, section 2, with the rules
 * of docs/standards/ux.md on top (no text below 12 pt, spacing on the 4-point grid).
 * The app is light-only in v1.0, so there is a single palette.
 */

import type { TextStyle, ViewStyle } from 'react-native';

export const Colors = {
  /** The page behind everything. */
  bg: '#F6F4F1',
  /** Cards, lists and fields. */
  surface: '#FFFFFF',
  /** Secondary buttons, the track of a segmented control, a photo still to come. */
  fill: '#EDE9E3',
  /** The 1-point contour of a card and the dividers. Too faint (1.2:1) to be a control's only edge. */
  line: '#E3DED6',
  ink: '#1E1A17',
  muted: '#6B6259',
  /** The logo's orange: the main button, links, and a listing that is published. */
  primary: '#B4460F',
  /** Primary when pressed; text and symbols on primaryTint. */
  primaryPressed: '#8F370B',
  /** Behind the wave on empty and waiting screens. */
  primaryTint: '#F8E8DC',
  /** Only the wave inside the app icon. */
  cream: '#F5EFE6',
  /** Only the counter on the Propostas tab, with ink text. */
  badge: '#E07A2E',
  /** The third series of a chart; never text. */
  chart3: '#E3A47A',
  /** Errors and actions that cannot be undone. */
  danger: '#B3261E',
  dangerTint: '#FCE9E7',
  onPrimary: '#FFFFFF',
  onInk: '#FFFFFF',
  transparent: 'transparent',
} as const;

export type ThemeColor = keyof typeof Colors;

/** iOS selects embedded fonts by PostScript name, one per weight. */
export const Fonts = {
  /** Titles and big numbers only. */
  display: 'SpaceGrotesk-SemiBold',
  textRegular: 'Inter-Regular',
  textMedium: 'Inter-Medium',
  textSemiBold: 'Inter-SemiBold',
  textBold: 'Inter-Bold',
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
  thumbnail: 52,
  /** The app icon inside the logo: the logo has this one size. */
  logo: 40,
  /** The long side of the photo on an item's own screen; the short side follows its proportions. */
  detailPhoto: 120,
  /** The tile behind the wave on an empty or failed screen, and the wave on it. */
  waveTile: 96,
  waveOnTile: 60,
  heroWave: 152,
  /** One segment of the step progress bar in a multi-step flow. */
  progress: 4,
  checkbox: 24,
  icon: 24,
  /** A symbol beside a label, as in a button or a field: a touch smaller than one that stands alone. */
  inlineIcon: 20,
  /** The counter on a tab's symbol. */
  badge: 20,
  /** The symbol inside a platform chip, beside its words. */
  sealIcon: 12,
} as const;

export const Radius = {
  /** Seals and chips. */
  seal: 8,
  /** Small controls: the options of a segmented control, a box to tick, a thumbnail. */
  control: 10,
  /** Fields and buttons. */
  field: 14,
  card: 16,
  /** Fully round ends, for pills and counters. */
  pill: 999,
  /** The tile behind the wave on an empty or failed screen (design-spec.md, EmptyState). */
  waveTile: 28,
} as const;

export const BorderWidth = {
  hairline: 1,
  /** The edge of a field, a seal or a box to tick. */
  control: 1.5,
  /** The underline of the chosen tab in a row of text tabs. */
  indicator: 2,
} as const;

/** Minimum heights, so controls grow with the system text size instead of clipping. */
export const ControlHeight = {
  /** A multi-line text field, before it grows with its text. */
  area: 96,
  large: 52,
  compact: 48,
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

/** The one shadow of our own (docs/standards/ux.md): under the chosen option of a segmented control. */
export const Shadow = {
  selectedOption: {
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
  },
} as const satisfies Record<string, ViewStyle>;

const tabularFigures: TextStyle['fontVariant'] = ['tabular-nums'];

/** One bundle per text role. Weight comes from the font file, never from fontWeight. */
export const Type = {
  // Space Grotesk: titles and big numbers, with tight tracking (-0.02em on the largest).
  screenTitle: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.64 },
  sectionTitle: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  /** The title of an empty or failed screen, and of an item on its own screen. */
  smallTitle: { fontFamily: Fonts.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  /** The price field and the sales total. */
  bigNumber: {
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    fontVariant: tabularFigures,
  },
  summaryValue: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.56 },
  /** The offered price on an offer card: the one number the card is about. */
  offerNumber: {
    fontFamily: Fonts.display,
    fontSize: 28,
    lineHeight: 32,
    fontVariant: tabularFigures,
  },
  /** The price on an item's own screen: the one figure the seller came to see. */
  heroPrice: {
    fontFamily: Fonts.display,
    fontSize: 24,
    lineHeight: 28,
    fontVariant: tabularFigures,
  },
  priceCurrency: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28 },
  // Inter: everything else.
  body: { fontFamily: Fonts.textRegular, fontSize: 16, lineHeight: 24 },
  bodySmall: { fontFamily: Fonts.textRegular, fontSize: 15, lineHeight: 22 },
  // Inter, not Space Grotesk: prices stacked in a list are compared digit by digit (CLAUDE.md).
  rowPrice: {
    fontFamily: Fonts.textSemiBold,
    fontSize: 17,
    lineHeight: 24,
    fontVariant: tabularFigures,
  },
  rowTitle: { fontFamily: Fonts.textSemiBold, fontSize: 15, lineHeight: 20 },
  rowMeta: { fontFamily: Fonts.textRegular, fontSize: 13, lineHeight: 18 },
  /** Names a section, a field or the step of a flow. */
  label: { fontFamily: Fonts.textSemiBold, fontSize: 13, lineHeight: 18 },
  button: { fontFamily: Fonts.textSemiBold, fontSize: 16, lineHeight: 20 },
  buttonCompact: { fontFamily: Fonts.textSemiBold, fontSize: 15, lineHeight: 20 },
  navAction: { fontFamily: Fonts.textMedium, fontSize: 15, lineHeight: 20 },
  /** The words inside a platform chip. */
  seal: { fontFamily: Fonts.textSemiBold, fontSize: 12, lineHeight: 16 },
  chip: { fontFamily: Fonts.textSemiBold, fontSize: 14, lineHeight: 20 },
  tileLabel: { fontFamily: Fonts.textSemiBold, fontSize: 13, lineHeight: 16 },
  option: { fontFamily: Fonts.textMedium, fontSize: 14, lineHeight: 20 },
  optionSelected: { fontFamily: Fonts.textSemiBold, fontSize: 14, lineHeight: 20 },
  // 12, not the 11 of the pictures: no text goes below the floor.
  tab: { fontFamily: Fonts.textMedium, fontSize: 12, lineHeight: 16 },
  tabSelected: { fontFamily: Fonts.textBold, fontSize: 12, lineHeight: 16 },
  tabBadge: { fontFamily: Fonts.textBold, fontSize: 12, lineHeight: 16 },
  // The logo's wordmark: Inter Bold 18 with letters spaced at 0.32 em.
  wordmark: { fontFamily: Fonts.textBold, fontSize: 18, lineHeight: 20, letterSpacing: 5.76 },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof Type;
