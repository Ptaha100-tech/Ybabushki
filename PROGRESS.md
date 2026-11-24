# Прогресс разработки (для продолжения после паузы лимита)

Сделано: Caddy/nginx; каркас контента (types, subjects, rng, build, index, check.ts, scripts/check-content.sh);
заполнены russian, english, world, geography, history, physics, chemistry (проверить check-content.sh).
Осталось по порядку (готовы math, informatics, literature, biology):
1. content: russian 9–11 классы (g9..g11 в russian.ts, добавить в export)
2. backend: entities (slug/subject/icon/contentHash, User.grade), SeedService синхронизация, типы заданий order/match/text, /catalog, игры, рейтинг, rate limiter
3. app: ребрендинг «Моя школа», лендинг, инфо-страницы, плееры заданий, игры, PWA (manifest, sw, иконки), кнопка установки
4. README, backup-скрипт, коммит+push (Co-Authored-By + Claude-Session), итог пользователю
Правила: не использовать параллельных субагентов (быстро жгут лимит); коммитить после каждого этапа.
