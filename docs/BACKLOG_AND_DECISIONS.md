# Backlog and decisions

> Backend scope update (2026-10-19): read [Current backend scope](BACKEND_IMPLEMENTATION.md). The backend proposals below predate the user's later decisions. Current implementation uses Bun, Prisma 7/PrismaPg, Neon with only user ID and email, JWT-based profile sync, and no webhooks or device-session storage.


Updated: 2026-10-18. Status reflects planning, not implementation. “Pending items” is used for the requested task list; no specific meaning is assumed for “KITAs.”

## Decision register

| ID | Topic | Current position | Status |
| --- | --- | --- | --- |
| D-01 | Repository boundaries | Separate `frontend/` and `backend/`; separate `desktop/` | Confirmed by user |
| D-02 | Website/backend languages | Next.js frontend, TypeScript backend and STT orchestration | User direction |
| D-03 | Identity | Clerk, interpreting “Clark” | Assumption to confirm if different service intended |
| D-04 | Voice direction | STT/dictation; no TTS playback | Interpretation of primary brief |
| D-05 | Desktop runtime | Electron + React + TypeScript | Proposed; phase 0 gate |
| D-06 | Platform | Windows 11 x64 first; others later | Proposed |
| D-07 | Backend | Independent Fastify service + PostgreSQL | Proposed |
| D-08 | Inference default | Evaluate local and hosted ASR; no silent cloud fallback | Pending benchmark |
| D-09 | Shortcut | Toggle mode; configurable; candidate `Ctrl+Shift+Space` | Pending OS/app conflict checks |
| D-10 | Desktop identity | Browser-approved backend device linking; compare Clerk Electron SDK | Pending security/SDK spike |
| D-11 | Distribution | Signed per-user installer, verified bootstrap, packaged CLI | Proposed; packaging choice pending |
| D-12 | Frontend visual direction | Use [Modern, Clean SaaS Company template](https://www.figma.com/site/2595Gwlxqa5M9I3YWNaD4x/Modern--Clean-SaaS-Company--Community-?node-id=0-1) in `frontend/` | Confirmed by user; visual inspection pending |

## Pending work

| ID | Priority | Task | Depends on | Completion evidence |
| --- | --- | --- | --- | --- |
| T-01 | P0 | Shortcut/overlay/insertion feasibility | None | Packaged Windows demo + compatibility report |
| T-02 | P0 | Local model/runtime benchmark | None | Model revisions, hardware, accuracy/latency/memory results |
| T-03 | P0 | Hosted ASR/cost/retention spike | Provider account/credentials | Request/error tests and documented terms |
| T-04 | P0 | Auth approach spike and review | Clerk project | Browser link, replay rejection, revoke demo |
| T-05 | P0 | Signing and packaging spike | Signing access | Clean-machine install/update/uninstall report |
| T-06 | P1 | Scaffold separate applications | Phase 0 choices | Independent builds and CI |
| T-07 | P1 | Website Clerk/account/download flows | T-06 | Browser journey evidence |
| T-08 | P1 | Backend schemas, auth, devices, migrations | T-04, T-06 | Ownership/revocation tests |
| T-09 | P1 | Desktop recording/settings/CLI | T-01, T-06 | Capture lifecycle and shortcut checks |
| T-10 | P1 | Local/cloud pipeline and model management | T-02, T-03, T-09 | Real audio benchmark and cancellation checks |
| T-11 | P1 | Focus-safe insertion/copy fallback | T-01, T-10 | Supported app matrix; no duplicate insertion |
| T-12 | P1 | Inspect selected Figma Sites template and apply it to frontend | Source access, T-07 | Verified tokens/assets, adapted pages, responsive visual review |
| T-13 | P1 | Installer/bootstrap/release automation | T-05, feature gates | Signed release and verification failure checks |
| T-14 | P1 | Privacy/help/beta acceptance | All MVP tasks | PR-01–PR-12 evidence and issue triage |
| T-15 | P2 | Additional languages/platforms/hold-to-talk | MVP results | Separate requirements and feasibility reports |

P0 means resolve before committing to the full implementation; P1 means required for MVP; P2 means future work. No task is started or completed yet. Assign owners and dates when implementation begins.

## Inputs needed before dependent work

- Accessible visual/design context for the selected Figma Sites template; URL and frontend scope are already supplied. Web inspection could not open the reference.
- Final brand/domain, launch language priorities, and desired first operating systems.
- Whether local processing is mandatory or cloud processing may be the default.
- Clerk project access/configuration; provider token only through a safe secret configuration; signing and hosting credentials during release setup.
- Baseline supported hardware and budget ceiling for hosted inference.

No secret is needed to continue requirements work. Do not paste production secrets into documents.

## Main risks and responses

| Risk | Response / release consequence |
| --- | --- |
| Insertion varies by app or privilege | Early Windows spike; narrow supported app list; manual copy fallback |
| Local recognition is too slow on baseline hardware | Benchmark smaller model/runtime; revise supported hardware or explicitly choose cloud |
| Hosted inference isn't free or reliably available | Budget cap and quota UI; evaluate actual provider; retain adapter boundary |
| Desktop auth adds security complexity | Evaluate supported Clerk path first; review any custom device protocol |
| Shortcut conflicts or modifiers-only request | Configurable validated accelerator and clear recovery |
| Unsigned releases trigger trust issues | Provision signing before public distribution; clean-machine verification |
| Selected Figma Sites template not yet inspectable | Keep supplied reference as frontend basis; obtain design context before choosing exact tokens/layouts; continue feasibility |

## Change discipline

Record a new decision with rationale and validation evidence when resolving a proposal. Update affected requirements, contracts and tasks together; avoid treating a recommendation in a planning document as a measured fact.
