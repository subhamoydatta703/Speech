# Current backend scope

Updated 2026-10-19. This document records the user's later decisions and supersedes the backend proposals in the original planning documents.

- Bun runtime, dependency management, scripts and tests.
- TypeScript + Fastify in the separate `backend/` folder.
- Prisma ORM 7 with `PrismaPg`, using Neon PostgreSQL over TCP/TLS.
- Exactly two application user columns: `id` (Clerk user ID) and `email`. The later middleware example replaced the earlier username proposal.
- Clerk JWT verification with a custom `email` claim. Read the local user first; upsert first-time users and changed email addresses. No Clerk user API request on the authentication path.
- No webhooks, backend-owned device sessions, refresh tokens, device-link endpoints, stored usage history or transcript history.
- Hosted STT through Hugging Face. Audio remains in request memory and is discarded after processing; transcripts are returned to the caller without persistence.
- The desktop app remains responsible for microphone capture, shortcuts, overlays, obtaining/refreshing Clerk tokens, and inserting text into other apps. This backend does not implement those desktop features.

See [backend setup and code map](../backend/README.md) for exact endpoints, environment setup, limitations and validation commands. The initial implementation plan's device-link and broader database tasks are no longer part of the backend scope.

Implementation is present. Real Neon, Clerk and Hugging Face integration still requires deployment configuration and live validation. The first SQL migration is included but has not been applied to the user's Neon database.
