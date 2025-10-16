# LukeLaRue Gaming Platform

This repository contains a full-stack web platform prototype for a gaming website. It includes a React frontend, Node.js backend, and Terraform infrastructure for deploying on Google Cloud Platform. Future iterations will add multi-game experiences and real-time features.

## Installation & Environment Setup

- **Prerequisites**
  - Node.js 22+
  - Firebase CLI (`npx firebase --version`) for the Firestore emulator

- **Install dependencies**
  ```bash
  npm install
  npm install --workspace services/api
  ```

- **Configure backend (`services/api/`)**
  - Copy `.env.example.api` to `.env` and adjust as needed.
  - The example config keeps the Firestore emulator and fake Google auth enabled for offline development.

- **Configure frontend (`apps/web/`)**
  - Copy `.env.example` to `.env`.
  - `VITE_AUTH_MODE` switches between mock (`frontend-mock`) and API-backed (`backend`) auth flows.
  - `VITE_GOOGLE_LOGIN_MOCK` retains an offline Google Sign-In experience even when talking to the API.
  - For the fake auth flow, set `VITE_GOOGLE_CLIENT_ID=fake-google-client-id` to match the backend default.

## Running Locally

### Frontend only (mocked backend)

- Use when you want to iterate on the UI without the API.
- Sessions are stored locally; Google login stays mocked via `VITE_GOOGLE_LOGIN_MOCK`.
- Commands
  ```bash
  npm run dev:web:mock
  ```
  - Launches Vite in `frontend-mock` mode with no API dependency.

### Full stack with mocked Google auth

- Run when you need the frontend and backend together while staying offline.
- The backend launches the Firestore emulator (`localhost:8080`), emulator UI (`http://localhost:4001`), and API (`http://localhost:4000`).
- Commands
  ```bash
  npm run dev --workspace services/api
  ```
  - Starts the API with the emulator and fake Google auth flags enabled.

  ```bash
  npm run dev:web:backend
  ```
  - Starts the frontend in `backend` mode so requests hit the API proxy at `http://localhost:4000`.

- Keep the API and frontend in separate terminals. The UI is served at `http://localhost:5173`.

### Sample API requests (while the backend is running)

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
- For API-only debugging, run `npm run dev:emulator --workspace services/api` to keep the Firestore emulator up without the server.

## Application Routes

- `/` – Marketing-style landing page with Google Sign-In widget.
- `/lobby` – Protected lobby shell (requires session).
- `/profile` – Profile preview sourced from the authenticated session.

## Testing & Quality

### Unit tests

- **Frontend (`apps/web/`)**
  ```bash
  npm run test --workspace apps/web -- --run --reporter=dot
  npm run test --workspace apps/web
  ```
  - The first command runs Vitest once; the second starts watch mode (press `q` to exit).

- **Backend (`services/api/`)**
  ```bash
  npm test --workspace services/api
  npm run test:watch --workspace services/api
  ```
  - Covers `loginWithGoogle()` and related auth controller behavior with mocked dependencies.

### Integration tests (backend)

- Ensure `USE_FIRESTORE_EMULATOR=1` and `USE_FAKE_GOOGLE_AUTH=1` in `services/api/.env`.
- Start the Firestore emulator if it is not already running:
  ```bash
  npm run dev:emulator --workspace services/api
  ```
- Execute the suite:
  ```bash
  npm run test:integration --workspace services/api
  ```
- Tests live in `services/api/src/__tests__/auth.integration.test.ts` and validate end-to-end login, cookie issuance, and Firestore persistence.

### Linting

```bash
npm run lint --workspace services/api
npm run lint --workspace services/api -- --fix
```
- Runs ESLint with type-aware rules; the `--fix` variant applies safe fixes locally.

### Continuous integration

- CI runs linting, unit tests, and integration tests using the commands above.
- Match the local commands before pushing to ensure parity with the pipeline.
