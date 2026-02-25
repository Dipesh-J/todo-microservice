FROM node:20-alpine

WORKDIR /app/auth-service

COPY auth-service/package*.json ./
RUN npm ci --omit=dev

COPY auth-service ./
COPY shared /app/shared

ENV NODE_ENV=production

EXPOSE 3001

CMD ["node", "src/server.js"]
