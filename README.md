# Speech — desktop dictation project

Status: the backend has been migrated to a lightweight account API for offline desktop STT. The desktop app, installer, frontend and live integrations remain pending. Start with the [offline product plan](docs/OFFLINE_PRODUCT_PLAN.md), [backend checklist](docs/BACKEND_CHANGE_PLAN.md) and [backend setup](backend/README.md).

Build an installable voice-to-text assistant inspired by the category of products such as Willow Voice. Users install the desktop software, sign in through the browser, download a local model during setup, and dictate into the active application using a global keyboard shortcut. After setup, transcription works offline.

The website supports the desktop product through browser sign-in, downloads, installation instructions, and help. The installed app performs recording, displays an animated recording overlay, and inserts text.

## Confirmed direction

- Separate `frontend/` and `backend/` folders.
- Next.js with TypeScript for the website; a separate TypeScript service for the backend.
- Clerk authentication. “Clark” in the initial brief is interpreted as Clerk.
- Speech-to-text (STT), also called automatic speech recognition (ASR). Text-to-speech playback is outside the current scope.
- Installation through a website download and a copyable terminal command.
- Global shortcut, microphone recording, visual feedback, and transcription into other apps.
- Download a public ungated model directly onto the user computer; local inference requires no Hugging Face token. No cloud transcription in the MVP. Noise suppression is deferred.
- Frontend design will use the user-selected [Modern, Clean SaaS Company Figma template](https://www.figma.com/site/2595Gwlxqa5M9I3YWNaD4x/Modern--Clean-SaaS-Company--Community-?node-id=0-1). See the design requirements for adaptation scope and inspection status.

## Proposed starting point

Desktop proposal: Windows 11 x64 with Electron + React + TypeScript. Implemented backend: Bun, Fastify, Prisma ORM 7 with PrismaPg, Neon PostgreSQL storing only user ID/email, and no hosted inference dependencies. Clerk JWTs supply identity and email without a user API lookup. No webhooks, device records, audio history, or transcript history. External services still need live configuration and validation.

## Documents

| Document | Purpose |
| --- | --- |
| [Offline product plan](docs/OFFLINE_PRODUCT_PLAN.md) | Current scope, desktop flow, phases and acceptance gates |
| [Backend changes](docs/BACKEND_CHANGE_PLAN.md) | Current-code migration checklist and endpoint changes |
| [Product requirements](docs/PRODUCT_REQUIREMENTS.md) | Scope, user journeys, acceptance criteria |
| [Architecture](docs/ARCHITECTURE.md) | Folder boundaries, runtime design, deployment |
| [Design requirements](docs/DESIGN_REQUIREMENTS.md) | Website, desktop overlay, interaction states, Figma handoff |
| [STT pipeline](docs/STT_PIPELINE.md) | Audio handling, model options, evaluation |
| [Authentication and API](docs/AUTH_AND_API.md) | Clerk browser sign-in, device linking, API contracts |
| [Installation and releases](docs/INSTALLATION_AND_RELEASES.md) | Installer, terminal commands, updates, uninstall |
| [Security and data](docs/SECURITY_AND_DATA.md) | Permissions, credentials, retention, trust boundaries |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Ordered phases with completion gates |
| [Backlog and decisions](docs/BACKLOG_AND_DECISIONS.md) | Pending tasks, assumptions, questions, risks |
| [Validation and sources](docs/VALIDATION_AND_SOURCES.md) | Test matrix, proposed targets, official references |

Start with the offline product plan and backend change checklist. Earlier documents are historical where they conflict with these plans. Track unresolved choices in the backlog. All dates, limits, commands, API paths, and performance budgets in these documents are proposed unless explicitly described as confirmed.

## Planned repository layout

```text
frontend/             # Next.js website, Clerk UI, account/download pages
backend/              # Independent TypeScript account API and Clerk verification
desktop/              # Electron app, overlay, OS integration, local inference
packages/contracts/   # Shared schemas and types, no server secrets
packages/stt/         # Runtime-neutral STT interfaces and text normalization
installer/            # PowerShell bootstrap and packaging configuration
docs/                 # Requirements, plans, decisions
```

The backend and shared contracts now exist. The remaining application folders are planned. Follow backend/README.md for installation, configuration, tests and startup; the offline product plan and backend change checklist govern future implementation. The backend setup guide describes the migrated account API; desktop authentication compatibility remains pending.
