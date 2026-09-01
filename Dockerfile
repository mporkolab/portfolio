# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# A site kétszer épül meg: egyszer a gyökérre (martinporkolab.hu/), egyszer a
# $BASE_PATH prefixre (100.71.44.91/portfolio). Egy statikus buildbe a base
# path bele van égetve minden linkbe, ezért kell két külön kimenet.
ARG BASE_PATH="portfolio"

# A kapcsolati űrlap beállításai build-időben égnek a statikus oldalba.
ARG PUBLIC_CONTACT_EMAIL=""
ARG PUBLIC_CONTACT_ENDPOINT=""
ARG PUBLIC_CONTACT_ACCESS_KEY=""
ENV PUBLIC_CONTACT_EMAIL=$PUBLIC_CONTACT_EMAIL \
    PUBLIC_CONTACT_ENDPOINT=$PUBLIC_CONTACT_ENDPOINT \
    PUBLIC_CONTACT_ACCESS_KEY=$PUBLIC_CONTACT_ACCESS_KEY

COPY . .
RUN BASE_PATH= npm run build && mv dist /site-root
RUN BASE_PATH="$BASE_PATH" npm run build && mv dist /site-prefixed

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime
ARG BASE_PATH="portfolio"
ENV BASE_PATH=$BASE_PATH

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /site-root /usr/share/nginx/html
COPY --from=build /site-prefixed /usr/share/nginx/html/$BASE_PATH

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1/" >/dev/null \
   && wget -qO- "http://127.0.0.1/$BASE_PATH/" >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
