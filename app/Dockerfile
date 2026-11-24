# Сборка веб-версии приложения (Expo → статические файлы) и раздача через nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json .npmrc ./
RUN npm install
COPY . .
# Выравнивает версии пакетов под установленный Expo SDK; не критично, если не сработало.
RUN npx expo install --fix || echo "expo install --fix пропущен"
# По умолчанию API на том же домене (/api проксирует nginx).
ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export --platform web
# Подключаем манифест, значки и тему к index.html (установка как приложения, PWA).
RUN sed -i 's#<html lang="en">#<html lang="ru">#; s#</head>#<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="icon" type="image/png" href="/favicon.png"><meta name="theme-color" content="\#4F46E5"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-title" content="Моя школа"><meta name="description" content="Задания по всем школьным предметам с 1 по 11 класс: учись играя"></head>#' dist/index.html \
 && cp -r public/. dist/ && (grep -c manifest dist/index.html || true)

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
