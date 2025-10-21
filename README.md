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

- `npm run dev:frontend:mock`
  - Boots the frontend UI in mock auth mode with no backend dependencies.
- `npm run dev:frontend:backend`
  - Boots the frontend UI in backend-auth mode, proxying to the login API configured in `apps/web/.env`.
- `npm run dev:login`
  - Starts the login API with its Firestore emulator.
- `npm run dev:chat`
  - Starts the chat API with its Firestore emulator.
- `npm run dev:firestore`
  - Starts only the shared Firestore emulator for service integration tests.
- `npm run dev:backend`
  - Boots the shared Firestore emulator once, then starts the login and chat APIs.
- `npm run dev:stack`
  - Runs `dev:backend` plus the backend-auth frontend for a full local stack.

### Unified test commands

- `npm run test:unit:frontend`
  - Executes the frontend unit test suite via Vitest.
- `npm run test:unit:login`
  - Executes the login API unit test suite.
- `npm run test:unit:chat`
  - Executes the chat API unit test suite.
- `npm run test:unit`
  - Runs all unit tests sequentially across workspaces.
- `npm run test:integration:frontend`
  - Executes the frontend integration test suite.
- `npm run test:integration:login`
  - Executes the login API integration test suite.
- `npm run test:integration:chat`
  - Executes the chat API integration test suite.
- `npm run test:integration`
  - Runs all integration tests sequentially across workspaces.
- `npm run test:all`
  - Runs all unit and integration tests.

### Unified linting command

- `npm run lint`
  - Runs ESLint in each workspace.

### Frontend UI (`apps/web/`)

- **Dev servers**
  ```bash
  npm run dev:frontend:mock
  npm run dev:frontend:backend
  ```
  - `dev:frontend:mock` launches Vite in `frontend-mock` mode with no backend dependency.
  - `dev:frontend:backend` serves the UI on `http://localhost:5173` and talks to the login API proxy at `http://localhost:4000`.
- **Unit tests**
  ```bash
  npm run test:unit --workspace apps/web
  npm run test:watch --workspace apps/web
  ```
  - Run-once versus watch mode for files under `src/__tests__/unit/`.
- **Integration tests**
  ```bash
  npm run test:integration --workspace apps/web
  npm run test:integration:watch --workspace apps/web
  ```
  - Covers scenarios in `src/__tests__/integration/` that exercise the app with mocked services.
- **Linting**
  ```bash
  npm run lint --workspace apps/web
  npm run lint --workspace apps/web -- --fix
  ```

### Login API (`services/login-api/`)

- **Dev servers**
  ```bash
  npm run dev:login
  npm run dev:login:api
  ```
  - `dev:login` boots the Firestore emulator (`localhost:8080`), emulator UI (`http://localhost:4001`), and login API (`http://localhost:4000`).
  - Use `dev:login:api` when another process already launched the emulator.
- **Unit tests**
  ```bash
  npm run test:unit --workspace services/login-api
  npm run test:watch --workspace services/login-api
  ```
  - Executes `src/__tests__/unit/**/*.unit.test.ts` with mocked dependencies.
- **Integration tests**
  ```bash
  npm run test:integration --workspace services/login-api
  npm run test:integration:watch --workspace services/login-api
  ```
  - Runs emulator-backed suites in `src/__tests__/integration/**/*.integration.test.ts`. To only start the emulator:
    ```bash
    npm run dev:firestore
  ```
- **Linting**
  ```bash
  npm run lint --workspace services/login-api
  npm run lint --workspace services/login-api -- --fix
  ```

### Chat API (`services/chat-api/`)

- **Dev servers**
  ```bash
  npm run dev:chat
  npm run dev:chat:api
  ```
  - `dev:chat` starts the chat API (`http://localhost:4100`) and Firestore emulator (`127.0.0.1:8080`).
  - Use `dev:chat:api` when an external process already launched the emulator.
- **Unit tests**
  ```bash
  npm run test:unit --workspace services/chat-api
  npm run test:watch --workspace services/chat-api
  ```
  - Targets `src/__tests__/unit/**/*.unit.test.ts` via `vitest.unit.config.ts`.
- **Integration tests**
  ```bash
  npm run test:integration --workspace services/chat-api
  npm run test:integration:watch --workspace services/chat-api
  ```
  - Uses `src/__tests__/integration/**/*.integration.test.ts` with the Firestore emulator.
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

- Avoid hard-coding `VITE_AUTH_MODE` in `apps/web/.env`; use the appropriate `npm run dev:frontend:*` command instead.
- `.env.frontend-mock` and `.env.backend` offer per-mode overrides when needed.
- For login-API-only debugging, run `npm run dev:firestore` to keep the Firestore emulator up without the server.

## Application Routes

- `/` – Marketing-style landing page with Google Sign-In widget.
- `/lobby` – Protected lobby shell (requires session).
- `/profile` – Profile preview sourced from the authenticated session.

## Continuous integration

- CI runs linting, unit tests, and integration tests using the commands above.
- Match the local commands before pushing to ensure parity with the pipeline.
