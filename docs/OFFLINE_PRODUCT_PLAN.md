# Offline desktop STT plan

> Latest requirement: sign in once on the website before download/install; installation must transfer authentication automatically without a second normal sign-in prompt. See [Authenticated distribution](AUTHENTICATED_DISTRIBUTION.md). Protected backend downloads exist; website, installer and automatic session handoff remain pending. Conflicting older journey descriptions below are superseded.

Updated: 2026-10-19. Status: approved direction, implementation pending. This plan and [backend changes](BACKEND_CHANGE_PLAN.md) supersede conflicting earlier plans. The backend account API migration is now implemented locally; desktop and distribution work remains pending. See the backend checklist for the exact migration status.

## Product we are building

An installable dictation application. A user downloads it from our website or installs it with a PowerShell command, signs in through their browser, and uses a global shortcut to speak into the active application's text field. Recognition runs on their computer using a downloaded model. Render never runs the model or receives dictation audio.

The default model is downloaded directly from a public, ungated model repository during installation or first-run setup. No Hugging Face account or token is required. The installer bundles the inference engine; downloading model weights alone is insufficient.

## Scope and decisions

| Area | Direction |
| --- | --- |
| Website | Separate `frontend/`, Next.js and TypeScript; existing Figma reference remains the design source |
| Backend | Separate `backend/`, Bun, TypeScript, Express |
| Database | Neon PostgreSQL, Prisma 7, PrismaPg; existing `User.id` and `User.email` only |
| Desktop | Separate `desktop/`; proposed Electron, React and TypeScript |
| First platform | Proposed Windows 11 x64; validate before promising other platforms |
| Speech engine | Proposed bundled whisper.cpp native executable controlled by TypeScript |
| Model | Public, ungated Whisper model in the engine's compatible format; benchmark Base and Small before choosing |
| Authentication | Clerk identity shared by website and desktop, browser-based sign-in |
| Downloads | Public installer; sign in after installation; no second mandatory website sign-in before download |
| Offline use | Initial online setup, then local dictation across app restarts without a network dependency |
| Cloud STT | Excluded from MVP; remove existing hosted inference integration |
| Noise suppression | Deferred; keep a replaceable audio processing module |
| Storage | Local model and preferences; credentials protected by OS storage; no audio/transcript history |

Bun remains the package manager and backend runtime. Electron has its own embedded runtime; the native engine executes machine code. Users do not install Bun, Node, Python, or a compiler.

## User journeys

### Install and activate

1. Download a signed Windows installer or run a published PowerShell bootstrap that downloads the same installer.
2. Install the application and native engine without requiring a developer environment.
3. Download the pinned model directly from its host. Show size, progress, retry and cancellation. In first-run setup, show separate model and account readiness states.
4. Click Sign in to open the system browser and authenticate with Clerk through our website flow.
5. Complete a protected callback to the desktop app; verify the identity and synchronize ID/email through the backend.
6. Configure the microphone and shortcut, then run a short dictation test.

Model download and authentication may happen in either order. Both must complete before first use. Installation is already complete when the app asks the user to sign in.

### Dictate offline

1. Register a configurable shortcut; offer a recovery path for conflicts.
2. On activation, remember the target window, show recording status without stealing focus, and capture microphone audio.
3. Stop recording on the next shortcut press; support cancellation and a bounded recording duration.
4. Convert audio into the engine's required format locally. Keep preprocessing separate so noise suppression can be added later.
5. Run inference in a worker/native child process so the UI stays responsive.
6. Insert the final text once into the original supported target, or offer manual copy if focus changed or insertion is unavailable.
7. Release audio and transcript buffers after use. Do not log their contents or retain history. Prefer an engine interface that avoids temporary audio files; any required temporary files need immediate cleanup and crash-recovery cleanup.

No request to Render, Clerk, Neon or Hugging Face is required for this journey after initial setup. Updates and session refresh must not block it.

## Authentication and offline policy

Use the same Clerk instance so the account has the same verified user ID across website and desktop. A caller-supplied user ID, email, or browser cookie copy is not authentication.

First prove a supported browser-to-desktop flow in a packaged app. Evaluate Clerk's native SDK and supported OAuth authorization-code/PKCE flow. Verify that the chosen flow actually supports our website sign-in experience and returns the token type our API expects. The Electron SDK's provider-browser flow alone does not prove arbitrary website-to-desktop session transfer.

Use a request-bound callback, expiration, replay protection and appropriate state/PKCE checks. Keep credentials in OS-protected storage through a reviewed adapter. No secret key belongs in the installer, renderer, command line, model URL or callback URL. Prefer Clerk-managed sessions over inventing a backend token store.

After successful initial activation, allow local dictation offline, including after short-lived API tokens expire. This local activation state does not authorize API calls. Online APIs always require fresh valid credentials. Logout clears local credentials and activation, requiring online sign-in to activate again. Account revocation cannot be detected while offline; do not claim immediate revocation or strong offline licensing enforcement. No offline expiry/licensing scheme is planned for MVP.

The current backend requires session-specific `sid`, `azp` and custom `email` claims. OAuth access tokens may have different claims. Decide the supported token contract before changing verification; never weaken validation merely to make a token pass. Preserve the requirement to get verified email from the token without a routine Clerk user API call. If a candidate flow cannot supply it, resolve that incompatibility during the feasibility phase.

