#!/usr/bin/env bash
# Включает по расписанию: ночную копию базы (03:30) и проверку сайта (каждые 5 минут).
# Безопасно запускать повторно.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p ~/backups
TMP=$(mktemp)
crontab -l 2>/dev/null | grep -v 'moyashkola-job' > "$TMP" || true
echo "30 3 * * * cd $DIR && bash scripts/backup.sh >> ~/backups/backup.log 2>&1 # moyashkola-job" >> "$TMP"
echo "*/5 * * * * cd $DIR && bash scripts/monitor.sh >> ~/backups/monitor.log 2>&1 # moyashkola-job" >> "$TMP"
crontab "$TMP"
rm -f "$TMP"
echo "Готово. Расписание:"
crontab -l | grep moyashkola-job
bash "$DIR/scripts/backup.sh" && echo "Первая копия базы создана."
