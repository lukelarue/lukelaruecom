# LukeLaRue Gaming Platform

Full-stack prototype for the LukeLaRue gaming experience. The monorepo houses a React frontend, Express-based login and chat APIs, and shared tooling for local development against Firestore. This README is divided into production operations guidance and a developer-focused guide.

## Production Operations

### Architecture
- **Web frontend** Vite build stored in a Cloud Storage bucket fronted by Cloud CDN. Requests hit `lukelarue.com` via Cloudflare before reaching the Google HTTPS load balancer.
- **Login API** Node.js service packaged with the repo Dockerfile, deployed to Cloud Run, persisting sessions to Firestore and issuing cookies.
- **Chat API** Node.js service packaged with the repo Dockerfile, deployed to Cloud Run, storing channel metadata and messages in Firestore.
- **Firestore** Native-mode database in the selected GCP region serving both APIs.
- **Secret Manager** Holds sensitive values such as `SESSION_JWT_SECRET` and OAuth credentials.
- **Artifact Registry & Cloud Build/GitHub Actions** Store and publish Docker images for both APIs before Cloud Run deployment.
- **Cloudflare DNS** Authoritative for `lukelarue.com`, routing apex and subdomains to Google-managed HTTPS endpoints.

### Terraform Infrastructure Setup
1. Enable required Google APIs (`run.googleapis.com`, `artifactregistry.googleapis.com`, `firestore.googleapis.com`, `secretmanager.googleapis.com`, `iamcredentials.googleapis.com`).
2. Provision Firestore in native mode and desired location (`google_firestore_database`).
3. Create Artifact Registry repositories for `login-api` and `chat-api` container images.
4. Create service accounts for deploy automation and each runtime, granting roles such as `roles/run.invoker`, `roles/run.admin`, `roles/firestore.user`, `roles/secretmanager.secretAccessor`, and `roles/logging.logWriter` as appropriate.
5. Manage secrets in Secret Manager for session JWT secret, Google OAuth client ID/secret, and any third-party tokens (`google_secret_manager_secret` + versions).
6. Define Cloud Run services for both APIs (`google_cloud_run_service`), pointing to Artifact Registry images, referencing secrets via environment variables, and locking ingress to HTTPS.
7. Provision the frontend hosting stack: Cloud Storage bucket for static assets plus Cloud CDN behind a HTTPS load balancer (`google_compute_backend_bucket`, `google_compute_url_map`, `google_compute_target_https_proxy`, `google_compute_managed_ssl_certificate`).
8. Configure Cloudflare DNS records (`cloudflare_record`) for apex `lukelarue.com` and API subdomains (`login-api.lukelarue.com`, `chat-api.lukelarue.com`) targeting the Google HTTPS load balancer IP or Cloud Run custom domain records.
9. Establish workload identity federation for CI/CD (`google_iam_workload_identity_pool` and provider) so GitHub Actions can assume deploy roles without long-lived keys.

### Deployment Workflow
- **Build & publish** GitHub Actions (or Cloud Build) run `docker build` for `services/login-api` and `services/chat-api`, push to Artifact Registry, and deploy to Cloud Run with immutable tags.
- **Frontend release** Build Vite assets (`npm --workspace apps/web run build`), then upload the `apps/web/dist` output to the production storage bucket and invalidate Cloud CDN as needed.
- **Secret rotation** Update Secret Manager versions and redeploy Cloud Run revisions to pick up new values.
- **DNS validation** Map custom domains to Cloud Run (upload TXT verification if required) before pointing Cloudflare records.
- **Smoke tests** Call `GET /healthz` on both APIs and complete the sign-in and chat flows through the production frontend after each deploy.

### Production Environment Variables
- **Frontend (`apps/web/.env.production`)**
  ```env
  VITE_LOGIN_API_BASE_URL=https://login-api-226428490565.us-central1.run.app
  VITE_CHAT_API_BASE_URL=https://chat-api-226428490565.us-central1.run.app
  VITE_GOOGLE_CLIENT_ID=226428490565-rj7bibt60n6errq7fp29utte133s8osc.apps.googleusercontent.com
  VITE_GOOGLE_LOGIN_MOCK=false
  ```
