# Сборка веб-версии приложения (Expo → статические файлы) и раздача через nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Выравнивает версии пакетов под установленный Expo SDK; не критично, если не сработало.
RUN npx expo install --fix || echo "expo install --fix пропущен"
# По умолчанию API на том же домене (/api проксирует nginx).
ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export --platform web

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
