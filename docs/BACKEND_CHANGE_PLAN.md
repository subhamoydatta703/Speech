# Backend migration to offline STT

Updated: 2026-10-19. Status: hosted-STT removal and account API cleanup implemented locally. Desktop authentication compatibility and live deployment remain pending. The file table records the migration from the original hosted backend. Read [product plan](OFFLINE_PRODUCT_PLAN.md) first.

## Result we want

The backend manages online account access. It does not download, load or run a speech model, accept microphone audio, or return transcriptions. The desktop app performs STT locally. Public ungated model files download directly to the user's PC with no Hugging Face token.

Keep Bun, TypeScript, Fastify, Clerk, Neon, Prisma 7 and PrismaPg. Preserve the `User` schema with exactly `id` and `email`. No new database migration is required for this architecture change; the existing initial migration still needs deployment to the actual Neon database. No webhooks, device table, token table, audio history or transcript history are introduced.

## Current code versus target

| Area | Current code | Target |
| --- | --- | --- |
| Startup | Requires HF token and constructs provider | Requires only account/API configuration |
| Transcription | Authenticated multipart endpoint calls HF inference | Desktop-only local inference; endpoint removed |
| Auth | Verifies Clerk session JWT with email and synchronizes user | Preserve verified identity/email; prove desktop token compatibility |
| Capabilities | Advertises uploaded audio limits | Advertise local processing and no cloud audio endpoint |
| Database | ID/email through PrismaPg | Keep unchanged |
| Model distribution | No desktop downloader | Desktop downloads direct; no backend file proxy |
| Release metadata | Not implemented | Static versioned manifests with releases; API endpoint optional, not MVP prerequisite |

## File-by-file tasks

| Files | Planned change |
| --- | --- |
| `backend/src/server.ts` | Remove provider import and creation; keep DB lifetime, startup and graceful shutdown |
| `backend/src/app.ts` | Remove provider dependency, multipart registration and transcription route; retain security headers, exact CORS, error handling and account routes |
| `backend/src/config/env.ts` | Remove `HF_TOKEN`, `HF_MODEL`, upload/audio limits and provider timeout; remove the provider/request timeout comparison; retain generic request deadline and account admission limits |
| `backend/.env.example` | Reflect the smaller configuration; no HF token; document Render host/port and account origins |
| `backend/src/routes/transcriptions.ts` | Remove the hosted transcription route |
| `backend/src/services/transcription.service.ts` | Remove Hugging Face SDK adapter and provider-only HTTP handling |
| `backend/src/lib/audio-upload.ts` | Remove server-side multipart parsing |
| `backend/src/lib/audio.ts` | Remove backend-only WAV processing; design desktop audio handling separately rather than transferring upload assumptions blindly |
| `backend/src/lib/route-context.ts` | Remove provider dependency and retain only dependencies used by remaining routes |
| `backend/src/routes/health.ts` | Keep liveness/readiness; change capabilities to local mode without upload limits |
| `backend/src/middleware/request-lifecycle.ts` | Keep bounded account/DB requests and cleanup; replace misleading `PROVIDER_TIMEOUT` with a generic request timeout code |
| `backend/src/middleware/error-handler.ts` | Remove multipart/provider mappings; keep safe generic/auth/DB/rate-limit errors |
| `backend/src/middleware/auth.ts` | Preserve signature/issuer/expiry and verified email checks; adapt only after desktop token contract is proven |
| `backend/src/config/env.ts` auth origin parsing | Separate browser CORS origins from token audience/authorized-party configuration if the selected native flow requires different values; do not allow arbitrary schemes or remove origin checks |
| `backend/src/services/user.service.ts`, `config/db.ts`, `prisma/` | Retain current lookup/upsert/race handling and PrismaPg; no schema expansion |
| `packages/contracts/src/index.ts` | Remove obsolete cloud request/result schemas and provider/audio error codes once no consumers remain; add typed account/capability schemas; put desktop job/IPC contracts in clearly separate modules |
| `backend/package.json`, root `bun.lock` | Remove `@huggingface/inference` and `@fastify/multipart` through Bun; regenerate lockfile normally |
| `backend/test/helpers.ts`, `api.test.ts`, `auth.test.ts` | Remove cloud fixtures; retain and extend account/security/timeout cases for selected token contract |
| `backend/test/provider.test.ts`, `audio.test.ts` | Retire tests for removed server features; create meaningful local inference/audio tests when desktop implementation exists |
| `backend/README.md`, scope and API docs | Replace hosted-STT setup and request examples after runtime migration; clearly describe offline responsibility and current deployment status |

