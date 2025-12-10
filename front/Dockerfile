FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build 

FROM alpine:latest
RUN apk --no-cache add rsync
WORKDIR /app
COPY --from=builder /app/dist ./dist