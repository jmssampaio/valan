import { createContext, use, useState, type ReactNode } from 'react';

type AuthFlow = {
  /** The address waiting for its confirmation code; null when none is. */
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
};

const AuthFlowContext = createContext<AuthFlow | null>(null);

/**
 * Carries the email from the form to the code screen. It is kept here and not in the route,
 * so an address never ends up in a URL.
 */
export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  return <AuthFlowContext value={{ pendingEmail, setPendingEmail }}>{children}</AuthFlowContext>;
}

export function useAuthFlow(): AuthFlow {
  const value = use(AuthFlowContext);
  if (value === null) {
    throw new Error('useAuthFlow must be used inside the sign-in screens.');
  }
  return value;
}
