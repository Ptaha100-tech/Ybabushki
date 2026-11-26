#!/usr/bin/env bash
# Подключает отправку писем через Brevo (работает по HTTPS, не нужны почтовые порты).
set -e
cd "$(dirname "$0")/.."
touch .env
echo "Адрес, который вы подтвердили в Brevo как отправителя (например, mcred7@yandex.ru):"
read -r MAIL
echo "API-ключ Brevo (вставьте и нажмите Enter, он не показывается):"
read -rs KEY
echo
sed -i '/^SMTP_HOST=/d;/^SMTP_PORT=/d;/^SMTP_USER=/d;/^SMTP_PASS=/d;/^MAIL_FROM=/d;/^BREVO_API_KEY=/d' .env
{
  echo "MAIL_FROM=Моя школа <$MAIL>"
  echo "BREVO_API_KEY=$KEY"
} >> .env
docker compose up -d
echo "Готово. Проверьте на сайте: «Забыли пароль?»."
echo "Если письма нет: docker compose logs backend | grep Mailer | tail -5"
