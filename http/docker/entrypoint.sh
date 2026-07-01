#!/bin/sh
set -eu

API_UPSTREAM="${API_UPSTREAM:-http://dfaq-api:3000}"
export API_UPSTREAM

envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
