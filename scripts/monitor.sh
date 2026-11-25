#!/usr/bin/env bash
# Проверка, что сайт жив. При проблеме (и при восстановлении) шлёт сообщение в Telegram.
# Нужны TG_BOT_TOKEN и TG_CHAT_ID в файле .env (см. README). Без них просто пишет в журнал.
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
STATE=~/.moyashkola-monitor-state
PROBLEM=""

CODE=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "http://localhost/api/health" 2>/dev/null || echo 000)
if [ "$CODE" != "200" ]; then
  CODE=$(curl -s -o /dev/null -m 15 -w '%{http_code}' "https://${DOMAIN}/api/health" 2>/dev/null || echo 000)
fi
[ "$CODE" = "200" ] || PROBLEM="Сайт не отвечает (код $CODE). "

DOWN=$(docker compose ps --status exited --status restarting -q 2>/dev/null | wc -l)
[ "$DOWN" = "0" ] || PROBLEM="${PROBLEM}Остановлено контейнеров: $DOWN. "

DISK=$(df / --output=pcent | tail -1 | tr -dc '0-9')
[ "${DISK:-0}" -lt 90 ] || PROBLEM="${PROBLEM}Диск заполнен на ${DISK}%. "

tg() {
  [ -n "${TG_BOT_TOKEN:-}" ] && [ -n "${TG_CHAT_ID:-}" ] || return 0
  curl -s -m 15 "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT_ID}" --data-urlencode "text=$1" >/dev/null || true
}

PREV=$(cat "$STATE" 2>/dev/null || echo ok)
if [ -n "$PROBLEM" ]; then
  echo "$(date '+%F %T') ПРОБЛЕМА: $PROBLEM"
  [ "$PREV" = "ok" ] && tg "⚠️ Моя школа: $PROBLEM"
  echo bad > "$STATE"
else
  [ "$PREV" = "bad" ] && { tg "✅ Моя школа: всё снова работает"; echo "$(date '+%F %T') восстановлено"; }
  echo ok > "$STATE"
fi
