#!/usr/bin/env sh
# Uso: ./scripts/commit-version.sh 2.1 "feat: importar Excel FAQs"
# Asunto final: [V2.1@abc1234] feat: importar Excel FAQs

set -eu

VERSION="${1:?Falta version (ej. 2.1)}"
MESSAGE="${2:?Falta mensaje de commit}"

if git diff --cached --quiet && git diff --quiet; then
  echo "No hay cambios para commitear. Haz git add antes." >&2
  exit 1
fi

git commit -m "[V${VERSION}] ${MESSAGE}"
HASH="$(git rev-parse --short HEAD)"
git commit --amend -m "[V${VERSION}@${HASH}] ${MESSAGE}"

echo "OK: [V${VERSION}@${HASH}] ${MESSAGE}"
git log -1 --oneline
