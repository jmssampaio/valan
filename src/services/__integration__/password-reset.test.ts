import {
  currentSession,
  onSessionChange,
  requestPasswordReset,
  resetPassword,
  signIn,
  type AppSession,
} from '../auth';
import { getSupabase } from '../supabase';

import {
  createConfirmedUser,
  emailTo,
  PASSWORD,
  recoveryCodeFor,
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

const NEW_PASSWORD = 'outra frase longa, escolhida agora';

async function signedOut() {
  await getSupabase().auth.signOut({ scope: 'local' });
}

afterEach(signedOut);

describe('asking to reset the password', () => {
  it('answers the same for an email with an account and for one without', async () => {
    const user = await createConfirmedUser();

    const forKnownEmail = await requestPasswordReset(user.email);
    const forUnknownEmail = await requestPasswordReset(uniqueEmail());

    expect(forKnownEmail).toEqual({ ok: true });
    expect(forUnknownEmail).toEqual(forKnownEmail);
  });

  it('sends a six-digit code that resets the password, in the language of the account', async () => {
    const user = await createConfirmedUser(uniqueEmail(), 'pt-PT');
    await requestPasswordReset(user.email);

    const message = await emailTo(user.email, 'Escreve este código na app');
    const code = /\b\d{6}\b/.exec(message.Text)?.[0];

    expect(code).toBeDefined();
    expect(await resetPassword(user.email, code ?? '', NEW_PASSWORD)).toEqual({ ok: true });
  });

  it('asks the seller to wait when another code is requested within a minute of the last', async () => {
    const user = await createConfirmedUser();
    await requestPasswordReset(user.email);

    expect(await requestPasswordReset(user.email)).toEqual({ ok: false, failure: 'rateLimited' });
  });
});

describe('resetting the password with the code', () => {
  it('changes the password: the old one stops working and the new one signs in', async () => {
    const user = await createConfirmedUser();
    const code = await recoveryCodeFor(user.email);

    expect(await resetPassword(user.email, code, NEW_PASSWORD)).toEqual({ ok: true });

    await signedOut();
    expect(await signIn(user.email, PASSWORD)).toEqual({ ok: false, failure: 'credentials' });
    expect(await signIn(user.email, NEW_PASSWORD)).toEqual({ ok: true });
  });

  it('leaves the seller signed in', async () => {
    const user = await createConfirmedUser();
    const code = await recoveryCodeFor(user.email);

    await resetPassword(user.email, code, NEW_PASSWORD);

    expect(await currentSession()).toEqual({ userId: user.id, email: user.email });
  });

  it('refuses a wrong code and leaves the password as it was', async () => {
    const user = await createConfirmedUser();
    const code = await recoveryCodeFor(user.email);
    const wrong = code === '000000' ? '111111' : '000000';

    expect(await resetPassword(user.email, wrong, NEW_PASSWORD)).toEqual({ ok: false, failure: 'code' });

    expect(await currentSession()).toBeNull();
    expect(await signIn(user.email, PASSWORD)).toEqual({ ok: true });
  });

  it('answers a wrong code the same for an email that has no account', async () => {
    expect(await resetPassword(uniqueEmail(), '000000', NEW_PASSWORD)).toEqual({
      ok: false,
      failure: 'code',
    });
  });

  it('refuses a password the server finds too weak, and leaves the seller signed out', async () => {
    const user = await createConfirmedUser();
    const code = await recoveryCodeFor(user.email);

    expect(await resetPassword(user.email, code, 'curta')).toEqual({ ok: false, failure: 'weakPassword' });

    expect(await currentSession()).toBeNull();
    expect(await signIn(user.email, PASSWORD)).toEqual({ ok: true });
  });

  it('ends the sessions that were open on other devices', async () => {
    const user = await createConfirmedUser();
    // Another device, signed in with the old password.
    await signIn(user.email, PASSWORD);
    const { data } = await getSupabase().auth.getSession();
    const otherDevice = data.session?.refresh_token ?? '';
    await signedOut();
    const code = await recoveryCodeFor(user.email);

    await resetPassword(user.email, code, NEW_PASSWORD);

    const mine = (await getSupabase().auth.getSession()).data.session;
    await signedOut();
    const revived = await getSupabase().auth.refreshSession({ refresh_token: otherDevice });
    expect(revived.data.session).toBeNull();
    expect(mine).not.toBeNull();
  });

  it('tells the seller by email that the password was changed', async () => {
    const user = await createConfirmedUser(uniqueEmail(), 'pt-PT');
    const code = await recoveryCodeFor(user.email);

    await resetPassword(user.email, code, NEW_PASSWORD);

    expect((await emailTo(user.email, 'A tua palavra-passe foi alterada')).Text).toContain(
      'Se não foste tu',
    );
  });
});

describe('the session while the password is being reset', () => {
  it('is not announced when the code is accepted, only once the new password is stored', async () => {
    const user = await createConfirmedUser();
    const code = await recoveryCodeFor(user.email);
    const seen: (AppSession | null)[] = [];
    const stop = onSessionChange((session) => seen.push(session));
    // The listener is told the starting state first: nobody is signed in.
    await new Promise((resolve) => setTimeout(resolve, 50));
    const before = seen.length;

    // Between the code being accepted and the password being stored, a session exists on
    // the server. Nobody listening may hear of it: the app would move on with the old password.
    const storePassword = jest.spyOn(getSupabase().auth, 'updateUser');
    let heardBeforePasswordWasStored = 0;
    storePassword.mockImplementationOnce(async (...args) => {
      heardBeforePasswordWasStored = seen.slice(before).filter((session) => session !== null).length;
      storePassword.mockRestore();
      return getSupabase().auth.updateUser(...args);
    });

    await resetPassword(user.email, code, NEW_PASSWORD);
    await new Promise((resolve) => setTimeout(resolve, 50));
    stop();

    expect(heardBeforePasswordWasStored).toBe(0);
    expect(seen.at(-1)).toEqual({ userId: user.id, email: user.email });
  });

  it('is never announced when the new password is refused', async () => {
    const user = await createConfirmedUser();
    const code = await recoveryCodeFor(user.email);
    const seen: (AppSession | null)[] = [];
    const stop = onSessionChange((session) => seen.push(session));

    await resetPassword(user.email, code, 'curta');
    await new Promise((resolve) => setTimeout(resolve, 50));
    stop();

    expect(seen.filter((session) => session !== null)).toEqual([]);
  });
});
