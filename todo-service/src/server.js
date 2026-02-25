'use strict';

const http = require('http');

const { createApp } = require('./app');
const { getEnv } = require('./config/env');
const { connectToDatabase, disconnectFromDatabase } = require('./config/db');
const { RabbitConsumerClient } = require('./config/rabbitmq');
const { createUserRegisteredConsumer } = require('./consumer/userRegistered.consumer');

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

  const rabbitClient = new RabbitConsumerClient(
    {
      url: env.rabbitmqUrl,
      queueName: env.rabbitmqQueue,
      prefetch: env.consumerPrefetch,
    },
    console
  );

  let shuttingDown = false;

  async function shutdown(signal, exitCode = 0, server) {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.info({ signal }, 'Shutting down todo-service');

    await rabbitClient.close();

    if (server) {
      await new Promise((resolve) => {
        server.close(() => {
          resolve();
        });
      });
    }

    await disconnectFromDatabase(console);

    process.exit(exitCode);
  }

  rabbitClient.setDisconnectHandler((error) => {
    if (shuttingDown) {
      return;
    }

    console.error({ error: error.message }, 'RabbitMQ disconnected unexpectedly');
    shutdown('rabbitmq-disconnect', 1).catch((shutdownError) => {
      console.error({ error: shutdownError.message }, 'Failed to shutdown after RabbitMQ disconnect');
      process.exit(1);
    });
  });

  await rabbitClient.connect({
    maxRetries: env.rabbitConnectMaxRetries,
    retryDelayMs: env.rabbitRetryDelayMs,
  });

  const consumer = createUserRegisteredConsumer(console);
  await rabbitClient.consume(consumer);

  const app = createApp();
  const server = http.createServer(app);

  process.on('SIGINT', () => {
    shutdown('SIGINT', 0, server).catch((error) => {
      console.error({ error: error.message }, 'Failed during SIGINT shutdown');
      process.exit(1);
    });
  });

  process.on('SIGTERM', () => {
    shutdown('SIGTERM', 0, server).catch((error) => {
      console.error({ error: error.message }, 'Failed during SIGTERM shutdown');
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error) => {
    console.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
    shutdown('uncaughtException', 1, server).catch(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error({ error: error.message, stack: error.stack }, 'Unhandled promise rejection');
  });

  server.listen(env.port, () => {
    console.info({ port: env.port }, 'todo-service listening');
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error({ error: error.message, stack: error.stack }, 'Failed to start todo-service');
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
