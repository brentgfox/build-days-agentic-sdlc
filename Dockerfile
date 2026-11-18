# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS build

ARG NPM_REGISTRY=https://registry.npmjs.org/

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" \
  && npm config set replace-registry-host npmjs \
  && npm ci

COPY tsconfig.json tsconfig.server.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runtime

ARG NPM_REGISTRY=https://registry.npmjs.org/

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm config set registry "${NPM_REGISTRY}" \
  && npm config set replace-registry-host npmjs \
  && npm ci --omit=dev \
  && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "dist/server/index.js"]
