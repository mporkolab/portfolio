# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Ha a site egy reverse proxy al-útvonalán áll (pl. /portfolio), ide a prefix
# (/ nélkül). Üresen a domain gyökerére épül.
ARG BASE_PATH=""

# A kapcsolati űrlap beállításai build-időben égnek az oldalba.
ARG PUBLIC_CONTACT_EMAIL=""
ARG PUBLIC_CONTACT_ENDPOINT=""
ARG PUBLIC_CONTACT_ACCESS_KEY=""

ENV PUBLIC_CONTACT_EMAIL=$PUBLIC_CONTACT_EMAIL \
    PUBLIC_CONTACT_ENDPOINT=$PUBLIC_CONTACT_ENDPOINT \
    PUBLIC_CONTACT_ACCESS_KEY=$PUBLIC_CONTACT_ACCESS_KEY

# A build nem kéri le a Ghostot: a projekteket a futó szerver olvassa,
# kérésenként. A Ghost címe és kulcsa ezért futásidejű környezeti változó.
COPY . .
RUN BASE_PATH="$BASE_PATH" npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:22-alpine AS runtime
WORKDIR /app
ARG BASE_PATH=""
ENV NODE_ENV=production HOST=0.0.0.0 PORT=80 BASE_PATH=$BASE_PATH

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 80
# Egy előre renderelt oldal: a konténer egészségét ne a Ghost állapota döntse el.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1${BASE_PATH:+/$BASE_PATH}/about/" >/dev/null || exit 1

CMD ["node", "dist/server/entry.mjs"]