- **Login API (`services/login-api` Cloud Run env)**
  ```env
  NODE_ENV=production
  PORT=8080
  WEB_APP_ORIGINS=https://lukelarue.com
  GCP_PROJECT_ID=parabolic-env-456611-q9
  GOOGLE_CLIENT_ID=226428490565-rj7bibt60n6errq7fp29utte133s8osc.apps.googleusercontent.com
  SESSION_COOKIE_NAME=session_token
  SESSION_JWT_SECRET=projects/<project>/secrets/session-jwt-secret/versions/latest
  SESSION_EXPIRES_IN=604800
  USE_FIRESTORE_EMULATOR=false
  USE_FAKE_GOOGLE_AUTH=false
  ```
  `SESSION_JWT_SECRET` should reference a Secret Manager value; other credentials can be injected the same way.
- **Chat API (`services/chat-api` Cloud Run env)**
  ```env
  NODE_ENV=production
  PORT=8080
  WEB_APP_ORIGINS=https://lukelarue.com
  GCP_PROJECT_ID=parabolic-env-456611-q9
  USE_FIRESTORE_EMULATOR=false
  DEFAULT_CHANNEL_HISTORY_LIMIT=50
  ```
  Secret Manager bindings can be added for additional configuration as needed.

## Developer Guide

### Workspaces
- **`apps/web/`** Vite + React UI. See `apps/web/README.md` for component, hook, and routing details.
- **`services/login-api/`** Auth service providing Google sign-in, session cookies, and user persistence. Docs in `services/login-api/README.md`.
- **`services/chat-api/`** Chat service exposing message and channel endpoints. Docs in `services/chat-api/README.md`.

### Prerequisites
- **Node.js 22 and npm 10** Enforced via the root `package.json` engines field.
- **Firebase CLI** `npx firebase --version` for the Firestore emulator.
- **Google OAuth client ID (optional)** Required when disabling fake auth locally.

### Getting Started
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

### Local Development

| Command | Purpose |
| --- | --- |
| `npm run dev:stack` | Start Firestore, both APIs, and the frontend in backend-auth mode. |
| `npm run dev:backend` | Start Firestore plus both APIs (no frontend). |
| `npm run dev:frontend:mock` | Serve the frontend with mocked auth for UI work. |
| `npm run dev:frontend:backend` | Serve the frontend pointed at the login API. |
| `npm run dev:login` / `npm run dev:chat` | Run each API with its emulator helpers. |
| `npm run dev:firestore` | Launch only the shared Firestore emulator. |

Each workspace README documents additional scripts, watch modes, and operational notes.

### Testing & Linting

| Command | Scope |
| --- | --- |
| `npm run test:unit` | Run unit tests for frontend, login API, and chat API sequentially. |
| `npm run test:integration` | Run integration suites across all workspaces. |
| `npm run test:all` | Execute all unit + integration tests. |
| `npm run lint` | Run ESLint across workspaces. |

Per-workspace watch modes live in their respective READMEs.

### Environment Tips
- **Frontend auth modes** Prefer `npm run dev:frontend:*` scripts instead of toggling `VITE_AUTH_MODE` manually.
- **Login API fake Google auth** Enabled by default; set real credentials and disable `USE_FAKE_GOOGLE_AUTH` when testing production flows.
- **Chat UI fallback** Disables itself when the chat API is unreachable, surfacing a "chat disabled" status.

### Application Routes
- **`/`** Marketing landing page with Google sign-in entry.
- **`/lobby`** Authenticated lobby view.
- **`/profile`** Profile preview derived from the active session.

### Continuous Integration
- **GitHub Actions** Run linting plus unit and integration suites on push.
- **Local parity** Reproduce CI checks with `npm run lint` and `npm run test:all` before pushing.

### Additional Documentation
- **`apps/web/README.md`** Frontend architecture, scripts, and integration tips.
- **`services/login-api/README.md`** Auth API environment variables and HTTP contract.
- **`services/chat-api/README.md`** Chat API configuration, endpoints, and data model.
