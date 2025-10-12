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
  The script launches the Firestore emulator on `localhost:8080` and the API on `http://localhost:4000`.

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
