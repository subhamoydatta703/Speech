# Windows desktop implementation

Updated 2026-10-19. The desktop application is implemented in `desktop/`; Windows 11 x64 is the initial target. This supersedes older statements that no desktop source exists. Linux and macOS remain later work.

See [desktop setup, build and limitations](../desktop/README.md) for commands, release configuration, local storage and validation boundaries.

Implemented: Electron isolation and restricted IPC, React setup/settings, existing backend activation proof exchange, Windows-protected local activation, verified public model download, native whisper.cpp recognition, bounded microphone capture, configurable global shortcut, tray, non-activating overlay, foreground checks, paste attempt and manual copy, cancellation, temporary-audio cleanup and per-user NSIS packaging.

Verified locally: TypeScript and audio/proof unit tests, native focus-helper query, real recognition of upstream public test audio, and isolated Electron setup UI/shortcut checks. No real customer's voice or identity was used for these automated tests.

Public deployment endpoints, application signing, live account-to-installer acceptance, physical microphone behavior, clean-machine installation and application-specific paste acceptance are not complete. The installer is currently a local development preview, not a public production release. The model runs on the user's computer and is never deployed to Render.
