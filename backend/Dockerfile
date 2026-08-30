# --- Build stage -----------------------------------------------------------
# better-sqlite3 is a native module: the build stage needs a toolchain, the
# runtime stage does not, which is the main reason this image is split.
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Reinstall production dependencies only, so the native module is rebuilt
# against the same Node version the runtime stage uses.
RUN npm ci --omit=dev

# --- Runtime stage ---------------------------------------------------------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_PATH=/data/foodlens.db

WORKDIR /app

# The image ships the data files; only the database is mutable, and it lives
# on a volume so a container restart does not lose a user's history.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY data ./data
COPY package.json ./

RUN mkdir -p /data && chown -R node:node /data /app

USER node

EXPOSE 4000

# /health is cheap and touches the additive database, so a passing check means
# the data files loaded, not merely that the process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
