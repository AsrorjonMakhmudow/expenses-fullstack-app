# 0009. Authentication: email + password, server-side sessions

- Status: Accepted
- Date: 2026-11-11

## Context

Until now one hard-coded owner (`OWNER_EMAIL`, `DevOwnerGuard`) owned all data, and the API
refused to start in production. People must be able to **register** and **sign in**, see only
their own data, and be **signed out automatically** after a long time away.

Options compared: server sessions + cookie, JWT access/refresh tokens, a hosted auth service,
OAuth (Telegram/Google). The web app and API share one origin (Vite proxy now, Caddy later),
so the main JWT benefit — no shared storage between services — doesn't apply, while its costs
(hard revocation, token storage in JS) do.

## Decision

- **Server-side sessions in PostgreSQL**, sent as an **httpOnly cookie**.
  - Token = 32 random bytes (base64url). The `sessions` table stores only its **SHA-256**:
    a leaked database dump can't be used to sign in.
  - Cookie: `HttpOnly`, `SameSite=Lax`, `Path=/`; in production `Secure` and the `__Host-`
    name prefix (no subdomain can overwrite it).
- **Expiry, two clocks** (env, defaults):
  - **Idle** `SESSION_IDLE_DAYS=14` — not used for 14 days → signed out.
  - **Absolute** `SESSION_MAX_DAYS=60` — even an active session ends; a stolen cookie can't
    live forever.
  - Using the app slides the idle expiry, written at most once per hour (no write per request).
  - Expired sessions are refused and deleted; old rows are swept on each sign-in.
- **Passwords:** argon2id (`@node-rs/argon2`, OWASP parameters: 19 MiB, 2 passes). 10–128
  characters, not equal to the email. Sign-in only checks the shape, so a future stricter rule
  never locks out existing users.
- **Endpoints** (`/api/v1/auth`): `GET config`, `POST register` (signs you in), `POST login`,
  `POST logout`, `POST logout-all`, `GET me`.
- **Every route is private by default:** a global `SessionGuard` replaces `DevOwnerGuard`;
  public routes opt out with `@Public()`. Controllers are unchanged (`@CurrentUserId()`).
- **Abuse protection:** rate limit on register/login (`@nestjs/throttler`, per IP); the same
  "Wrong email or password" for unknown email and wrong password, with a dummy hash check so
  timing doesn't tell either; CSRF: `SameSite=Lax` + changes refused when `Origin` /
  `Sec-Fetch-Site` say the request comes from another site.
- **Registration** is open; `REGISTRATION_ENABLED=false` closes it.
  Registering an email that exists → 409 (accepted trade-off: rate-limited).
- **Existing data:** `pnpm auth:set-password <email>` sets the password of an existing user
  (your old owner account keeps all its expenses) or creates the user.
- Removed: `DevOwnerGuard`, `OwnerService`, `OWNER_EMAIL`, the production start block.

## Consequences

- One database read per request (indexed primary key) — negligible at this scale.
- Not yet: email verification, password reset (need an email service), Telegram login
  (needs the public domain) — each is a new ADR.
- The mobile app (later) can use the same sessions with an `Authorization: Bearer` header.
