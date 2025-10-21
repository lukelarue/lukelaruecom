# LukeLaRue Gaming Platform

Full-stack prototype for the LukeLaRue gaming experience. The monorepo houses a React frontend, Express-based login and chat APIs, and shared tooling for local development against Firestore.

## Workspaces

- `apps/web/` – Vite + React UI. See `apps/web/README.md` for component, hook, and routing details.
- `services/login-api/` – Auth service providing Google sign-in, session cookies, and user persistence. Docs in `services/login-api/README.md`.
- `services/chat-api/` – Chat service exposing message and channel endpoints. Docs in `services/chat-api/README.md`.

## Prerequisites

- Node.js 22 and npm 10 (enforced via the repo `package.json`)
- Firebase CLI (`npx firebase --version`) for the Firestore emulator
- Optional Google OAuth client ID when testing the real auth flow

## Getting started

1. Install dependencies (runs for all workspaces):
   ```bash
   npm install
   ```
2. Copy environment templates:
   - `apps/web/.env.example` → `apps/web/.env`
   - `services/login-api/.env.example.login-api` → `services/login-api/.env`
   - `services/chat-api/.env.example.chat-api` → `services/chat-api/.env`
3. Adjust `.env` values as needed. Local defaults assume:
   - Frontend at `http://localhost:5173`
   - Login API at `http://localhost:4000`
   - Chat API at `http://localhost:4100`

## Local development

| Command | Purpose |
| --- | --- |
| `npm run dev:stack` | Start Firestore, both APIs, and the frontend in backend-auth mode. |
| `npm run dev:backend` | Start Firestore plus both APIs (no frontend). |
| `npm run dev:frontend:mock` | Serve the frontend with mocked auth for UI work. |
| `npm run dev:frontend:backend` | Serve the frontend pointed at the login API. |
| `npm run dev:login` / `npm run dev:chat` | Run each API with its emulator helpers. |
| `npm run dev:firestore` | Launch only the shared Firestore emulator. |

Each workspace README documents additional scripts, watch modes, and operational notes.

## Testing & linting

| Command | Scope |
| --- | --- |
| `npm run test:unit` | Run unit tests for frontend, login API, and chat API sequentially. |
| `npm run test:integration` | Run integration suites across all workspaces. |
| `npm run test:all` | Execute all unit + integration tests. |
| `npm run lint` | Run ESLint across workspaces. |

Per-workspace watch modes live in their respective READMEs.

## Environment tips

- `apps/web` supports `frontend-mock` and `backend` auth modes; prefer `npm run dev:frontend:*` scripts instead of toggling `VITE_AUTH_MODE` manually.
- The login API ships with fake Google auth enabled by default; set real credentials and disable `USE_FAKE_GOOGLE_AUTH` to validate production flows.
- The chat UI deactivates when it cannot reach the chat API, surfacing a "chat disabled" status instead of sending requests.

## Application routes

- `/` – Marketing landing page with Google sign-in entry.
- `/lobby` – Authenticated lobby view.
- `/profile` – Profile preview derived from the active session.

## Continuous integration

- GitHub Actions run linting plus unit and integration suites.
- Reproduce those checks locally with `npm run lint` and `npm run test:all` before pushing.

## Additional documentation

- `apps/web/README.md` – Frontend architecture, scripts, and integration tips.
- `services/login-api/README.md` – Auth API environment variables and HTTP contract.
- `services/chat-api/README.md` – Chat API configuration, endpoints, and data model.
