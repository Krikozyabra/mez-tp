# Stage 1: Build React app
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --legacy-peer-deps --no-audit --progress=false

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Stage 2: Production - Nginx для статических файлов
FROM nginx:alpine

# Копируем собранные React файлы
COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]