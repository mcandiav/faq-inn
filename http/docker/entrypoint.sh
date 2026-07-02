#!/bin/sh
set -eu

API_UPSTREAM="${API_UPSTREAM:-http://faq-inn-api:3000}"
export API_UPSTREAM

envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

case "$API_UPSTREAM" in
  https://*)
    proxy_host=$(echo "$API_UPSTREAM" | sed -e 's|https://||' -e 's|:[0-9]*||' -e 's|/.*||')
    sed -i "s|proxy_pass|proxy_ssl_server_name on;\\
        proxy_set_header Host ${proxy_host};\\
        proxy_pass|" /etc/nginx/conf.d/default.conf
    ;;
esac

exec nginx -g 'daemon off;'
