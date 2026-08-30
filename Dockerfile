# --- Build stage -----------------------------------------------------------
# better-sqlite3 is a native module: the build stage needs a toolchain, the
# runtime stage does not, which is the main reason this image is split.
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# The workspace manifests first, so a dependency-free code change reuses the
# cached install layer.
COPY package.json package-lock.json ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/data/package.json ./packages/data/
COPY backend/package.json ./backend/
# The mobile workspace is not needed to serve the API and would drag in the
# entire React Native toolchain, so it is installed as an empty stub.
RUN mkdir -p mobile && echo '{"name":"foodlens-mobile","version":"1.0.0","private":true}' > mobile/package.json

RUN npm ci --workspace @foodlens/backend --workspace @foodlens/data --workspace @foodlens/engine --include-workspace-root

COPY packages ./packages
COPY backend ./backend

# Order matters: the backend imports the engine's build output.
RUN npm run build --workspace @foodlens/engine \
 && npm run build --workspace @foodlens/data \
 && npm run build --workspace @foodlens/backend

# Reinstall production dependencies only, against the same Node version the
# runtime stage uses, so the native module stays ABI-compatible.
RUN npm ci --omit=dev --workspace @foodlens/backend --workspace @foodlens/data --workspace @foodlens/engine --include-workspace-root

# --- Runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/data/foodlens.db

WORKDIR /app

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/
COPY --from=build /app/packages/engine/dist ./packages/engine/dist
COPY --from=build /app/packages/engine/package.json ./packages/engine/
COPY --from=build /app/packages/data/dist ./packages/data/dist
COPY --from=build /app/packages/data/package.json ./packages/data/
# The reference data is immutable and ships in the image; only the SQLite
# database is mutable, and it lives on a volume.
COPY --from=build /app/packages/data/data ./packages/data/data

RUN mkdir -p /data && chown -R node:node /data /app

USER node

EXPOSE 4000

# /health reads the additive database, so a passing check means the data files
# loaded, not merely that the process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "backend/dist/index.js"]
