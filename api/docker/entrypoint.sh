#!/bin/bash
set -euo pipefail

MYSQL_DATADIR="/var/lib/mysql"
MYSQL_RUN_DIR="/run/mysqld"
MYSQL_SOCKET="${MYSQL_RUN_DIR}/mysqld.sock"

export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-dfaq_root}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-dfaq}"
export MYSQL_USER="${MYSQL_USER:-dfaq}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-dfaq}"

mkdir -p "${MYSQL_RUN_DIR}"
chown -R mysql:mysql "${MYSQL_RUN_DIR}" "${MYSQL_DATADIR}" 2>/dev/null || true

if [ ! -d "${MYSQL_DATADIR}/mysql" ]; then
  echo "[dfaq-api] Inicializando MariaDB..."
  mariadb-install-db --user=mysql --datadir="${MYSQL_DATADIR}" --auth-root-authentication-method=normal
fi

echo "[dfaq-api] Arrancando MariaDB..."
mariadbd --user=mysql --datadir="${MYSQL_DATADIR}" --bind-address=127.0.0.1 &
MYSQL_PID=$!

for i in $(seq 1 30); do
  if mariadb-admin --socket="${MYSQL_SOCKET}" ping --silent 2>/dev/null; then
    break
  fi
  if ! kill -0 "${MYSQL_PID}" 2>/dev/null; then
    echo "[dfaq-api] MariaDB no arranco"
    exit 1
  fi
  sleep 1
done

mariadb --socket="${MYSQL_SOCKET}" -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'localhost' IDENTIFIED BY '${MYSQL_PASSWORD}';
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'127.0.0.1' IDENTIFIED BY '${MYSQL_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL

export DATABASE_URL="${DATABASE_URL:-mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@127.0.0.1:3306/${MYSQL_DATABASE}}"

echo "[dfaq-api] MariaDB listo. Arrancando API Node..."
exec node src/index.js
