# Security rules

## Secrets
- Keys, tokens and passwords live only in environment variables and only on the server.
- No secrets in app code, in the repository, in logs or in error messages.
- `.env` never goes into Git; keep `.env.example` up to date, with no real values.

## Database
- Row Level Security (RLS) enabled on every table, with policies written and tested.
- The service-role key never leaves the server.
- Schema changes only through migration files in the repository.

## User data
- Store the minimum needed. Third-party tokens are encrypted.
- Deleting an account deletes its data and revokes access to external services.
- Validate on the server everything that comes from the app; never trust the client.

## Attack resistance

### 1. Session tokens
- Never store session or refresh tokens in localStorage, sessionStorage, AsyncStorage or any unencrypted storage.
- Mobile: store them in the device keychain/keystore (the Supabase session is stored encrypted, and its encryption key lives in `expo-secure-store`; sessions can be too large to keep in SecureStore directly).
- Web: httpOnly, Secure, SameSite cookies. JavaScript must not be able to read the token.
- Short-lived access tokens with refresh rotation. Sign-out revokes the session on the server.

### 2. Authorization is decided on the server
- Every permission check (admin, owner, plan, role) runs on the server: database policies and server functions.
- Hiding a button or a route in the app is UX, not security. Assume any client check can be bypassed.
- Roles come from server-controlled data (Supabase Auth `app_metadata`, which only the service role can write, and server-written columns such as the subscription status set by the RevenueCat webhook), never from a field the user can edit or from a flag sent by the client.
- Every server function verifies who the caller is and that they may act on that specific record.

### 3. Two-factor authentication
- Offer optional 2FA (TOTP) to all users. Require it for admin and staff accounts.
- Sensitive actions (changing email or password, deleting the account, payout details) ask for re-authentication.
- Provide recovery codes; recovery must not be weaker than the login itself.

### 4. Rate limiting
- Limit login, sign-up, password reset, OTP and email-sending endpoints, per IP and per account.
- Back off progressively after repeated failures; add a CAPTCHA when abuse is detected.
- Error messages never reveal whether an account exists ("Invalid email or password").
- Rate limit every public server function and every endpoint that calls a paid or third-party API.

### 5. Password rules
- Minimum 10 characters; allow long passphrases and all characters; no forced periodic changes.
- Reject passwords found in known breaches and the most common ones.
- Never store, log or email passwords. Hashing is done by the auth provider, never by our own code.
- Password reset links are single-use and expire quickly.

## Before merging a PR that touches authentication, payments or personal data
Ask Claude for a security review of the diff and resolve what it finds.
