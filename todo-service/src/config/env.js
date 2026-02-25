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
    port: parseInteger(process.env.PORT, 3002, 'PORT'),
    mongoUri: process.env.MONGODB_URI,
    dbName: process.env.DB_NAME || 'todo_db',
    rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    rabbitmqQueue: process.env.RABBITMQ_QUEUE || QUEUES.USER_REGISTERED,
    consumerPrefetch: parseInteger(process.env.CONSUMER_PREFETCH, 20, 'CONSUMER_PREFETCH'),
    dbConnectMaxRetries: parseInteger(process.env.DB_CONNECT_MAX_RETRIES, 0, 'DB_CONNECT_MAX_RETRIES'),
    dbRetryDelayMs: parseInteger(process.env.DB_RETRY_DELAY_MS, 1000, 'DB_RETRY_DELAY_MS'),
    rabbitConnectMaxRetries: parseInteger(
      process.env.RABBITMQ_CONNECT_MAX_RETRIES,
      0,
      'RABBITMQ_CONNECT_MAX_RETRIES'
    ),
    rabbitRetryDelayMs: parseInteger(process.env.RABBITMQ_RETRY_DELAY_MS, 2000, 'RABBITMQ_RETRY_DELAY_MS'),
  };

  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is required.');
  }

  return env;
}

module.exports = {
  getEnv,
};
