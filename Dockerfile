# Update this digest deliberately and validate the resulting release before deploying.
FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS build
ARG SITE_URL
ARG STORAGE_DRIVER=r2
ARG GOOGLE_SITE_VERIFICATION=""
ARG APP_VERSION=unreleased
ARG GIT_REVISION=unknown
ENV SITE_URL=$SITE_URL STORAGE_DRIVER=$STORAGE_DRIVER GOOGLE_SITE_VERIFICATION=$GOOGLE_SITE_VERIFICATION NEXT_TELEMETRY_DISABLED=1
COPY next.config.mjs tsconfig.json ./
COPY src ./src
COPY public ./public
COPY seed ./seed
COPY scripts ./scripts
COPY tests ./tests
RUN node scripts/write-build-info.mjs && npm test && npm run build
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS runtime
ARG APP_VERSION=unreleased
ARG GIT_REVISION=unknown
LABEL org.opencontainers.image.title="Import Corporal Medical" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$GIT_REVISION
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/seed ./seed
COPY --from=build --chown=node:node /app/next.config.mjs /app/build-info.json ./
COPY --from=build --chown=node:node /app/scripts ./scripts
COPY --from=build --chown=node:node /app/src/lib/storage*.ts ./src/lib/
RUN mkdir -p /app/data /app/.next/cache && chown node:node /app/data /app/.next/cache
USER node
VOLUME ["/app/data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "scripts/healthcheck.mjs"]
CMD ["node", "scripts/start-production.mjs"]
