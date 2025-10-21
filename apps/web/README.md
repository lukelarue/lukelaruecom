# Web Frontend

This package (`apps/web/`) contains the LukeLaRue gaming platform UI built with Vite, React, and TypeScript. The app can run fully mocked for design work or connect to the login and chat backends for end-to-end flows. Repository-wide setup steps live in the root `README.md`.

## Prerequisites

- Node.js 22 or newer (matching the workspace `engines` field)
- npm 10+
- Optional: running instances of the login API (`http://localhost:4000`) and chat API (`http://localhost:4100`) when exercising backend-backed features
- Dependencies installed via `npm install` at the repo root (covers this workspace)

## Environment configuration

1. Copy `.env.example` to `.env`.
2. Adjust the following keys as needed:
   - `VITE_LOGIN_API_BASE_URL` – URL of the login API service.
   - `VITE_GOOGLE_CLIENT_ID` – Google OAuth client ID (use the fake ID for local mock mode).
   - `VITE_GOOGLE_LOGIN_MOCK` / `VITE_FAKE_GOOGLE_CREDENTIAL` – enable the fake Google flow when offline.
3. Use `.env.frontend-mock` or `.env.backend` for per-mode overrides if required.

## Auth modes & dev servers

Two npm scripts launch the UI in different auth modes:

- `npm run dev:mock` – starts Vite in the `frontend-mock` mode, using only local fake services.
- `npm run dev:backend` – starts Vite in the `backend` mode and proxies auth requests to the login API configured in `.env`.

Both commands serve the app at `http://localhost:5173`. When the chat service is unreachable, the in-app chat panel disables itself and shows a status message.

## Common npm scripts

| Command | Description |
| --- | --- |
| `npm run dev:mock` | Launches Vite with mocked auth flows. |
| `npm run dev:backend` | Launches Vite with backend-auth mode (requires login API). |
| `npm run build` | Type-checks and emits production assets into `dist/`. |
| `npm run preview` | Serves the production build for smoke testing. |
| `npm run test` | Executes the Vitest unit suite once (same as `test:unit`). |
| `npm run lint` | Runs ESLint across `src/`. |
| `npm run test:watch` | Executes Vitest in watch mode; append `-- --run` for single-run. |

## Folder Highlights

- `src/components/` – Shared UI components (buttons, layout, chat widgets).
- `src/pages/` – Route-level screens such as the landing page and lobby.
- `src/context/` and `src/hooks/` – Auth context provider (`AuthContext.shared.ts`) and `useAuthContext()` hook.
- `src/services/` – HTTP clients for the login and chat APIs.

## Integration tips

- The login flow expects a session cookie (`session_token` by default) issued by the login API. When running everything locally, start the full stack with `npm run dev:stack` from the repo root.
- The chat client (`src/services/chat/httpClient.ts`) injects `x-user-id` and `x-user-name` headers based on the authenticated session; ensure the login API is issuing user IDs before attempting chat operations.
- Update environment variables whenever backend URLs or credentials change to keep the frontend in sync.
