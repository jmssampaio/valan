/**
 * Valan design tokens. Source: docs/design/README.md and docs/design/mockups/valan-mockups-v2.html.
 * The app is light-only in v1.0, so there is a single palette.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  paper: '#F5EFE6',
  surface: '#FBF8F3',
  ink: '#1E1A17',
  muted: '#6B6259',
  /** Dividers only. Controls are edged with ink: this is too faint (1.4:1) to mark one. */
  line: '#D8CEBF',
  accent: '#B4460F',
  onAccent: '#FFFFFF',
  success: '#2C6A3F',
  error: '#A12A1E',
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

export const Spacing = {
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = 10;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
