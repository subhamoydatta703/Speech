# Frontend implementation plan

## Implementation update — 2026-10-19

The Next.js frontend now exists in `frontend/`: landing page, Clerk sign-in/sign-up, protected download and account pages, server-side installer streaming, and `/desktop/complete?id=...` installation confirmation. The website uses the existing backend API without changing backend source. See [frontend setup and limitations](../frontend/README.md).

Current journey: sign in on the website → protected download → installer opens browser confirmation → match code and approve using the existing session → installer completes activation and local model setup. Download is never public. The older journey and route table below are historical and superseded by this section and `INSTALLATION_AUTH_API.md`.

The latest Figma reference is `914NaaK932moLZZrYeROVY`, node `0:1`. The plugin denied edit access. The user authorized independent design decisions, so the frontend uses an original clean SaaS design; template fidelity is not verified. The real installer, production Clerk configuration and end-to-end desktop activation verification remain pending. No terminal installer command, version, or checksum is invented.

> Latest requirement: sign in once on the website before download/install; installation must transfer authentication automatically without a second normal sign-in prompt. See [Authenticated distribution](AUTHENTICATED_DISTRIBUTION.md). Protected backend downloads exist; website, installer and automatic session handoff remain pending. Conflicting older journey descriptions below are superseded.

Updated 2026-10-19. Requirements updated; frontend implementation remains pending. This replaces the earlier authenticated-download, device-management and cloud-mode website proposals. Read with [design requirements](DESIGN_REQUIREMENTS.md) and [offline product plan](OFFLINE_PRODUCT_PLAN.md).

## Website responsibilities

Build a separate `frontend/` using Next.js and TypeScript, with Bun for dependencies and scripts. Keep the user-selected Figma template as the visual reference. Actual inspection, assets and visual implementation remain pending; this update does not infer its appearance.

The website explains the product, distributes the installer, supports browser sign-in from the installed app, and shows basic account details. It does not capture microphone audio, run Whisper, download model weights into browser storage, or upload audio to the API.

## Main journey

1. Visitor clicks Download for Windows without signing in first.
2. Downloads page provides a published installer or a copyable command for the same released version.
3. Setup installs the app and engine and downloads a verified public model directly from its host.
4. User clicks Sign in inside the installed app; the system browser opens website authentication.
5. Clerk authenticates the same account used on the website. A supported protected callback returns control to the app.
6. The desktop validates authentication and model readiness before enabling dictation; subsequent dictation works offline.

Earlier website sign-in is optional. Reuse the browser session where supported, but do not claim that website sign-in alone authenticates the desktop.

## Screens and states

Paths are proposed frontend routes, not existing endpoints.

| Route | Access | Content and states |
| --- | --- | --- |
| `/` | Public | Offline dictation, installation flow, supported OS, Download CTA, secondary Sign in |
| `/download` | Public | Version, architecture, installer/model sizes, measured hardware requirements, release notes, installer and PowerShell instructions |
| `/sign-in`, `/sign-up` | Clerk UI | Authentication, validation, cancellation, expired session and safe return destination |
| `/desktop/sign-in` | Flow entry | Validated pending app-auth request; signed-out, pending, cancelled, expired, invalid and retry states |
| `/desktop/complete` | Flow-specific | Browser step complete, approved Open app action and manual recovery; desktop success only when supported by actual confirmation |
| `/account` | Authenticated | Verified ID/email from `/v1/me`, loading/error/expired-session states and website sign-out |
| `/help` | Public | Setup connectivity, model download/repair, microphone, shortcuts, insertion limits, updates, sign-out and uninstall |

Desktop-auth route parameters must follow the supported Clerk flow selected by the packaged-app feasibility gate. Do not invent a device-link protocol or accept user ID/email URL parameters as authentication.

## API and release integration

- Use `GET /v1/me` with the configured Clerk session token including verified email. Handle 401 as reauthentication, missing email as setup/support guidance, and 429/503/504 as recoverable account errors.
- Keep public downloads/help accessible when the account API is unavailable.
- Capabilities describe architecture, not whether the user's desktop model is installed. Browser download clicks cannot establish model readiness.
- Use static versioned release metadata and real hosted artifacts. No release API currently exists.
- Never call removed transcription, devices, device-links, device-sessions or webhook endpoints.
- Never expose HF tokens, Neon URLs, Clerk secrets or signing credentials in frontend bundles.
- Validate return destinations and callback targets; do not transfer browser cookies or put bearer tokens in URLs/installation commands.

## Download and product copy

Enable installer links and command-copy controls only when real signed artifacts exist. Until then, display Release unavailable without runnable placeholder commands. Both installation paths select the same version and architecture. Never instruct users to disable execution policy globally; offer the signed installer if scripts are blocked.

Explain that initial installation, model download, sign-in and updates need internet. After setup, local dictation works offline. Download and verification progress belong to the desktop, not the website. Distinguish installer size from model size and show hardware requirements only after measurement.

Remove cloud/local selectors, provider-token instructions, hosted quotas, usage dashboards, custom device approval codes, device lists, last-seen data and per-device revoke actions. No noise-cancellation claims: dedicated suppression is deferred. Do not promise universal app, language or hardware support.

Website sign-out affects the browser session. Desktop logout clears that app's credentials and activation. Do not claim website sign-out immediately disables an offline app. Account sign-in and updates still contact online services even though dictation audio stays local.

## Implementation checklist

- [ ] F-01: Inspect the selected Figma source and verify reusable assets/typography.
- [ ] F-02: Scaffold separate Next.js frontend and accessible reusable components using Bun.
- [ ] F-03: Build public landing/download/help pages with truthful unavailable-release states.
- [ ] F-04: Integrate Clerk website sign-in and account API, including error recovery.
- [ ] F-05: Prove packaged desktop browser sign-in and exact token/callback contract.
- [ ] F-06: Implement that flow's website portion; validate expiry, replay, cancellation and redirects.
- [ ] F-07: Connect published artifacts and version metadata to download/copy controls.
- [ ] F-08: Review responsive layouts, keyboard focus, screen readers and reduced motion against the reference.
- [ ] F-09: Validate clean-PC installation, sign-in, model setup and offline dictation with the desktop app.

F-01 through F-04 can proceed independently of desktop auth feasibility. F-06 depends on F-05; F-07 needs real releases. No new database columns are needed.

## Acceptance

Public downloads never require sign-in. Commands contain no credentials and use the same version as direct download. Account pages display only the authenticated user's ID/email. Browser completion is bound to a real auth request; app-missing, expired-callback and cancelled states have recovery. No microphone capture, audio upload, cloud selector or custom device dashboard appears on the website. The visual design retains the selected Figma direction.

Current backend handoff: [Installation activation API](INSTALLATION_AUTH_API.md) defines implemented start/inspect/approve/exchange endpoints. Website/installer integration remains pending. This supersedes earlier statements that these backend endpoints do not exist. The exchange returns offline activation, not a copied Clerk session.
