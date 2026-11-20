import type { AuthError, Session } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { AuthFailure } from '@/features/auth/rules';

import { getSupabase } from './supabase';

/** Who is signed in, as much as the rest of the app needs to know. */
export type AppSession = {
  userId: string;
  email: string | null;
};

export type AuthOutcome = { ok: true } | { ok: false; failure: AuthFailure };

const OK: AuthOutcome = { ok: true };

const TOO_MANY_REQUESTS = 429;

function failed(failure: AuthFailure): AuthOutcome {
  return { ok: false, failure };
}

/** The reasons that mean the same whatever was being attempted. */
function commonFailure(error: AuthError): AuthFailure | null {
  // No answer at all: the request never reached the server.
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) return 'offline';
  if (error.status === TOO_MANY_REQUESTS || error.code?.startsWith('over_')) return 'rateLimited';
  return null;
}

function toAppSession(session: Session | null): AppSession | null {
  return session ? { userId: session.user.id, email: session.user.email ?? null } : null;
}

/**
 * Starts an account. The answer is the same whether or not the email already has one, so
 * nobody can use this to find out who is registered: either way, "we sent you a code".
 */
export async function signUp(email: string, password: string, language: string): Promise<AuthOutcome> {
  const { error } = await getSupabase().auth.signUp({
    email: email.trim(),
    password,
    // Read by the confirmation email to pick its language.
    options: { data: { language } },
  });
  if (!error) return OK;

  if (error.code === 'weak_password') return failed('weakPassword');
  return failed(commonFailure(error) ?? 'unknown');
}

/** Confirms the email with the code it received, which signs the seller in. */
export async function confirmEmail(email: string, code: string): Promise<AuthOutcome> {
  const { error } = await getSupabase().auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  });
  if (!error) return OK;

  // Wrong, expired, or for an email with no account: all the same to the person typing.
  return failed(commonFailure(error) ?? 'code');
}

export async function resendCode(email: string): Promise<AuthOutcome> {
  const { error } = await getSupabase().auth.resend({ type: 'signup', email: email.trim() });
  if (!error) return OK;

  return failed(commonFailure(error) ?? 'unknown');
}

export async function signIn(email: string, password: string): Promise<AuthOutcome> {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (!error) return OK;

  // Only reached with the right password, so it gives nothing away to anyone else.
  if (error.code === 'email_not_confirmed') return failed('unconfirmed');
  // An unknown email and a wrong password get the same answer from the server, and here.
  if (error.code === 'invalid_credentials') return failed('credentials');
  return failed(commonFailure(error) ?? 'unknown');
}

/** Ends the session here and revokes it on the server, so its tokens stop working everywhere. */
export async function signOut(): Promise<AuthOutcome> {
  const { error } = await getSupabase().auth.signOut();
  if (!error) return OK;

  return failed(commonFailure(error) ?? 'unknown');
}

export async function currentSession(): Promise<AppSession | null> {
  const { data } = await getSupabase().auth.getSession();
  return toAppSession(data.session);
}

// While a password is being reset a session exists on the server before the new password is
// stored. Nobody listening is told of it until the reset is over: otherwise the app would
// move on as signed in while the account still has the password its owner forgot.
let holdingSessionChanges = false;
const announcers = new Set<() => void>();

async function withSessionChangesHeld<Result>(work: () => Promise<Result>): Promise<Result> {
  holdingSessionChanges = true;
  try {
    return await work();
  } finally {
    holdingSessionChanges = false;
    // Whatever the session is now, every listener hears it once.
    announcers.forEach((announce) => announce());
  }
}

/**
 * Calls back with the session now and every time it changes (sign-in, sign-out, expiry).
 * Returns the function that stops listening.
 */
export function onSessionChange(listener: (session: AppSession | null) => void): () => void {
  let latest: AppSession | null = null;
  const announce = () => listener(latest);
  announcers.add(announce);

  const { data } = getSupabase().auth.onAuthStateChange((_event, session) => {
    latest = toAppSession(session);
    if (!holdingSessionChanges) announce();
  });

  return () => {
    announcers.delete(announce);
    data.subscription.unsubscribe();
  };
}

/**
 * Sends a code to reset the password. The answer is the same whether or not the email has
 * an account, so nobody can use this to find out who is registered.
 */
export async function requestPasswordReset(email: string): Promise<AuthOutcome> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim());
  if (!error) return OK;

  return failed(commonFailure(error) ?? 'unknown');
}

/**
 * Sets a new password with the code from the email, signs the seller in, and ends the
 * sessions on every other device: whoever had the old password is out.
 */
export async function resetPassword(email: string, code: string, newPassword: string): Promise<AuthOutcome> {
  const { auth } = getSupabase();

  return withSessionChangesHeld(async () => {
    const verified = await auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'recovery' });
    // Wrong, expired, or for an email with no account: all the same to the person typing.
    if (verified.error) return failed(commonFailure(verified.error) ?? 'code');

    const updated = await auth.updateUser({ password: newPassword });
    if (updated.error) {
      // The code is spent and the password is unchanged: nobody stays signed in on it.
      await auth.signOut({ scope: 'local' });
      if (updated.error.code === 'weak_password') return failed('weakPassword');
      return failed(commonFailure(updated.error) ?? 'unknown');
    }

    // The password is changed either way. If the other sessions cannot be ended now, their
    // access tokens run out within the hour and their refresh needs the old session.
    await auth.signOut({ scope: 'others' });
    return OK;
  });
}

/**
 * Refreshes the access token only while the app is in front. In the background the timer
 * cannot be trusted, and a refresh that half-happens would sign the seller out.
 * Returns the function that stops it.
 */
export function keepSessionFresh(): () => void {
  const { auth } = getSupabase();
  const follow = (state: string) => {
    if (state === 'active') {
      void auth.startAutoRefresh();
    } else {
      void auth.stopAutoRefresh();
    }
  };

  follow(AppState.currentState ?? 'active');
  const subscription = AppState.addEventListener('change', follow);
  return () => {
    subscription.remove();
    void auth.stopAutoRefresh();
  };
}

const WRONG_PASSWORD = 403;

/**
 * Deletes the seller's account with everything in it, for good. The server does it, and
 * only for the account the session belongs to; it asks for the current password again,
 * because an open session alone must not be enough for something that cannot be undone.
 */
export async function deleteAccount(password: string): Promise<AuthOutcome> {
  const supabase = getSupabase();
  const { error } = await supabase.functions.invoke('delete-account', { body: { password } });

  if (error) {
    // The request never reached the server.
    if (error.name === 'FunctionsFetchError') return failed('offline');
    const status = error.context instanceof Response ? error.context.status : undefined;
    return failed(status === WRONG_PASSWORD ? 'credentials' : 'unknown');
  }

  // The account is gone, so its session means nothing: forget it here too.
  await supabase.auth.signOut({ scope: 'local' });
  return OK;
}
