# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Al-útvonalas kiszolgáláshoz: --build-arg BASE_PATH=portfolio
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH

COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:1.27-alpine AS runtime
ARG BASE_PATH=""
ENV BASE_PATH=$BASE_PATH

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/$BASE_PATH

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -qO- "http://127.0.0.1/$BASE_PATH/" >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
