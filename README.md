# LukeLaRue Gaming Platform

This repository contains a full-stack web platform prototype for a gaming website. It includes a React frontend, Node.js backend, and Terraform infrastructure for deploying on Google Cloud Platform. Future iterations will add multi-game experiences and real-time features.

## Monorepo Workspaces

- **Frontend UI (`apps/web/`)** – Vite/React client with mocked and API-backed auth modes. The chat bar disables itself with a "chat disabled" notice when it cannot reach the chat backend.
- **Login API (`services/login-api/`)** – Express server handling Google auth, session cookies, and Firestore persistence.
- **Chat API (`services/chat-api/`)** – Express server exposing chat endpoints backed by Firestore.

## Installation & Environment Setup

- **Prerequisites**
  - Node.js 22+
  - Firebase CLI (`npx firebase --version`) for the Firestore emulator

- **Install dependencies**
  ```bash
  npm install
  npm install --workspace services/login-api
  npm install --workspace services/chat-api
  ```

- **Configure login backend (`services/login-api/`)**
  - Copy `.env.example.login-api` to `.env` and adjust as needed.
  - The example config keeps the Firestore emulator and fake Google auth enabled for offline development.

- **Configure frontend (`apps/web/`)**
  - Copy `.env.example` to `.env`.
  - `VITE_LOGIN_API_BASE_URL` should point at `http://localhost:4000` when you are running the full stack locally.
  - `VITE_AUTH_MODE` switches between mock (`frontend-mock`) and login-API-backed (`backend`) auth flows.
  - `VITE_GOOGLE_LOGIN_MOCK` retains an offline Google Sign-In experience even when talking to the login API.
  - For the fake auth flow, set `VITE_GOOGLE_CLIENT_ID=fake-google-client-id` to match the backend default.
  - If the chat API is not running locally, the in-app chat shows "chat disabled" rather than attempting to send messages.

## Quick start: run the full stack

1. **Prepare environment files**
   - Copy `apps/web/.env.example` to `apps/web/.env` and `services/login-api/.env.example.login-api` to `services/login-api/.env`.
   - Ensure `WEB_APP_ORIGINS=http://localhost:5173` in the login API `.env` and `VITE_LOGIN_API_BASE_URL=http://localhost:4000` in the frontend `.env`.
2. **Install dependencies** (once per clone):
   ```bash
   npm install
   npm install --workspace services/login-api
   npm install --workspace services/chat-api
   ```
3. **Start everything**
   ```bash
   npm run dev:stack
   ```
   - Spawns the login and chat APIs (ports `4000` and `4100`) plus the frontend in backend-auth mode on `http://localhost:5173`.
4. **Sign in** via the landing page to create a mock Google session and reach the lobby.

## Workspace Command Reference

### Unified development commands

- `npm run dev:backend`
  - Boots the shared Firestore emulator/UI once, then starts the login API (`http://localhost:4000`) and chat API (`http://localhost:4100`).
- `npm run dev:stack`
  - Runs `dev:backend` plus the frontend in backend mode (`http://localhost:5173`).

### Frontend UI (`apps/web/`)

- **Dev servers**
  ```bash
  npm run dev:web:mock
  npm run dev:web:backend
  ```
  - `dev:web:mock` launches Vite in `frontend-mock` mode with no backend dependency.
  - `dev:web:backend` talks to the login API proxy at `http://localhost:4000` (serve UI on `http://localhost:5173`). Keep frontend and backend in separate terminals.
- **Unit tests**
  ```bash
  npm run test --workspace apps/web -- --run --reporter=dot
  npm run test --workspace apps/web
  ```
  - Run-once versus watch mode (press `q` to exit watch).
- **Linting**
  ```bash
  npm run lint --workspace apps/web
  npm run lint --workspace apps/web -- --fix
  ```

### Login API (`services/login-api/`)

- **Dev servers**
  ```bash
  npm run dev --workspace services/login-api
  ```
  - Boots the Firestore emulator (`localhost:8080`), emulator UI (`http://localhost:4001`), and login API (`http://localhost:4000`).
  - When running alongside other services, prefer the root `npm run dev:backend` (or `npm run dev:stack`) so the emulator is started only once.
- **Unit & integration tests**
  ```bash
  npm test --workspace services/login-api
  npm run test:watch --workspace services/login-api
  npm run test:integration --workspace services/login-api
  ```
  - Ensure `USE_FIRESTORE_EMULATOR=true` and `USE_FAKE_GOOGLE_AUTH=true` in `.env` for integration tests. Start the Firestore emulator separately when you only need it:
    ```bash
    npm run dev:emulator --workspace services/login-api
    ```
- **Linting**
  ```bash
  npm run lint --workspace services/login-api
  npm run lint --workspace services/login-api -- --fix
  ```

### Chat API (`services/chat-api/`)

- **Dev servers**
  ```bash
  npm run dev --workspace services/chat-api
  ```
  - Starts the chat API (`http://localhost:4100`) and Firestore emulator (`127.0.0.1:8080`). Set headers `x-user-id` and `x-user-name` when calling the API directly to simulate authenticated users.
  - To avoid port collisions when another service already launched the emulator, start only the API with:
    ```bash
    npm run dev:chat-api --workspace services/chat-api
    ```
  - When the frontend cannot connect to this service, the UI displays "chat disabled" to signal the offline state.
- **Unit tests**
  ```bash
  npm run test:unit --workspace services/chat-api
  ```
- **Integration tests**
  ```bash
  npm run test:integration --workspace services/chat-api
  ```
- **Linting**
  ```bash
  npm run lint --workspace services/chat-api
  npm run lint --workspace services/chat-api -- --fix
  ```

### Sample login API requests (while the backend is running)

```bash
# Login with fabricated Google credentials (JSON payload is optional)
curl -i -X POST http://localhost:4000/auth/google \
  -H "Content-Type: application/json" \
  -d '{"credential":"{\"email\":\"dev-user@example.com\",\"name\":\"Dev User\"}"}' \
  -c cookies.txt

# Fetch current session using the HTTP-only cookie
curl -i http://localhost:4000/auth/session -b cookies.txt

# Sign out
curl -i -X POST http://localhost:4000/auth/signout -b cookies.txt
```

### Environment tips

- Avoid hard-coding `VITE_AUTH_MODE` in `apps/web/.env`; use the appropriate `npm run dev:web:*` command instead.
- `.env.frontend-mock` and `.env.backend` offer per-mode overrides when needed.
- For login-API-only debugging, run `npm run dev:emulator --workspace services/login-api` to keep the Firestore emulator up without the server.

## Application Routes

- `/` – Marketing-style landing page with Google Sign-In widget.
- `/lobby` – Protected lobby shell (requires session).
- `/profile` – Profile preview sourced from the authenticated session.

## Continuous integration

- CI runs linting, unit tests, and integration tests using the commands above.
- Match the local commands before pushing to ensure parity with the pipeline.
