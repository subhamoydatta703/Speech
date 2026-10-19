# Installation activation API

Updated 2026-10-19. Backend support is implemented; website, installer and desktop integration remain pending. This supports one website sign-in followed by local app activation, without asking the user to enter credentials again during normal setup.

## Purpose and limits

The installer receives a verified account identity for offline activation. It does **not** receive a copied browser session, Clerk refresh token, or bearer token for online APIs. The desktop must store local activation only after a successful HTTPS exchange with the configured API and retain model/preferences locally. The activation response is not accepted as authorization by `/v1/me` or downloads.

Online account operations still need valid Clerk credentials. The account website can reuse the existing browser session. This protocol is not an offline license/DRM system and does not promise remote revocation while offline.

## Integration sequence

1. User signs in on the website before downloading. Website accesses `GET /v1/downloads/windows` using its Clerk credentials. No credential belongs in a generic installer or copyable command.
2. Installer generates at least 32 random bytes and encodes them as a base64url `codeVerifier`. Keep it private to that installation; do not send it to the browser or put it in URLs.
3. Compute `codeChallenge = base64url(SHA256(codeVerifier))`. Start with `POST /v1/installations`, JSON `{ codeChallenge }`.
4. API returns 201 `{ id, confirmationCode, expiresAt, pollIntervalSeconds }`. Show the confirmation code in setup and open the configured website's install-completion page with the opaque `id` only. The website URL must be fixed/allowlisted by the application.
5. Website reuses its existing Clerk session and calls `GET /v1/installations/:id` with authorization. Display the account and confirmation code, and require an explicit Continue installation action after the user matches the code to setup. This confirmation is not another sign-in; it prevents silent approval of an unrelated installation.
6. Website posts `{ confirmationCode }` to `/v1/installations/:id/approve` with the same authenticated session. Backend uses the account derived by the user's unchanged auth middleware, never an ID supplied by the browser body. Response: `{ status: "approved" }`.
7. Installer polls `POST /v1/installations/:id/exchange` with `{ codeVerifier }` at the returned interval (3 seconds), respecting 429/Retry-After. Pending returns 202 `{ status: "pending" }` with no account data.
8. After approval, the correct verifier receives 200 `{ status: "activated", user: { id, email }, activatedAt }`. Backend consumes the transaction before returning it. Setup records activation, completes the model download if necessary, and enables offline dictation.

There is no normal second credential prompt. If the browser session has genuinely expired, reauthentication is necessary. Expired or interrupted setup starts a new transaction and reuses the browser session where still available.

## Endpoint contracts

| Method/path | Authorization | Result |
| --- | --- | --- |
| `POST /v1/installations` | Public, rate/concurrency limited | Create a pending transaction bound to an S256 challenge |
| `GET /v1/installations/:id` | Existing Clerk auth middleware | Confirmation details only; no account or verifier disclosure |
| `POST /v1/installations/:id/approve` | Existing Clerk auth middleware | Bind the current authenticated account after confirmation |
| `POST /v1/installations/:id/exchange` | Possession of original verifier | Pending or one-time offline activation |

POST bodies are JSON, limited to 2 KiB with strict fields. Challenge is 43 base64url characters. Verifier is 43-128 RFC 7636 unreserved characters. Transaction IDs are 32 random bytes encoded as base64url. All responses are no-store. No client-specified redirect URL is accepted by the API.

Expired, missing or consumed transaction: 410 `INSTALLATION_EXPIRED`. Wrong verifier: 401 `INVALID_INSTALLATION_PROOF`. Mismatched confirmation: 400. A second approving account: 409 `INSTALLATION_CONFLICT`. Invalid input: 400; oversized body: 413; non-JSON: 415. Wrong origin is rejected by the existing origin check. Clerk errors retain the supplied auth middleware's response shape.

## State and deployment

Transactions live only in bounded process memory (maximum 1000, expiry five minutes), with timers removing expired entries. After approval this temporary record contains ID/email, but no Clerk token or audio. Successful exchange and shutdown delete it. No Prisma tables, columns or migrations were added.

Deploy this version as **one backend instance/process**. Restart/redeploy invalidates pending transactions; users retry setup without a second sign-in if their browser session is valid. Multiple instances require a shared atomic TTL store before scaling; independent memory maps cannot guarantee routing or single-use redemption across instances.

A network failure after consumption can lose the activation response. Restart setup rather than replaying the consumed transaction. This intentionally avoids retaining reusable activation credentials.

## Completion boundary

Protected downloads and the activation exchange are implemented and locally tested. The real signed installer, website confirmation page, native verifier storage, browser launching and local activation persistence still need implementation. Do not claim the end-to-end installation flow is shipped until those clients are tested together.
