import { useNetworkState } from 'expo-network';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import {
  confirmEmail,
  deleteAccount,
  onSessionChange,
  requestPasswordReset,
  resendCode,
  resetPassword,
  signIn,
  signOut,
  signUp,
  type AppSession,
  type AuthOutcome,
} from '@/services/auth';
import { listItems } from '@/services/listings';
import { countPendingOffers } from '@/services/offers';
import { listSales } from '@/services/sales';

// System boundaries: the device language, the network state and the services.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('expo-network', () => ({ useNetworkState: jest.fn() }));
jest.mock('@/services/listings');
jest.mock('@/services/offers');
jest.mock('@/services/sales');

const APP_DIR = 'src/app';
const ana: AppSession = { userId: 'user-1', email: 'ana@example.com' };
const PASSPHRASE = 'o disco está na prateleira';

/** Stands in for the session changing: signing in, signing out, or an expiry. */
let changeSession: (session: AppSession | null) => void = () => {};

/** Starts the app as the session listener would report it. */
function startWith(initial: AppSession | null | 'unknown') {
  jest.mocked(onSessionChange).mockImplementation((listener) => {
    changeSession = listener;
    if (initial !== 'unknown') listener(initial);
    return () => {};
  });
}

/** A service answer that is held back until the test releases it. */
function heldBack() {
  let release: (outcome: AuthOutcome) => void = () => {};
  const promise = new Promise<AuthOutcome>((resolve) => (release = resolve));
  return { promise, release };
}

function setOnline(isConnected: boolean) {
  jest.mocked(useNetworkState).mockReturnValue({ isConnected, isInternetReachable: isConnected });
}

async function openEmailForm() {
  startWith(null);
  await renderRouter(APP_DIR);
  await fireEvent.press(screen.getByRole('button', { name: 'Continuar com email' }));
}

async function fill(email: string, password: string) {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.changeText(screen.getByLabelText('Palavra-passe'), password);
}

/** Fills the sign-up form and sends it, which leads to the code screen. */
async function signUpAsAna() {
  await openEmailForm();
  await fireEvent.press(screen.getByRole('radio', { name: 'Criar conta' }));
  await fill('ana@example.com', PASSPHRASE);
  await fireEvent.press(screen.getByRole('button', { name: 'Criar conta' }));
}

const submitButton = (name: string) => screen.getByRole('button', { name });

afterEach(() => jest.useRealTimers());

beforeEach(() => {
  jest.clearAllMocks();
  setOnline(true);
  for (const call of [
    signIn,
    signUp,
    confirmEmail,
    resendCode,
    signOut,
    requestPasswordReset,
    resetPassword,
  ]) {
    jest.mocked(call).mockResolvedValue({ ok: true });
  }
  jest.mocked(listItems).mockResolvedValue([]);
  jest.mocked(countPendingOffers).mockResolvedValue(0);
  jest.mocked(listSales).mockResolvedValue([]);
});

