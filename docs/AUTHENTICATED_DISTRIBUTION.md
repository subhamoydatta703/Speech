# Authenticated distribution: sign in once

Updated 2026-10-19. This is the latest distribution requirement and overrides earlier public-download or repeated-login proposals.

## User journey

1. User clicks Download/Install on the website and signs in or signs up with Clerk.
2. The authenticated website permits download/installation.
3. Installation securely hands off the existing authenticated identity to the installed app.
4. Setup downloads/verifies the local model as needed, then enables dictation.
5. The user starts using the product without a second mandatory login prompt in the installer or app.

Reuse the existing browser session for the normal handoff. A browser return or Open app confirmation may be needed, but it must not unnecessarily request credentials again. If authorization expires or setup is interrupted, first retry using the browser session; request sign-in only if no valid session remains.

## Implemented backend support

`GET /v1/downloads/windows` runs Clerk Express and the user's unchanged auth middleware before serving a configured private installer. Configure `WINDOWS_INSTALLER_PATH` on the server. Missing releases return 503; signed-out users receive 401. There is no public static artifact route. A real signed release still needs to be built and provisioned.

`GET /v1/me` verifies the current account. The installation activation endpoints now transfer verified account identity for local use without copying browser credentials. See [Installation activation API](INSTALLATION_AUTH_API.md). Client integration remains pending.

## Backend handoff implemented; clients pending

The website, installer and app must implement a supported secure handoff so the original sign-in is sufficient. Use a short-lived, request-bound, single-use authorization exchange; never embed a reusable Clerk session JWT or secret in a generic installer, public URL or terminal command. Implement the website and installer against the documented activation API, then validate the actual packaged flow. Replay enforcement/storage requirements must be explicit; no extra user fields or persistent device sessions are added by this plan.

Do not assume a downloaded generic binary knows its user's identity. A copied installer cannot inherit someone else's authenticated session. Authorization must be bound to the intended installation; expiration and replay fail safely. This is implementation work, not another login screen in the normal journey.

The underlying release file must remain private. Public ungated model weights are separate from access to the product. No model runs on Render, and already activated local dictation remains available offline.

## Acceptance

- Sign in once on the website, then download/install/use without another credential prompt.
- Actual release downloads require authentication, not just a protected page/button.
- Installation receives and verifies the correct identity automatically.
- Expired, replayed or copied handoff data cannot activate another installation.
- No credentials appear in installer binaries, URLs, logs or installation commands.
- Interrupted setup has a clear retry path that reuses an existing browser session.
- Offline dictation works after completed setup.
