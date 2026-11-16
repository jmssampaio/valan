---
description: Audit the project or a change against the security rules
---
Audit this for security: $ARGUMENTS (if empty, audit the whole project).

Use docs/standards/security.md as the checklist. Check in particular:
1. Where session tokens are stored on each platform.
2. Every permission or role check: is it enforced on the server, or only in the client?
3. Whether 2FA is available and required for privileged accounts.
4. Rate limits on login, sign-up, reset, OTP and public server functions.
5. Password rules and reset flow.
6. Secrets in code, logs or the repository; tables without RLS.

For each item give: pass, fail or not applicable, the evidence (file and line, or the setting), and the fix. Order the failures by severity. Do not change code unless I ask.
