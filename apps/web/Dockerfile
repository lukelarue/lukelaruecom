# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /workspace

ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ARG VITE_MINESWEEPER_URL
ENV VITE_MINESWEEPER_URL=${VITE_MINESWEEPER_URL}

# Install workspace dependencies and build the Vite bundle
COPY package.json package-lock.json ./
COPY apps ./apps
COPY services ./services

RUN if [ -z "${VITE_GOOGLE_CLIENT_ID}" ] || [ "${VITE_GOOGLE_CLIENT_ID}" = "" ]; then \
      echo "VITE_GOOGLE_CLIENT_ID is required for the frontend build. Set it in GitHub Variables and pass as build-arg." >&2; \
      exit 1; \
    fi

RUN npm ci
RUN npm --workspace apps/web run build

FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["/docker-entrypoint.sh", "nginx", "-g", "daemon off;"]
