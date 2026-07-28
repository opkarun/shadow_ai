# Shadow

Shadow is an AI commitment intelligence platform that discovers commitments in Gmail conversations, tracks them as first-class objects, verifies completion with GitHub and Calendar evidence, and drafts the communication needed to keep work on track while never sending without explicit approval.

## Folder Map

- `shared/types/`: canonical TypeScript interfaces for Section 20 entities.
- `shared/db/`: Mongo connection, Mongoose models, and the commitment status state machine.
- `shared/utils/`: cross-cutting env and logging helpers only.
- `detection/`: Gmail pre-filter, Gemini extraction, confidence scoring stubs.
- `verification/`: GitHub/Calendar/manual evidence matching and risk detection stubs.
- `communication/`: acknowledgement, completion, recovery, and extension draft stubs.
- `dashboard/`: React frontend and dashboard BFF/API route stubs.

## Local Run

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in local/sandbox credentials.
3. Run `npm run dev` once `dashboard/server.ts` is implemented by the dashboard branch.
4. Use `npm run build`, `npm run test`, and `npm run lint` before opening shared contract changes.

## ngrok

Use `ngrok` to expose the local backend over HTTPS for Gmail Pub/Sub, GitHub webhooks, Google OAuth callbacks, and phone-based demos. Set `NGROK_URL` in `.env` to the active public tunnel URL and configure webhook/callback URLs in provider dashboards to point at that URL.
