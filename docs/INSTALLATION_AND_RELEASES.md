# Installation and releases

> Current direction (2026-10-19): [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [backend change checklist](BACKEND_CHANGE_PLAN.md) supersede conflicting requirements below. STT and model downloads move to the desktop; Render keeps account APIs. This document contains historical planning. The account API migration is implemented; desktop work and live integration remain pending. See BACKEND_IMPLEMENTATION.md for current backend scope.



## Distribution proposal

Windows 11 x64 is the initial target. Provide a signed per-user installer that includes the desktop app and `speech` CLI launcher. End users should not need Node.js, npm, Python, Git, or administrator access for standard installation. Start with one Windows packaging/update stack selected in the feasibility phase; do not combine incompatible installer/update formats.

Website authentication precedes the normal download journey. Release packages and bootstrap scripts may be public, credential-free resources; the authenticated account experience and desktop device linking establish identity. If downloads must be gated, use short-lived URLs without putting Clerk credentials into terminal commands.

## Planned terminal experience

The following are interface examples only. `downloads.example.com` is a reserved placeholder; these commands do not install a working product today and must never appear as live website instructions.

```powershell
Invoke-WebRequest -Uri 'https://downloads.example.com/speech/install.ps1' -OutFile '.\speech-install.ps1'
# Inspect the script and verify its signature before execution.
Get-AuthenticodeSignature -FilePath '.\speech-install.ps1'
.\speech-install.ps1
```

Website should provide a copyable block plus direct installer download. Final bootstrap must enforce its own artifact/signature checks; merely printing a signature is not verification. Do not instruct users to disable execution policy globally. If their policy blocks scripts, provide the signed installer path.

Proposed CLI after installation:

```text
speech login              Open website and link this device
speech start              Launch tray app; return if already running
speech stop               Quit app and stop active microphone capture
speech status             Display version, running/auth/model state
speech settings           Open settings window
speech doctor             Diagnose microphone, shortcut, model, connectivity
speech update             Check/apply a verified compatible update
speech logout             Revoke device session and clear local credentials
```

Launch app immediately after install with consent; explain that a new terminal may be needed after PATH changes. Commands communicate with the existing single app instance through a permission-restricted local IPC channel, with no auth tokens in command arguments or stdout.

## Bootstrap requirements

1. Check OS, architecture, writable install directory, current version, and install policy.
2. Resolve a versioned release from a trusted HTTPS manifest; validate the manifest trust mechanism and approved host list.
3. Download into a temporary directory with timeouts, bounded retries, and progress.
4. Verify hash and Windows Authenticode publisher identity against the approved signer. Hashes served from the same compromised location alone are insufficient authenticity protection.
5. Launch only the verified installer; fail closed on verification errors.
6. Install per user, register app/CLI/uninstaller, and optionally launch onboarding. Do not embed credentials or record microphone audio during installation.
7. Return meaningful exit codes, clean temporary files, and leave an existing working version intact on failure.

Installer reruns are idempotent. Offer explicit repair/update paths and prevent accidental downgrades. Handle interruption, locked files, low disk, corporate proxy, and stale manifests. Test clean standard-user Windows machines rather than only development machines.

## Updates and uninstall

Sign releases, publish immutable versioned artifacts, include release notes/checksums, and separate stable/beta channels. Select a packaging-compatible updater; Electron documents platform-specific behavior: [autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater). Schedule installation when no recording or insertion is active. Failed updates must leave a launchable app; rollback behavior must be validated for the chosen packaging system.

Uninstall through Windows installed-app settings removes binaries, startup registration, PATH entries, app protocol/IPC registrations, and cached credentials. Ask whether to remove models/settings. Server device revocation is best effort when online; users can always revoke from the account page. Explain that uninstall alone while offline cannot immediately revoke remote sessions.

A production release requires a real domain, configured artifact storage, trusted signing certificate/provider, reproducible build pipeline, release manifest validation, and a clean-machine install/update/uninstall report. No working install command can be supplied before those exist.
