# ---- build ----
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Ha a site egy reverse proxy al-útvonalán áll (pl. /portfolio), ide a prefix
# (/ nélkül). Üresen a domain gyökerére épül.
ARG BASE_PATH=""

# A nyilvános cím (séma + domain, / nélkül): a canonical linkek, az Open Graph
# és a sitemap ebből épülnek. Üresen https://martinporkolab.hu.
ARG SITE_URL=""

# A kapcsolati űrlap beállításai build-időben égnek az oldalba.
ARG PUBLIC_CONTACT_EMAIL=""
ARG PUBLIC_CONTACT_ENDPOINT=""
ARG PUBLIC_CONTACT_ACCESS_KEY=""

ENV PUBLIC_CONTACT_EMAIL=$PUBLIC_CONTACT_EMAIL \
    PUBLIC_CONTACT_ENDPOINT=$PUBLIC_CONTACT_ENDPOINT \
    PUBLIC_CONTACT_ACCESS_KEY=$PUBLIC_CONTACT_ACCESS_KEY

# A build nem olvassa a CMS-t: a projekteket a futó szerver olvassa, kérésenként,
# a CMS adatbázisából (node:sqlite, ezért kell a Node 24). Az adatbázis és a
# képek helye ezért futásidejű környezeti változó.
COPY . .
RUN BASE_PATH="$BASE_PATH" SITE_URL="$SITE_URL" npm run build && npm prune --omit=dev

# ---- runtime ----
FROM node:24-alpine AS runtime
WORKDIR /app
ARG BASE_PATH=""
ENV NODE_ENV=production HOST=0.0.0.0 PORT=80 BASE_PATH=$BASE_PATH \
    CMS_DATABASE=/data/cms.db CMS_UPLOADS=/data/uploads

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 80
# Egy előre renderelt oldal: a konténer egészségét ne a CMS állapota döntse el.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1${BASE_PATH:+/$BASE_PATH}/about/" >/dev/null || exit 1

CMD ["node", "dist/server/entry.mjs"]
