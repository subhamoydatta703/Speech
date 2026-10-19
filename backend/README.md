# Speech backend

A Bun + TypeScript + Fastify API for desktop dictation. Clerk verifies identity, Prisma ORM 7 connects to Neon PostgreSQL through `PrismaPg`, and Hugging Face performs hosted speech recognition.

The only application table is `User`, with `id` and `email`. Recordings and transcripts are never written to the database or filesystem. There are no webhook, device-management, refresh-token, or transcript-history endpoints.

## Run locally

From the repository root:

```powershell
bun install --frozen-lockfile
Copy-Item backend/.env.example backend/.env
```

Fill in `backend/.env` using your own Neon, Clerk and Hugging Face configuration, then:

```powershell
cd backend
bun run db:generate
bun run db:validate
bun run db:migrate
bun run dev
```

`db:migrate` creates the user table in the database named by `DIRECT_URL`. Review the connection target before running it. No migration has been applied to your Neon account by this implementation.

The default API address is `http://127.0.0.1:4000`. Bun loads `.env` from the backend working directory. Run backend scripts from that directory, or use the repository's `bun run dev:backend` command.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL URL with TLS, used by the running API |
| `DIRECT_URL` | Neon direct PostgreSQL URL, used by Prisma migrations; falls back to `DATABASE_URL` if omitted |
| `CLERK_JWT_KEY` | PEM public key from your Clerk instance; literal `\n` line breaks are supported |
| `CLERK_ISSUER` | Exact issuer URL from your Clerk session tokens |
| `CLERK_AUTHORIZED_PARTIES` | Comma-separated origins allowed in the JWT's `azp` claim |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API |
| `HF_TOKEN` | Server-only Hugging Face token with inference permission |
| `HF_MODEL` | ASR model available through `hf-inference` for your account |

Other limits are documented in `.env.example`. Defaults: 60-second recordings, 5 MiB uploads, four active requests, 60 requests per minute per process, 45-second inference timeout and 90-second total request deadline. Rate limiting uses global counters, not saved user/IP records. It is not a cross-instance quota or a monetary budget cap. Configure provider spending limits separately.

### Clerk session claims

In Clerk's **Sessions → Customize session token** settings, include:

```json
{
  "email": "{{user.primary_email_address}}"
}
```

Use a normal Clerk **session token**, with its existing `sub`, `sid`, `iss`, `azp`, and expiration claims. Refresh the client session after changing its claims. The backend accepts only `Authorization: Bearer <token>`, not cookies or caller-supplied user IDs.

The middleware performs these steps:

1. Verify the token signature, issuer, allowed origin and expiration using Clerk's SDK and configured public key.
2. Validate `sub`, `sid` and `email`; reject incomplete sessions.
3. Read `User` by the verified `sub` value.
4. Reuse an unchanged record. Upsert only if it is new or its verified email changed.
5. Attach `request.userId` and `request.user` for the route.

There is no Clerk user API lookup in this flow. There is still a Neon query, whose latency depends on region, networking and cold starts. Email changes become visible with refreshed JWTs. JWT validation is networkless, so Clerk session revocation is not instantaneous: a previously issued token may remain valid until it expires. Rotate the configured public key when Clerk rotates its signing key.

With no webhooks, deleting a Clerk account does not automatically delete its Neon row. Database cleanup is currently an operator action. There is no user-list endpoint.

