# A natív modulokhoz (better-sqlite3, sharp) általában van előre fordított
# bináris; ha az adott platformra mégsem, a fordítóeszközökkel helyben fordul.
# Ezek csak a build-szakaszokban vannak, a futtató image-ben nem.

# ---- futásidejű függőségek ----
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=2368 \
    DATABASE_PATH=/data/cms.db UPLOADS_DIR=/data/uploads MIGRATIONS_DIR=/app/drizzle

COPY package.json package-lock.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Adatbázis-migrációk (induláskor futnak) és a mentőszkript.
COPY drizzle ./drizzle
COPY scripts ./scripts

# Az adatbázis és a feltöltött képek: a compose `cms-data` volume-ja, amit a
# portfólió konténere is felcsatol (csak olvas belőle).
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node

EXPOSE 2368
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:2368/ >/dev/null || exit 1

CMD ["node", "dist/server/entry.mjs"]
