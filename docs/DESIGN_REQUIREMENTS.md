# Design and interaction requirements

> Backend scope update (2026-10-19): read [Current backend scope](BACKEND_IMPLEMENTATION.md). The backend proposals below predate the user's later decisions. Current implementation uses Bun, Prisma 7/PrismaPg, Neon with only user ID and email, JWT-based profile sync, and no webhooks or device-session storage.


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
- Make the primary action lead to Clerk sign-in and the authenticated download journey.
- Include direct installer download and copyable PowerShell installation instructions with version/platform details on the downloads page.
- Extend the template's verified visual language to account, device approval, device management, and help screens even if the original template lacks these pages.
- Integrate Clerk components with matching styles while preserving their authentication behavior and accessibility.
- Retain responsive layouts, keyboard focus indicators, reduced-motion behavior, and readable contrast when adapting the source.
- Verify which source assets and fonts may be reused; replace unrelated company logos, testimonials, metrics, and product screenshots. Do not publish invented customer claims.
- Desktop onboarding and overlay retain their own interaction requirements. Related visual styling may be shared later; the supplied website template does not establish desktop layouts.

Before implementation, capture accessible screenshots/design context, inventory sections and components, record reusable assets and tokens, and compare the implemented frontend at desktop and mobile viewport sizes.

## Website screens

| Screen | Required content and states |
| --- | --- |
| Home | Clear dictation proposition, short workflow, Windows support, privacy/mode explanation, sign-in/download CTA |
| Sign-in/sign-up | Clerk UI, validation, session expiry, return to intended page |
| Downloads | Detected platform with manual selection, installer version and architecture, checksum, direct download, copyable terminal instructions, prerequisites |
| Device approval | App/device name, short matching code, expiry, approve/reject, success and already-used states |
| Account/devices | Device list, last seen, revoke action, empty/loading/error states |
| Help | Microphone access, shortcut conflict, failed insertion, proxy/network failures, uninstall |

Copy buttons announce success through an accessible status message. Download instructions never include credentials. Unsupported platforms show availability honestly. Avoid unsupported speed, accuracy, “free forever,” or zero-retention claims about external providers.

## Desktop surfaces

- Welcome and browser sign-in/linking flow with retry, cancel, and expiration.
- Microphone selection and test, volume indicator, denied/missing permission recovery.
- Shortcut picker with live conflict validation and reset.
- Local/cloud selection showing download size, network need, destination of recordings, and model readiness.
- Guided sample dictation and insertion check.
- Tray menu: start/stop, open settings, sign-in state, updates, quit.
- Settings: account, input, shortcut, language, model/mode, privacy, startup, version and update status.

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
