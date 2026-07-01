# Dockerfile para el servicio `http` cuando EasyPanel usa la raíz del repo.
# En la rama `http`, este archivo se publica como /Dockerfile.

FROM nginx:1.27-alpine

ARG GIT_SHA=unknown

RUN apk add --no-cache gettext wget

COPY http/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY http/docker/entrypoint.sh /entrypoint.sh
COPY http/public /usr/share/nginx/html
RUN chmod +x /entrypoint.sh \
  && printf '%.7s\n' "${GIT_SHA}" > /usr/share/nginx/html/git-commit.txt

ENV API_UPSTREAM=http://dfaq-api:3000

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
