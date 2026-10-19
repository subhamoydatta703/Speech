# speech

**Give your thoughts a voice.** — Local-first desktop dictation powered by [Whisper](https://github.com/ggml-org/whisper.cpp). Speak naturally and speech types for you, completely offline after setup.

## Overview

speech is a voice-to-text desktop application for Windows. Users sign in on the website, download the installer, and activate with a one-time browser confirmation. After the speech model is downloaded, all transcription runs locally — no cloud, no data leaves your machine.

| Component | Stack | Purpose |
| --- | --- | --- |
| **Frontend** | Next.js · TypeScript · Clerk | Marketing site, sign-in, download page, installation confirmation |
| **Backend** | Bun · Express · Prisma · Neon PostgreSQL | Account API, Clerk verification, authenticated installer delivery |
| **Desktop** | Electron · React · whisper.cpp | Recording overlay, global shortcut, local STT, text insertion |

## Quick start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.3.14
- [Node.js](https://nodejs.org) ≥ 24 (for Electron)
- A [Clerk](https://clerk.com) project with publishable + secret keys
- A [Neon](https://neon.tech) PostgreSQL database

### Install dependencies

```bash
bun install
```

### Backend

```bash
cp backend/.env.example backend/.env
# Fill in DATABASE_URL, CLERK keys, and optionally WINDOWS_INSTALLER_PATH
cd backend
bun run db:generate
bun run db:migrate
bun run dev            # → http://localhost:4000
```

### Frontend

```bash
cp frontend/.env.example frontend/.env
# Fill in CLERK keys and BACKEND_URL
cd frontend
bun run dev            # → http://localhost:3000
```

### Desktop (development)

```bash
cd desktop
bun run dev            # builds and launches the Electron app
```

### Build the Windows installer

```bash
bun run package:windows   # outputs desktop/release/speech-Setup.exe
```

## Repository layout

```
frontend/              Next.js website — sign-in, download, account, help
backend/               Express API — Clerk auth, user accounts, installer delivery
desktop/               Electron app — overlay, recording, local Whisper inference
packages/contracts/    Shared schemas and types (no server secrets)
docs/                  Requirements, plans, architecture decisions
```

## How the download works

The installer is served through an authenticated flow:

1. User signs in on the website via Clerk
2. Clicks **Download installer ↓** on `/download`
3. Frontend calls `HEAD /api/download` to check availability
4. Backend verifies the Clerk JWT and streams the installer

**Development:** `WINDOWS_INSTALLER_PATH` points to a local file (e.g. `../desktop/release/speech-Setup.exe`).

**Production:** `WINDOWS_INSTALLER_PATH` can be a URL (e.g. a GitHub Release asset). The backend streams it to the user so the download appears to come from your domain.

## Deployment

### Frontend → Vercel

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Build Command | `next build` |
| Environment | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `BACKEND_URL` |

### Backend → Render

| Setting | Value |
| --- | --- |
| Build Command | `bun install --frozen-lockfile && bun run --cwd backend build` |
| Start Command | `bun run --cwd backend start` |
| Environment | `HOST=0.0.0.0`, `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CORS_ORIGINS`, `WINDOWS_INSTALLER_PATH` |

> **Important:** `CORS_ORIGINS` must include your Vercel frontend URL. `WINDOWS_INSTALLER_PATH` can be a GitHub Releases URL for production.

### Installer hosting

Upload `speech-Setup.exe` to a [GitHub Release](https://docs.github.com/en/repositories/releasing-projects-on-github) and set `WINDOWS_INSTALLER_PATH` to the download URL:

```
https://github.com/subhamoydatta703/speech/releases/download/v0.1.0/speech-Setup.exe
```

## How it works

1. **Download & install** — User downloads `speech-Setup.exe` from the website after signing in.
2. **Activate** — The installer generates a confirmation code. The user matches it in their browser to link the installation to their account.
3. **Model download** — On first launch, the app downloads the Whisper base model (~148 MB) from Hugging Face. This is a one-time step.
4. **Dictate** — Press the global shortcut to start recording. speech transcribes locally using whisper.cpp and types the result into the active application.

## Privacy

- All transcription happens **locally** on your machine.
- No audio or text is sent to any server after activation.
- The backend only stores user ID and email for account management.
- The speech model is downloaded directly from Hugging Face (public, no token required).

## Documentation

| Document | Purpose |
| --- | --- |
| [Offline product plan](docs/OFFLINE_PRODUCT_PLAN.md) | Scope, desktop flow, phases and acceptance gates |
| [Backend changes](docs/BACKEND_CHANGE_PLAN.md) | Migration checklist and endpoint changes |
| [Frontend plan](docs/FRONTEND_IMPLEMENTATION_PLAN.md) | Downloads, desktop sign-in, account UI |
| [Authenticated distribution](docs/AUTHENTICATED_DISTRIBUTION.md) | Sign-in-once install flow |
| [Windows desktop](docs/WINDOWS_DESKTOP_IMPLEMENTATION.md) | Electron app architecture |
| [Installation API](docs/INSTALLATION_AUTH_API.md) | Installation activation endpoints |

## License

Private — an [AgEX](https://agexai.vercel.app/) product.
