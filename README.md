# Todo Microservice

Reliable event-driven microservices with Auth (producer + outbox relay) and Todo (consumer).

## Basic Flow

1. `POST /register` creates `User` and `Outbox` event in one MongoDB transaction.
2. Outbox relay publishes pending events to RabbitMQ and marks them `SENT` only after broker confirm.
3. Todo consumer processes `USER_REGISTERED` and creates one welcome todo (idempotent).

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- RabbitMQ
- Docker Compose

## Prerequisites

- Docker Desktop installed and running
- `docker compose` available

Verify:

```bash
docker --version
docker compose version
```

## Run Locally (Reviewer Steps)

1. Clone and open the repo:

```bash
git clone <your-repo-url>
cd todo-microservice
```

2. (Optional) copy env template:

```bash
cp .env.example .env
```

3. Start all services:

```bash
docker compose up --build -d
```

4. Check containers:

```bash
docker compose ps
```

5. Health checks:

```bash
curl http://localhost:3001/healthz
curl http://localhost:3002/healthz
```

## API Endpoints

### Auth Service

- `POST /register`

Example:

```bash
curl -X POST http://localhost:3001/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user1@example.com","password":"StrongPass123"}'
```

### Todo Service

- `GET /todos?limit=50&offset=0`
- `GET /todos/:userId?limit=50&offset=0`

Examples:

```bash
curl 'http://localhost:3002/todos?limit=50&offset=0'
curl 'http://localhost:3002/todos/<userId>?limit=50&offset=0'
```

## RabbitMQ Failure Simulation

1. Stop RabbitMQ:

```bash
docker compose stop rabbitmq
```

2. Register a user while RabbitMQ is down (should still return `201`):

```bash
EMAIL="failtest_$(date +%s)@example.com"
curl -X POST http://localhost:3001/register \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"StrongPass123\"}"
```

3. Confirm pending outbox event:

```bash
docker compose exec mongo mongosh --quiet --eval \
'db.getSiblingDB("auth_db").outboxes.find({status:"PENDING"}).sort({createdAt:-1}).pretty()'
```

4. Start RabbitMQ again:

```bash
docker compose start rabbitmq
```

5. Confirm recovery:

```bash
docker compose exec mongo mongosh --quiet --eval \
'db.getSiblingDB("auth_db").outboxes.find({}).sort({createdAt:-1}).pretty()'

docker compose exec mongo mongosh --quiet --eval \
'db.getSiblingDB("todo_db").todos.find({}).sort({createdAt:-1}).pretty()'
```

## Postman

Import these files:

- `postman/todo-microservice.postman_collection.json`
- `postman/todo-microservice.local.postman_environment.json`

Recommended run order:

1. Health Checks
2. Auth - Registration
3. Todo - Query APIs

## Logs and Debugging

```bash
docker compose logs -f auth-service todo-service rabbitmq
```

## Stop / Cleanup

Stop services:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```
