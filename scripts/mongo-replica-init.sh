#!/usr/bin/env bash
set -euo pipefail

MONGO_HOST="${MONGO_HOST:-mongo}"
MONGO_PORT="${MONGO_PORT:-27017}"
REPLICA_SET_NAME="${MONGO_REPLICA_SET_NAME:-rs0}"
MAX_RETRIES="${MAX_RETRIES:-60}"

mongo_eval() {
  mongosh --host "${MONGO_HOST}:${MONGO_PORT}" --quiet --eval "$1"
}

echo "Waiting for MongoDB at ${MONGO_HOST}:${MONGO_PORT}..."
for i in $(seq 1 "$MAX_RETRIES"); do
  if mongo_eval "db.adminCommand({ ping: 1 }).ok" >/dev/null 2>&1; then
    echo "MongoDB is available."
    break
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "MongoDB did not become available in time." >&2
    exit 1
  fi

  sleep 2
done

RS_STATUS="$(mongo_eval "try { rs.status().ok } catch (e) { 0 }")"
if [ "$RS_STATUS" != "1" ]; then
  echo "Initializing replica set ${REPLICA_SET_NAME}..."
  mongo_eval "rs.initiate({_id: '${REPLICA_SET_NAME}', members: [{_id: 0, host: '${MONGO_HOST}:${MONGO_PORT}'}]})" >/dev/null
else
  echo "Replica set already initialized."
fi

echo "Waiting for PRIMARY state..."
for i in $(seq 1 "$MAX_RETRIES"); do
  IS_PRIMARY="$(mongo_eval "db.hello().isWritablePrimary")"
  if [ "$IS_PRIMARY" = "true" ]; then
    echo "Replica set is ready."
    exit 0
  fi

  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "Replica set did not reach PRIMARY state in time." >&2
    exit 1
  fi

  sleep 2
done
