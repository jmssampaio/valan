import { AppText } from './app-text';

export type ScreenTitleProps = {
  children: string;
  size?: 'large' | 'medium';
};

export function ScreenTitle({ children, size = 'large' }: ScreenTitleProps) {
  return (
    <AppText accessibilityRole="header" variant={size === 'large' ? 'screenTitle' : 'sectionTitle'}>
      {children}
    </AppText>
  );
}
