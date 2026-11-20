import type { SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Icon } from './icon';

import { BorderWidth, Colors, Radius, Size, Spacing, type ThemeColor } from '@/constants/theme';
import { t, type TranslationKey } from '@/i18n';

/** What an item is on one marketplace. `chipState` in src/features/listings works it out. */
export type ChipState = 'live' | 'pending' | 'paused' | 'error' | 'sold' | 'off';

type Look = {
  background: ThemeColor;
  text: ThemeColor;
  edge: ThemeColor;
  symbol: SFSymbol;
};

// Colours from design-spec.md. Paused uses `muted` where the pictures have two greys that are
// not tokens; pending is not in the spec (CLAUDE.md keeps it) and is drawn like paused.
const looks: Record<ChipState, Look> = {
  live: { background: 'primary', text: 'onPrimary', edge: 'primary', symbol: 'checkmark' },
  pending: { background: 'surface', text: 'muted', edge: 'muted', symbol: 'clock' },
  paused: { background: 'surface', text: 'muted', edge: 'muted', symbol: 'pause' },
  error: { background: 'dangerTint', text: 'danger', edge: 'danger', symbol: 'exclamationmark' },
  sold: { background: 'ink', text: 'onInk', edge: 'ink', symbol: 'checkmark' },
  off: { background: 'fill', text: 'muted', edge: 'fill', symbol: 'minus' },
};

const wordKeys: Record<ChipState, TranslationKey> = {
  live: 'chip.live',
  pending: 'chip.pending',
  paused: 'chip.paused',
  error: 'chip.error',
  sold: 'chip.sold',
  off: 'chip.off',
};

export type PlatformChipProps = {
  /** The marketplace's own name, from src/services/marketplaces.ts; never written here. */
  name: string;
  state: ChipState;
};

/**
 * The mark of the app: where an item is and how it is doing there. The state is always said in
 * words; the symbol beside them is the one exception to the icon rule (docs/standards/ux.md), so
 * the state never rests on colour alone.
 */
export function PlatformChip({ name, state }: PlatformChipProps) {
  const look = looks[state];

  return (
    <View
      testID={`chip-${state}`}
      style={[
        styles.chip,
        { backgroundColor: Colors[look.background], borderColor: Colors[look.edge] },
        state === 'pending' && styles.waiting,
      ]}>
      <AppText variant="seal" color={look.text} numberOfLines={1}>
        {t(wordKeys[state], { marketplace: name })}
      </AppText>
      <Icon name={look.symbol} size={Size.sealIcon} color={look.text} weight="bold" />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.x1,
    paddingVertical: Spacing.x1,
    paddingHorizontal: Spacing.x2,
    borderRadius: Radius.seal,
    borderWidth: BorderWidth.control,
  },
  // Still on its way: the edge is not drawn solid yet.
  waiting: {
    borderStyle: 'dashed',
  },
});
