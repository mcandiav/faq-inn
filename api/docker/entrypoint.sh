#!/bin/sh
set -eu

echo "[dfaq-api] Arrancando API Node (MariaDB externo: ${DB_HOST:-DATABASE_URL})..."
exec node src/index.js
