#!/bin/sh
set -eu

echo "[faq-inn-api] Arrancando API Node (PostgreSQL: ${DB_HOST:-DATABASE_URL})..."
exec node src/index.js
