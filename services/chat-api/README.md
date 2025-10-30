# Chat API Service

This package (`services/chat-api/`) provides chat capabilities for the LukeLaRue platform. It enforces per-channel access rules, persists messages to Firestore, and exposes REST endpoints for listing channels and fetching message history. Repository-wide setup instructions live in the root `README.md`.

## Prerequisites

- Node.js 22 (per workspace engines) and npm 10+
- Firestore emulator (`firebase-tools`) for local development
- Login API service issuing user IDs for authenticated requests
- Dependencies installed via `npm install` at the repo root (covers this workspace)

## Environment variables

- **`PORT`**: HTTP port (default `4100`).
- **`GCP_PROJECT_ID`**: Firestore project ID (`demo-firestore` when emulator is active).
- **`WEB_APP_ORIGINS`**: Comma-separated list of allowed CORS origins (default `http://localhost:5173`).
- **`USE_FIRESTORE_EMULATOR`**: Enables Firestore emulator (default `true`).
- **`FIRESTORE_EMULATOR_HOST`**: Host:port of the emulator (`127.0.0.1:8080`).
- **`DEFAULT_CHANNEL_HISTORY_LIMIT`**: Default number of messages returned when no limit is provided (default `50`, capped at `200`).

Copy `.env.example.chat-api` to `.env` to start with local defaults.

## Local development

| Command | Description |
| --- | --- |
| `npm run dev:chat` | Start Firestore (emulator) and the API at `http://localhost:4100`. |
| `npm run dev:chat:api` | Start only the API when an emulator is already running. |
| `npm --workspace services/chat-api run dev` | Workspace-local equivalent to `npm run dev:chat`. |
| `npm --workspace services/chat-api run build` | Compile TypeScript via `tsc`. |

## Testing

| Command | Description |
| --- | --- |
| `npm run test:unit:chat` | Execute the workspace unit suite from the repo root. |
| `npm run test:integration:chat` | Execute the workspace integration suite from the repo root. |
| `npm --workspace services/chat-api run test:watch` | Run unit tests in watch mode. |
| `npm --workspace services/chat-api run test:integration:watch` | Run integration tests in watch mode. |

### Docker-based testing

| Command | Description |
| --- | --- |
| `docker build -f services/chat-api/Dockerfile -t chat-api:local services/chat-api` | Build the production image deployed to Cloud Run. |
| `docker build --target tester -f services/chat-api/Dockerfile -t chat-api:tester services/chat-api` | Build the tester image with Vitest and emulator prerequisites. |
| `docker run --rm --entrypoint bash chat-api:tester -lc "npm run test:unit"` | Execute the unit suite inside the tester image. |
| `docker run --rm --entrypoint bash chat-api:tester -lc "npx firebase emulators:exec --only firestore 'npm run test:integration'"` | Run integration tests against an emulator inside the container. |

## Authentication requirements

All chat routes sit behind middleware that expects headers:

- `x-user-id`: Required, identifies the authenticated user.
- `x-user-name`: Optional, used for display names in stored messages.

Requests without `x-user-id` receive `401 Missing authentication header`.

## HTTP endpoints

### `GET /healthz`
- **Purpose**: Liveness probe. Returns `{ "status": "ok", "timestamp": ISO8601 }`.
- **Auth**: None.

### `POST /chat/messages`
- **Auth**: Requires `x-user-id` header.
- **Body schema**:
  ```json
  {
    "channelType": "global" | "direct" | "game",
    "body": "<string 1-2000 chars>",
    "metadata": { "..." },
    "senderDisplayName": "<string 1-120 chars>",
    "scope": "<string>",
    "participantIds": ["user-a", "user-b"],
    "gameId": "<string>"
  }
  ```
- **Channel rules**:
  - `global`: Optional `scope`, default `default`.
  - `direct`: `participantIds` must include exactly two distinct IDs including the sender; the API adds the sender if omitted.
  - `game`: Requires `gameId`.
- **Success (201)**: `{ "message": { id, channelId, channelType, senderId, senderDisplayName, body, metadata, createdAt, updatedAt } }`.
- **Validation (400)**: Includes details whenever payload is invalid. Access errors (e.g., bad participants) bubble through as `500` with `message: "Chat router error"`.

### `GET /chat/messages`
- **Auth**: Requires `x-user-id` header.
- **Query parameters**:
  - `channelId`: Fetch by explicit channel ID (`direct:user-a--user-b`, etc.). Respects access checks.
  - `channelType`: One of `global`, `direct`, `game`. When provided:
    - `global`: Optional `scope`.
    - `direct`: `participantIds` is required (comma-separated or repeated query param).
    - `game`: `gameId` is required.
  - `limit`: Optional positive integer, capped at `200`. Defaults to `DEFAULT_CHANNEL_HISTORY_LIMIT`.
- **Success (200)**: `{ "messages": [ ...ChatMessageRecord ] }` sorted oldest-first.
- **Validation (400)**: Returns descriptive message for invalid parameters or unauthorized channel access.

### `GET /chat/channels`
- **Auth**: Requires `x-user-id` header.
- **Response (200)**:
  ```json
  {
    "channels": [
      {
        "channelId": "direct:user-a--user-b",
        "channelType": "direct",
        "metadata": { "participantIds": ["user-a", "user-b"] }
      }
    ]
  }
  ```
  Only channels accessible to the caller are returned. Global and game channels include metadata built from their descriptors.

## Data model

- **Firestore collection**: `chatMessages`
- **Document fields**: `id`, `channelId`, `channelType`, `senderId`, `senderDisplayName`, `body`, `metadata`, `createdAt`, `updatedAt`.
- **Indexing**: Queries filter on `channelId` and order by `createdAt` descending to fetch recent history.

## Operational notes

- Message store enforces a max returned history of `200` messages per request.
- Channel IDs follow patterns:
  - `global:<scope>` (scope lower-cased, default `global:default`).
  - `direct:<user-a>--<user-b>` with sorted participant IDs.
  - `game:<gameId>`.
- Error handler returns `500 Chat router error` when descriptor construction fails (server logs contain root cause).
- Combine with the login API so the frontend can propagate `x-user-id`/`x-user-name` headers based on authenticated sessions.
