'use strict';

const amqp = require('amqplib');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class RabbitConsumerClient {
  constructor({ url, queueName, prefetch = 20 }, logger = console) {
    this.url = url;
    this.queueName = queueName;
    this.prefetch = prefetch;
    this.logger = logger;

    this.connection = null;
    this.channel = null;
    this.consumerTag = null;
    this.closing = false;
    this.onDisconnect = null;
  }

  setDisconnectHandler(handler) {
    this.onDisconnect = handler;
  }

  async connect({ maxRetries = 0, retryDelayMs = 2000 } = {}) {
    let attempt = 0;

    while (!this.closing) {
      try {
        this.connection = await amqp.connect(this.url, {
          heartbeat: 30,
        });

        this.connection.on('error', (error) => {
          this.logger.error({ error: error.message }, 'RabbitMQ connection error (consumer)');
        });

        this.connection.on('close', () => {
          this.logger.error('RabbitMQ connection closed (consumer)');
          this.channel = null;
          this.connection = null;

          if (!this.closing && typeof this.onDisconnect === 'function') {
            this.onDisconnect(new Error('RabbitMQ connection closed.'));
          }
        });

        this.channel = await this.connection.createChannel();
        await this.channel.assertQueue(this.queueName, {
          durable: true,
        });
        await this.channel.prefetch(this.prefetch);

        this.logger.info({ queue: this.queueName, prefetch: this.prefetch }, 'RabbitMQ consumer channel ready');
        return;
      } catch (error) {
        attempt += 1;
        const shouldStop = maxRetries > 0 && attempt >= maxRetries;

        this.logger.error(
          {
            attempt,
            shouldStop,
            retryInMs: retryDelayMs,
            error: error.message,
          },
          'Failed to connect RabbitMQ consumer'
        );

        if (shouldStop) {
          throw error;
        }

        await sleep(retryDelayMs);
      }
    }

    throw new Error('RabbitMQ consumer was closed before connection completed.');
  }

  async consume(handler) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not connected.');
    }

    const consumeResult = await this.channel.consume(
      this.queueName,
      async (message) => {
        if (!message) {
          return;
        }

        try {
          await handler(message, this.channel);
        } catch (error) {
          this.logger.error({ error: error.message }, 'Unhandled consumer handler error');

          try {
            this.channel.nack(message, false, true);
          } catch (nackError) {
            this.logger.error({ error: nackError.message }, 'Failed to NACK message');
          }
        }
      },
      {
        noAck: false,
      }
    );

    this.consumerTag = consumeResult.consumerTag;
  }

  async close() {
    this.closing = true;

    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag).catch(() => {
        this.logger.warn('Failed to cancel RabbitMQ consumer');
      });
    }

    if (this.channel) {
      await this.channel.close().catch(() => {
        this.logger.warn('Failed to close RabbitMQ channel');
      });
    }

    if (this.connection) {
      await this.connection.close().catch(() => {
        this.logger.warn('Failed to close RabbitMQ connection');
      });
    }

    this.channel = null;
    this.connection = null;
    this.consumerTag = null;
  }
}

module.exports = {
  RabbitConsumerClient,
};
