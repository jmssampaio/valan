import {
  CODE_LENGTH,
  failureMessage,
  isAcceptablePassword,
  isCode,
  isEmail,
  MIN_PASSWORD_LENGTH,
  type AuthFailure,
} from '../rules';

describe('isEmail', () => {
  it.each(['ana@example.com', '  ana.silva+valan@mail.example.pt  ', 'a@b.co'])('accepts "%s"', (email) => {
    expect(isEmail(email)).toBe(true);
  });

  it.each(['', 'ana', 'ana@', '@example.com', 'ana@example', 'ana silva@example.com', 'ana@@example.com'])(
    'rejects "%s"',
    (email) => {
      expect(isEmail(email)).toBe(false);
    },
  );
});

describe('isAcceptablePassword', () => {
  it(`needs at least ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(isAcceptablePassword('123456789')).toBe(false);
    expect(isAcceptablePassword('1234567890')).toBe(true);
  });

  it('accepts long passphrases with spaces and any characters', () => {
    expect(isAcceptablePassword('o disco está na prateleira de cima 🎶')).toBe(true);
  });

  it('asks for nothing but length: no digits, capitals or symbols are required', () => {
    expect(isAcceptablePassword('aaaaaaaaaa')).toBe(true);
  });
});

describe('isCode', () => {
  it(`is ${CODE_LENGTH} digits`, () => {
    expect(isCode('123456')).toBe(true);
    expect(isCode(' 123456 ')).toBe(true);
  });

  it.each(['', '12345', '1234567', '12345a', '12 3456'])('rejects "%s"', (code) => {
    expect(isCode(code)).toBe(false);
  });
});

describe('failureMessage', () => {
  it('has words for every way signing in or up can fail', () => {
    const failures: AuthFailure[] = [
      'credentials',
      'code',
      'weakPassword',
      'unconfirmed',
      'rateLimited',
      'offline',
      'unknown',
    ];

    for (const failure of failures) {
      expect(failureMessage(failure)).toMatch(/^auth\.failure\./);
    }
  });

  it('never says which of the email or the password was wrong', () => {
    // One reason, one message: an unknown email and a wrong password are told apart nowhere.
    expect(failureMessage('credentials')).toBe('auth.failure.credentials');
  });
});
