#!/bin/sh
set -e
USER="${BASIC_AUTH_USER:-admin}"
PASS="${BASIC_AUTH_PASSWORD:-changeme}"
HASH=$(openssl passwd -apr1 "$PASS")
printf '%s:%s\n' "$USER" "$HASH" > /etc/nginx/.htpasswd
exec nginx -g 'daemon off;'
