# Статус
Всё запланированное сделано и отправлено в main: банк заданий (11 предметов), backend, клиент, PWA, workflow APK, README, скрипты.
Не проверялось сборкой (нет сети в песочнице): backend и app компилируются только на сервере/в Actions. При ошибках сборки смотреть `docker compose logs`/вывод `./deploy.sh`.
Идеи дальше: подтверждение e-mail, восстановление пароля, олимпиады, реальная оплата, просмотр заданий методистом.

## Обновление 26.11.2026 (список «развития»)
Сделано: сброс пароля по коду из письма и подтверждение почты (SMTP через .env, без SMTP коды печатаются в журнал backend);
согласие с политикой при регистрации; скрипты scripts/install-cron.sh (ночная копия БД + проверка сайта каждые 5 мин),
scripts/monitor.sh (Telegram через TG_BOT_TOKEN/TG_CHAT_ID); слабые темы («Стоит повторить»); рейтинг за неделю;
задания дня + монеты + магазин (рамки и звания); еженедельные письма родителям (пн, нужна почта) + кнопка «прислать сейчас»;
свои темы учителя (формат «вопрос | верный | неверный…»); теория перед заданиями (78 тем, backend/src/content/theory.ts);
ещё 16 тем ВПР/ОГЭ/ЕГЭ (backend/src/content/exams2.ts); CI «Проверка кода» (.github/workflows/check.yml) собирает backend и проверяет типы клиента.
Android: APK подписывается ключом из секретов GitHub (ANDROID_KEYSTORE_B64 / ANDROID_KEYSTORE_PASSWORD), см. scripts/make-android-key.sh.
Не сделано: видео-объяснения, настоящая оплата, проверка заданий учителем-человеком.

## Обновление 27.11.2026 — ТЕКУЩАЯ РАБОТА (точка сохранения)
Сделано и отправлено: почта через Brevo по HTTPS (`BREVO_API_KEY`, `scripts/set-mail-brevo.sh`, SMTP-порты у хостинга закрыты),
красивые HTML-письма (`backend/src/mail-templates.ts`, картинки `app/public/mail/`), админ-панель (роль `admin`, `scripts/make-admin.sh`,
backend `admin.controller/service.ts`, экран `app/src/screens/AdminScreen.tsx`: обзор, люди, темы, рассылка), Caddy не сжимает /downloads/*.

В работе (запрос пользователя): «при неверном ответе показывать правильный ответ и краткое объяснение».
- UI уже показывает `result.correctAnswer` и `result.explanation` (PracticeScreen). Проблема была в том, что объяснения были только у ~700 из 4334 заданий.
- Сделано (не закоммичено до этой записи): `backend/src/content/explain.ts` — `autoExplain(seed)`: объяснение из исходника → арифметика/expr → таблица `EXPLAIN` (explain-data.ts, ключ `explainKey(prompt, answer)`) → шаблоны по типу (order/match/choice/number/text). `index.ts finalizeTask` использует `autoExplain`.
- СЛЕДУЮЩИЕ ШАГИ: 1) `bash scripts/check-content.sh` (лимит объяснения 300 символов, нет смеси латиницы/кириллицы); 2) наполнить `explain-data.ts` настоящими короткими объяснениями для заданий без своих (выгрузить список через tsx: buildAll() → где объяснение шаблонное; писать пачками по ~300 штук, ключ = explainKey); 3) в UI показать блок «Почему так» отдельно, а при отсутствии объяснения — подсказку заглянуть в теорию.
- Запрос пользователя: в админку добавить продление подписки / безлимит заданий. План: в `admin.service.ts` методы grantSubscription(userId, days) (создаёт Subscription с parentId=админ) и revoke; поле `unlimited` (bool) у User, проверяется в LearningService.remainingToday; кнопки в UserCard («+30 дней», «+365», «Безлимит навсегда вкл/выкл»); отображать статус подписки в detail().
- Ожидает пользователя: секреты GitHub для постоянной подписи APK; `bash scripts/install-cron.sh` в ~/Ybabushki; выполнить `bash scripts/make-admin.sh почта` после деплоя.
