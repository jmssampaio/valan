import { Stack } from 'expo-router/stack';

import { AuthFlowProvider } from '@/hooks/use-auth-flow';

// A screen opened directly (a reloaded page, a link) still has the entry screen under it,
// so its way back always leads somewhere.
export const unstable_settings = {
  anchor: 'index',
};

/**
 * Everything a signed-out visitor can see: the entry screen (the index, so it is where they
 * land whatever route they asked for) and signing in with email.
 */
export default function WelcomeLayout() {
  return (
    <AuthFlowProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthFlowProvider>
  );
}
