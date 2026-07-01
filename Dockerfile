# EasyPanel usa el repositorio como contexto de build en la raíz.
# Este Dockerfile construye el servicio `api` desde el subdirectorio api/.

FROM node:20-bookworm-slim

ARG GIT_SHA=unknown

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/package.json ./
RUN npm install --omit=dev

COPY api/src ./src
COPY api/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && printf '%.7s\n' "${GIT_SHA}" > /app/.git-commit

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DFAQ_GIT_COMMIT=${GIT_SHA}

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=45s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
