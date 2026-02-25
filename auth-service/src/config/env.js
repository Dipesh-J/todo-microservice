'use strict';

const path = require('path');
const dotenv = require('dotenv');

const { QUEUES } = require('../../../shared/events');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function parseInteger(value, fallback, name) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  if (parsed < 0) {
    throw new Error(`${name} must be greater than or equal to 0.`);
  }

  return parsed;
}

function getEnv() {
  const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInteger(process.env.PORT, 3001, 'PORT'),
    mongoUri: process.env.MONGODB_URI,
    dbName: process.env.DB_NAME || 'auth_db',
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    rabbitmqQueue: process.env.RABBITMQ_QUEUE || QUEUES.USER_REGISTERED,
    outboxPollIntervalMs: parseInteger(process.env.OUTBOX_POLL_INTERVAL_MS, 3000, 'OUTBOX_POLL_INTERVAL_MS'),
    outboxBatchSize: parseInteger(process.env.OUTBOX_BATCH_SIZE, 20, 'OUTBOX_BATCH_SIZE'),
    outboxLockTtlMs: parseInteger(process.env.OUTBOX_LOCK_TTL_MS, 30000, 'OUTBOX_LOCK_TTL_MS'),
    outboxRetryBaseMs: parseInteger(process.env.OUTBOX_RETRY_BASE_MS, 2000, 'OUTBOX_RETRY_BASE_MS'),
    outboxRetryMaxMs: parseInteger(process.env.OUTBOX_RETRY_MAX_MS, 60000, 'OUTBOX_RETRY_MAX_MS'),
    dbConnectMaxRetries: parseInteger(process.env.DB_CONNECT_MAX_RETRIES, 0, 'DB_CONNECT_MAX_RETRIES'),
    dbRetryDelayMs: parseInteger(process.env.DB_RETRY_DELAY_MS, 1000, 'DB_RETRY_DELAY_MS'),
  };

  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  return env;
}

module.exports = {
  getEnv,
};
