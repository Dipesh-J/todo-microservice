'use strict';

const http = require('http');

const { createApp } = require('./app');
const { getEnv } = require('./config/env');
const { connectToDatabase, disconnectFromDatabase } = require('./config/db');
const { RabbitPublisherClient } = require('./config/rabbitmq');
const { createOutboxPublisher } = require('./messaging/publisher');
const { createOutboxRelay } = require('./outbox/outbox.relay');

async function startServer() {
  const env = getEnv();

  await connectToDatabase(
    {
      mongoUri: env.mongoUri,
      dbName: env.dbName,
      maxRetries: env.dbConnectMaxRetries,
      retryDelayMs: env.dbRetryDelayMs,
    },
    console
  );

  const rabbitClient = new RabbitPublisherClient(
    {
      url: env.rabbitmqUrl,
      queueName: env.rabbitmqQueue,
    },
    console
  );

  const publisher = createOutboxPublisher(
    {
      rabbitClient,
      queueName: env.rabbitmqQueue,
    },
    console
  );

  const relay = createOutboxRelay(
    {
      publisher,
      pollIntervalMs: env.outboxPollIntervalMs,
      batchSize: env.outboxBatchSize,
      lockTtlMs: env.outboxLockTtlMs,
      retryBaseMs: env.outboxRetryBaseMs,
      retryMaxMs: env.outboxRetryMaxMs,
    },
    console
  );

  const app = createApp();
  const server = http.createServer(app);

  let shuttingDown = false;

  async function shutdown(signal, exitCode = 0) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info({ signal }, 'Shutting down auth-service');

    await rabbitClient.close();

    await relay.stop().catch((error) => {
      console.error({ error: error.message }, 'Failed to stop outbox relay cleanly');
    });

    await new Promise((resolve) => {
      server.close(() => {
        resolve();
      });
    });

    await disconnectFromDatabase(console);

    process.exit(exitCode);
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT', 0).catch((error) => {
      console.error({ error: error.message }, 'Failed during SIGINT shutdown');
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM', 0).catch((error) => {
      console.error({ error: error.message }, 'Failed during SIGTERM shutdown');
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error) => {
    console.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
    shutdown('uncaughtException', 1).catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error({ error: error.message, stack: error.stack }, 'Unhandled promise rejection');
  });

  server.listen(env.port, () => {
    console.info({ port: env.port }, 'auth-service listening');
    relay.start();
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error({ error: error.message, stack: error.stack }, 'Failed to start auth-service');
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
