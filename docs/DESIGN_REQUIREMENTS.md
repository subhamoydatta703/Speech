# Design and interaction requirements

## Current implementation — 2026-10-19

The frontend is implemented in `frontend/`. Updated reference: https://www.figma.com/site/914NaaK932moLZZrYeROVY/Modern--Clean-SaaS-Company--Community-?node-id=0-1 . Figma rejected both design-context and screenshot requests for lack of edit access. The user subsequently authorized independent design decisions. The implementation is an original clean SaaS adaptation, not a verified template reproduction, and uses no unverified Figma assets.

Downloads require website sign-in. Account access uses the backend ID/email endpoint. Installation confirmation reuses the browser session and requires the installer code to match. The landing demo is explicitly an illustration and does not access the microphone. Public-download language in the historical requirements below is superseded.

> Latest requirement: sign in once on the website before download/install; installation must transfer authentication automatically without a second normal sign-in prompt. See [Authenticated distribution](AUTHENTICATED_DISTRIBUTION.md). Protected backend downloads exist; website, installer and automatic session handoff remain pending. Conflicting older journey descriptions below are superseded.

> Updated 2026-10-19 for the offline MVP. Read [Frontend implementation plan](FRONTEND_IMPLEMENTATION_PLAN.md) and [Offline product plan](OFFLINE_PRODUCT_PLAN.md). Visual inspection and frontend implementation remain pending.



## Design status

The user selected the following template for the frontend on 2026-10-18:

- Reference: [Modern, Clean SaaS Company (Community)](https://www.figma.com/site/2595Gwlxqa5M9I3YWNaD4x/Modern--Clean-SaaS-Company--Community-?node-id=0-1&t=DQKnnKCVJ0DO95JO-1).
- Figma URL type: `site`.
- File key: `2595Gwlxqa5M9I3YWNaD4x`.
- Starting node: `0:1` (URL form `0-1`).
- Scope: the Next.js website in `frontend/`; the independent `backend/` remains unchanged in scope.

Use this template as the frontend design basis. Preserve its visual hierarchy, layout patterns, typography, spacing, colors, component styling, and responsive behavior after inspecting the actual source. Replace template branding and generic SaaS content with the dictation product's messaging and functions.

Inspection status: the supplied Figma Sites URL could not be opened by the web inspection tool. Its actual appearance, assets, tokens, responsive behavior, and reuse/license terms have not been verified. No design details are inferred from the template title. Visual extraction remains a pending implementation task; reference selection is complete. Do not substitute an unrelated template without user direction.

## Template adaptation requirements

- Adapt template navigation and landing-page sections to the product's sign-in, download, workflow, features, privacy, and help content. Map actual sections after source inspection rather than assuming a section inventory.
- Use product copy describing installable speech-to-text software, global shortcuts, microphone feedback, and supported text insertion.
- Make the primary action Download for Windows, available without sign-in. Offer sign-in separately for account access; the installed app starts browser sign-in during activation.
- Include direct installer download and copyable PowerShell installation instructions with version/platform details on the downloads page.
- Extend the template's verified visual language to account, desktop sign-in return, and help screens even if the original template lacks these pages.
- Integrate Clerk components with matching styles while preserving their authentication behavior and accessibility.
- Retain responsive layouts, keyboard focus indicators, reduced-motion behavior, and readable contrast when adapting the source.
- Verify which source assets and fonts may be reused; replace unrelated company logos, testimonials, metrics, and product screenshots. Do not publish invented customer claims.
- Desktop onboarding and overlay retain their own interaction requirements. Related visual styling may be shared later; the supplied website template does not establish desktop layouts.

Before implementation, capture accessible screenshots/design context, inventory sections and components, record reusable assets and tokens, and compare the implemented frontend at desktop and mobile viewport sizes.

## Website screens

| Screen | Required content and states |
| --- | --- |
| Home | Clear dictation proposition, short workflow, Windows support, offline processing explanation, public download CTA and secondary sign-in |
| Sign-in/sign-up | Clerk UI, validation, session expiry, return to intended page |
| Downloads | Detected platform with manual selection, installer version and architecture, checksum, direct download, copyable terminal instructions, prerequisites |
| Desktop sign-in return | Pending browser sign-in, validated return-to-app, cancelled/expired/invalid request, app not opening, retry; exact transport depends on auth feasibility |
| Account | Verified current user ID/email, loading/error/expired-session states and website sign-out; no device list, last-seen data or revoke controls |
| Help | Microphone access, shortcut conflict, failed insertion, initial model-download failures, offline readiness, account connection failures, uninstall |

Copy buttons announce success through an accessible status message. Download instructions never include credentials. Unsupported platforms show availability honestly. Explain that setup, initial sign-in and updates need internet, while completed setup enables offline dictation. Avoid unsupported speed, accuracy or hardware claims. Do not imply that the browser can inspect the installed model.

## Desktop surfaces

- Welcome and browser sign-in flow with retry, cancel and expiration; a successful website login alone must not claim the desktop has authenticated.
- Microphone selection and test, volume indicator, denied/missing permission recovery.
- Shortcut picker with live conflict validation and reset.
- Local model setup showing download size, progress, verification, cancellation, retry, repair and readiness. No cloud selector. Account activation and model readiness are separate states.
- Guided sample dictation and insertion check.
- Tray menu: start/stop, open settings, sign-in state, updates, quit.
- Settings: account, input, shortcut, supported language options, local model, privacy, startup, version and update status.

## Recording overlay state machine

```text
Idle -> Preparing -> Listening -> Processing -> Inserting -> Success -> Idle
                    |              |             |
                    +-> Cancelled  +-> Error      +-> Copy available
```

| State | User-facing behavior |
| --- | --- |
| Preparing | Explain loading/model readiness; microphone not active yet; allow cancel |
| Listening | Microphone indicator, elapsed time, audio-reactive bars, stop/cancel controls |
| Processing | Static progress label with subtle animation; recording has stopped |
| Inserting | Brief status; do not claim success until insertion adapter reports completion |
| Success | Short confirmation then dismissal |
| Copy available | Explain insertion limitation; keep transcript accessible until dismissed/copied |
| Error | Plain reason and specific recovery action; preserve an available transcript |
| Cancelled | Confirm capture stopped; discard unfinished audio and ignore late results |

Proposed placement: small bottom-center overlay within the active monitor's work area. It must avoid the caret and taskbar, scale with display DPI, and preserve input focus. Overlay clicks and keyboard accessibility need a deliberate interaction mode: normal recording stays non-activating; opening transcript/settings enters a normal focusable window. Restore focus only on explicit user action.

Recording bars should reflect real microphone energy rather than imply recognition quality. Silence should appear visibly quiet. Offer reduced motion with static status changes, sufficient contrast, text alongside color, screen-reader labels, and keyboard-accessible controls. A screen-reader user must receive start/stop/error announcements without focus being stolen.

Global Escape cancellation requires a separately validated recording-only binding. If unavailable, expose stop/cancel through the tray and overlay; do not promise an unimplemented global key hook.

## Future Figma handoff checklist

- [x] Frontend reference URL, file key, starting node, and scope captured.
- [ ] Template visually inspected; original assets, fonts, and reuse terms verified.
- [ ] Website desktop/mobile layouts defined.
- [ ] Every overlay state and recovery action designed.
- [ ] Light/dark behavior, typography, spacing, icon and motion tokens agreed.
- [ ] Component focus/hover/disabled/loading states documented.
- [ ] Copy approved, especially privacy and installation messages.
- [ ] Prototype covers first install and one complete dictation session.
- [ ] Implementation compared with the reference at agreed viewport sizes.
