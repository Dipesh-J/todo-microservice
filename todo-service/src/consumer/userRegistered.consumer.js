'use strict';

const { EVENT_TYPES } = require('../../../shared/events');
const { parseMessageContent, assertUserRegisteredEvent } = require('../../../shared/message-schema');
const { createWelcomeTodoFromEvent } = require('../modules/todo/todo.service');

function createUserRegisteredConsumer(logger = console) {
  return async function onMessage(message, channel) {
    let event;

    try {
      event = parseMessageContent(message.content);

      if (event.eventType !== EVENT_TYPES.USER_REGISTERED) {
        logger.warn({ eventType: event.eventType }, 'Skipping unsupported event type');
        try {
          channel.ack(message);
        } catch (ackError) {
          logger.error({ error: ackError.message }, 'Failed to ACK unsupported event');
        }
        return;
      }

      assertUserRegisteredEvent(event);

      const result = await createWelcomeTodoFromEvent(event);

      try {
        channel.ack(message);
      } catch (ackError) {
        logger.error({ error: ackError.message }, 'Failed to ACK processed event');
        throw ackError;
      }

      logger.info(
        {
          eventId: event.eventId,
          userId: event.payload.userId,
          created: result.created,
          skipped: result.skipped,
        },
        'Processed USER_REGISTERED event'
      );
    } catch (error) {
      const isValidationError = error.name === 'EventValidationError';

      if (isValidationError) {
        logger.warn(
          {
            details: error.details || [error.message],
          },
          'Dropping invalid event payload'
        );

        try {
          channel.ack(message);
        } catch (ackError) {
          logger.error({ error: ackError.message }, 'Failed to ACK invalid event');
        }
        return;
      }

      logger.error(
        {
          error: error.message,
          eventId: event && event.eventId,
        },
        'Failed to process USER_REGISTERED event'
      );

      try {
        channel.nack(message, false, true);
      } catch (nackError) {
        logger.error({ error: nackError.message }, 'Failed to NACK failed event');
      }
    }
  };
}

module.exports = {
  createUserRegisteredConsumer,
};
