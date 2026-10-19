# Speech for Windows

Electron + React + TypeScript desktop dictation. An AgEX product. Windows 11 x64 is the first target; Linux and macOS are deferred.

## Current build

This is a local development preview. Its account endpoints are `http://localhost:3000` and `http://127.0.0.1:4000`. Keep the frontend and backend running on the same PC when testing installation confirmation. These addresses will not connect to your services on somebody else's computer.

The NSIS output is `desktop/release/Speech-Setup.exe`. The app runs per user and includes Electron, the native whisper.cpp engine, and Microsoft's original signed VC++ x64 Redistributable installer. The speech model is downloaded separately after activation. The Speech installer itself is unsigned until the project provides a code-signing certificate.

## Build and run

From the repository root:

```sh
bun install
bun run dev:desktop
bun run package:windows
```

If Bun has not executed Electron's dependency installer, run `node desktop/node_modules/electron/install.js` once. `package:windows` downloads the pinned engine and Microsoft prerequisite, checks their SHA-256 values, builds the source, and creates an NSIS installer. Keep `bun.lock` committed.

Run validation from `desktop/`:

```sh
bun run typecheck
bun run test
bun scripts/smoke-engine.ts
bun scripts/smoke-input.ts
node --experimental-strip-types scripts/smoke-ui.ts
```

The engine smoke test downloads the public 148 MB model into ignored `.smoke/`, recognizes the upstream public JFK sample locally, and verifies expected words. The input helper test reads foreground information without sending keys. The Electron UI smoke test uses a separate test profile, verifies setup gates, disabled recording before activation, sandboxed preload and shortcut registration, and saves a screenshot. It does not approve a real account or record a person's microphone.

## Setup and use

1. Sign in on the website and download the installer through its protected route.
2. Run setup and open Speech. Continue installation in the browser, match the setup code, and approve with the existing website session. This is confirmation, not a second ordinary credential prompt. The installer never receives your Clerk cookie or a Clerk secret key.
3. Download the verified public Whisper Base multilingual model. No Hugging Face account or token is needed. An interrupted or cancelled download restarts cleanly when retried.
4. If the Windows VC++ runtime is missing, open the bundled Microsoft installer using the prerequisite button. This optional system prerequisite may require administrator approval. Check it again after Microsoft's setup completes.
5. Choose an input device after microphone discovery and configure an available shortcut. Default: `Control+Shift+Space`.
6. Use Run in tray, focus a normal application text field, and press the shortcut to start/stop. The overlay does not take focus. Each recording is limited to 60 seconds.

Speech checks that the original target is still focused before attempting a Ctrl+V paste. Elevated applications and special editors may reject simulated input. Use Copy text if insertion fails; sending input is not proof that the target application accepted it. Clipboard insertion changes the system clipboard. Escape cancels when the Speech window has keyboard focus; global Escape cancellation is not implemented.

## Local data and offline use

The per-user Electron application directory contains the verified model, shortcut preference, and OS-encrypted activation ID/email. After successful setup, local dictation does not request Clerk, the API or the model host. Audio is temporarily written for the native CLI and removed after processing/cancellation; stale scratch directories are cleaned on startup. There is no transcript history. The current transcript stays in memory until the next recording, disconnect or quit. Copy/paste puts it in the Windows clipboard, whose history is controlled by Windows.

Disconnect this PC removes local activation; models are retained for reuse. Uninstallation retains per-user data so reinstall does not redownload the model. A remove-model/erase-data UI remains future work. No revocation guarantee is made while offline.

## Publishing after deployment

Set public addresses at build time using `SPEECH_WEBSITE_URL`, `SPEECH_API_URL` and `SPEECH_RELEASE_CHANNEL=preview`. Both service addresses must be HTTPS for a non-development build. Only public URLs are embedded, never database URLs or Clerk secret keys. Rebuild the installer after changing addresses.

Configure the backend's `WINDOWS_INSTALLER_PATH` with the absolute path to the real installer on that backend's filesystem. A local `E:/...` path cannot work on Render. The artifact must be fetched or included during deployment, or distribution must later be adapted to private object storage. Do not commit a large installer into application source just to deploy it. Downloads remain authenticated.

## Remaining release checks

The public website/backend addresses and code signing are not configured yet. A clean Windows VM install/uninstall, real microphone test, live Clerk confirmation, full model-download recovery, offline restart and insertion tests in supported applications are still required before calling this a production release. Noise suppression is deferred.
