import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { Colors } from '@/constants/theme';
import { useWebFonts } from '@/hooks/use-web-fonts';

// Keeps the tabs underneath when the app is opened straight into another screen.
export const unstable_settings = {
  anchor: '(tabs)',
};

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.accent,
    background: Colors.paper,
    card: Colors.paper,
    text: Colors.ink,
    border: Colors.line,
  },
};

export default function RootLayout() {
  useWebFonts();

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-listing" options={{ presentation: 'modal' }} />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
