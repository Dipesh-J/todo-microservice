'use strict';

const { randomUUID } = require('crypto');

const EVENT_TYPES = Object.freeze({
  USER_REGISTERED: 'USER_REGISTERED',
});

const QUEUES = Object.freeze({
  USER_REGISTERED: 'user.registered',
});

function buildUserRegisteredEvent({ userId, email }) {
  if (!userId || !email) {
    throw new Error('userId and email are required to build USER_REGISTERED event');
  }

  return {
    eventId: randomUUID(),
    eventType: EVENT_TYPES.USER_REGISTERED,
    occurredAt: new Date().toISOString(),
    payload: {
      userId,
      email,
    },
  };
}

module.exports = {
  EVENT_TYPES,
  QUEUES,
  buildUserRegisteredEvent,
};
