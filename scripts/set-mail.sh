#!/usr/bin/env bash
# Спрашивает адрес Яндекс-почты и пароль приложения, записывает их в .env и перезапускает сервис.
set -e
cd "$(dirname "$0")/.."
touch .env
echo "Адрес почты Яндекса, с которой будут уходить письма (например, myschool@yandex.ru):"
read -r MAIL
echo "Пароль приложения (при вводе он не показывается, просто вставьте и нажмите Enter):"
read -rs PASS
echo
sed -i '/^SMTP_HOST=/d;/^SMTP_PORT=/d;/^SMTP_USER=/d;/^SMTP_PASS=/d;/^MAIL_FROM=/d' .env
{
  echo "SMTP_HOST=smtp.yandex.ru"
  echo "SMTP_PORT=465"
  echo "SMTP_USER=$MAIL"
  echo "SMTP_PASS=$PASS"
  echo "MAIL_FROM=$MAIL"
} >> .env
docker compose up -d
echo
echo "Готово. Проверьте: на сайте нажмите «Забыли пароль?» и введите свою почту."
echo "Если письмо не пришло, выполните: docker compose logs backend | grep Mailer | tail -5"
