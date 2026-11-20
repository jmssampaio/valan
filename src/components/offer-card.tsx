import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';
import { Button } from './button';
import { Tag, type TagTone } from './tag';

import {
  BorderWidth,
  Colors,
  MaxFontScale,
  MinFontSize,
  Spacing,
  Type,
} from '@/constants/theme';

export type OfferCardAction = {
  label: string;
  /** When several cards share a label ("Aceitar"), says which offer this one is for. */
  accessibilityLabel?: string;
  onPress: () => void;
  /** The action that goes ahead with the offer; the others are outlined. */
  primary?: boolean;
  disabled?: boolean;
};

export type OfferCardProps = {
  title: string;
  /** Who offered, where, and when it expires. */
  meta: string;
  /** What the seller asks; null when the item has no price. */
  asking: string | null;
  /** What the buyer offers: the one number this card is about. */
  price: string;
  /** The outcome, for an offer that was answered. */
  tag?: { label: string; tone: TagTone };
  /** Why there is nothing to do, when there is a reason. */
  note?: string;
  actions: readonly OfferCardAction[];
  /** The last card of a list has no divider. */
  isLast?: boolean;
};

const PRICE_MINIMUM_SCALE = MinFontSize / Type.offerNumber.fontSize;

/** One offer from a buyer, with what the seller can do about it. */
export function OfferCard({ title, meta, asking, price, tag, note, actions, isLast = false }: OfferCardProps) {
  return (
    <View style={[styles.card, !isLast && styles.divider]}>
      <View style={styles.summary}>
        <View style={styles.text}>
          <AppText variant="rowTitle">{title}</AppText>
          <AppText variant="rowMeta" color="muted">
            {meta}
          </AppText>
          {asking ? (
            <AppText variant="label" color="muted" style={styles.asking}>
              {asking}
            </AppText>
          ) : null}
        </View>
        <View style={styles.figure}>
          <AppText
            variant="offerNumber"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={PRICE_MINIMUM_SCALE}
            maxFontSizeMultiplier={MaxFontScale.display}>
            {price}
          </AppText>
          {tag ? <Tag label={tag.label} tone={tag.tone} /> : null}
        </View>
      </View>
      {note ? (
        <AppText variant="rowMeta" color="muted">
          {note}
        </AppText>
      ) : null}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map(({ label, accessibilityLabel, onPress, primary, disabled }) => (
            <View key={label} style={styles.action}>
              <Button
                label={label}
                accessibilityLabel={accessibilityLabel}
                variant={primary ? 'primary' : 'secondary'}
                disabled={disabled}
                onPress={onPress}
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.x3,
    paddingVertical: Spacing.x4,
  },
  divider: {
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.line,
  },
  // On a narrow screen or at a large text size the price drops below the text.
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.x3,
  },
  text: {
    flexShrink: 1,
    gap: Spacing.x1,
  },
  asking: {
    marginTop: Spacing.x2,
  },
  figure: {
    alignItems: 'flex-end',
    gap: Spacing.x2,
  },
  // The same gap as the buttons of the detail screen's footer: one rhythm for a pair of buttons.
  actions: {
    flexDirection: 'row',
    gap: Spacing.x2,
  },
  action: {
    flex: 1,
  },
});
