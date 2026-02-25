'use strict';

function serializeError(error) {
  return {
    message: error.message,
    name: error.name,
  };
}

function createOutboxPublisher({ rabbitClient, queueName }, logger = console) {
  async function publish(event) {
    const channel = await rabbitClient.ensureChannel();
    const body = Buffer.from(JSON.stringify(event), 'utf8');

    await new Promise((resolve, reject) => {
      try {
        channel.sendToQueue(
          queueName,
          body,
          {
            persistent: true,
            contentType: 'application/json',
            contentEncoding: 'utf-8',
            timestamp: Date.now(),
            messageId: event.eventId,
            type: event.eventType,
            appId: 'auth-service',
          },
          (error, ok) => {
            if (error) {
              reject(error);
              return;
            }

            if (ok === false) {
              reject(new Error('RabbitMQ negatively acknowledged message.'));
              return;
            }

            resolve();
          }
        );
      } catch (error) {
        reject(error);
      }
    }).catch((error) => {
      logger.error(
        {
          eventId: event.eventId,
          eventType: event.eventType,
          error: serializeError(error),
        },
        'Failed to publish outbox event'
      );

      throw error;
    });
  }

  return {
    publish,
  };
}

module.exports = {
  createOutboxPublisher,
};
