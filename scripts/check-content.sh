#!/usr/bin/env bash
# Проверка всех заданий: компилирует банк заданий и запускает проверки.
set -euo pipefail
cd "$(dirname "$0")/../backend"
rm -rf ../.content-build
TSC="$(command -v tsc || echo node_modules/.bin/tsc)"
"$TSC" -p tsconfig.content.json
node ../.content-build/check.js
