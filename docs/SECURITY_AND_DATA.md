# Security, permissions, and data

> Current direction (2026-10-19): [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [backend change checklist](BACKEND_CHANGE_PLAN.md) supersede conflicting requirements below. STT and model downloads move to the desktop; Render keeps account APIs. This document contains historical planning. The account API migration is implemented; desktop work and live integration remain pending. See BACKEND_IMPLEMENTATION.md for current backend scope.



## Trust boundaries

Browser UI, desktop renderer, public network requests, provider responses, audio inputs, and model downloads are untrusted inputs. Backend authorization and Electron main-process IPC must validate requests independently. Authentication does not grant arbitrary filesystem, shell, or OS input access.

Electron implementation follows its official [security recommendations](https://www.electronjs.org/docs/latest/tutorial/security): context isolation and sandboxing, no renderer Node integration, restrictive CSP, validated IPC senders/arguments, controlled navigation, and allowlisted external URLs. Load bundled production UI; never run remote application JavaScript with desktop privileges.

## Data policy proposal

| Data | Proposed handling |
| --- | --- |
| Raw microphone audio, local | Memory only where practical; dispose after processing/cancel; remove unavoidable temporary files promptly |
| Raw audio, cloud | Bounded backend/provider transit; no app object-store archive or content logs; provider retention disclosed separately |
| Transcript | In-memory through insertion/copy; no server history or persistent local history by default |
| Device credential | OS-protected desktop storage; refresh hashes/server revocation metadata only on backend |
| Account/device metadata | PostgreSQL with ownership checks and deletion workflow |
| Diagnostics | Redacted error code, app/model version, durations, request IDs; no tokens, audio, transcript, clipboard content |
| Models | Verified local cache with visible storage size and removal control |

Application-level disposal does not guarantee forensic memory erasure or zero retention at an external provider. Select and document the actual provider's retention terms before shipping cloud mode. Proposed operational log retention is 14 days and usage metadata 30 days; validate operational need before adopting those periods. Avoid content in crash reports; submission should be opt-in and redacted.

## Recording and insertion

- Record only after user activation, always show a visible recording indicator, and release the microphone on stop, quit, error, or cancellation.
- Ask for microphone access through supported OS/runtime mechanisms. Never capture system audio or other applications by default.
- Overlay must not steal focus. Recheck foreground window before insertion and refuse uncertain targets.
- Prefer supported text insertion APIs where feasible. Paste-based insertion must snapshot clipboard state, avoid overwriting a newer user clipboard change, restore only when safe, and explain limitations with rich clipboard formats. Do not log clipboard contents.
- Reject detected password/secure fields. Since detection is imperfect, onboarding must disclose supported targets and offer a manual copy mode. Do not market universal sensitive-field protection.
- Never inject into an elevated process or execute pasted text/Enter commands. Terminal targets use manual copy in MVP.
- Startup at login requires an explicit setting; no recording at login.

## Abuse and account controls

Rate-limit unauthenticated linking and authenticated uploads. Enforce per-account cloud quotas and provider budget caps. Validate content signatures, decode limits, duration, and concurrency; do not fetch arbitrary audio URLs supplied by clients. Protect webhook signatures and process events idempotently. Device revoke and account deletion deny subsequent backend requests and expire sessions. Offline local use cannot be remotely revoked in real time; document this distinction.

Before release, exercise replayed link approval, stolen poll secret without verifier, stolen refresh reuse, cross-user device revocation, forged webhook, malicious IPC, corrupted model, and compromised release-manifest scenarios. These are implementation gates for the selected design, not claims that controls already exist.
