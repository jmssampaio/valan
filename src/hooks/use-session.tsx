import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { keepSessionFresh, onSessionChange, type AppSession } from '@/services/auth';

export type SessionState =
  /** The stored session has not been read yet: nothing can be shown. */
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: AppSession };

const SessionContext = createContext<SessionState | null>(null);

/** Knows who is signed in, from the moment the app starts and through every change. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });

  useEffect(() => {
    const stopListening = onSessionChange((session) => {
      setState(session ? { status: 'signedIn', session } : { status: 'signedOut' });
    });
    const stopRefreshing = keepSessionFresh();

    return () => {
      stopListening();
      stopRefreshing();
    };
  }, []);

  return <SessionContext value={state}>{children}</SessionContext>;
}

export function useSession(): SessionState {
  const value = use(SessionContext);
  if (value === null) {
    throw new Error('useSession must be used inside the app.');
  }
  return value;
}
