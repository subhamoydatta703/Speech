# Implementation plan

> Backend scope update (2026-10-19): read [Current backend scope](BACKEND_IMPLEMENTATION.md). The backend proposals below predate the user's later decisions. Current implementation uses Bun, Prisma 7/PrismaPg, Neon with only user ID and email, JWT-based profile sync, and no webhooks or device-session storage.


All implementation is pending. These phases are ordered by dependency; estimates and dates should be added after feasibility. Track individual tasks and unresolved decisions in [Backlog and decisions](BACKLOG_AND_DECISIONS.md).

## Phase 0 — feasibility and decisions

- Prove global shortcut registration and conflict recovery in a packaged Electron Windows app.
- Prove non-activating overlay, microphone capture, focus tracking, and one-time insertion in target apps.
- Validate a maintained Windows input adapter and its packaging/license; native integration is the largest platform risk.
- Run local Transformers.js ASR on a baseline 8 GB RAM CPU-only Windows machine; measure supported runtime, memory and latency.
- Exercise a hosted ASR request with a server-only key, timeout, quota failure and cancellation.
- Evaluate Clerk Electron beta against the explicit website-approval requirement; decide native SDK integration or reviewed device-link design.
- Select installer/updater pair; demonstrate a signed test install/update/uninstall.

Gate: record evidence and choose desktop runtime, insertion approach, model/mode, auth approach, and packaging stack. If feasibility fails, revise architecture before building the full UI.

## Phase 1 — repository foundations

Create `frontend/`, `backend/`, `desktop/`, `packages/contracts/`, `packages/stt/`, and `installer/`. Set up strict TypeScript, dependency lockfile, environment validation, formatting/linting, separate build commands, and CI. Define shared API/IPC schemas and stable errors. Add example environment files containing placeholders only.

Gate: each app builds independently; frontend cannot import backend server modules; no secret appears in public bundles. No runtime dependency on the frontend for local audio capture or inference.

## Phase 2 — identity and account website

Integrate Clerk in Next.js and verification in backend. Add data migrations, device ownership model, account/device pages, device-link or chosen SDK flow, revocation, logout, and deletion webhook handling. Build functional download/help pages with clearly unavailable releases until artifacts exist.

Gate: browser authentication and app linking work across app restarts; expired/replayed links and cross-user access fail. Website approval occurs only after explicit action.

## Phase 3 — desktop recording and UI

Implement single instance, tray, CLI launcher, microphone selection/test, toggle shortcut, overlay state machine, settings storage, consent screens, cancellation, focus preservation, and error handling. Use test audio only during development and make microphone state visible.

Gate: start/stop/cancel and quit always release capture; conflict/microphone errors are recoverable; overlay works across DPI and monitors without stealing focus.

## Phase 4 — transcription and insertion

Implement selected local model lifecycle and cloud adapter, audio validation/resampling, bounded segmentation, transcript normalization, cancellation and quota handling. Add Windows insertion adapter and manual copy fallback. Keep mode selection explicit and prevent stale/double insertion.

Gate: end-to-end real dictation passes the target app matrix, silence checks, latency/accuracy evaluation, offline-local verification, and cloud privacy checks.

## Phase 5 — reference-driven visual implementation

Use the user-selected [Modern, Clean SaaS Company Figma Sites template](https://www.figma.com/site/2595Gwlxqa5M9I3YWNaD4x/Modern--Clean-SaaS-Company--Community-?node-id=0-1) as the design basis for `frontend/`. First obtain accessible visual/design context, inventory actual sections/assets, and extract verified tokens and components. The initial web inspection could not open this URL, so exact design details remain unverified. Adapt branding and copy for the dictation product and extend the same visual language to Clerk, downloads, account/device, and help screens. This can proceed alongside phases 2–4 once source access is available. Desktop onboarding/overlay follow their documented interaction requirements and may share suitable visual tokens after review.

Gate: all required states, responsive website layouts, keyboard/screen-reader behavior and reduced motion are reviewed against the approved reference.

## Phase 6 — distribution and beta

Provision release domain/storage, signing, verified PowerShell bootstrap, installer, updates, release manifest and CI publishing. Complete clean-machine checks, limited beta, support instructions, provider cost review, and privacy copy. Release only after validation gates pass.

Gate: a newly authenticated user can install from the website, link, dictate into a supported app, update, revoke, and uninstall without a developer environment.

## Definition of done

The product is done for MVP when PR-01 through PR-12 pass with evidence, both top-level web applications deploy independently, signed installation/update flows work, supported target apps are documented, and outstanding issues have explicit severity and release decisions. Documentation alone does not satisfy any application implementation gate.
