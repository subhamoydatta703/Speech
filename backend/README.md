# Speech account backend

Bun + TypeScript + Fastify account API. Clerk verifies identity, and Prisma ORM 7 connects to Neon PostgreSQL through `PrismaPg`. The only application table is `User`, with `id` and `email`.

Speech recognition is planned for the desktop application. This API does not accept recordings, perform inference, download models, or store transcripts. No Hugging Face token is required. There are no webhook, device-management, refresh-token, or transcript-history endpoints.

The hosted-STT removal is implemented. Desktop browser sign-in and offline dictation still need implementation and end-to-end validation. See the [product plan](../docs/OFFLINE_PRODUCT_PLAN.md) and [migration checklist](../docs/BACKEND_CHANGE_PLAN.md).

## Run locally

From the repository root:

```powershell
bun install --frozen-lockfile
Copy-Item backend/.env.example backend/.env
```

Configure Neon and Clerk, then run:

```powershell
cd backend
bun run db:generate
bun run db:validate
bun run db:migrate
bun run dev
```

The migration creates the existing ID/email user table. Verify the database target before running it. This work has not applied a migration to your Neon account. Bun loads `.env` from the backend working directory. The default API URL is `http://127.0.0.1:4000`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL with TLS, used by the API |
| `DIRECT_URL` | Neon direct URL for migrations; falls back to `DATABASE_URL` |
| `CLERK_JWT_KEY` | Clerk PEM public key; literal `\n` line breaks supported |
| `CLERK_ISSUER` | Exact Clerk issuer URL |
| `CLERK_AUTHORIZED_PARTIES` | Exact HTTP(S) origins permitted in session token `azp` |
| `CORS_ORIGINS` | Exact origins permitted for browser API calls |
| `HOST`, `PORT` | Listen address; default `127.0.0.1:4000` |
| `MAX_CONCURRENT_REQUESTS` | Active account/readiness requests per process; default 4 |
| `REQUESTS_PER_MINUTE` | Global account/readiness attempt limit per process; default 60 |
| `REQUEST_TIMEOUT_MS` | Response wait deadline; default 10000 ms |

No HF variables, upload limits or model paths are used. Rate limits are global in-memory counters, not per-user records or distributed quotas.

## Authentication contract

In Clerk session token customization, add:

```json
{ "email": "{{user.primary_email_address}}" }
```

The backend currently accepts **Clerk session tokens** via `Authorization: Bearer <token>`. It verifies signature, issuer, expiry, allowed `azp`, completed session state, `sub`, `sid`, and email. It derives identity only from verified claims. It reads the user by ID and upserts only on first use or changed email; a concurrent-insert race is handled. It does not call Clerk's user API.

Refresh the client session after changing claims. Offline JWT verification does not detect revocation immediately, and the configured public key must be rotated when Clerk changes signing keys. Without webhooks, deleting a Clerk account does not automatically delete its Neon row; cleanup remains an operator action.

**Desktop integration is pending.** A native SDK or OAuth token must be checked against this contract before it can call this API. OAuth access tokens are not interchangeable with session tokens. No custom device-link endpoints or weaker validation have been added. The desktop's future offline activation state will not authorize online API access.

## Endpoints

| Method | Path | Authentication | Result |
| --- | --- | --- | --- |
| GET | `/v1/health` | Public | Process liveness, no database call |
| GET | `/v1/ready` | Public | Bounded database readiness check |
| GET | `/v1/capabilities` | Public | Local STT architecture and storage policy |
| GET | `/v1/me` | Clerk bearer token | Synchronize and return current ID/email |

`/v1/me` response:

```json
{ "user": { "id": "user_example", "email": "user@example.com" } }
```

`/v1/capabilities` response:

```json
{
  "sttMode": "local",
  "cloudTranscription": false,
  "storage": { "audio": false, "transcripts": false, "userFields": ["id", "email"] }
}
```

Capabilities describe the API, not whether a desktop model is installed or usable. There is no transcription endpoint. Requests to removed routes return 404; unsupported request bodies can be rejected with 415 before routing. Do not upload audio to this API.

Errors have `{ requestId, error: { code, message, retryable } }`. Responses include `Cache-Control: no-store` and a generated `X-Request-Id`. Typical errors are 401 for invalid credentials, 400 for missing/invalid email claims, 403 for disallowed origins, 429 for attempt limits, 503 for unavailable database/capacity, and 504 `REQUEST_TIMEOUT` for an exceeded deadline. Logs omit tokens, emails, bodies and raw database exceptions.

## Code map

```text
src/
  server.ts                       Startup and graceful shutdown
  app.ts                          API composition and security headers
  config/
    env.ts                        Configuration validation
    db.ts                         Shared PrismaPg client and user repository
  middleware/
    auth.ts                       Verified identity and user synchronization
    error-handler.ts              Safe structured API errors
    request-lifecycle.ts          Admission, deadlines and cleanup
  routes/
    health.ts                     Liveness, readiness and capabilities
    users.ts                      Current account
  services/
    user.service.ts               Profile read/upsert rules
  lib/
    errors.ts                     Errors and bounded response waits
    limiter.ts                    Process-wide admission counters
    route-context.ts              Shared route dependencies
  generated/prisma/               Generated client; do not edit
prisma/                           Two-column user schema and initial migration
test/                             Account API and verified-JWT tests
```

Shared account/capability schemas and error types live in `packages/contracts/src/index.ts`.

## Validation and deployment

```powershell
cd backend
bun run format:check
bun run typecheck
bun test
bun run db:validate
bun run build
```

Deploy on Render with the repository root available, since the API imports workspace contracts. Example build command from the root: `bun install --frozen-lockfile && bun run build`. Start command: `bun run --cwd backend start`. Set `HOST=0.0.0.0`, use Render's `PORT`, set production HTTPS origins and supply Clerk/Neon environment values. Apply the existing migration through a controlled deployment step. No model or GPU is needed on the backend.

The response deadline bounds waiting, not underlying database execution. Database driver timeouts bound queries separately; a profile upsert can finish after a client disconnects. Socket disconnect detection is best-effort, with deadline cleanup as a fallback. The shared pool closes on shutdown.

Tests use real locally signed JWTs and a fake user repository. They cover account sync, invalid tokens, CORS, database errors, admission limits, deadlines, shutdown and removal of hosted STT. They do not establish real Clerk configuration, Neon connectivity or desktop authentication. No production migration or deployment was performed.
