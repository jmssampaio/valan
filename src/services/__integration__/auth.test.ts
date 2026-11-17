import { confirmEmail, currentSession, resendCode, signIn, signOut, signUp } from '../auth';
import { getSupabase } from '../supabase';

import {
  createConfirmedUser,
  createUnconfirmedUser,
  latestEmailTo,
  PASSWORD,
  uniqueEmail,
} from './local-stack';

// The device is the boundary here (its storage, its app state); the Supabase stack is real.
jest.mock('react-native', () => ({
  AppState: { currentState: 'active', addEventListener: () => ({ remove: () => {} }) },
}));
jest.mock('../session-storage', () => {
  const values = new Map<string, string>();
  return {
    sessionStorage: {
      getItem: async (key: string) => values.get(key) ?? null,
      setItem: async (key: string, value: string) => void values.set(key, value),
      removeItem: async (key: string) => void values.delete(key),
    },
  };
});

afterEach(async () => {
  await getSupabase().auth.signOut({ scope: 'local' });
});

describe('signing up', () => {
  it('answers the same for a new email and for one that already has an account', async () => {
    const existing = await createConfirmedUser();

    const forNewEmail = await signUp(uniqueEmail(), PASSWORD, 'pt-PT');
    const forExistingEmail = await signUp(existing.email, PASSWORD, 'pt-PT');

    expect(forNewEmail).toEqual({ ok: true });
    expect(forExistingEmail).toEqual(forNewEmail);
  });

  it('does not sign the seller in before the email is confirmed', async () => {
    await signUp(uniqueEmail(), PASSWORD, 'pt-PT');

    expect(await currentSession()).toBeNull();
  });

  it('is refused with a password the server finds too weak', async () => {
    expect(await signUp(uniqueEmail(), 'curta', 'pt-PT')).toEqual({ ok: false, failure: 'weakPassword' });
  });
});

describe('the confirmation email', () => {
  it('carries a six-digit code that confirms the account, in the language of the seller', async () => {
    const email = uniqueEmail();
    await signUp(email, PASSWORD, 'pt-PT');

    const message = await latestEmailTo(email);
    const code = /\b\d{6}\b/.exec(message.Text)?.[0];

    expect(message.Text).toContain('Escreve este código na app');
    expect(code).toBeDefined();
    expect(await confirmEmail(email, code ?? '')).toEqual({ ok: true });
    expect(await currentSession()).toMatchObject({ email });
  });

  it('falls back to English for a language the app does not have', async () => {
    const email = uniqueEmail();
    await signUp(email, PASSWORD, 'fr');

    expect((await latestEmailTo(email)).Text).toContain('Enter this code in the app');
  });
});

describe('confirming the email', () => {
  it('signs the seller in with the code from the email', async () => {
    const { email, code } = await createUnconfirmedUser();

    expect(await confirmEmail(email, code)).toEqual({ ok: true });
    expect(await currentSession()).toMatchObject({ email });
  });

  it('refuses a wrong code and leaves the seller signed out', async () => {
    const { email, code } = await createUnconfirmedUser();
    const wrong = code === '000000' ? '111111' : '000000';

    expect(await confirmEmail(email, wrong)).toEqual({ ok: false, failure: 'code' });
    expect(await currentSession()).toBeNull();
  });

  it('answers a wrong code the same for an email that has no account', async () => {
    expect(await confirmEmail(uniqueEmail(), '000000')).toEqual({ ok: false, failure: 'code' });
  });

  // The server sends one email a minute to an address. The screen waits that minute before
  // it offers to resend, so a seller should never meet this answer.
  it('asks the seller to wait when another code is requested within a minute of the last', async () => {
    const { email } = await createUnconfirmedUser();

    expect(await resendCode(email)).toEqual({ ok: false, failure: 'rateLimited' });
  });

  it('accepts a request for another code for an email that has no account', async () => {
    expect(await resendCode(uniqueEmail())).toEqual({ ok: true });
  });
});

describe('signing in', () => {
  it('signs a confirmed seller in', async () => {
    const user = await createConfirmedUser();

    expect(await signIn(user.email, PASSWORD)).toEqual({ ok: true });
    expect(await currentSession()).toEqual({ userId: user.id, email: user.email });
  });

  it('gives the same reason for a wrong password and for an email with no account', async () => {
    const user = await createConfirmedUser();

    const wrongPassword = await signIn(user.email, 'outra frase longa errada');
    const unknownEmail = await signIn(uniqueEmail(), PASSWORD);

    expect(wrongPassword).toEqual({ ok: false, failure: 'credentials' });
    expect(unknownEmail).toEqual(wrongPassword);
  });

  it('does not reveal an unconfirmed account to someone without its password', async () => {
    const { email } = await createUnconfirmedUser();

    expect(await signIn(email, 'outra frase longa errada')).toEqual({ ok: false, failure: 'credentials' });
  });

  it('tells a seller with the right password that the email still needs confirming', async () => {
    const { email } = await createUnconfirmedUser();

    expect(await signIn(email, PASSWORD)).toEqual({ ok: false, failure: 'unconfirmed' });
    expect(await currentSession()).toBeNull();
  });
});

describe('signing out', () => {
  it('ends the session on the device and on the server', async () => {
    const user = await createConfirmedUser();
    await signIn(user.email, PASSWORD);
    const { data } = await getSupabase().auth.getSession();
    const refreshToken = data.session?.refresh_token ?? '';

    expect(await signOut()).toEqual({ ok: true });

    expect(await currentSession()).toBeNull();
    // The old refresh token no longer buys a new session: it was revoked, not just forgotten.
    const revived = await getSupabase().auth.refreshSession({ refresh_token: refreshToken });
    expect(revived.data.session).toBeNull();
  });
});
