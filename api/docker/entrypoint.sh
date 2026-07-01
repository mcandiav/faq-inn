#!/bin/bash
set -euo pipefail

MYSQL_DATADIR="/var/lib/mysql"
MYSQL_RUN_DIR="/run/mysqld"
MYSQL_SOCKET="${MYSQL_RUN_DIR}/mysqld.sock"
MYSQL_PID_FILE="${MYSQL_RUN_DIR}/mysqld.pid"
FLOCK_FILE="${MYSQL_DATADIR}/.dfaq.lock"

export MYSQL_ROOT_PASSWORD="${MYSQL_ROOT_PASSWORD:-dfaq_root}"
export MYSQL_DATABASE="${MYSQL_DATABASE:-dfaq}"
export MYSQL_USER="${MYSQL_USER:-dfaq}"
export MYSQL_PASSWORD="${MYSQL_PASSWORD:-dfaq}"

NODE_PID=""
MYSQL_PID=""

shutdown() {
  echo "[dfaq-api] Apagando servicios..."

  if [ -n "${NODE_PID}" ] && kill -0 "${NODE_PID}" 2>/dev/null; then
    kill -TERM "${NODE_PID}" 2>/dev/null || true
    wait "${NODE_PID}" 2>/dev/null || true
  fi

  if mariadb-admin --socket="${MYSQL_SOCKET}" ping --silent 2>/dev/null; then
    echo "[dfaq-api] Apagando MariaDB..."
    mariadb-admin --socket="${MYSQL_SOCKET}" shutdown 2>/dev/null || true
  fi

  if [ -n "${MYSQL_PID}" ]; then
    for _ in $(seq 1 30); do
      kill -0 "${MYSQL_PID}" 2>/dev/null || break
      sleep 1
    done
    kill -TERM "${MYSQL_PID}" 2>/dev/null || true
    wait "${MYSQL_PID}" 2>/dev/null || true
  fi

  exit 0
}

trap shutdown SIGTERM SIGINT

mkdir -p "${MYSQL_RUN_DIR}" "${MYSQL_DATADIR}"
chown -R mysql:mysql "${MYSQL_RUN_DIR}" "${MYSQL_DATADIR}" 2>/dev/null || true

echo "[dfaq-api] Esperando lock exclusivo del datadir..."
exec 9>"${FLOCK_FILE}"
if ! flock -w 120 9; then
  echo "[dfaq-api] ERROR: otro proceso usa ${MYSQL_DATADIR}."
  echo "[dfaq-api] Verifique que dfaq-api tenga una sola replica en EasyPanel."
  exit 1
fi

if [ ! -d "${MYSQL_DATADIR}/mysql" ]; then
  echo "[dfaq-api] Inicializando MariaDB..."
  mariadb-install-db --user=mysql --datadir="${MYSQL_DATADIR}" --auth-root-authentication-method=normal
fi

if mariadb-admin --socket="${MYSQL_SOCKET}" ping --silent 2>/dev/null; then
  echo "[dfaq-api] MariaDB ya responde en el socket local."
else
  echo "[dfaq-api] Arrancando MariaDB..."
  mariadbd \
    --user=mysql \
    --datadir="${MYSQL_DATADIR}" \
    --bind-address=127.0.0.1 \
    --socket="${MYSQL_SOCKET}" \
    --pid-file="${MYSQL_PID_FILE}" &
  MYSQL_PID=$!

  ready=0
  for i in $(seq 1 90); do
    if mariadb-admin --socket="${MYSQL_SOCKET}" ping --silent 2>/dev/null; then
      ready=1
      break
    fi
    if ! kill -0 "${MYSQL_PID}" 2>/dev/null; then
      echo "[dfaq-api] MariaDB termino inesperadamente durante el arranque."
      wait "${MYSQL_PID}" || true
      exit 1
    fi
    if [ $((i % 10)) -eq 0 ]; then
      echo "[dfaq-api] Esperando MariaDB... (${i}/90)"
    fi
    sleep 1
  done

  if [ "${ready}" -ne 1 ]; then
    echo "[dfaq-api] Timeout esperando MariaDB."
    exit 1
  fi
fi

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
node src/index.js &
NODE_PID=$!

wait "${NODE_PID}"
