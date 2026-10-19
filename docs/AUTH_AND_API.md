# Authentication and API

> Latest requirement: sign in once on the website before download/install; installation must transfer authentication automatically without a second normal sign-in prompt. See [Authenticated distribution](AUTHENTICATED_DISTRIBUTION.md). Protected backend downloads exist; website, installer and automatic session handoff remain pending. Conflicting older journey descriptions below are superseded.

Updated 2026-10-19 for the offline MVP. This replaces the earlier custom device-link and cloud-transcription proposal. See [backend guide](../backend/README.md), [frontend plan](FRONTEND_IMPLEMENTATION_PLAN.md), and [offline product plan](OFFLINE_PRODUCT_PLAN.md).

## Implemented account API

Clerk owns authentication. The backend accepts verified Clerk session tokens containing ID (`sub`), session (`sid`), issuer, authorized party (`azp`), expiration and custom `email`. It reads/upserts only verified ID/email in Neon, with no routine Clerk user API lookup or webhook.

| Endpoint | Authorization | Behavior |
| --- | --- | --- |
| `GET /v1/health` | Public | Process liveness |
| `GET /v1/ready` | Public | Bounded database readiness |
| `GET /v1/capabilities` | Public | Local-processing architecture and storage policy |
| `GET /v1/me` | Verified Clerk session bearer token | Synchronize and return ID/email |

There are no device, device-link, refresh-token, cloud-transcription, webhook or release API endpoints. Release metadata is planned for static hosting. Local offline activation does not authorize online account requests.

## Planned desktop sign-in

The app is installed before sign-in. Its Sign in action opens the system browser. Use the same Clerk instance and a supported protected return flow; reuse browser authentication where supported. Do not copy browser cookies or trust a user ID as authentication.

First validate a supported Clerk native or OAuth flow in a packaged app. Define its token contract before changing middleware: OAuth access tokens can differ from currently accepted session tokens. Preserve issuer, signature, expiry, intended audience/authorized party and verified email checks. If a candidate cannot supply verified email in a token, resolve that incompatibility before implementation.

Require appropriate request binding, state/PKCE, expiration and replay protection. Store credentials through a reviewed OS-protected adapter. No bearer tokens in URLs, command arguments or logs. Validate callback and return targets. A generic provider sign-in example does not prove website-to-desktop session transfer.

The exact frontend callback contract remains pending this feasibility work. Do not introduce custom backend device/refresh-token storage by default. No application secret belongs in distributed desktop software.

## Offline activation and logout

After initial online activation and model installation, local dictation works across restarts without valid online API tokens. This state grants no online API access.

Desktop logout clears credentials and activation; next activation requires online sign-in. Browser sign-out affects the website session and must not be presented as immediate revocation of offline desktop use. Remote revocation cannot be detected immediately offline. No licensing expiry scheme or custom device dashboard is planned.

## Errors and privacy

Errors use `{ requestId, error: { code, message, retryable } }`; current codes are in `packages/contracts/src/index.ts`. See the backend guide for exact statuses. Do not show raw token or database failures in the frontend.

Audio and transcripts never pass through the website or API. Account and download services still use the network. Keep that distinction explicit in privacy copy.

Current backend handoff: [Installation activation API](INSTALLATION_AUTH_API.md) defines implemented start/inspect/approve/exchange endpoints. Website/installer integration remains pending. This supersedes earlier statements that these backend endpoints do not exist. The exchange returns offline activation, not a copied Clerk session.
