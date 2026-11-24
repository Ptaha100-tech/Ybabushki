#!/usr/bin/env bash
# Резервная копия базы данных. Хранит последние 14 копий в папке ~/backups.
# Запуск вручную: ./scripts/backup.sh
# Автоматически каждую ночь: crontab -e и добавить строку
#   30 3 * * * cd ~/Ybabushki && ./scripts/backup.sh >> ~/backups/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a
mkdir -p ~/backups
FILE=~/backups/db-$(date +%Y%m%d-%H%M%S).sql.gz
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-uchi}" "${POSTGRES_DB:-uchi}" | gzip > "$FILE"
echo "Готово: $FILE ($(du -h "$FILE" | cut -f1))"
ls -1t ~/backups/db-*.sql.gz | tail -n +15 | xargs -r rm -f
