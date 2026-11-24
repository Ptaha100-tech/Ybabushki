#!/usr/bin/env bash
# Проверка домена: смотрит, куда он ведёт и открывается ли сайт.
set -u
cd "$(dirname "$0")/.."
DOMAIN=$(grep -E '^DOMAIN=' .env | cut -d= -f2)
IP=$(curl -s -4 ifconfig.me || true)
echo "Домен: $DOMAIN"
echo "IP этого сервера: $IP"
echo "Домен указывает на: $(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)"
echo "--- Проверка сайта по http:"
curl -s -o /dev/null -w "код ответа: %{http_code}\n" "http://$DOMAIN/api/health" || echo "не открывается"
echo "--- Проверка сайта по https:"
curl -s -o /dev/null -w "код ответа: %{http_code}\n" "https://$DOMAIN/api/health" || echo "не открывается (сертификат ещё не выдан или DNS не обновился)"
echo "--- Последние строки лога Caddy:"
docker compose logs --tail 8 caddy
