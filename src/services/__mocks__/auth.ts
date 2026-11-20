import type { AppSession, AuthOutcome } from '../auth';

// The stand-in every app test gets (see jest.setup.js): a seller who is already signed in,
// so tests about the rest of the app start past the entry screen. Tests about signing in
// replace these one by one.
export const signedInSeller: AppSession = { userId: 'user-1', email: 'ana@example.com' };

const ok = async (): Promise<AuthOutcome> => ({ ok: true });

export const signUp = jest.fn(ok);
export const confirmEmail = jest.fn(ok);
export const resendCode = jest.fn(ok);
export const signIn = jest.fn(ok);
export const signOut = jest.fn(ok);
export const deleteAccount = jest.fn(ok);
export const requestPasswordReset = jest.fn(ok);
export const resetPassword = jest.fn(ok);
export const currentSession = jest.fn(async (): Promise<AppSession | null> => signedInSeller);
export const onSessionChange = jest.fn((listener: (session: AppSession | null) => void) => {
  listener(signedInSeller);
  return () => {};
});
export const keepSessionFresh = jest.fn(() => () => {});
