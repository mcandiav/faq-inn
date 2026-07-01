# EasyPanel usa el repositorio como contexto de build en la raíz.
# Este Dockerfile construye el servicio `api` desde el subdirectorio api/.

FROM alpine:3.20 AS git-meta
RUN apk add --no-cache git
WORKDIR /src
COPY .git ./.git
RUN git rev-parse --short HEAD > /git-commit.txt 2>/dev/null || echo unknown > /git-commit.txt

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/package.json ./
RUN npm install --omit=dev

COPY api/src ./src
COPY api/docker/entrypoint.sh /entrypoint.sh
COPY --from=git-meta /git-commit.txt /app/.git-commit
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
