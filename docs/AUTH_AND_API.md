# Authentication and API proposal

> Backend scope update (2026-10-19): read [Current backend scope](BACKEND_IMPLEMENTATION.md). The backend proposals below predate the user's later decisions. Current implementation uses Bun, Prisma 7/PrismaPg, Neon with only user ID and email, JWT-based profile sync, and no webhooks or device-session storage.


## Identity model

Clerk owns website user authentication. The independent backend verifies Clerk credentials for web requests. The desktop is a public client and cannot hold a confidential application secret. Website sign-in does not automatically authenticate an installed application.

Proposed MVP: a backend-owned device-link flow, approved on the Clerk-authenticated website. This supports the requested browser sign-in experience without assuming browser cookies are accessible to Electron. The Clerk Electron SDK is currently documented as beta; evaluate it as an alternative before implementing custom credential infrastructure: [Clerk Electron SDK](https://clerk.com/docs/reference/electron/overview). Changing the chosen approach requires updating these contracts and the security review.

## Proposed device linking

1. Desktop generates a high-entropy verifier and SHA-256 challenge, then requests a link attempt.
2. Backend creates an expiring attempt and returns an approval URL, short matching code, separate high-entropy polling secret, and polling interval. Store secret hashes. Expiry target: five minutes.
3. Desktop opens the allowlisted HTTPS approval page in the system browser. The page requires Clerk authentication, displays device details and matching code, and requires explicit approval. A GET must never approve.
4. Browser submits approval with a verified Clerk token and appropriate origin/CSRF protection for the actual transport. Approval is one-time and binds the attempt to the authenticated user.
5. Desktop polls with its polling secret and proves possession of the original verifier. Approval URL or short code alone cannot retrieve credentials. Rate-limit both attempt creation and polling.
6. Backend atomically consumes the approved attempt and returns a short-lived app access credential plus rotating refresh credential scoped to that device.
7. Main process stores the refresh credential in OS-protected storage. Renderer receives only narrow authenticated operations, never the stored refresh secret.

This is a proposed application-specific protocol, not a claim that Clerk provides an OAuth device grant. Review threat cases and available maintained solutions before implementing it. Failed/expired/rejected attempts never create sessions. Protect against replay, concurrent redemption, account/device mixups, and approval phishing; the app must clearly show the matching code.

Proposed access lifetime: 10 minutes; refresh lifetime: 30 days with rotation and reuse detection. Backend checks device revocation on authenticated requests. Sign-out clears local credentials and revokes server session; account deletion revokes all devices. Reauthentication must not discard a completed local transcript. Local inference may continue offline after onboarding; cloud and account operations always require valid credentials.

## API surface

Base path: `/v1`. JSON unless noted. These are proposed contracts, not working endpoints.

| Method/path | Authorization | Behavior |
| --- | --- | --- |
| `GET /health` | Public | Minimal liveness; no secrets |
| `GET /me` | Verified Clerk token | Current user's profile/settings summary |
| `GET /devices` | Clerk token | Current user's devices |
| `DELETE /devices/:id` | Clerk token or owning device credential | Revoke owned device; reject cross-user access |
| `POST /device-links` | Public, rate-limited | Begin link with challenge and bounded device metadata |
| `POST /device-links/:id/inspect` | Clerk token + approval secret | Display approval metadata without consuming it |
| `POST /device-links/:id/approve` | Clerk token + approval secret | Explicit one-time approval |
| `POST /device-links/:id/reject` | Clerk token + approval secret | Reject attempt |
| `POST /device-links/:id/exchange` | Poll secret + verifier | Pending/approved/expired result; consume credentials once |
| `POST /device-sessions/refresh` | Refresh credential | Rotate credentials; detect reuse |
| `POST /transcriptions` | Device access credential | Validate multipart audio, invoke cloud provider, return final text |
| `GET /releases/latest?platform=win32&arch=x64` | Public | Version, signed artifact URL, checksum, release notes |
| `POST /webhooks/clerk` | Verified webhook signature | Process relevant user changes/deletion idempotently |

Desktop credentials and Clerk tokens have distinct verification paths and audiences. Never accept either by merely decoding a JWT. User-provided IDs are selectors, not authorization.

## Transcription request and errors

Multipart fields: `audio`, `sessionId`, optional `language`; `Idempotency-Key` header scoped to device/user. Decode and validate duration/container rather than trusting file extension or duration metadata. Proposed cap: 60 seconds and 5 MiB; reject before unbounded buffering. Client cancellation should abort upstream work where supported; a provider may still charge for already-started work.

Success shape: `{ requestId, sessionId, text, language?, model, audioDurationMs, processingDurationMs }`. Error shape: `{ requestId, error: { code, message, retryable } }`. Stable codes include `AUTH_REQUIRED`, `DEVICE_REVOKED`, `AUDIO_TOO_LARGE`, `INVALID_AUDIO`, `NO_SPEECH`, `QUOTA_EXCEEDED`, `PROVIDER_UNAVAILABLE`, and `CANCELLED`.

Use request IDs in logs without raw audio, transcript, or token content. Bound retries and idempotency storage lifetime; repeated keys with different payload hashes are rejected. Do not promise cached transcript responses: retain only short-lived request status by default and return an explicit duplicate result requiring user action if the original response was lost. Desktop independently guarantees no duplicate insertion.
