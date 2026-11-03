# Imagen de producción. Los datos (base de datos + fotos) viven en /app/data: monta ahí un volumen persistente.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data PORT=3000
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/seed ./seed
COPY --from=build /app/next.config.mjs ./
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npx", "next", "start"]
