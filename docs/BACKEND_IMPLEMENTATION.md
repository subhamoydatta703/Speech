# Current backend scope

Updated 2026-10-19. The account API migration is implemented locally. See the [backend guide](../backend/README.md) for the current runtime and [migration checklist](BACKEND_CHANGE_PLAN.md) for completed and pending work.

- Bun, TypeScript and Fastify in the separate `backend/` folder.
- Prisma 7 with PrismaPg and Neon PostgreSQL over TCP/TLS.
- Only `User.id` (Clerk identity) and `User.email`; schema unchanged.
- Verified Clerk session JWTs supply ID/email without a routine Clerk user API call.
- Current-user, liveness, readiness and local-mode capabilities endpoints.
- No Hugging Face SDK/token requirement, audio upload route, model loading or cloud transcription.
- No webhooks, custom device sessions, refresh-token storage, device-link endpoints or content history.
- Bounded account requests, safe errors and no sensitive content logging.

The desktop will download a public ungated model directly and run it locally. That app, installer, browser sign-in callback and offline activation remain pending. Current session verification is intentionally preserved until the chosen desktop flow proves its token contract. No database migration or deployment has been run against the user's services.

The [offline product plan](OFFLINE_PRODUCT_PLAN.md) governs the remaining product work. Older plans describing cloud STT or device tables are historical.
