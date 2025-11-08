# Web Frontend

This package (`apps/web/`) contains the LukeLaRue gaming platform UI built with Vite, React, and TypeScript. It can run fully mocked for design work or connect to the login and chat backends for end-to-end flows. Repository-wide setup steps live in the root `README.md`.

## HTTP endpoints used

- **Base URLs**
  - Login API base URL: from `VITE_LOGIN_API_BASE_URL` (defaults to `/login-api` in production; typically `http://localhost:4000` in local backend mode).
  - Chat API base URL: from `VITE_CHAT_API_BASE_URL` (defaults to `/chat-api`). All chat routes mount under `{chatBase}/chat`.

- **Login**
  - `POST {loginBase}/auth/google` — Exchange Google ID token (or fake JSON in dev) for a session cookie.
  - `GET {loginBase}/auth/session` — Recover current session via cookie.
  - `POST {loginBase}/auth/signout` — Clear the session cookie.

- **Chat**
  - `POST {chatBase}/chat/messages` — Send a message. The client adds `x-user-id` and `x-user-name` from the authenticated session.
  - `GET {chatBase}/chat/messages` — Fetch history by descriptor or `channelId`.
  - `GET {chatBase}/chat/channels` — List accessible channels.
  - `GET {chatBase}/chat/stream?channelId=...` — SSE stream. Because headers can’t be set by `EventSource`, `userId`/`userName` are passed as query params.

## Operational notes

- **Auth & cookies**: The UI relies on an HTTP-only session cookie issued by the login API (`session_token` by default). Requests use `withCredentials` and require CORS to allow credentials.
- **Chat availability**: If the chat API is unreachable, the in-app chat panel disables itself and shows a status message.
- **CORS**: Backends read allowed origins from `WEB_APP_ORIGINS` (see their READMEs). Frontend calls must originate from an allowed domain.
- **Dev proxying**: Vite proxies `/chat-api/*` to `http://localhost:4100` and rewrites the prefix; for login, prefer setting `VITE_LOGIN_API_BASE_URL=http://localhost:4000`.
- **Static hosting**: Production image serves the Vite build via Nginx on port `8080`.

## Development

### Prerequisites

- Node.js 22 and npm 10+
- Optional: running login API (`http://localhost:4000`) and chat API (`http://localhost:4100`) for backend mode
- Install repo dependencies at the root: `npm install`

### Environment variables (local/dev)

- `VITE_GOOGLE_CLIENT_ID` — Google OAuth client ID. Required for a production build; a fake ID is fine locally.
- `VITE_LOGIN_API_BASE_URL` — Login API base URL. Defaults to `/login-api`; set to `http://localhost:4000` for local backend mode.
- `VITE_CHAT_API_BASE_URL` — Chat API base URL. Defaults to `/chat-api` (Vite proxy handles local dev).
- `VITE_AUTH_MODE` — `frontend-mock` or `backend`. Defaults to `frontend-mock` in dev, `backend` in prod. Legacy `VITE_AUTH_MOCK=true|false` is also supported.
- `VITE_GOOGLE_LOGIN_MOCK` — When `true`, bypasses Google and uses a fake credential (defaults to `true` in dev).
- `VITE_FAKE_GOOGLE_CREDENTIAL` — JSON string used in mock login (defaults to `{ "email":"dev-user@example.com","name":"Dev User" }`).

An example file exists: `.env.example`. Typical local backend mode `.env`:

```ini
VITE_GOOGLE_CLIENT_ID=fake-google-client-id
VITE_LOGIN_API_BASE_URL=http://localhost:4000
VITE_CHAT_API_BASE_URL=/chat-api
VITE_AUTH_MODE=backend
VITE_GOOGLE_LOGIN_MOCK=false
```

### Local development

| Command | Description |
| --- | --- |
| `npm run dev:mock` | Start Vite in `frontend-mock` mode (no real backends required). |
| `npm run dev:backend` | Start Vite in `backend` mode. Set `VITE_LOGIN_API_BASE_URL=http://localhost:4000`. |
| `npm run build` | Type-checks and builds the production bundle to `dist/`. |
| `npm run preview` | Serves the production build for smoke testing. |
| `npm run dev:stack` (repo root) | Start login API, chat API, and the emulator together with the frontend backend mode. |

### Testing

| Command | Description |
| --- | --- |
| `npm run test:unit:frontend` (repo root) | Run unit tests. |
| `npm --workspace apps/web run test:watch` | Watch unit tests. |
| `npm --workspace apps/web run test:integration` | Run integration tests. |

### Docker commands

| Command | Description |
| --- | --- |
| `docker build -f apps/web/Dockerfile -t frontend:local --build-arg VITE_GOOGLE_CLIENT_ID=<id> .` | Build the production image (Nginx static site). |
| `docker run --rm -p 8080:8080 frontend:local` | Run the production image locally. |

## Production environment variables

| Name | Where defined | Effective value (default) | Notes |
| --- | --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | `.github/workflows/api-image-publish.yml` as Docker `--build-arg` | A Google OAuth client ID string | Provided via GitHub repository variable. Required for CI build. |
| `VITE_LOGIN_API_BASE_URL` | Not set in CI; code default | `/login-api` | GCLB routes `/login-api/*` to Cloud Run login API (see `infra/load_balancer.tf`). |
| `VITE_CHAT_API_BASE_URL` | Not set in CI; code default | `/chat-api` | GCLB routes `/chat-api/*` to Cloud Run chat API. |
| `VITE_AUTH_MODE` | Not set in CI | `backend` | Defaults based on build mode (prod). |
| `VITE_GOOGLE_LOGIN_MOCK` | Not set in CI | `false` | Mock disabled in prod. |
| `PORT` | Container runtime | `8080` | Nginx listens on 8080 inside the container. |

## Authentication requirements

- UI flows assume a valid session cookie from the login API (`session_token` by default).
- Chat requests include `x-user-id`/`x-user-name` headers derived from the session; SSE subscriptions pass `userId`/`userName` as query params.
- Ensure the login API is issuing user IDs before attempting chat operations.
