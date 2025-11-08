# Login API Service

This package (`services/login-api/`) exposes authentication endpoints for the LukeLaRue platform. It exchanges Google ID tokens for sessions, persists user profiles to Firestore, and issues HTTP-only cookies consumed by the frontend. Repository-wide setup steps live in the root `README.md`.

## HTTP endpoints

- **Base paths**
  - All auth routes are available under both of these base paths:
    - `/auth`
    - `/login-api/auth`
  - Health is also available at both `/healthz` and `/login-api/healthz`.

### `GET /healthz` and `GET /login-api/healthz`
- **Purpose**: Liveness probe. Returns `{ "status": "ok", "timestamp": "<ISO8601>" }`.
- **Auth**: None.

### `POST {base}/google`
- **Body**
  ```json
  {
    "credential": "<Google ID token or fake JSON string>"
  }
  ```
- **Success (200)**: `{ "user": { id, email, name, pictureUrl?, createdAt, lastLoginAt } }` and sets the session cookie.
- **Validation (400)**: `message: "Invalid request"` with `issues` from `zod`.
- **Auth failure (401)**: `message: "Authentication failed"`.

### `GET {base}/session`
- **Auth**: Requires valid session cookie.
- **Success (200)**: `{ "user": { ...profile } }`.
- **Missing/invalid cookie (401)**: Clears cookie when user doc missing; returns `"Not authenticated"` or `"Session no longer valid"`.
- **Server error (500)**: `message: "Failed to fetch session"`.

### `POST {base}/signout`
- **Auth**: Requires session cookie; succeeds even if already cleared.
- **Success (204)**: No body. Clears the session cookie.

## Data model

- **Firestore collection**: `users`
- **Document ID**: Google user ID.
- **Fields**: `email`, `name`, `pictureUrl`, `createdAt`, `lastLoginAt`.

## Operational notes

- **Cookies**: `httpOnly`, `sameSite=lax`, `secure` in production; name configurable via `SESSION_COOKIE_NAME` (default `session_token`).
- **JWT**: Signed with `SESSION_JWT_SECRET`; expires after `SESSION_EXPIRES_IN` seconds.
- **CORS**: Allowed origins come from `WEB_APP_ORIGINS`; credentials are enabled.
- **Fake Google Auth**: When `USE_FAKE_GOOGLE_AUTH=true`, the service accepts a JSON string in `credential` and constructs a deterministic profile for local testing.

## Development

### Prerequisites

- Node.js 22 and npm 10+
- Firestore emulator via `firebase-tools`
- Install repo dependencies from the repo root: `npm install`

### Environment variables (local/dev)

- **`PORT`**: HTTP port (default `4000`).
- **`WEB_APP_ORIGINS`**: Comma-separated CORS origins (default `http://localhost:5173`).
- **`GCP_PROJECT_ID`**: Firestore project ID. Defaults to `demo-firestore` when emulator is enabled.
- **`USE_FIRESTORE_EMULATOR`**: Enable Firestore emulator (suggested for local dev).
- **`FIRESTORE_EMULATOR_HOST`**: Emulator host:port (`localhost:8080`).
- **`USE_FAKE_GOOGLE_AUTH`**: When `true`, bypass Google verification and allow fake credentials.
- **`GOOGLE_CLIENT_ID`**: OAuth client ID. Optional when `USE_FAKE_GOOGLE_AUTH=true`.
- **`SESSION_COOKIE_NAME`**: Name of the session cookie (default `session_token`).
- **`SESSION_JWT_SECRET`**: Secret used to sign session tokens. Required unless `USE_FAKE_GOOGLE_AUTH=true` (falls back to `dev-session-secret`).
- **`SESSION_EXPIRES_IN`**: Session TTL in seconds (default one week).

Example `.env` for local dev:

```ini
PORT=4000
WEB_APP_ORIGINS=http://localhost:5173
GCP_PROJECT_ID=demo-firestore
USE_FIRESTORE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=localhost:8080
USE_FAKE_GOOGLE_AUTH=true
GOOGLE_CLIENT_ID=fake-google-client-id
SESSION_JWT_SECRET=dev-session-secret
SESSION_EXPIRES_IN=604800
SESSION_COOKIE_NAME=session_token
```

