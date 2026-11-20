import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { useWebFonts } from '@/hooks/use-web-fonts';

// Keeps the tabs underneath when the app is opened straight into another screen.
export const unstable_settings = {
  anchor: '(tabs)',
};

// The splash stays until the stored session is read, so a signed-in seller never sees the
// entry screen flash by, and a signed-out one never sees the listings.
void SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    background: Colors.bg,
    card: Colors.bg,
    text: Colors.ink,
    border: Colors.line,
  },
};

export default function RootLayout() {
  useWebFonts();

  return (
    <SessionProvider>
      <ThemeProvider value={navigationTheme}>
        <Screens />
      </ThemeProvider>
    </SessionProvider>
  );
}

/**
 * Which screens exist depends on whether someone is signed in. This is for the seller's
 * sake, not for security: what protects the data is the database, which gives a signed-out
 * caller nothing.
 */
function Screens() {
  const { status } = useSession();
  const isReady = status !== 'loading';
  const isSignedIn = status === 'signedIn';

  useEffect(() => {
    if (isReady) void SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-listing" options={{ presentation: 'modal' }} />
        <Stack.Screen name="subscription" options={{ presentation: 'modal' }} />
        <Stack.Screen name="delete-account" options={{ presentation: 'modal' }} />
        <Stack.Screen name="listing/[id]" />
        <Stack.Screen name="connect" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
    </Stack>
  );
}