## Endpoint target

| Method/path | Action | Purpose |
| --- | --- | --- |
| `GET /v1/health` | Keep, public | Process liveness; no external call |
| `GET /v1/ready` | Keep, public | Bounded DB readiness check |
| `GET /v1/me` | Keep, authenticated | Sync and return verified user ID/email |
| `GET /v1/capabilities` | Update, public | Report local STT and data policy, not audio upload support |
| `POST /v1/transcriptions` | Remove | Return standard 404 in the new API; desktop never calls it |
| Custom auth/device-link endpoints | Do not add by default | Prefer supported Clerk-managed flow; resolve any required exception during auth feasibility |

Proposed capabilities fields: `sttMode: "local"`, `cloudTranscription: false`, `storage: { audio: false, transcripts: false, userFields: ["id", "email"] }`. This describes architecture, not whether a particular computer has downloaded its model. Desktop readiness is determined locally.

No deployed client has been verified in this work. Check for existing consumers before removing the cloud contract; if any exist, coordinate a versioned client/API cutover. Do not silently redirect their audio somewhere else.

## Desktop authentication gate

1. Prove website/browser sign-in and a protected return to a packaged desktop app using a supported Clerk flow.
2. Inspect redacted token claims and establish issuer, token type, audience/authorized party, session rules and email claim. Do not log raw tokens.
3. Confirm that the verified identity maps to the same Clerk user ID and custom email without a per-request Clerk user lookup.
4. Configure explicit verification for the selected token type. An OAuth access token is not automatically compatible with the current `sid`/`azp` session checks.
5. Test expiry, wrong issuer/audience, missing email, callback replay, logout and restart. Desktop API access must fail for invalid credentials even when local dictation remains available offline.

Do not pass a long-lived bearer token in a website redirect or trust an ID supplied by the client. Keep refresh/session management with the supported identity flow, and protect local credentials with OS storage. No persistent custom device-session infrastructure is planned.

## Render and deployment

Deploy only the account API with Bun. Keep the workspace root available because the backend imports `packages/contracts`. Install with the committed lockfile, run the backend build, and start from the backend directory. Set `HOST=0.0.0.0` and use the platform's `PORT`. Supply Neon and Clerk configuration through environment variables; no HF credentials or model files.

Apply the existing migration to the intended Neon database as a controlled deployment step. Keep installer binaries, model weights and release artifacts outside the API filesystem. Direct model hosting and static release manifests avoid a dependency on Render for model installation metadata. Account-service outages can delay initial sign-in but must not interrupt already activated local dictation.

## Ordered backend checklist

- [ ] B-01: Confirm desktop authentication token contract with packaged feasibility demo.
- [x] B-02: Remove hosted inference routes, dependencies, config and startup wiring.
- [x] B-03: Simplify contracts, generic errors, deadlines and capability response.
- [ ] B-04: Adapt identity verification to the proven desktop flow; preserve email claim sync and browser protections.
- [x] B-05: Update tests and runtime documentation together.
- [x] B-06: Validate startup without HF variables; verify removed upload endpoint returns 404 and no provider is contacted.
- [x] B-07: Run Bun tests, typecheck, formatting, Prisma validation and production build.
- [ ] B-08: Configure Render/Neon/Clerk and validate actual online sign-in and user synchronization.
- [ ] B-09: Verify the desktop works with the network disabled after initial setup, including restart and expired API token.

B-02/B-03 can proceed while authentication feasibility is being resolved. B-04 depends on B-01. Backend completion does not mean desktop STT, installer, model handling or OS integration are complete.

## Verification and current status

Preserve tests for valid/invalid signatures, expiration, issuer/audience, absent email, unchanged profile fast path, changed-email upsert, concurrent insert races, DB outage, CORS, limits and shutdown. Add startup-without-HF and removed-endpoint regressions. Validate no new user fields or audio persistence.

Hosted inference packages, configuration, upload handling and cloud contracts have been removed. Account tests and documentation have been updated. Session-token verification and the two-column schema are preserved. Desktop authentication compatibility (B-01/B-04), real deployment (B-08) and offline desktop acceptance (B-09) remain pending. No migration ran against Neon and no service was deployed.

Local validation after migration: 29 tests passed (77 assertions); TypeScript, formatting, Prisma schema validation and production build passed. Markdown links verified. No live service validation was performed.