### Local development

| Command | Description |
| --- | --- |
| `npm run dev:login` | Start Firestore (emulator) and the API at `http://localhost:4000`. |
| `npm run dev:login:api` | Start only the API when an emulator is already running. |
| `npm --workspace services/login-api run dev` | Workspace-local equivalent to `npm run dev:login`. |
| `npm --workspace services/login-api run build` | Compile TypeScript via `tsc`. |

### Testing

| Command | Description |
| --- | --- |
| `npm run test:unit:login` | Execute the workspace unit suite from the repo root. |
| `npm run test:integration:login` | Execute the workspace integration suite from the repo root. |
| `npm --workspace services/login-api run test:watch` | Run unit tests in watch mode. |
| `npm --workspace services/login-api run test:integration:watch` | Run integration tests in watch mode. |

### Docker commands

| Command | Description |
| --- | --- |
| `docker build -f services/login-api/Dockerfile -t login-api:local services/login-api` | Build the production image deployed to Cloud Run. |
| `docker build --target tester -f services/login-api/Dockerfile -t login-api:tester services/login-api` | Build the tester image with Vitest and emulator prerequisites. |
| `docker run --rm --entrypoint bash login-api:tester -lc "npm run test:unit"` | Execute the unit suite inside the tester image. |
| `docker run --rm --entrypoint bash login-api:tester -lc "npx firebase emulators:exec --only firestore 'npm run test:integration'"` | Run integration tests against an emulator inside the container. |
| `docker run --rm -p 8080:8080 -e NODE_ENV=production -e GCP_PROJECT_ID=<your-project> -e GOOGLE_CLIENT_ID=<client-id> -e SESSION_JWT_SECRET=<secret> login-api:local` | Run the production image locally (Cloud Run-compatible). |

## Production environment variables

These are injected by Terraform into the Cloud Run service defined in `infra/cloud_run.tf` (defaults in `infra/variables.tf`).

| Name | Where defined | Effective value (default) | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `infra/cloud_run.tf` (env) | `production` | Static literal. |
| `WEB_APP_ORIGINS` | `infra/cloud_run.tf` from `var.web_app_origins` | `https://lukelarue.com,https://www.lukelarue.com` | Comma-joined list. |
| `GCP_PROJECT_ID` | `infra/cloud_run.tf` from `var.project_id` | `parabolic-env-456611-q9` | Your production GCP Project ID. |
| `SESSION_COOKIE_NAME` | `infra/cloud_run.tf` from `var.login_api_session_cookie_name` | `session_token` | Cookie name. |
| `SESSION_EXPIRES_IN` | `infra/cloud_run.tf` from `var.login_api_session_expires_in` | `604800` | One week in seconds. |
| `SESSION_JWT_SECRET` | Secret Manager `login-api-session-signing-key` (key version from `var.login_api_session_signing_key_version`) | a random signing key in Secret Manager | Value is secret; not in Terraform state. |
| `GOOGLE_CLIENT_ID` | `infra/cloud_run.tf` from `var.login_api_google_client_id` | e.g. a Google OAuth client ID | Not secret but managed as Terraform variable. |
| `GOOGLE_CLIENT_SECRET` | Secret Manager `google-oauth-client-secret:latest` | a Google OAuth client secret | Value is secret; not in Terraform state. |
| `USE_FIRESTORE_EMULATOR` | `infra/cloud_run.tf` from `var.login_api_use_firestore_emulator` | `false` | Should remain `false` in prod. |
| `USE_FAKE_GOOGLE_AUTH` | `infra/cloud_run.tf` from `var.login_api_use_fake_google_auth` | `false` | Must be `false` in prod. |
| `PORT` | Cloud Run runtime | `8080` | Provided by Cloud Run; not set in Terraform. |

## Authentication requirements

- Clients must send/receive the HTTP-only session cookie (`SESSION_COOKIE_NAME`).
- CORS must allow credentials from the frontend origin(s) defined in `WEB_APP_ORIGINS`.
- The frontend uses `withCredentials=true` on requests to this API.
