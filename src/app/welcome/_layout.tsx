import { Stack } from 'expo-router/stack';

import { AuthFlowProvider } from '@/hooks/use-auth-flow';

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
