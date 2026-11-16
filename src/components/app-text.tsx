import { Text, type TextProps } from 'react-native';

import { Colors, Type, type TextVariant, type ThemeColor } from '@/constants/theme';

export type AppTextProps = TextProps & {
  variant?: TextVariant;
  color?: ThemeColor;
};

export function AppText({ variant = 'body', color = 'ink', style, ...rest }: AppTextProps) {
  return <Text style={[Type[variant], { color: Colors[color] }, style]} {...rest} />;
}
