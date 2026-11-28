#!/usr/bin/env bash
# Сохраняет ключ AITunnel для генератора картинок в админ-панели.
set -e
cd "$(dirname "$0")/.."
touch .env
echo "Вставьте API-ключ AITunnel (он не показывается на экране) и нажмите Enter:"
read -rs KEY
echo
sed -i '/^AITUNNEL_API_KEY=/d' .env
echo "AITUNNEL_API_KEY=$KEY" >> .env
docker compose up -d
echo "Готово. В админ-панели откройте вкладку «Картинки»."