See [Clerk session customization](https://clerk.com/docs/guides/sessions/customize-session-tokens) and [Prisma PostgreSQL setup](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql).

## Endpoints

| Method | Path | Authentication | Result |
| --- | --- | --- | --- |
| GET | `/v1/health` | None | Process liveness |
| GET | `/v1/ready` | None | Database connectivity; does not test the inference provider |
| GET | `/v1/capabilities` | None | Audio format, limits and storage policy |
| GET | `/v1/me` | Clerk bearer token | Initialize/sync and return the current user's ID and email |
| POST | `/v1/transcriptions` | Clerk bearer token | Validate audio and return its final transcription |

### Transcription request

Send `multipart/form-data` with one file named `audio`. An optional `sessionId` UUID is echoed for client-side correlation. It is not stored and is not a server-side idempotency key.

Accepted format: RIFF WAV, integer PCM, 16 kHz, mono, 16-bit little-endian, between 0.1 seconds and the configured duration limit. The desktop must convert microphone capture to this format before uploading. WebM, MP3, audio URLs and JSON-encoded audio are not accepted. Duration is computed from samples rather than trusted metadata. Near-silent clips are rejected before inference; this is a silence check, not a speech classifier.

Example request from a frontend/desktop client that already has a Clerk token:

```ts
const form = new FormData();
form.append('audio', wavBlob, 'recording.wav');
form.append('sessionId', crypto.randomUUID());

const response = await fetch(`${apiBaseUrl}/v1/transcriptions`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${clerkSessionToken}` },
  body: form,
  signal: abortController.signal,
});
const result = await response.json();
if (!response.ok) throw new Error(result.error.message);
```

Let `fetch` generate the multipart boundary; do not set `Content-Type` yourself when using `FormData`.

Success shape:

```json
{
  "requestId": "server-generated-uuid",
  "sessionId": "optional-client-uuid",
  "text": "The recognized words.",
  "model": "configured/model",
  "audioDurationMs": 2000,
  "processingDurationMs": 700
}
```

Error shape:

```json
{
  "requestId": "server-generated-uuid",
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "The Clerk session is invalid or expired. Sign in again.",
    "retryable": false
  }
}
```

Notable statuses: `400` invalid fields/missing email claim, `401` authentication, `413` audio limit, `415` wrong upload type, `422` silence/no recognized speech, `429` rate limit, `503` database/provider/busy, `504` timeout. Error messages never return upstream credentials or raw exception objects.

No automatic inference retries occur. A retry can incur another provider charge. The desktop must ignore late results after cancellation and prevent duplicate text insertion. The provider auto-detects language; no language selector is currently accepted by this API.

## Code map

```text
src/
  server.ts                       Start server and handle shutdown
  app.ts                          Register middleware, plugins and routes
  config/
    env.ts                        Validate environment variables
    db.ts                         One PrismaPg/PrismaClient per server
  middleware/
    auth.ts                       Verify JWT and synchronize user
    error-handler.ts              Translate errors to safe API responses
    request-lifecycle.ts          Request slots, deadlines and cancellation
  routes/
    health.ts                     Liveness, readiness, capabilities
    users.ts                      Current authenticated user
    transcriptions.ts             Upload → validate → transcribe → clear buffers
  services/
    user.service.ts               User read/upsert rules and database interface
    transcription.service.ts      Hugging Face adapter and bounded HTTP responses
  lib/
    audio-upload.ts               Bounded multipart parsing
    audio.ts                      WAV validation and metadata removal
    errors.ts                     Public error type and cancellation helper
    limiter.ts                    Process-wide request counters
    route-context.ts              Dependencies passed to route registration
  generated/prisma/               Generated client; do not edit
prisma/
  schema.prisma                   User model: id and email only
  migrations/                     Reviewed SQL migration
test/                             Auth, audio, API and provider tests
```

Read `routes/transcriptions.ts` first for the main flow, then `middleware/auth.ts` and the two service files. Shared response types live in `packages/contracts/src/index.ts`. Database and provider interfaces let tests run without real accounts; production always uses Prisma and the Hugging Face SDK.

## Checks and production build

```powershell
cd backend
bun run format:check
bun run typecheck
bun test
bun run build
bun run start
```

`build` generates Prisma Client, checks TypeScript and bundles the server for Bun. Production requires the workspace dependencies and `packages/contracts/` alongside the backend. Install from the repository root using the committed `bun.lock`. Configure HTTPS at the hosting layer and set `HOST=0.0.0.0` when the platform requires it. The pooled database client is reused for the server lifetime and disconnected on shutdown.

Tests use real locally signed JWTs, a fake user repository and mocked provider HTTP responses. A real local HTTP test covers disconnected-client resource cleanup. They do not prove your Neon connection, Clerk project settings or model availability. No live Neon migration or paid inference request has run.

The installed Bun runtime did not consistently report client disconnects immediately in the HTTP test. Cancellation is best-effort on socket events; the provider/request deadlines bound work and release the slot even when disconnect notification is delayed. Providers may still bill work already started. Configure proxy logs to omit authorization headers, request bodies and user content. External provider retention terms must be reviewed before launch.
