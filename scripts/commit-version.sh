#!/usr/bin/env sh
# Uso: ./scripts/commit-version.sh 2.1 "feat: importar Excel FAQs"
# Asunto final: [V2.1@abc1234] feat: importar Excel FAQs
# Actualiza VERSION (fuente única) y cache-bust ?v= en index.html.

set -eu

VERSION="${1:?Falta version (ej. 2.1)}"
MESSAGE="${2:?Falta mensaje de commit}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION_FILE="$ROOT/VERSION"
INDEX_FILE="$ROOT/http/public/index.html"

printf '%s' "$VERSION" > "$VERSION_FILE"
git add "$VERSION_FILE"

if [ -f "$INDEX_FILE" ]; then
  sed -i "s/\(i18n\.js?v=\)[0-9.]*/\1${VERSION}/" "$INDEX_FILE"
  sed -i "s/\(app\.js?v=\)[0-9.]*/\1${VERSION}/" "$INDEX_FILE"
  git add "$INDEX_FILE"
fi

if git diff --cached --quiet && git diff --quiet; then
  echo "No hay cambios para commitear. Haz git add antes." >&2
  exit 1
fi

git commit -m "[V${VERSION}] ${MESSAGE}"
HASH="$(git rev-parse --short HEAD)"
git commit --amend -m "[V${VERSION}@${HASH}] ${MESSAGE}"

echo "OK: [V${VERSION}@${HASH}] ${MESSAGE} (VERSION=${VERSION})"
git log -1 --oneline
