import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BorderWidth, Colors, Radius, Spacing } from '@/constants/theme';

export type CardProps = {
  children: ReactNode;
  /**
   * Room inside the card, for one block of content such as a total. Without it the card holds
   * rows, which carry their own room and are separated by a line.
   */
  padding?: keyof typeof Spacing;
  testID?: string;
};

/**
 * A white surface with a 1-point line around it. Its rows are separated by a 1-point line, so a
 * screen only lists the rows it has; a row left out (null) leaves no line behind.
 */
export function Card({ children, padding, testID }: CardProps) {
  return (
    <View testID={testID} style={[styles.card, padding && { padding: Spacing[padding] }]}>
      {padding ? children : <Rows>{children}</Rows>}
    </View>
  );
}

function Rows({ children }: { children: ReactNode }) {
  return Children.toArray(children).map((row, index) => (
    <Fragment key={isValidElement(row) && row.key !== null ? row.key : index}>
      {index > 0 ? (
        <View
          testID="card-divider"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.divider}
        />
      ) : null}
      {row}
    </Fragment>
  ));
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderWidth: BorderWidth.hairline,
    borderColor: Colors.line,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  divider: {
    height: BorderWidth.hairline,
    backgroundColor: Colors.line,
  },
});