describe('who sees what', () => {
  it('shows nothing until the stored session has been read', async () => {
    startWith('unknown');
    await renderRouter(APP_DIR);

    expect(screen.queryByRole('header')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button')).not.toBeOnTheScreen();

    await act(async () => changeSession(null));

    expect(screen.getByRole('button', { name: 'Continuar com email' })).toBeOnTheScreen();
  });

  it.each(['/', '/account', '/new-listing/catalogue', '/listing/abc123', '/connect', '/subscription'])(
    'sends a signed-out visitor who opens %s to the entry screen',
    async (route) => {
      startWith(null);
      await renderRouter(APP_DIR, { initialUrl: route });

      expect(screen).toHavePathname('/welcome');
      expect(listItems).not.toHaveBeenCalled();
    },
  );

  it('takes a signed-in seller to the listings', async () => {
    startWith(ana);
    await renderRouter(APP_DIR);

    expect(screen).toHavePathname('/');
    expect(screen.getByRole('header', { name: 'Anúncios' })).toBeOnTheScreen();
  });

  it.each(['/welcome', '/welcome/email', '/welcome/confirm'])(
    'takes a signed-in seller who opens %s to the listings',
    async (route) => {
      startWith(ana);
      await renderRouter(APP_DIR, { initialUrl: route });

      expect(screen).toHavePathname('/');
    },
  );

  it('goes back to the entry screen when the session ends', async () => {
    startWith(ana);
    await renderRouter(APP_DIR);

    await act(async () => changeSession(null));

    expect(screen).toHavePathname('/welcome');
  });
});

describe('the entry screen', () => {
  it('names the marketplaces the app supports', async () => {
    startWith(null);
    await renderRouter(APP_DIR);

    expect(
      screen.getByText('Discos e outros artigos em Discogs e eBay, geridos a partir de um só sítio.'),
    ).toBeOnTheScreen();
  });

  it('shows Apple and Google as coming soon, and they cannot be pressed', async () => {
    startWith(null);
    await renderRouter(APP_DIR);

    expect(screen.getByRole('button', { name: 'Continuar com Apple · em breve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Continuar com Google · em breve' })).toBeDisabled();
  });

  it('opens the email form', async () => {
    await openEmailForm();

    expect(screen).toHavePathname('/welcome/email');
    expect(screen.getByRole('header', { name: 'Entrar com email' })).toBeOnTheScreen();
  });
});

describe('signing in with email', () => {
  it('cannot be sent until there is an email and a password', async () => {
    await openEmailForm();

    expect(submitButton('Entrar')).toBeDisabled();

    await fill('ana@example', 'x');
    expect(submitButton('Entrar')).toBeDisabled();

    await fill('ana@example.com', 'x');
    expect(submitButton('Entrar')).toBeEnabled();
  });

  it('never shows the password as it is typed, unless the seller asks', async () => {
    await openEmailForm();

    expect(screen.getByLabelText('Palavra-passe')).toHaveProp('secureTextEntry', true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar a palavra-passe' }));

    expect(screen.getByLabelText('Palavra-passe')).toHaveProp('secureTextEntry', false);
  });

  it('lands on the listings once the session starts', async () => {
    await openEmailForm();
    await fill(' ana@example.com ', PASSPHRASE);

    await fireEvent.press(submitButton('Entrar'));
    expect(signIn).toHaveBeenCalledWith(' ana@example.com ', PASSPHRASE);
    await act(async () => changeSession(ana));

    expect(screen).toHavePathname('/');
  });

  it('gives one message for a wrong email or password, and keeps what was typed', async () => {
    jest.mocked(signIn).mockResolvedValue({ ok: false, failure: 'credentials' });
    await openEmailForm();
    await fill('ana@example.com', PASSPHRASE);

    await fireEvent.press(submitButton('Entrar'));

    expect(screen.getByText('Email ou palavra-passe incorretos.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email')).toHaveProp('value', 'ana@example.com');
    expect(screen).toHavePathname('/welcome/email');
  });

  it('sends the request once, however many times the button is pressed', async () => {
    const answer = heldBack();
    jest.mocked(signIn).mockReturnValue(answer.promise);
    await openEmailForm();
    await fill('ana@example.com', PASSPHRASE);

    await fireEvent.press(submitButton('Entrar'));
    expect(submitButton('Entrar')).toBeDisabled();
    await fireEvent.press(submitButton('Entrar'));
    await act(async () => answer.release({ ok: true }));

    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('says to wait after too many attempts', async () => {
    jest.mocked(signIn).mockResolvedValue({ ok: false, failure: 'rateLimited' });
    await openEmailForm();
    await fill('ana@example.com', PASSPHRASE);

    await fireEvent.press(submitButton('Entrar'));

    expect(screen.getByText('Demasiadas tentativas. Espera um minuto e tenta de novo.')).toBeOnTheScreen();
  });

  it('cannot be sent without a connection, and says why', async () => {
    setOnline(false);
    await openEmailForm();
    await fill('ana@example.com', PASSPHRASE);

    expect(submitButton('Entrar')).toBeDisabled();
    expect(screen.getByText('Estás sem ligação. Liga-te à internet e tenta de novo.')).toBeOnTheScreen();
  });

  it('asks for the code when the password is right but the email was never confirmed', async () => {
    jest.mocked(signIn).mockResolvedValue({ ok: false, failure: 'unconfirmed' });
    await openEmailForm();
    await fill('ana@example.com', PASSPHRASE);

    await fireEvent.press(submitButton('Entrar'));

    expect(resendCode).toHaveBeenCalledWith('ana@example.com');
    expect(screen).toHavePathname('/welcome/confirm');
  });
});

describe('creating an account with email', () => {
  it('needs a password of at least 10 characters, and says so', async () => {
    await openEmailForm();
    await fireEvent.press(screen.getByRole('radio', { name: 'Criar conta' }));

    expect(screen.getByText(/Pelo menos 10 caracteres/)).toBeOnTheScreen();

    await fill('ana@example.com', '123456789');
    expect(submitButton('Criar conta')).toBeDisabled();

    await fill('ana@example.com', '1234567890');
    expect(submitButton('Criar conta')).toBeEnabled();
  });

  it('asks for the code from the email, in the language of the device', async () => {
    await signUpAsAna();

    expect(signUp).toHaveBeenCalledWith('ana@example.com', PASSPHRASE, 'pt-PT');
    expect(screen).toHavePathname('/welcome/confirm');
    expect(screen.getByText(/Enviámos um código de 6 dígitos para ana@example.com/)).toBeOnTheScreen();
  });

  it('says the same whether or not the email already had an account', async () => {
    // The service answers alike for both; the screen has nothing else to go on.
    await signUpAsAna();

    expect(screen.getByText(/Se já tinhas conta com este email/)).toBeOnTheScreen();
  });

  it('says what is wrong with a password the server refuses', async () => {
    jest.mocked(signUp).mockResolvedValue({ ok: false, failure: 'weakPassword' });
    await signUpAsAna();

    expect(screen.getByText(/fácil de adivinhar ou já apareceu numa fuga de dados/)).toBeOnTheScreen();
    expect(screen).toHavePathname('/welcome/email');
  });
});

describe('confirming the email', () => {
  it('cannot be sent until the code has six digits', async () => {
    await signUpAsAna();

    await fireEvent.changeText(screen.getByLabelText('Código'), '12345');
    expect(submitButton('Confirmar')).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');
    expect(submitButton('Confirmar')).toBeEnabled();
  });

  it('lands on the listings once the code is accepted', async () => {
    await signUpAsAna();
    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');

    await fireEvent.press(submitButton('Confirmar'));
    expect(confirmEmail).toHaveBeenCalledWith('ana@example.com', '123456');
    await act(async () => changeSession(ana));

    expect(screen).toHavePathname('/');
  });

  it('says so when the code is wrong or expired', async () => {
    jest.mocked(confirmEmail).mockResolvedValue({ ok: false, failure: 'code' });
    await signUpAsAna();
    await fireEvent.changeText(screen.getByLabelText('Código'), '123456');

    await fireEvent.press(submitButton('Confirmar'));

    expect(screen.getByText('Código errado ou expirado. Confirma o código ou pede outro.')).toBeOnTheScreen();
  });

  it('offers another code only after a minute, and waits again after sending one', async () => {
    jest.useFakeTimers();
    await signUpAsAna();

    expect(submitButton('Enviar outro código')).toBeDisabled();
    expect(screen.getByText('Podes pedir outro código daqui a um minuto.')).toBeOnTheScreen();

    await act(async () => jest.advanceTimersByTime(60_000));
    await fireEvent.press(submitButton('Enviar outro código'));

    expect(resendCode).toHaveBeenCalledWith('ana@example.com');
    expect(screen.getByText('Enviámos outro código.')).toBeOnTheScreen();
    expect(submitButton('Enviar outro código')).toBeDisabled();
  });

  it('goes to the form when opened with no email waiting for a code', async () => {
    startWith(null);
    await renderRouter(APP_DIR, { initialUrl: '/welcome/confirm' });

    expect(screen).toHavePathname('/welcome/email');
  });
});

describe('the account tab', () => {
  async function openAccount() {
    startWith(ana);
    await renderRouter(APP_DIR, { initialUrl: '/account' });
  }

  it('says who is signed in', async () => {
    await openAccount();

    expect(screen.getByText('ana@example.com')).toBeOnTheScreen();
  });

  it('signs out and returns to the entry screen', async () => {
    await openAccount();

    await fireEvent.press(screen.getByRole('button', { name: 'Terminar sessão' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    await act(async () => changeSession(null));

    expect(screen).toHavePathname('/welcome');
  });

  it('stays signed in and says so when signing out fails', async () => {
    jest.mocked(signOut).mockResolvedValue({ ok: false, failure: 'offline' });
    await openAccount();

    await fireEvent.press(screen.getByRole('button', { name: 'Terminar sessão' }));

    expect(screen.getByText('Estás sem ligação. Liga-te à internet e tenta de novo.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/account');
  });
});

describe('a forgotten password', () => {
  const NEW_PASSPHRASE = 'outra frase longa, escolhida agora';

  /** From the sign-in form, with the email already typed, to the screen that asks for a code. */
  async function openReset(email = 'ana@example.com') {
    await openEmailForm();
    await fireEvent.changeText(screen.getByLabelText('Email'), email);
    await fireEvent.press(screen.getByRole('button', { name: 'Esqueceste-te da palavra-passe?' }));
  }

  /** Asks for the code, which leads to the screen for the code and the new password. */
  async function askForCode() {
    await openReset();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }));
  }

  async function fillNewPassword(code: string, password: string) {
    await fireEvent.changeText(screen.getByLabelText('Código'), code);
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe nova'), password);
  }

  it('is offered when signing in, not when creating an account', async () => {
    await openEmailForm();

    expect(screen.getByRole('button', { name: 'Esqueceste-te da palavra-passe?' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('radio', { name: 'Criar conta' }));

    expect(screen.queryByRole('button', { name: 'Esqueceste-te da palavra-passe?' })).not.toBeOnTheScreen();
  });

  it('takes along the email already typed', async () => {
    await openReset(' ana@example.com ');

    expect(screen).toHavePathname('/welcome/reset');
    expect(screen.getByLabelText('Email')).toHaveProp('value', 'ana@example.com');
  });

  it('starts with an empty field when what was typed is not an email', async () => {
    await openReset('ana');

    expect(screen.getByLabelText('Email')).toHaveProp('value', '');
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled();
  });

  it('says the same whether or not the email has an account', async () => {
    // The service answers alike for both; the screen has nothing else to go on.
    await askForCode();

    expect(requestPasswordReset).toHaveBeenCalledWith('ana@example.com');
    expect(screen).toHavePathname('/welcome/new-password');
    expect(screen.getByText(/Se ana@example.com tiver conta, enviámos-lhe um código/)).toBeOnTheScreen();
  });

  it('asks for the code once, however many times the button is pressed', async () => {
    const answer = heldBack();
    jest.mocked(requestPasswordReset).mockReturnValue(answer.promise);
    await openReset();

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }));
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }));
    await act(async () => answer.release({ ok: true }));

    expect(requestPasswordReset).toHaveBeenCalledTimes(1);
  });

  it('says to wait when the code is asked for too often', async () => {
    jest.mocked(requestPasswordReset).mockResolvedValue({ ok: false, failure: 'rateLimited' });
    await openReset();

    await fireEvent.press(screen.getByRole('button', { name: 'Enviar código' }));

    expect(screen.getByText('Demasiadas tentativas. Espera um minuto e tenta de novo.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/welcome/reset');
  });

  it('cannot ask for a code without a connection, and says why', async () => {
    setOnline(false);
    await openReset();

    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled();
    expect(screen.getByText('Estás sem ligação. Liga-te à internet e tenta de novo.')).toBeOnTheScreen();
  });

  it('needs the six digits and a password of at least 10 characters', async () => {
    await askForCode();
    const save = () => screen.getByRole('button', { name: 'Guardar e entrar' });

    await fillNewPassword('12345', NEW_PASSPHRASE);
    expect(save()).toBeDisabled();

    await fillNewPassword('123456', '123456789');
    expect(save()).toBeDisabled();

    await fillNewPassword('123456', NEW_PASSPHRASE);
    expect(save()).toBeEnabled();
  });

  it('never shows the new password as it is typed, unless the seller asks', async () => {
    await askForCode();

    expect(screen.getByLabelText('Palavra-passe nova')).toHaveProp('secureTextEntry', true);
  });

  it('lands on the listings once the new password is saved', async () => {
    await askForCode();
    await fillNewPassword('123456', NEW_PASSPHRASE);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar e entrar' }));
    expect(resetPassword).toHaveBeenCalledWith('ana@example.com', '123456', NEW_PASSPHRASE);
    await act(async () => changeSession(ana));

    expect(screen).toHavePathname('/');
  });

  it('saves once, however many times the button is pressed', async () => {
    const answer = heldBack();
    jest.mocked(resetPassword).mockReturnValue(answer.promise);
    await askForCode();
    await fillNewPassword('123456', NEW_PASSPHRASE);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar e entrar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar e entrar' }));
    await act(async () => answer.release({ ok: true }));

    expect(resetPassword).toHaveBeenCalledTimes(1);
  });

  it('says so when the code is wrong or expired, and keeps what was typed', async () => {
    jest.mocked(resetPassword).mockResolvedValue({ ok: false, failure: 'code' });
    await askForCode();
    await fillNewPassword('123456', NEW_PASSPHRASE);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar e entrar' }));

    expect(screen.getByText('Código errado ou expirado. Confirma o código ou pede outro.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Palavra-passe nova')).toHaveProp('value', NEW_PASSPHRASE);
    expect(screen).toHavePathname('/welcome/new-password');
  });

  it('says a refused password has used the code, and clears it for the next one', async () => {
    jest.mocked(resetPassword).mockResolvedValue({ ok: false, failure: 'weakPassword' });
    await askForCode();
    await fillNewPassword('123456', NEW_PASSPHRASE);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar e entrar' }));

    expect(screen.getByText(/O código já foi usado: pede outro e escolhe outra palavra-passe/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Código')).toHaveProp('value', '');
  });

  it('offers another code only after a minute', async () => {
    jest.useFakeTimers();
    await askForCode();

    expect(screen.getByRole('button', { name: 'Enviar outro código' })).toBeDisabled();

    await act(async () => jest.advanceTimersByTime(60_000));
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar outro código' }));

    expect(requestPasswordReset).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Enviámos outro código.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Enviar outro código' })).toBeDisabled();
  });

  it('goes to asking for a code when opened with no email waiting for one', async () => {
    startWith(null);
    await renderRouter(APP_DIR, { initialUrl: '/welcome/new-password' });

    expect(screen).toHavePathname('/welcome/reset');
  });

  it('is out of reach for a seller who is signed in', async () => {
    startWith(ana);
    await renderRouter(APP_DIR, { initialUrl: '/welcome/reset' });

    expect(screen).toHavePathname('/');
  });
});

// A screen can be the first one shown: the page was reloaded in the browser, or a link
// opened the app straight into it. Its way back must still lead somewhere.
describe('going back from a screen that was opened directly', () => {
  it.each([
    ['/welcome/email', '/welcome'],
    ['/welcome/reset', '/welcome'],
  ])('leads from %s to %s', async (opened, destination) => {
    startWith(null);
    await renderRouter(APP_DIR, { initialUrl: opened });

    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen).toHavePathname(destination);
  });
});

describe('deleting the account', () => {
  const alert = jest.spyOn(Alert, 'alert');

  /** Presses a button of the confirmation that is on screen. */
  async function answerConfirmation(label: string) {
    const buttons = alert.mock.calls.at(-1)?.[2] ?? [];
    const button = buttons.find(({ text }) => text === label);
    if (!button) throw new Error(`The confirmation has no "${label}" button.`);
    await act(async () => button.onPress?.());
  }

  async function openDeleteAccount() {
    startWith(ana);
    await renderRouter(APP_DIR, { initialUrl: '/account' });
    await fireEvent.press(screen.getByRole('button', { name: 'Eliminar conta' }));
  }

  const deleteButton = () => screen.getByRole('button', { name: 'Eliminar conta' });

  beforeEach(() => {
    alert.mockImplementation(() => {});
    jest.mocked(deleteAccount).mockResolvedValue({ ok: true });
  });

  it('is reached from the account tab, and says what will be lost', async () => {
    await openDeleteAccount();

    expect(screen).toHavePathname('/delete-account');
    expect(screen.getByText(/anúncios, rascunhos, fotos, propostas e histórico de vendas/)).toBeOnTheScreen();
    expect(screen.getByText(/Não pode ser desfeito/)).toBeOnTheScreen();
  });

  it('needs the current password before it can be asked for', async () => {
    await openDeleteAccount();

    expect(deleteButton()).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), PASSPHRASE);

    expect(deleteButton()).toBeEnabled();
    expect(screen.getByLabelText('Palavra-passe atual')).toHaveProp('secureTextEntry', true);
  });

  it('asks once more before deleting, and deletes nothing when the seller cancels', async () => {
    await openDeleteAccount();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), PASSPHRASE);

    await fireEvent.press(deleteButton());

    expect(alert).toHaveBeenCalledWith('Eliminar a conta de vez?', expect.any(String), expect.any(Array));
    expect(deleteAccount).not.toHaveBeenCalled();

    await answerConfirmation('Cancelar');

    expect(deleteAccount).not.toHaveBeenCalled();
    expect(screen).toHavePathname('/delete-account');
  });

  it('deletes the account once confirmed, and returns to the entry screen', async () => {
    await openDeleteAccount();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), PASSPHRASE);
    await fireEvent.press(deleteButton());

    await answerConfirmation('Eliminar');
    expect(deleteAccount).toHaveBeenCalledWith(PASSPHRASE);
    await act(async () => changeSession(null));

    expect(screen).toHavePathname('/welcome');
  });

  it('asks the server once, even if the confirmation is answered twice', async () => {
    const answer = heldBack();
    jest.mocked(deleteAccount).mockReturnValue(answer.promise);
    await openDeleteAccount();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), PASSPHRASE);
    await fireEvent.press(deleteButton());

    await answerConfirmation('Eliminar');
    expect(screen.getByText('A eliminar a conta')).toBeOnTheScreen();
    expect(deleteButton()).toBeDisabled();
    await answerConfirmation('Eliminar');
    await act(async () => answer.release({ ok: true }));

    expect(deleteAccount).toHaveBeenCalledTimes(1);
  });

  it('says the password is wrong and that nothing was deleted', async () => {
    jest.mocked(deleteAccount).mockResolvedValue({ ok: false, failure: 'credentials' });
    await openDeleteAccount();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), 'errada');
    await fireEvent.press(deleteButton());

    await answerConfirmation('Eliminar');

    expect(screen.getByText('Palavra-passe errada. Nada foi apagado.')).toBeOnTheScreen();
    expect(screen).toHavePathname('/delete-account');
  });

  it('says so when the server could not delete the account', async () => {
    jest.mocked(deleteAccount).mockResolvedValue({ ok: false, failure: 'unknown' });
    await openDeleteAccount();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), PASSPHRASE);
    await fireEvent.press(deleteButton());

    await answerConfirmation('Eliminar');

    expect(
      screen.getByText('Não conseguimos eliminar a conta. Tenta de novo dentro de momentos.'),
    ).toBeOnTheScreen();
  });

  it('cannot be asked for without a connection, and says why', async () => {
    setOnline(false);
    await openDeleteAccount();
    await fireEvent.changeText(screen.getByLabelText('Palavra-passe atual'), PASSPHRASE);

    expect(deleteButton()).toBeDisabled();
    expect(screen.getByText('Estás sem ligação. Liga-te à internet e tenta de novo.')).toBeOnTheScreen();
  });

  it('goes back to the account tab on cancel', async () => {
    await openDeleteAccount();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen).toHavePathname('/account');
  });

  it('is out of reach for someone who is not signed in', async () => {
    startWith(null);
    await renderRouter(APP_DIR, { initialUrl: '/delete-account' });

    expect(screen).toHavePathname('/welcome');
  });
});
