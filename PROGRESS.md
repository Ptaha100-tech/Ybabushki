# Прогресс разработки (для продолжения после паузы лимита)

ГОТОВО: Caddy/nginx; банк заданий (все 11 предметов, 219 тем, ~3800 заданий, `./scripts/check-content.sh` проходит);
backend (сущности, синхронизация банка, типы заданий order/match/text, /catalog, игры lightning/memory, leaderboard,
уровни/значки, rate limiter, grade при регистрации). Backend не компилировался целиком (нет типов nest в песочнице) — проверять при деплое.
ОСТАЛОСЬ по порядку:
3. app (Expo): ГОТОВО api.ts, TopicBrowser, PracticeScreen, GamesScreen. ОСТАЛОСЬ: install.ts+InstallCard, InfoScreens (о сервисе, конфиденциальность, условия), LandingScreen, App.tsx, StudentScreen (вкладки+значки+рейтинг), AuthScreen (класс), TeacherScreen (TopicBrowser), ui.tsx бренд
4. PWA (manifest, sw, иконки, Dockerfile инъекция head), кнопка установки, README, скрипт бэкапа, итоговый отчёт пользователю
Правила: не использовать параллельных субагентов; коммитить после каждого этапа; commit trailers Co-Authored-By + Claude-Session.
