# EasyPanel usa el repositorio como contexto de build en la raíz.
# Este Dockerfile construye el servicio `api` desde el subdirectorio api/.

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    mariadb-server \
    mariadb-client \
    wget \
    ca-certificates \
    util-linux \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY api/package.json ./
RUN npm install --omit=dev

COPY api/src ./src
COPY api/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV MYSQL_DATABASE=dfaq
ENV MYSQL_USER=dfaq
ENV MYSQL_PASSWORD=dfaq
ENV DATABASE_URL=mysql://dfaq:dfaq@127.0.0.1:3306/dfaq

VOLUME ["/var/lib/mysql"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
