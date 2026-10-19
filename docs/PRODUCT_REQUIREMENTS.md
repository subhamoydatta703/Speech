# Product requirements

> Latest requirement: sign in once on the website before download/install; installation must transfer authentication automatically without a second normal sign-in prompt. See [Authenticated distribution](AUTHENTICATED_DISTRIBUTION.md). Protected backend downloads exist; website, installer and automatic session handoff remain pending. Conflicting older journey descriptions below are superseded.

> Updated 2026-10-19 for the offline MVP. The [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [Frontend implementation plan](FRONTEND_IMPLEMENTATION_PLAN.md) define the current journey. Backend account APIs exist; desktop and frontend implementation remain pending.



## Outcome

Allow a person to dictate into a focused text field without switching to a transcription website. Initial audience: Windows users composing messages, documents, emails, and notes.

Working name: Speech. Brand name, domain, logo, and legal identity remain undecided. The competitor reference describes the product category; no exact feature or design parity has been established.

## MVP scope and acceptance

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| PR-01 | Website sign-in with Clerk | Sign-up, sign-in, sign-out, and expired session states work; protected account data requires server verification. |
| PR-02 | Download and terminal installation | A signed Windows package and a copyable, versioned installation command produce the same installed version on a clean machine. |
| PR-03 | Browser-based desktop sign-in | Installed app opens browser sign-in and securely completes authentication to the same Clerk account; no copied credentials or custom device inventory. |
| PR-04 | Background desktop app | App appears in the system tray, can be opened or quit, and records only after explicit activation. |
| PR-05 | Configurable global shortcut | A validated shortcut starts/stops dictation outside the app; a conflict prompts the user to choose another. |
| PR-06 | Microphone onboarding | User selects and tests a microphone; denied access, missing devices, and disconnection have recovery actions. |
| PR-07 | Recording overlay | Listening, processing, success, cancellation, and failure have distinct text and visual feedback; overlay preserves typing focus. |
| PR-08 | Offline speech recognition | Direct public model download completes with verified integrity; after setup, local dictation works without internet across app restarts and expired API tokens. Silence inserts no text. |
| PR-09 | Text insertion | Transcript is inserted once into supported standard text fields; unsafe or unsupported targets get a manual copy fallback. |
| PR-10 | Local processing privacy | Audio and transcripts stay on the PC, are not uploaded or retained as history, and are cleared after use. Initial setup connectivity is disclosed. |
| PR-11 | Recovery | Interrupted model setup is recoverable; account outages do not block activated offline dictation; cancellation stops capture and prevents late insertion. |
| PR-12 | Settings and lifecycle | User can change microphone, shortcut, local model and launch-at-login setting. Desktop logout clears local activation and credentials; next activation requires online sign-in. |

## Primary journey

1. Visitor understands offline dictation, supported OS, hardware requirements and initial internet setup.
2. Visitor downloads the public installer or copies a published PowerShell installation command.
3. Installer installs the desktop app and engine; setup downloads and verifies the public model directly without a Hugging Face token.
4. Installed app opens the browser for Clerk sign-in and securely completes its callback. Reuse an existing browser session where supported.
5. Onboarding confirms model and account readiness, then tests microphone, shortcut and insertion in a safe sample field.
6. User focuses a supported field and presses the configured shortcut.
7. Non-focus-stealing overlay confirms recording and reacts to microphone level.
8. User presses the shortcut again to stop. Processing finishes, then text is inserted once.
9. Overlay confirms completion; user continues typing.

## Scope boundaries

MVP uses toggle-to-record. Hold-to-talk requires separate key-release support and is deferred. `Ctrl+M` is a requested shortcut candidate; proposed default is `Ctrl+Shift+Space`, pending conflict testing. `Ctrl+Windows` alone consists only of modifier keys and is not a reliable default accelerator; test an additional non-modifier key if that combination is desired. Handle unavailable shortcuts explicitly. Electron supports background shortcuts and reports registration failure: [globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut).

Start with English dictation and evaluate Indian English accents. Hindi, other languages, mixed-language speech, and translation require separate datasets and acceptance decisions. Keep technical Unicode support from day one.

Supported insertion targets for beta: Notepad, browser textareas, Gmail compose, and VS Code editor on a standard desktop session, subject to the compatibility gate. Elevated apps, password fields, terminals that could execute pasted commands, remote desktops, and unusual editors require manual copy fallback in the MVP. Do not claim universal insertion.

Deferred: dedicated noise suppression, hosted transcription, device-management pages, macOS/Linux installers, mobile, transcription history sync, meeting recording, AI rewriting, billing, team administration, speech playback, always-on listening, and partial transcript insertion.

## Quality expectations

Performance figures are validation targets in [Validation and sources](VALIDATION_AND_SOURCES.md), not marketing claims. A release must remain responsive during inference, show all errors visibly, and avoid duplicate insertion, background recording, and silent cloud fallback.
