#!/usr/bin/env bash
# Создаёт постоянный ключ подписи Android-приложения и печатает два значения
# для секретов GitHub: ANDROID_KEYSTORE_B64 и ANDROID_KEYSTORE_PASSWORD.
set -e
D=$(mktemp -d)
PASS=$(openssl rand -hex 12)
openssl req -x509 -newkey rsa:2048 -nodes -keyout "$D/k.pem" -out "$D/c.pem" -days 36500 -subj "/CN=Moya Shkola/C=RU" 2>/dev/null
openssl pkcs12 -export -inkey "$D/k.pem" -in "$D/c.pem" -name moyashkola -out "$D/release.keystore" -passout "pass:$PASS"
echo
echo "=== ANDROID_KEYSTORE_PASSWORD (значение пароля) ==="
echo "$PASS"
echo
echo "=== ANDROID_KEYSTORE_B64 (одна длинная строка) ==="
base64 -w0 "$D/release.keystore"
echo
echo
rm -rf "$D"
