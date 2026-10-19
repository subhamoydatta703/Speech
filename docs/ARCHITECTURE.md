# Architecture

> Current direction (2026-10-19): [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [backend change checklist](BACKEND_CHANGE_PLAN.md) supersede conflicting requirements below. STT and model downloads move to the desktop; Render keeps account APIs. This document contains historical planning. The account API migration is implemented; desktop work and live integration remain pending. See BACKEND_IMPLEMENTATION.md for current backend scope.



## Application boundaries

| Folder | Runtime and proposed stack | Owns |
| --- | --- | --- |
| `frontend/` | Next.js, React, TypeScript | Marketing, Clerk UI, downloads, device approval and account pages |
| `backend/` | Node.js, TypeScript, Fastify | API, Clerk token verification, device credentials, provider adapter, quotas, metadata |
| `desktop/` | Electron, React, TypeScript | Tray, microphone, shortcuts, overlay, local inference, insertion, CLI entry point |
| `packages/contracts/` | TypeScript and runtime schemas | API DTOs, error codes, IPC schemas, shared enums |
| `packages/stt/` | TypeScript | STT interface, segmentation policy, normalization; runtime-specific adapters stay with their owning app |
| `installer/` | PowerShell and packaging config | Bootstrap, installer metadata, release manifests |

Use one repository with workspace tooling and a lockfile. Each application gets its own package manifest, environment schema, build command, tests, and deployment artifact. Frontend and backend remain separate top-level applications and can deploy independently. Do not move business API routes into Next.js route handlers. Next.js may have framework/auth plumbing only; backend owns application data and authorization.

## Runtime flow

```text
Browser (frontend) -- Clerk session token --> backend -- metadata --> PostgreSQL
       |                                         |
       +-- device approval                       +-- provider credential --> Hosted ASR
                                                 ^
Desktop -- device access credential / audio ------+  (cloud mode only)
   |
   +-- microphone -> audio worker -> local model     (local mode)
   +-- transcript -> Windows insertion adapter -> user's focused app
```

No audio passes through the website. Local inference runs on the user's computer; hosted inference receives audio only in cloud mode. Installer artifacts live in an HTTPS release store/CDN rather than the frontend bundle.

## Desktop processes

- Main process: lifecycle, shortcut registration, tray, trusted windows, secure credential storage, narrow OS operations.
- Renderer: bundled React settings and overlay UI; microphone capture with an allowlisted permission handler; no unrestricted Node access.
- Preload: small typed IPC bridge with validated requests and sender checks.
- Worker/utility process: decode/resample and model inference, isolated from UI rendering. First spike determines the supported Transformers.js execution provider and packaged runtime.
- Windows adapter: remembers target window, checks focus before insertion, performs supported paste/input operations, and provides copy fallback.

TypeScript orchestrates the product. Electron, ONNX runtimes, and OS input libraries may contain native code. A requirement for exclusively pure TypeScript would conflict with reliable system integration; no custom native code is planned unless the insertion spike proves it necessary.

Electron is proposed because it supports the requested TypeScript stack and desktop APIs. Tauri is an alternative if package size becomes decisive, but introduces Rust/platform work. This choice must pass the Windows feasibility phase before the application architecture is treated as settled.

## Backend and persistence

Use HTTP JSON for account and device operations and bounded multipart audio uploads for cloud transcription. Batch transcription after stop is sufficient for MVP; a streaming gateway is a later feature. Keep model inference out of the Next.js runtime.

Proposed tables:

| Entity | Minimum fields |
| --- | --- |
| User | internal ID, unique Clerk user ID, createdAt, deletedAt |
| Device | ID, userId, label, platform, version, lastSeenAt, revokedAt |
| DeviceLink | ID, verifier challenge, hashed approval/poll secrets, expiry, status, approvedUserId |
| DeviceSession | deviceId, hashed rotating refresh token, familyId, expiry, revokedAt |
| UsageEvent | userId, deviceId, requestId, audio duration, mode, status, timestamp; no transcript |
| Preferences | userId, non-sensitive defaults; desktop-only device settings remain local |

Delete expired link attempts on a schedule. User identity comes from verified credentials, never a supplied userId. Account deletion/revocation must invalidate associated device access.

## Deployment and environment

Development example: frontend `http://localhost:3000`, backend `http://localhost:4000`, Electron loads a local renderer development server. Production desktop loads only packaged renderer assets. Allow CORS only for configured web origins; CORS is not authentication.

Production: frontend hosting for Next.js, independently deployed container/Node backend, managed PostgreSQL, HTTPS release storage, and a secrets store. Configure upload/body limits and provider timeouts before enabling cloud STT. Do not assume a serverless request can handle arbitrary audio durations.

Environment inventory, names proposed:

- Frontend: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_BASE_URL`; Clerk server secret only if its server integration requires it.
- Backend: `CLERK_SECRET_KEY`, Clerk verification settings, `DATABASE_URL`, optional `HF_TOKEN`, provider/model configuration, approved origins, credential signing keys.
- Desktop: public API URL, public model manifest, release channel. No Clerk secret or hosted inference token.
- Release automation: Windows signing credentials and release publishing credential, outside app bundles.

Pin supported Node/Electron/library versions during implementation after checking compatibility; do not leave release builds on floating `latest`. Fastify supports schema-based request validation: [validation documentation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/).
