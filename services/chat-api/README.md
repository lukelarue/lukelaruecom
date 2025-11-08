# Chat API Service

This package (`services/chat-api/`) provides chat capabilities for the LukeLaRue platform. It exposes REST endpoints (plus an SSE stream) for sending and reading chat messages, enforces per-channel access rules, and persists data to Firestore. Repository-wide setup lives in the root `README.md`.

## HTTP endpoints

- **Base paths**
  - All chat routes are available under both of these base paths:
    - `/chat`
    - `/chat-api/chat`
  - Health is also available at both `/healthz` and `/chat-api/healthz`.

### `GET /healthz` and `GET /chat-api/healthz`
- **Purpose**: Liveness probe. Returns `{ "status": "ok", "timestamp": "<ISO8601>" }`.
- **Auth**: None.

### `POST {base}/messages`
- **Auth**: Requires `x-user-id` header (see Auth requirements below).
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
  - `global`: Optional `scope`, default scope is `default`.
  - `direct`: `participantIds` must resolve to exactly two distinct IDs including the sender; the API will add the sender if omitted.
  - `game`: Requires `gameId`.
- **Success (201)**: `{ "message": { id, channelId, channelType, senderId, senderDisplayName, body, metadata, createdAt, updatedAt } }`.
- **Validation (400)**: Returns issue details when payload is invalid.

### `GET {base}/messages`
- **Auth**: Requires `x-user-id` header.
- **Query options** (either `channelId` OR `channelType` must be provided):
  - `channelId`: Fetch by explicit channel ID (for example `direct:user-a--user-b`). Access is enforced for direct channels.
  - `channelType`: One of `global`, `direct`, `game`.
    - `global`: Optional `scope`.
    - `direct`: `participantIds` is required (comma-separated string or repeated query param).
    - `game`: `gameId` is required.
  - `limit`: Optional positive integer, capped at `200`. Defaults to `DEFAULT_CHANNEL_HISTORY_LIMIT`.
- **Success (200)**: `{ "messages": [ ...ChatMessageRecord ] }` sorted oldest-first.
- **Validation (400)**: Descriptive error for invalid parameters or unauthorized access to a channel.

### `GET {base}/channels`
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
- Only channels accessible to the caller are returned. Global and game channels include metadata based on their descriptors.

### `GET {base}/stream`
- **Auth**: Requires `x-user-id` header. If your transport cannot set headers (e.g., `EventSource`), you may pass `userId` and `userName` as query parameters instead.
- **Query parameters**:
  - `channelId`: Required. The channel to subscribe to.
- **Behavior**: Server-Sent Events (SSE) stream. Immediately sends `: connected` and then publishes JSON chat message records as `data: { ... }\n\n`. Keep-alive comments are sent every ~25s.

## Data model

- **Firestore collection**: `chatMessages`
- **Document fields**: `id`, `channelId`, `channelType`, `senderId`, `senderDisplayName`, `body`, `metadata`, `createdAt`, `updatedAt`.
- **Channel IDs**:
  - `global:<scope>` (scope lower-cased; default is `global:default`).
  - `direct:<user-a>--<user-b>` (participant IDs sorted lexicographically).
  - `game:<gameId>`.

## Operational notes

- **History limits**: Max returned history per request is `200`. Default is `DEFAULT_CHANNEL_HISTORY_LIMIT` (configurable).
- **Access control**: Direct-channel access is restricted to listed participants. Global and game channels are public to authenticated users.
- **CORS**: Allowed origins come from `WEB_APP_ORIGINS`; credentials are enabled.
- **Logging**: Morgan is `dev` locally and `combined` in production. Unhandled router errors return `500` with a generic message.

## Development

### Prerequisites

- Node.js 22 and npm 10+
- Firestore emulator via `firebase-tools`
- Login API service (for issuing user IDs to frontends)
- Install repo dependencies from the repo root: `npm install`

### Environment variables (local/dev)

