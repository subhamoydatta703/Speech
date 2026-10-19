# Current backend scope

Updated 2026-10-19. The account API migration is implemented locally. See the [backend guide](../backend/README.md) for the current runtime and [migration checklist](BACKEND_CHANGE_PLAN.md) for completed and pending work.

- Bun, TypeScript and Express in the separate `backend/` folder.
- Prisma 7 with PrismaPg and Neon PostgreSQL over TCP/TLS.
- Only `User.id` (Clerk identity) and `User.email`; schema unchanged.
- Verified Clerk session JWTs supply ID/email without a routine Clerk user API call.
- Current-user, liveness, readiness and local-mode capabilities endpoints.
- No Hugging Face SDK/token requirement, audio upload route, model loading or cloud transcription.
- No webhooks, custom device sessions, refresh-token storage, device-link endpoints or content history.
- Bounded account requests, safe errors and no sensitive content logging.

The desktop will download a public ungated model directly and run it locally. That app, installer, browser sign-in callback and offline activation remain pending. Current session verification is intentionally preserved until the chosen desktop flow proves its token contract. Both migrations have now been applied to the configured Neon database and a live PrismaPg query verified connectivity. Application deployment remains pending.

The [offline product plan](OFFLINE_PRODUCT_PLAN.md) governs the remaining product work. Older plans describing cloud STT or device tables are historical.

Database connection uses the user-provided PrismaPg pattern in config/db.ts. Server settings read process.env directly; config/env.ts has been removed. The current schema keeps the user-provided UUID default and unique email, while auth explicitly supplies the Clerk ID.

Latest integration: Express with Clerk middleware runs before the unchanged user-supplied auth.ts. Only Clerk publishable/secret keys are configured; CORS_ORIGINS supplies the allowed website origins. The supplied existing-user fast path does not synchronize changed email claims. Authenticated artifact downloads and installation checks remain planned, not implemented.

Current backend handoff: [Installation activation API](INSTALLATION_AUTH_API.md) defines implemented start/inspect/approve/exchange endpoints. Website/installer integration remains pending. This supersedes earlier statements that these backend endpoints do not exist. The exchange returns offline activation, not a copied Clerk session.
