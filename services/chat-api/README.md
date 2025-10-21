# Chat API Service

This package (`services/chat-api/`) provides chat capabilities for the LukeLaRue platform. It enforces per-channel access rules, persists messages to Firestore, and exposes REST endpoints for listing channels and fetching message history.

## Prerequisites

- Node.js 22 (per workspace engines) and npm 10+
- Firestore emulator (`firebase-tools`) for local development
- Login API service issuing user IDs for authenticated requests

## Environment variables

- **`PORT`**: HTTP port (default `4100`).
- **`GCP_PROJECT_ID`**: Firestore project ID (`demo-firestore` when emulator is active).
- **`WEB_APP_ORIGINS`**: Comma-separated list of allowed CORS origins (default `http://localhost:5173`).
- **`USE_FIRESTORE_EMULATOR`**: Enables Firestore emulator (default `true`).
- **`FIRESTORE_EMULATOR_HOST`**: Host:port of the emulator (`127.0.0.1:8080`).
- **`DEFAULT_CHANNEL_HISTORY_LIMIT`**: Default number of messages returned when no limit is provided (default `50`, capped at `200`).

Copy `.env.example.chat-api` to `.env` to start with local defaults.

## Local development

- **Install dependencies**
  ```bash
  npm install
  npm install --workspace services/chat-api
  ```
- **Run with emulator**
  ```bash
  npm run dev:chat
  ```
  Starts the Firestore emulator and the API at `http://localhost:4100`. Equivalent workspace command: `npm run dev --workspace services/chat-api`.
- **Run API only** (when emulator already running)
  ```bash
  npm run dev:chat:api
  ```
- **Build**
  ```bash
  npm run build --workspace services/chat-api
  ```
- **Tests**
  ```bash
  npm run test:unit:chat
  npm run test:integration:chat
  npm run test:watch --workspace services/chat-api
  npm run test:integration:watch --workspace services/chat-api
  ```

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
