# Speech account backend

Bun + TypeScript + Express. Clerk Express verifies authentication before the user's supplied `src/middleware/auth.ts`. That file is preserved unchanged and excluded from automatic formatting.

## Configuration and startup

Copy `.env.example` to `.env` in `backend/` and configure:

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `CLERK_PUBLISHABLE_KEY`: Clerk dashboard publishable key.
- `CLERK_SECRET_KEY`: Clerk dashboard secret key; backend only.
- `CORS_ORIGINS`: comma-separated allowed website origins, also used for Clerk authorized-party checks. Default development origin is `http://localhost:3000`.

No manually configured JWT public key, issuer or separate authorized-parties variable is required. Clerk obtains verification keys through its SDK; this can require network access on a key-cache miss. ID/email come from verified claims without a Clerk user-profile API lookup.

Configure this custom Clerk session claim:

```json
{ "email": "{{user.primary_email_address}}" }
```

From the repository root run `bun install --frozen-lockfile`. Then in `backend/`:

```powershell
bun run db:generate
bun run db:validate
bun run db:migrate
bun run dev
```

Bun loads `backend/.env`. `config/db.ts` under `src/` uses the user-provided PrismaPg connection pattern. Prisma generates into the repository-root `generated/prisma/` directory; the root Prisma runtime dependency supports that location. `backend/config/db/dbConfig.ts` re-exports the same client at the exact import path used by the supplied middleware. It does not create a second client.

Both user-table migrations were applied to Neon and a live PrismaPg read verified connectivity. The schema has `id` with a Prisma-generated UUID default and unique `email`. Authentication explicitly supplies the Clerk ID.

## Routes and authentication behavior

| Route | Behavior |
| --- | --- |
| `GET /v1/health` | Public process liveness |
| `GET /v1/ready` | Public database readiness |
| `GET /v1/capabilities` | Public local-STT architecture and storage policy |
| `GET /v1/downloads/windows` | Clerk and supplied auth middleware required; streams the configured private installer |
| `GET /v1/me` | Request limits, Clerk verification, supplied auth middleware, then ID/email response |

For `/v1/me`, Clerk middleware must run before `authMiddleware`, because `getAuth(req)` reads Clerk's attached authentication state. The supplied middleware queries Prisma by verified user ID, requires email for a new user, upserts the new profile and attaches `req.userId`. The route then reads that profile and returns `{ user: { id, email } }`.

Existing users take the supplied fast path: their stored email is not updated from later token changes, and a missing email claim does not fail that path. These semantics intentionally match the user's code. Authentication errors retain its `{ success: false, message }` response and its status codes. Other API errors use `{ requestId, error: { code, message, retryable } }`; clients must handle both shapes.

The supplied middleware logs caught errors directly. The surrounding error handler does not log raw errors; this does not override the supplied file's logging behavior. No device, webhook, refresh-token, audio-upload or transcription endpoints exist.

## Server behavior

Responses have no-store and request-ID headers. CORS and Clerk use the configured website origins. Account/readiness requests use per-process concurrency and attempt limits without storing users or IP addresses. `REQUEST_TIMEOUT_MS` closes stalled HTTP connections; it does not cancel an already-running Prisma query or produce a guaranteed JSON timeout response. The server closes its listener and Prisma client on shutdown.

Only user ID/email are persisted. Model downloads and transcription belong to the planned desktop application; no Hugging Face token or model is needed by this API.

## Code map

- `src/app.ts`: Express composition and Clerk-before-auth ordering.
- `src/server.ts`: environment reads, listener and shutdown.
- `src/config/db.ts`: PrismaPg connection supplied by the user.
- `src/middleware/auth.ts`: user-supplied middleware, unchanged.
- `src/middleware/request-lifecycle.ts`: admission and connection deadlines.
- `src/middleware/error-handler.ts`: errors outside the supplied auth middleware.
- `src/routes/`: health/capabilities and current-user endpoints.
- `src/types/app-config.ts`: HTTP settings type; no env.ts file.

## Checks and deployment

```powershell
bun run format:check
bun run typecheck
bun test
bun run build
```

Tests use real Clerk Express middleware with locally signed JWTs and a fully replaced database module. They do not need real Clerk/Neon credentials. Run production builds from the workspace, retaining root dependencies, generated client and shared contracts. On Render set `HOST=0.0.0.0` and use its `PORT`. Root build command: `bun install --frozen-lockfile && bun run build`; start: `bun run --cwd backend start`.

Desktop/browser authentication and the authenticated download/installation flow remain pending. The latest requirement is sign-in before download or installation; the protected download route enforces authentication before serving the configured private installer.

## Authenticated installer download

Set `WINDOWS_INSTALLER_PATH` to a private signed Windows installer on the server (absolute path, or relative to the backend working directory). `GET /v1/downloads/windows` requires Clerk authentication and runs the supplied middleware before accessing that file. It streams a download named `Speech-Setup.exe`, without a public static URL or cacheable response. Invalid sessions return 401; a missing/unconfigured release returns 503 `RELEASE_UNAVAILABLE`. User-supplied paths are ignored. Downloads have a separate admission pool and a five-minute connection deadline. No real installer is included in this repository.

The frontend must send the Clerk session token using its supported authenticated request flow. Do not put session tokens into URLs or copyable commands. Deployment must provision the private installer file; this local-file implementation does not automatically fetch artifacts from object storage. A future private-storage adapter can replace it without changing auth middleware.

Latest UX requirement: user signs in once on the website, then downloads/installs and starts using the product. No second mandatory sign-in prompt during normal installation. Automatic browser-to-installer/app session handoff is still pending. An authenticated download alone does not transfer identity into the installed app. Use a short-lived, request-bound, single-use handoff, not a reusable token embedded in a generic installer. `/v1/me` can verify resulting credentials; it is not itself a handoff exchange endpoint.

Validation: 22 tests pass; auth.ts SHA-256 remains unchanged. Tests use mocked database modules and local test JWTs; no live Clerk sign-in or installer handoff has been validated.
## One website sign-in: installation activation

The backend now provides a short-lived, single-use installation activation exchange. See [Installation activation API](../docs/INSTALLATION_AUTH_API.md) for the exact start/inspect/approve/exchange contracts and client integration steps. The website reuses its existing Clerk session; the installer proves possession of a private verifier before receiving ID/email for offline activation. No browser JWT is copied into the app and no database fields are added.

Use one backend instance for the bounded in-memory transaction store. Transactions expire after five minutes and are lost on restart. Website and installer integration is still pending. This supersedes earlier statements that all backend handoff endpoints are pending. The exchange enables local activation, not an authenticated Clerk session for future online API calls.