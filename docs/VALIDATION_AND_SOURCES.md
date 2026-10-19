# Validation plan and technical sources

> Current direction (2026-10-19): [Offline product plan](OFFLINE_PRODUCT_PLAN.md) and [backend change checklist](BACKEND_CHANGE_PLAN.md) supersede conflicting requirements below. STT and model downloads move to the desktop; Render keeps account APIs. This document contains historical planning. The account API migration is implemented; desktop work and live integration remain pending. See BACKEND_IMPLEMENTATION.md for current backend scope.



## Validation targets

Proposed engineering targets for baseline Windows 11 x64, 8 GB RAM, CPU-only machine; record exact CPU and network for each run. These are not achieved results.

| Metric | Initial target / measurement |
| --- | --- |
| Shortcut to recording indicator | p95 under 300 ms when app/model are ready |
| Stop to final text | Measure p50/p95 on 5-, 15-, and 60-second clips; initial p95 target under 3 seconds for 5-second clips on chosen mode |
| Accuracy | Initial target WER at or below 15% on a fixed quiet-English evaluation set; report noisy/accent slices separately |
| UI responsiveness | No inference on renderer UI thread; recording controls remain usable under load |
| Duplicate insertion | Zero duplicates in repeated/retried/cancelled-session checks |
| Capture lifecycle | Microphone released after every stop/cancel/quit/error scenario |
| Resource use | Measure idle RAM/CPU, peak inference RAM, disk/cache size; choose budgets after model/runtime spike |
| Cloud costs | Record cost per audio minute and quota behavior for selected provider; no assumed free tier |

Define the test dataset, sample counts, transcript normalization and scoring procedure before comparing models. Separate cold model load/download from warm transcription latency. If targets fail, document the reason and revise mode/hardware/scope before making promises.

## Release validation matrix

- Unit/contract tests: audio validation, segmentation boundaries, error schemas, state transitions, cancellation, request/insertion deduplication, and ownership rules.
- Integration tests: Clerk verification, link expiry/replay/concurrent exchange, refresh reuse, webhook signatures, revoked devices, provider errors, invalid audio, rate limits and quota enforcement.
- Desktop scenarios: repeated hotkey, shortcut conflict, no microphone, permission denied, device unplug, model corruption, disk full, offline, network interruption, suspend/resume, app restart and crash recovery.
- Insertion matrix: Notepad, browser textarea, Gmail compose, VS Code; test Unicode, multiline text, clipboard restoration, focus change during transcription, and manual copy when target is unsupported. Record app/OS versions.
- Privacy checks: verify no audio network traffic in local mode, no transcript/token logging, explicit cloud consent, cancellation cleanup, and no capture at startup.
- Accessibility/design: keyboard navigation, screen reader announcements, reduced motion, contrast, multi-monitor placement, 100%/150%/200% DPI, responsive website.
- Distribution: fresh standard-user install, PATH/new terminal behavior, reinstall, upgrade, invalid signature/hash, interrupted download, proxy, uninstall and optional cache removal.

Use focused automated tests for risky logic and manual clean-machine checks for OS behavior; documentation-only changes need link/consistency checks, not an application test suite.

## Official references

Reviewed for planning on 2026-10-18. Recheck version-specific APIs, provider availability, SDK beta status, model licenses and prices at implementation time. These sources support capabilities, not proof that this project works.

| Source | Relevance |
| --- | --- |
| [Electron globalShortcut](https://www.electronjs.org/docs/latest/api/global-shortcut) | Background shortcuts and registration conflicts |
| [Electron keyboard shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts) | Shortcut implementation options |
| [Electron security](https://www.electronjs.org/docs/latest/tutorial/security) | Renderer isolation, IPC and navigation boundaries |
| [Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater) | Platform/packaging-dependent update behavior |
| [Clerk Electron SDK beta](https://clerk.com/docs/reference/electron/overview) | Maintained desktop authentication option to evaluate |
| [Clerk scoped OAuth access](https://clerk.com/docs/guides/configure/auth-strategies/oauth/scoped-access) | OAuth capability and PKCE context; not evidence of a device grant |
| [Transformers.js](https://huggingface.co/docs/transformers.js/index) | JavaScript inference and supported tasks |
| [Whisper-base ONNX candidate](https://huggingface.co/onnx-community/whisper-base/tree/main) | Candidate local artifact; exact revision/license still to validate |
| [Hugging Face ASR API](https://huggingface.co/docs/inference-providers/tasks/automatic-speech-recognition) | Hosted speech recognition and authentication |
| [Fastify validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/) | Backend input/output schema validation |

No application tests or benchmarks have run because the repository currently contains planning files only.
