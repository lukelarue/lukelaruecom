# Login API Service

This package (`services/login-api/`) exposes authentication endpoints for the LukeLaRue platform. It exchanges Google ID tokens for sessions, persists user profiles to Firestore, and issues HTTP-only cookies consumed by the frontend. Repository-wide setup steps live in the root `README.md`.

## Prerequisites

- Node.js 22 (per workspace engines) and npm 10+
- Firestore emulator (`firebase-tools`) for local development
- Optional: valid Google OAuth client ID when `USE_FAKE_GOOGLE_AUTH` is disabled
- Dependencies installed via `npm install` at the repo root (covers this workspace)

## Environment variables

- **`PORT`**: HTTP port (default `4000`).
- **`SESSION_COOKIE_NAME`**: Name of the session cookie (default `session_token`).
- **`SESSION_JWT_SECRET`**: Secret used to sign JWT session tokens. Required unless fake auth is enabled.
- **`SESSION_EXPIRES_IN`**: Session TTL in seconds (default one week).
- **`WEB_APP_ORIGINS`**: Comma-separated list of allowed CORS origins (default `http://localhost:5173`).
- **`GOOGLE_CLIENT_ID`**: OAuth client ID. Optional when `USE_FAKE_GOOGLE_AUTH=true`.
- **`GCP_PROJECT_ID`**: Firestore project ID (`demo-firestore` when emulator is active).
- **`USE_FIRESTORE_EMULATOR`**: Enables the Firestore emulator (`true` in `.env.example.login-api`).
- **`FIRESTORE_EMULATOR_HOST`**: Host:port for the emulator (`localhost:8080`).
- **`USE_FAKE_GOOGLE_AUTH`**: Accepts fabricated Google credentials when `true` (default for local dev).

Copy `.env.example.login-api` to `.env` and adjust values for your environment.

## Local development

| Command | Description |
| --- | --- |
| `npm run dev:login` | Start Firestore (emulator), emulator UI, and the API at `http://localhost:4000`. |
| `npm run dev:login:api` | Start only the API when an emulator already exists. |
| `npm --workspace services/login-api run dev` | Workspace-local equivalent to `npm run dev:login`. |
| `npm --workspace services/login-api run build` | Compile TypeScript via `tsc`. |

## Testing

| Command | Description |
| --- | --- |
| `npm run test:unit:login` | Execute the workspace unit suite from the repo root. |
| `npm run test:integration:login` | Execute the workspace integration suite from the repo root. |
| `npm --workspace services/login-api run test:watch` | Run unit tests in watch mode. |
| `npm --workspace services/login-api run test:integration:watch` | Run integration tests in watch mode. |

### Docker-based testing

| Command | Description |
| --- | --- |
| `docker build -f services/login-api/Dockerfile -t login-api:local services/login-api` | Build the production image that Cloud Run will run. |
| `docker build --target tester -f services/login-api/Dockerfile -t login-api:tester services/login-api` | Build the tester image with dev tools (Vitest, Firebase emulator prerequisites). |
| `docker run --rm --entrypoint bash login-api:tester -lc "npm run test:unit"` | Execute the unit suite inside the tester image. |
| `docker run --rm --entrypoint bash login-api:tester -lc "npx firebase emulators:exec --only firestore 'npm run test:integration'"` | Launch the Firestore emulator inside the container and run integration tests against it. |

## Authentication workflow

1. Clients call `POST /auth/google` with a Google ID token (or fake credential) to establish a session.
2. The service verifies the credential, upserts a Firestore user profile, and issues a JWT-backed cookie.
3. Subsequent requests send the HTTP-only cookie (`session_token` by default) to recover the session through `GET /auth/session`.
4. Sessions can be revoked via `POST /auth/signout`, which clears the cookie.

## HTTP endpoints

### `GET /healthz`
- **Purpose**: Liveness probe. Returns `{ "status": "ok", "timestamp": ISO8601 }`.
- **Auth**: None.

### `POST /auth/google`
- **Body**
  ```json
  {
    "credential": "<Google ID token or fake JSON string>"
  }
  ```
- **Success (200)**: `{ "user": { id, email, name, pictureUrl?, createdAt, lastLoginAt } }` and sets session cookie.
- **Validation failures (400)**: `message: "Invalid request"` with `issues` array from `zod` parsing.
- **Auth failure (401)**: `message: "Authentication failed"`.

### `GET /auth/session`
- **Auth**: Requires valid session cookie.
- **Success (200)**: `{ "user": { ...profile } }`.
- **Missing/invalid cookie (401)**: Clears cookie when Firestore lookup fails and responds with `message: "Not authenticated"` or `"Session no longer valid"`.
- **Server error (500)**: `message: "Failed to fetch session"`.

### `POST /auth/signout`
- **Auth**: Requires session cookie; succeeds even if already cleared.
- **Success (204)**: No body. Clears the session cookie.

## Firestore data model

- **Collection**: `users`
- **Document ID**: Google user ID.
- **Fields**: `email`, `name`, `pictureUrl`, `createdAt`, `lastLoginAt`.

## Operational notes

- JWTs are signed with `SESSION_JWT_SECRET` and expire after `SESSION_EXPIRES_IN` seconds.
- Cookies are `httpOnly`, `sameSite=lax`, and `secure` when `NODE_ENV=production`.
- When fake Google auth is enabled, credentials can be any JSON string containing at least `email` and `name`; the verifier injects a deterministic user ID for local testing.
