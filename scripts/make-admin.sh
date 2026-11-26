#!/usr/bin/env bash
# Делает пользователя администратором: bash scripts/make-admin.sh почта@пример.ру
set -e
cd "$(dirname "$0")/.."
E=$(printf '%s' "${1:-}" | tr 'A-Z' 'a-z' | tr -d "'\"; ")
if [ -z "$E" ]; then echo "Укажите почту: bash scripts/make-admin.sh ваша@почта.ру"; exit 1; fi
R=$(docker compose exec -T db sh -c "psql -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -tAc \"UPDATE users SET role='admin' WHERE email='$E' RETURNING email\"")
if [ -z "$R" ]; then echo "Такого пользователя нет. Сначала зарегистрируйтесь на сайте с этой почтой."; exit 1; fi
echo "Готово: $R теперь администратор. Выйдите из аккаунта и войдите снова."
