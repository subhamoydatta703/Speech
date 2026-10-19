# Speech frontend

Next.js App Router, TypeScript, Clerk and Bun. Backend code is independent and unchanged by this frontend implementation.

## Run

From the repository root, run `bun install`. Copy `frontend/.env.example` to `frontend/.env.local`, then set the Clerk publishable and secret keys and `BACKEND_URL`. Use the same Clerk application as the backend and configure the JWT `email` claim dynamically for the signed-in user. Start the backend separately, then run `bun run dev:frontend`. Configure backend allowed origins to include the frontend origin.

Without Clerk keys, the public website can be previewed; protected functionality fails closed with a configuration message. No demo user or fake session is created.

Use `http://localhost:3000` for development. The dev command binds to `localhost` to match Clerk's middleware URL normalization. Binding explicitly to `127.0.0.1` can cause Next.js to treat Clerk's same-page rewrite to `localhost` as an external proxy request and loop until the connection resets. Restart the dev server after changing the command or environment values.

Validation: `bun run --cwd frontend typecheck`, `bun run --cwd frontend test`, `bun run build:frontend`.

Browser checks: run `bun run build:frontend`, then `bun run --cwd frontend test:e2e` (install Chromium with `bunx playwright install chromium` from `frontend/` if needed). Tests use a separate production server on port 3100 with Clerk disabled to verify public pages, responsive layout, interactions, invalid installation links and fail-closed protected resources. They do not contact the real database or validate a live Clerk session. The separate production server can coexist with your development server.

## Routes

- `/`: product landing page with a clearly labeled simulated dictation preview; never records audio.
- `/sign-in`, `/sign-up`: Clerk authentication.
- `/download`: protected Windows download page. `/api/download` authenticates server-side and streams the backend installer. No public asset path, bearer token in a URL, or memory-buffered installer.
- `/account`: authenticated account ID and email from `/v1/me`.
- `/desktop/complete?id=...`: installer confirmation. The installer creates the transaction and keeps its verifier; the website displays and approves the matching code using the existing Clerk session. Approval does not claim the installer finished activation.
- `/help`: setup and troubleshooting guidance.

The real Windows installer and model setup remain separate work. The backend returns an unavailable response until an installer is configured. No invented version, checksum, download command, pricing, testimonials or performance claims are published.

## Design status

The selected reference is https://www.figma.com/site/914NaaK932moLZZrYeROVY/Modern--Clean-SaaS-Company--Community-?node-id=0-1 . Figma denied design-context and screenshot access. The user authorized independent design decisions, so this implementation uses an original clean SaaS treatment: warm paper background, forest green typography, soft green panels, responsive layouts and product-specific illustration. It is not a verified reproduction of the inaccessible reference. DM Sans and Manrope fonts are bundled locally through Fontsource, with system fallbacks.

## Release validation still required

Configure real Clerk keys and the JWT email claim, then verify sign-in → download → installer code confirmation against a deployed backend and signed Windows installer. Test expired sessions, expired codes, service unavailability and a real large download. No production Clerk credentials or signed installer were available during implementation.
