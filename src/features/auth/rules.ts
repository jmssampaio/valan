import type { TranslationKey } from '@/i18n';

/** The server enforces this too; the app only saves the seller a round trip. */
export const MIN_PASSWORD_LENGTH = 10;

/** The length of the code in the confirmation email. */
export const CODE_LENGTH = 6;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shaped like an address. Whether it exists is for the confirmation email to find out. */
export function isEmail(text: string): boolean {
  return EMAIL_SHAPE.test(text.trim());
}

/**
 * Length is the only rule: long passphrases and every character are welcome, and nothing
 * forces digits or symbols. Breached and common passwords are refused by the server.
 */
export function isAcceptablePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function isCode(text: string): boolean {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(text.trim());
}

/**
 * Why signing in, signing up or confirming did not work, as far as the seller may be told.
 * 'credentials' covers an unknown email and a wrong password alike, so the app never
 * reveals whether an account exists.
 */
export type AuthFailure =
  | 'credentials'
  /** The confirmation code is wrong or too old. */
  | 'code'
  /** The server refused the password: too short, too common, or found in a breach. */
  | 'weakPassword'
  /** The password was right but the email was never confirmed; a new code is on its way. */
  | 'unconfirmed'
  | 'rateLimited'
  | 'offline'
  | 'unknown';

export function failureMessage(failure: AuthFailure): TranslationKey {
  return `auth.failure.${failure}`;
}
