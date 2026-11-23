#!/usr/bin/env bash
# Обновление и запуск на сервере: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Нет файла .env. Выполните: cp .env.example .env и заполните значения." >&2
  exit 1
fi

git pull --ff-only
docker compose up -d --build
docker compose ps
