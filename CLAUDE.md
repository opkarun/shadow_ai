# CLAUDE.md

This file is read by every Claude Code session working on this project. Read it in full before writing or editing any code.

---

## #project

**App name:** Shadow

**One-line description:** Shadow is an AI commitment intelligence platform that automatically discovers commitments hidden inside Gmail conversations, tracks whether they're fulfilled, verifies completion using GitHub/Calendar evidence, and drafts (never auto-sends) the communication needed to keep them on track.

**Stack:**
- Frontend: React + TypeScript + Tailwind CSS + Zustand + Three.js (via `@react-three/fiber` + `@react-three/drei`, used only for the enhanced 3D commitment view — never a dependency of the core dashboard)
- Backend: Node.js + Express + TypeScript
- AI: Google Gemini API (Flash) for extraction, confidence scoring, and draft generation
- Integrations: Gmail API + Pub/Sub, GitHub Webhooks + Octokit.js, Google Calendar API (`googleapis`)
- Background jobs: node-cron (default) / BullMQ + Redis (upgrade path)
- Local/demo access: ngrok (public tunnel for webhooks + phone access)

**DB:** MongoDB (free-tier Atlas cluster). Connection and schema/model definitions live centrally in `shared/db/`, matching the interfaces in `shared/types/` exactly. No feature folder defines its own schema or opens its own connection — always import from `shared/db`.

---

## #conventions

- TypeScript everywhere. No implicit `any`.
- All shared object shapes (`Commitment`, `Evidence`, `CommunicationDraft`, `Integration`) come from `shared/types/` — never redefine or duplicate a type locally. If a field is missing, propose the change to the group; don't silently add it in your own folder.
- Naming: `camelCase` for variables/functions, `PascalCase` for types/components, files named after what they export (`extract.ts`, `matchEvidence.ts`).
- Every commitment status transition must go through the shared state-machine helper in `shared/db` — no direct `status: "COMPLETED"` writes scattered across feature code.
- Keep functions scoped to one responsibility (e.g., pre-filtering, extraction, and confidence scoring are three separate functions, not one).
- Comment *why*, not *what* — the spec already explains what each piece does; code comments should explain non-obvious decisions only.

---

## #testing

- Every module ships with basic unit tests for its core logic before being considered done (e.g., pre-filter pass/fail cases, confidence tier boundaries, evidence-matching heuristics).
- Test against a small hand-written sample set first (a handful of real-looking emails/GitHub payloads) before wiring up live API calls — this catches logic bugs without burning API credits.
- Never assume completion/success without checking output — if a function is supposed to return a `Commitment` object, the test asserts the actual shape, not just "it didn't crash."
- Manual end-to-end testing (one message → dashboard) happens at every daily sync, not only at the end.

---

## #git-workflow

- One shared repo, feature branches per module (`detection/`, `verification/`, `communication/`, `dashboard/`).
- Commit small and often — a commit should represent one logical change, not a full day of work.
- Never commit directly to `main`/`shared/` without flagging the change to the other three devs first, especially anything touching `shared/types/` or `shared/db/`.
- Pull before you push. Resolve merge conflicts in `shared/` as a group decision, not solo.
- Two daily syncs (start-of-day blockers, end-of-day contract changes + demo) — mentioned here because git conflicts are the visible symptom of a missed sync, not the root cause.

---

## #boundaries

- **Never auto-send communication.** Every drafted message (acknowledgement, completion, recovery, extension) requires explicit user approval before anything is sent via Gmail. This is a hard product constraint, not a suggestion — no "auto-send after N hours," ever, in any code path.
- **Never assume completion from elapsed time.** A passed deadline with no verification evidence must transition to `OVERDUE`, never silently to `COMPLETED`.
- **Stay inside your assigned folder.** Detection/Verification/Communication/Dashboard modules only write within their own folder plus shared read access to `shared/`. Don't edit another dev's folder, and don't edit `shared/` without flagging it first.
- **Don't fabricate API responses.** If Gmail/GitHub/Calendar/Gemini calls aren't wired up yet, use clearly-labeled mock data — never hardcode a fake "success" response that looks real.
- **No scope creep.** Build Must Have features (Section 28 of PRODUCT_SPEC.md) before touching any Should Have (Three.js view, full dynamic priority scoring, etc.). If a Should Have isn't done by Day 4, it's cut — not rushed.
- **Watch token spend.** Keep sessions long and focused rather than many short cold restarts; check `/cost` periodically; don't let agents run open-ended, unscoped tasks.

---

## #why-this-matters

Shadow's entire value proposition is trust: it watches people's communication and, when authorized, speaks on their behalf. If it ever sends something without approval, marks something done that isn't, or silently drops a real commitment, the product doesn't just have a bug — it breaks the one thing it exists to protect. Every rule in this file traces back to that: user control over communication, evidence over assumption, and a shared contract that keeps four people's code honest with each other over four fast days. When in doubt, build the boring, verifiable version of a feature over the clever, unverifiable one.
