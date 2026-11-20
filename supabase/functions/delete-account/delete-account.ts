// The rules for deleting an account, apart from how the server is reached, so they can be
// tested without one. index.ts wires them to Supabase.

export interface Seller {
  readonly id: string;
  readonly email: string;
}

/** What deleting an account needs from the server. */
export interface AccountDeletion {
  /** Who a session token belongs to; null when it is missing, forged or expired. */
  identify(token: string): Promise<Seller | null>;
  passwordIsRight(email: string, password: string): Promise<boolean>;
  /** Every photo file in the seller's folder. Their rows go with the account. */
  deletePhotoFiles(userId: string): Promise<void>;
  /** The account itself; the database deletes the seller's rows in every table with it. */
  deleteUser(userId: string): Promise<void>;
  /** Records a failure where the people running the server can see it. Never the password. */
  reportFailure?(error: unknown): void;
}

export interface DeletionRequest {
  readonly token: string | null;
  readonly password: string;
}

export type DeletionOutcome =
  | { ok: true }
  | { ok: false; reason: 'not_signed_in' | 'wrong_password' | 'failed' };

/**
 * Deletes the account of whoever the token belongs to. Nothing else in the request says
 * whose account it is, so one seller can never ask for another's to be deleted.
 *
 * Deleting cannot be undone, so the caller proves again that they know the password: a
 * session left open on a borrowed phone is not enough.
 */
export async function deleteAccount(
  server: AccountDeletion,
  request: DeletionRequest,
): Promise<DeletionOutcome> {
  const seller = request.token === null ? null : await server.identify(request.token);
  if (seller === null) return { ok: false, reason: 'not_signed_in' };

  try {
    if (request.password === '' || !(await server.passwordIsRight(seller.email, request.password))) {
      return { ok: false, reason: 'wrong_password' };
    }

    // The files first: once the account is gone nothing says whose they were. If this
    // fails the account is kept, and asking again starts over.
    await server.deletePhotoFiles(seller.id);
    await server.deleteUser(seller.id);
    return { ok: true };
  } catch (error) {
    // The seller only needs to know to try again; what went wrong is for the server's log.
    server.reportFailure?.(error);
    return { ok: false, reason: 'failed' };
  }
}
