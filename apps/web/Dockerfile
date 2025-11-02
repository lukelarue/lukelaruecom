# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /workspace

# Install workspace dependencies and build the Vite bundle
COPY package.json package-lock.json ./
COPY apps ./apps
COPY services ./services

RUN npm ci
RUN npm --workspace apps/web run build

FROM nginx:1.27-alpine AS runtime

RUN rm /etc/nginx/conf.d/default.conf
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["/docker-entrypoint.sh", "nginx", "-g", "daemon off;"]
