FROM node:20-alpine

WORKDIR /app/todo-service

COPY todo-service/package*.json ./
RUN npm ci --omit=dev

COPY todo-service ./
COPY shared /app/shared

ENV NODE_ENV=production

EXPOSE 3002

CMD ["node", "src/server.js"]
