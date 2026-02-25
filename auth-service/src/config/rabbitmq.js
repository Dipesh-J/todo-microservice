'use strict';

const amqp = require('amqplib');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

class RabbitPublisherClient {
  constructor({ url, queueName, reconnectDelayMs = 3000 }, logger = console) {
    this.url = url;
    this.queueName = queueName;
    this.reconnectDelayMs = reconnectDelayMs;
    this.logger = logger;

    this.connection = null;
    this.channel = null;
    this.isClosed = false;
    this.connectPromise = null;
  }

  async ensureChannel() {
    if (this.isClosed) {
      throw new Error('RabbitPublisherClient is closed.');
    }

    if (this.channel) {
      return this.channel;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.connect();
    }

    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }

    if (!this.channel) {
      throw new Error('RabbitMQ confirm channel is unavailable.');
    }

    return this.channel;
  }

  async connect() {
    while (!this.isClosed) {
      try {
        this.connection = await amqp.connect(this.url, {
          heartbeat: 30,
        });

        this.connection.on('error', (error) => {
          this.logger.error({ error: error.message }, 'RabbitMQ connection error (publisher)');
        });

        this.connection.on('close', () => {
          this.logger.warn('RabbitMQ connection closed (publisher)');
          this.channel = null;
          this.connection = null;
        });

        this.channel = await this.connection.createConfirmChannel();
        await this.channel.assertQueue(this.queueName, {
          durable: true,
        });

        this.logger.info({ queue: this.queueName }, 'RabbitMQ confirm channel ready');
        return;
      } catch (error) {
        this.logger.error(
          {
            error: error.message,
            retryInMs: this.reconnectDelayMs,
          },
          'Failed to connect RabbitMQ publisher; retrying'
        );

        await sleep(this.reconnectDelayMs);
      }
    }
  }

  async close() {
    this.isClosed = true;

    const channel = this.channel;
    const connection = this.connection;

    this.channel = null;
    this.connection = null;

    if (channel) {
      await channel.close().catch(() => {
        this.logger.warn('Failed to close RabbitMQ channel cleanly');
      });
    }

    if (connection) {
      await connection.close().catch(() => {
        this.logger.warn('Failed to close RabbitMQ connection cleanly');
      });
    }
  }
}

module.exports = {
  RabbitPublisherClient,
};