## Download and model lifecycle

- Bundle a pinned, platform-compatible engine and required runtime libraries.
- Select a public ungated model, review redistribution/download terms, record its license, immutable revision, format, byte size and SHA-256.
- Ship trusted model metadata with the app; model installation must not depend on a live backend manifest.
- Download weights directly from the host to a per-user application directory. Never proxy large files through Render or expose arbitrary download URLs supplied by clients.
- Check available disk space, handle interrupted downloads, verify completed bytes, then atomically mark the model ready. Never load a partial or mismatched file.
- Keep model downloads resumable only when the host supports it; otherwise restart with clear progress. Handle unavailable hosts and low disk space.
- Separate application and model updates. Retain the last working compatible model until replacement verification succeeds. Updates are optional during offline use.
- Provide model repair and uninstall cleanup choices. No server-side device/model inventory is needed.

## Ownership and folders

| Component | Responsibilities |
| --- | --- |
| `frontend/` | Landing page, download/help pages, browser sign-in and return-to-app experience |
| `backend/` | Verify online identity, synchronize ID/email, current-user endpoint, health checks |
| `desktop/src/auth/` | Browser sign-in, callback handling, secure credentials and local activation |
| `desktop/src/audio/` | Capture, resampling, silence checks and future preprocessing hook |
| `desktop/src/models/` | Download, verification, installation, repair and compatibility |
| `desktop/src/stt/` | Native engine adapter, bounded jobs, cancellation and result handling |
| `desktop/src/platform/` | Shortcut, focus tracking, text insertion and tray integration |
| `desktop/src/ui/` | Onboarding, settings, recording overlay and error states |
| `installer/` | Packaging, PowerShell bootstrap, signed release/update configuration |
| `packages/contracts/` | Shared account, error and release metadata types without secrets |

Keep files in responsibility-based folders with descriptive names. Do not move the cloud provider service into desktop code: native inference needs its own adapter.

## Implementation order and completion gates

1. **Prove local inference and sign-in.** Package an engine on clean Windows; benchmark Base/Small on representative CPU-only hardware. Record exact model revision, RAM, processing time, language and accuracy on quiet/noisy speech. Prove browser callback, token contract, restart and logout. Gate: select engine/model/auth design from evidence.
2. **Migrate the backend.** Follow the file checklist in [backend changes](BACKEND_CHANGE_PLAN.md). Gate: starts without HF credentials, authenticated account operations pass, audio upload endpoint is gone, schema still has only ID/email.
3. **Build desktop setup and dictation.** Implement model installation, authentication, microphone, shortcut, overlay, local engine and insertion. Gate: complete dictation after disconnecting the network and restarting the app; cancellation never inserts late results.
4. **Build website and distribution.** Use the supplied Figma reference for the separate frontend, browser sign-in and download pages. Publish versioned installer/bootstrap artifacts only when real builds exist. Gate: a clean PC installs without development tools and recovers from interrupted model downloads.
5. **Deploy and validate the MVP.** Deploy lightweight API to Render and migrate Neon using the configured target. Validate real Clerk identity and email claims. Gate: account services work online and their outage does not stop already activated offline dictation.
6. **Later updates.** Evaluate dedicated noise suppression using measured accuracy before/after; consider more models, languages and platforms separately. No automatic cloud fallback.

## Release acceptance checklist

- [ ] Public install and browser sign-in work on a clean supported PC.
- [ ] A model downloads directly without a Hugging Face token and its checksum is verified.
- [ ] Offline dictation survives app restart and API-token expiry after initial activation.
- [ ] Network inspection confirms audio and transcripts are not uploaded.
- [ ] Sign-in cancellation, replay, malformed callbacks and wrong-account/token cases fail safely.
- [ ] Missing/corrupt model, low memory, missing microphone and shortcut conflict have usable recovery.
- [ ] Silence produces no inserted text; test ordinary background noise and document limits.
- [ ] Supported editor/browser input fields receive text once; focus changes and cancellation are safe.
- [ ] Sign-out removes local activation; subsequent use requires sign-in.
- [ ] Signed install/update/uninstall work; failed updates retain a working version.
- [ ] Backend tests, typecheck, Prisma validation and build pass after migration.

## References and open decisions

[whisper.cpp](https://github.com/ggml-org/whisper.cpp) documents local inference and compatible model downloads. [Clerk Electron quickstart](https://clerk.com/docs/electron/getting-started/quickstart) describes its currently beta native integration. [Clerk OAuth](https://clerk.com/docs/guides/configure/auth-strategies/oauth/scoped-access) and [native app authentication guidance](https://www.rfc-editor.org/rfc/rfc8252) inform the authentication feasibility work.

Pending evidence: final model/license/download revision, minimum hardware, launch languages, packaged sign-in token contract, Windows insertion adapter, signing and release host. These do not block documenting or simplifying the existing backend, but dependent implementation must pass its gate before release.

Frontend details: [Frontend implementation plan](FRONTEND_IMPLEMENTATION_PLAN.md) defines the current pages, API integration, download states and acceptance checklist.

Current backend handoff: [Installation activation API](INSTALLATION_AUTH_API.md) defines implemented start/inspect/approve/exchange endpoints. Website/installer integration remains pending. This supersedes earlier statements that these backend endpoints do not exist. The exchange returns offline activation, not a copied Clerk session.