- **`PORT`**: HTTP port (default `4100`; Cloud Run sets `PORT=8080`).
- **`GCP_PROJECT_ID`**: Firestore project ID. When the emulator is enabled, defaults to `demo-firestore`.
- **`WEB_APP_ORIGINS`**: Comma-separated CORS origins (default `http://localhost:5173`).
- **`USE_FIRESTORE_EMULATOR`**: Enables Firestore emulator (defaults to `true` when `NODE_ENV !== 'production'`).
- **`FIRESTORE_EMULATOR_HOST`**: Emulator host:port (`127.0.0.1:8080`).
- **`DEFAULT_CHANNEL_HISTORY_LIMIT`**: Default messages returned when no limit is provided (default `50`, capped at `200`).

Create a `.env` file at `services/chat-api` if needed. Example:

```ini
PORT=4100
GCP_PROJECT_ID=demo-firestore
WEB_APP_ORIGINS=http://localhost:5173
USE_FIRESTORE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
DEFAULT_CHANNEL_HISTORY_LIMIT=50
```

### Local development

| Command | Description |
| --- | --- |
| `npm run dev:chat` | Start Firestore (emulator) and the API at `http://localhost:4100`. |
| `npm run dev:chat:api` | Start only the API when an emulator is already running. |
| `npm --workspace services/chat-api run dev` | Workspace-local equivalent to `npm run dev:chat`. |
| `npm --workspace services/chat-api run build` | Compile TypeScript via `tsc`. |
| `npm run dev:backend` | From repo root, starts login API, chat API, and the emulator together. |

### Testing

| Command | Description |
| --- | --- |
| `npm run test:unit:chat` | Execute the workspace unit suite from the repo root. |
| `npm run test:integration:chat` | Execute the workspace integration suite from the repo root. |
| `npm --workspace services/chat-api run test:watch` | Run unit tests in watch mode. |
| `npm --workspace services/chat-api run test:integration:watch` | Run integration tests in watch mode. |

### Docker commands

| Command | Description |
| --- | --- |
| `docker build -f services/chat-api/Dockerfile -t chat-api:local services/chat-api` | Build the production image deployed to Cloud Run. |
| `docker build --target tester -f services/chat-api/Dockerfile -t chat-api:tester services/chat-api` | Build the tester image with Vitest and emulator prerequisites. |
| `docker run --rm --entrypoint bash chat-api:tester -lc "npm run test:unit"` | Execute the unit suite inside the tester image. |
| `docker run --rm --entrypoint bash chat-api:tester -lc "npx firebase emulators:exec --only firestore 'npm run test:integration'"` | Run integration tests against an emulator inside the container. |
| `docker run --rm -p 8080:8080 -e NODE_ENV=production -e GCP_PROJECT_ID=<your-project> chat-api:local` | Run the production image locally (Cloud Run-compatible). |

## Production environment variables

These are injected by Terraform into the Cloud Run service defined in `infra/cloud_run.tf` (defaults in `infra/variables.tf`).

| Name | Where defined | Effective value (default) | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `infra/cloud_run.tf` (env) | `production` | Static literal. |
| `WEB_APP_ORIGINS` | `infra/cloud_run.tf` from `var.web_app_origins` | `https://lukelarue.com,https://www.lukelarue.com` | Comma-joined list. |
| `GCP_PROJECT_ID` | `infra/cloud_run.tf` from `var.project_id` | `parabolic-env-456611-q9` | Your production GCP Project ID. |
| `USE_FIRESTORE_EMULATOR` | `infra/cloud_run.tf` from `var.chat_api_use_firestore_emulator` | `false` | Should remain `false` in prod. |
| `DEFAULT_CHANNEL_HISTORY_LIMIT` | `infra/cloud_run.tf` from `var.chat_api_default_channel_history_limit` | `50` | Tune if needed. |
| `PORT` | Cloud Run runtime | `8080` | Provided by Cloud Run; not set in Terraform. |

## Authentication requirements

- **`x-user-id`**: Required; identifies the authenticated user.
- **`x-user-name`**: Optional; used for display names in stored messages.
- For transports that cannot set headers (e.g., `EventSource`), you may pass `userId` and `userName` as query parameters. Missing `x-user-id` (or `userId`) yields a `401`.

## Firestore index

To support the common query shape used by this service (filter by `channelId` and order by `createdAt` desc), create this composite index in production:

```json
{
  "indexes": [
    {
      "collectionGroup": "chatMessages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "channelId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy via the Firebase console or with `firebase deploy --only firestore:indexes` when using a `firestore.indexes.json` file.
