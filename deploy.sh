#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Build ==="
npm run build

echo "=== Git commit ==="
git add -A
if git diff --cached --quiet; then
  echo "Nothing to commit."
else
  git commit -m "${1:-deploy: update}"
fi

echo "=== Git push ==="
git push origin master

echo "=== Wrangler deploy ==="
npx wrangler pages deploy dist --project-name=cargo-flow-admin --branch=main

echo
echo "Done. https://manage.cargoflowafrica.co.za"
