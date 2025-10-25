# Install dependencies (including dev) once for caching
FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json ./

RUN npm install

# Build application with dev dependencies available for testing
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# TODO(later): install emulator prerequisites and copy test configs when running tests inside Docker
# RUN apt-get update \
#   && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
#   && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY tsconfig.json tsconfig.build.json ./
# COPY vitest*.config.ts ./
# COPY firebase.json ./
# COPY .firebaserc ./
COPY src ./src

RUN npm run build

# NOTE: Uncomment the tester stage below when we want to run the Vitest suites inside Docker for parity with production runtime.
# FROM builder AS tester
# ENV NODE_ENV=test
# Default command kept empty so workflow can provide the test command

# Prune dev dependencies for the production image
FROM builder AS prod-deps

RUN npm prune --omit=dev

# Production image
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production

WORKDIR /app

COPY --from=prod-deps /app/package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/index.js"]
