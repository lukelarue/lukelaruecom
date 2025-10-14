# LukaLarue Gaming Platform

This repository contains a full-stack web platform prototype for a gaming website. It includes a React frontend, Node.js backend, and Terraform infrastructure for deploying on Google Cloud Platform. Future iterations will add multi-game experiences and real-time features.

## Local Authentication Service Development

- **Prerequisites**
  - Node.js 22+
  - `npm install` inside `services/api`
  - Firebase CLI (`npx firebase --version`) for the Firestore emulator

- **Environment**
  - Copy `.env.example.api` to `.env` under `services/api/` and tweak as needed.
  - The example config enables the Firestore emulator and fake Google auth so the service runs fully offline.

- **Running the stack**
  ```bash
  cd services/api
  npm install
  npm run dev
  ```
  The script launches the Firestore emulator on `localhost:8080`, the emulator UI on `http://localhost:4001`, and the API on `http://localhost:4000`.

- **Sample requests**
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

- **Production**
  - Keep Terraform-managed resources and replace the dev flags (`USE_FIRESTORE_EMULATOR`, `USE_FAKE_GOOGLE_AUTH`) with production values.
  - Provide a real `GOOGLE_CLIENT_ID`, `GCP_PROJECT_ID`, and `SESSION_JWT_SECRET` in the hosted environment.

## Local Frontend (Web App) Development

- **Prerequisites**
  - Node.js 22+
  - `npm install` inside the repository root (installs all workspace dependencies)

- **Environment**
  - Copy `apps/web/.env.example` to `apps/web/.env`.
  - For the fake auth flow, set `VITE_GOOGLE_CLIENT_ID=fake-google-client-id` (matches the API default).

- **Running the web app**
  ```bash
  npm run dev --workspace apps/web
  ```
  - Vite serves the UI at [http://localhost:5173](http://localhost:5173).
  - The dev server proxies `/api` requests to `http://localhost:4000`, so keep the API running for login features.

- **Available routes**
  - `/` – Marketing-style landing page with Google Sign-In widget.
  - `/lobby` – Protected lobby shell (requires session).
  - `/profile` – Profile preview sourced from the authenticated session.

## Full-Stack Development Loop

- **Install once**
  ```bash
  npm install
  ```

- **Terminal 1 – API + emulator**
  ```bash
  npm run dev --workspace services/api
  ```

- **Terminal 2 – Frontend**
  ```bash
  npm run dev --workspace apps/web
  ```

- **Access**
  - API available at `http://localhost:4000` (Firestore emulator on `localhost:8080`).
  - UI available at `http://localhost:5173` with live reload and API proxying in place.

## Authentication Linting

- **Run ESLint once**
  ```bash
  npm run lint --workspace services/api
  ```
  Executes the same checks as CI using `tsconfig.eslint.json` for type-aware rules.

- **Auto-fix what can be fixed**
  ```bash
  npm run lint --workspace services/api -- --fix
  ```
  Applies safe fixes locally (CI still runs the non-fix command).

## Authentication Unit Testing Strategy

- **Purpose**
  - Document the regression coverage for the Google login flow under `services/api`.
  - Ensure request validation, happy-path authentication, and failure handling behave consistently.
- **Tooling**
  - Uses [Vitest](https://vitest.dev/) with TypeScript support. Install deps via `npm install` inside `services/api/` after pulling new changes.
- **Scope**
  - `services/api/src/controllers/__tests__/authController.test.ts` targets `loginWithGoogle()`.
  - Mocks `verifyGoogleIdToken`, Firestore reads/writes, and `jsonwebtoken` signing to isolate controller logic.
- **Key Assertions**
  - Invalid payloads return HTTP 400 with validation feedback.
  - Successful logins upsert the user, set the session cookie, and respond with the user profile snapshot.
  - Downstream failures (e.g., Google verification errors) surface as HTTP 401 without mutating cookies.
- **Running the suite**
  - `npm test --workspace services/api` runs the unit tests once.
  - `npm run test:watch --workspace services/api` keeps Vitest in watch mode during development.

## Authentication Offline Integration Strategy

- **Purpose**
  - Validate end-to-end behavior of the login flow against the Firestore emulator with fake Google auth.
  - Exercise request routing, persistence, and cookie/session handling in combination.
- **Tooling**
  - Relies on the Firebase Firestore emulator (`firebase-tools`) and Vitest + Supertest for HTTP assertions.
- **Environment**
  - Ensure `.env` in `services/api/` has `USE_FIRESTORE_EMULATOR=1` and `USE_FAKE_GOOGLE_AUTH=1` (already present in `.env.example.api`).
  - Start the Firestore emulator once via `npm run dev:emulator --workspace services/api` (keeps the emulator running without launching the API server).
- **Test location**
  - `services/api/src/__tests__/auth.integration.test.ts` covers the happy-path login and repeated login timestamp updates.
  - The suite seeds credentials by passing JSON payloads accepted by the fake Google auth flag.
- **Execution**
  - Run `npm run test:integration --workspace services/api` after the emulator is listening.
  - Optionally, run `npm run dev:emulator --workspace services/api` in one terminal and `npm run test:integration --workspace services/api` in another for iterative development.
- **Assertions**
  - Confirms session cookies are issued and reused between `/auth/google` and `/auth/session` requests.
  - Verifies user documents are created and updated inside the emulator with consistent timestamps.
