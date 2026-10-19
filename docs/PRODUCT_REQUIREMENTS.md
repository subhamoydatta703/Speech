# Product requirements

> Current direction (2026-10-19): [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [backend change checklist](BACKEND_CHANGE_PLAN.md) supersede conflicting requirements below. STT and model downloads move to the desktop; Render keeps account APIs. This document contains historical planning. The account API migration is implemented; desktop work and live integration remain pending. See BACKEND_IMPLEMENTATION.md for current backend scope.



## Outcome

Allow a person to dictate into a focused text field without switching to a transcription website. Initial audience: Windows users composing messages, documents, emails, and notes.

Working name: Speech. Brand name, domain, logo, and legal identity remain undecided. The competitor reference describes the product category; no exact feature or design parity has been established.

## MVP scope and acceptance

| ID | Requirement | Acceptance criterion |
| --- | --- | --- |
| PR-01 | Website sign-in with Clerk | Sign-up, sign-in, sign-out, and expired session states work; protected account data requires server verification. |
| PR-02 | Download and terminal installation | A signed Windows package and a copyable, versioned installation command produce the same installed version on a clean machine. |
| PR-03 | Browser-based device linking | Desktop opens the website; authenticated user approves the device; app becomes linked without copying credentials. |
| PR-04 | Background desktop app | App appears in the system tray, can be opened or quit, and records only after explicit activation. |
| PR-05 | Configurable global shortcut | A validated shortcut starts/stops dictation outside the app; a conflict prompts the user to choose another. |
| PR-06 | Microphone onboarding | User selects and tests a microphone; denied access, missing devices, and disconnection have recovery actions. |
| PR-07 | Recording overlay | Listening, processing, success, cancellation, and failure have distinct text and visual feedback; overlay preserves typing focus. |
| PR-08 | Speech recognition | A completed recording returns editable text; silent audio returns no invented text. |
| PR-09 | Text insertion | Transcript is inserted once into supported standard text fields; unsafe or unsupported targets get a manual copy fallback. |
| PR-10 | Privacy choices | Audio destination is disclosed before cloud use; local mode sends no recording to the backend; raw audio is not retained by the application after processing. |
| PR-11 | Recovery | Network/provider failure preserves a successful transcript for copy; cancellation stops capture and prevents late insertion. |
| PR-12 | Settings and lifecycle | User can change microphone, shortcut, STT mode, launch-at-login setting, and revoke/sign out the device. |

## Primary journey

1. Visitor understands the product, supported OS, microphone requirements, and local/cloud distinction.
2. Visitor authenticates through Clerk on the website.
3. Account download page offers a direct installer and a copyable PowerShell command.
4. Installed app opens the browser to link the device to that account; existing browser sign-in avoids unnecessary reauthentication.
5. Onboarding tests microphone, shortcut, audio destination, and insertion in a safe sample field.
6. User focuses a supported field and presses the configured shortcut.
7. Non-focus-stealing overlay confirms recording and reacts to microphone level.
8. User presses the shortcut again to stop. Processing finishes, then text is inserted once.
9. Overlay confirms completion; user continues typing.

## Scope boundaries

MVP uses toggle-to-record. Hold-to-talk requires separate key-release support and is deferred. `Ctrl+M` is a requested shortcut candidate; proposed default is `Ctrl+Shift+Space`, pending conflict testing. `Ctrl+Windows` alone consists only of modifier keys and is not a reliable default accelerator; test an additional non-modifier key if that combination is desired. Handle unavailable shortcuts explicitly. Electron supports background shortcuts and reports registration failure: [globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut).

Start with English dictation and evaluate Indian English accents. Hindi, other languages, mixed-language speech, and translation require separate datasets and acceptance decisions. Keep technical Unicode support from day one.

Supported insertion targets for beta: Notepad, browser textareas, Gmail compose, and VS Code editor on a standard desktop session, subject to the compatibility gate. Elevated apps, password fields, terminals that could execute pasted commands, remote desktops, and unusual editors require manual copy fallback in the MVP. Do not claim universal insertion.

Deferred: macOS/Linux installers, mobile, transcription history sync, meeting recording, AI rewriting, billing, team administration, speech playback, always-on listening, and partial transcript insertion.

## Quality expectations

Performance figures are validation targets in [Validation and sources](VALIDATION_AND_SOURCES.md), not marketing claims. A release must remain responsive during inference, show all errors visibly, and avoid duplicate insertion, background recording, and silent cloud fallback.
