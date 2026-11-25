#!/usr/bin/env bash
# Обновление и запуск на сервере: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Нет файла .env. Выполните: cp .env.example .env и заполните значения." >&2
  exit 1
fi

git pull --ff-only

# Скачиваем свежий APK приложения из GitHub (если он уже собран), чтобы его можно было скачать с сайта.
mkdir -p app/public/downloads
curl -fsSL -m 120 -o app/public/downloads/moya-shkola.apk.tmp \
  "https://github.com/Ptaha100-tech/Ybabushki/releases/download/apk-latest/moya-shkola.apk" \
  && mv app/public/downloads/moya-shkola.apk.tmp app/public/downloads/moya-shkola.apk \
  && echo "APK обновлён" || { rm -f app/public/downloads/moya-shkola.apk.tmp; echo "APK пока не найден (это нормально, если он ещё не собран)"; }

docker compose up -d --build
docker compose ps
