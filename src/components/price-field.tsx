import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from './app-text';

import { BorderWidth, Colors, MaxFontScale, Spacing, Type } from '@/constants/theme';

export type PriceFieldProps = {
  /** Names the field for screen readers: "Price in EUR". */
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  /** The currency code shown beside the amount. */
  currency: string;
  placeholder: string;
};

// Room for "999999,99"; anything longer is not a price.
const MAX_LENGTH = 9;

/** The one large figure of the publish step, underlined like an amount written on a tag. */
export function PriceField({ label, value, onChangeText, currency, placeholder }: PriceFieldProps) {
  return (
    <View style={styles.field}>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.muted}
        selectionColor={Colors.accent}
        keyboardType="decimal-pad"
        maxLength={MAX_LENGTH}
        // Already the largest text on the screen: growing further would push the amount off it.
        maxFontSizeMultiplier={MaxFontScale.display}
        style={styles.amount}
      />
      <AppText
        variant="priceCurrency"
        color="muted"
        accessibilityElementsHidden
        importantForAccessibility="no">
        {currency}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.x2,
    paddingBottom: Spacing.x2,
    borderBottomWidth: BorderWidth.hairline,
    borderBottomColor: Colors.ink,
  },
  amount: {
    ...Type.priceInput,
    flex: 1,
    // An input has a width of its own, which would push the currency off the line.
    minWidth: 0,
    padding: 0,
    color: Colors.ink,
  },
});
