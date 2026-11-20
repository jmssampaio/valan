import { AppText } from './app-text';

import type { TextVariant } from '@/constants/theme';

export type ScreenTitleProps = {
  children: string;
  /** Large for the tabs and the connect screen, medium for the steps of a flow, small for a message. */
  size?: 'large' | 'medium' | 'small';
  align?: 'left' | 'center';
};

const variantBySize: Record<NonNullable<ScreenTitleProps['size']>, TextVariant> = {
  large: 'screenTitle',
  medium: 'sectionTitle',
  small: 'smallTitle',
};

export function ScreenTitle({ children, size = 'large', align = 'left' }: ScreenTitleProps) {
  return (
    <AppText
      accessibilityRole="header"
      variant={variantBySize[size]}
      style={align === 'center' ? { textAlign: 'center' } : undefined}>
      {children}
    </AppText>
  );
}
