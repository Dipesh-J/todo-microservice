'use strict';

const { EVENT_TYPES } = require('./events');

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateBaseEvent(event) {
  const errors = [];

  if (!isPlainObject(event)) {
    errors.push('Event must be an object.');
    return { valid: false, errors };
  }

  if (typeof event.eventId !== 'string' || event.eventId.trim().length === 0) {
    errors.push('eventId must be a non-empty string.');
  }

  if (typeof event.eventType !== 'string' || event.eventType.trim().length === 0) {
    errors.push('eventType must be a non-empty string.');
  }

  if (typeof event.occurredAt !== 'string' || Number.isNaN(Date.parse(event.occurredAt))) {
    errors.push('occurredAt must be a valid ISO datetime string.');
  }

  if (!isPlainObject(event.payload)) {
    errors.push('payload must be an object.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateUserRegisteredEvent(event) {
  const result = validateBaseEvent(event);
  const errors = [...result.errors];

  if (!result.valid) {
    return {
      valid: false,
      errors,
    };
  }

  if (event.eventType !== EVENT_TYPES.USER_REGISTERED) {
    errors.push(`eventType must be ${EVENT_TYPES.USER_REGISTERED}.`);
  }

  if (typeof event.payload.userId !== 'string' || event.payload.userId.trim().length === 0) {
    errors.push('payload.userId must be a non-empty string.');
  }

  if (typeof event.payload.email !== 'string' || event.payload.email.trim().length === 0) {
    errors.push('payload.email must be a non-empty string.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function parseMessageContent(content) {
  const text = Buffer.isBuffer(content) ? content.toString('utf8') : String(content);

  try {
    return JSON.parse(text);
  } catch (error) {
    const parseError = new Error('Message is not valid JSON.');
    parseError.name = 'EventValidationError';
    parseError.details = [error.message];
    throw parseError;
  }
}

function assertUserRegisteredEvent(event) {
  const validation = validateUserRegisteredEvent(event);

  if (!validation.valid) {
    const validationError = new Error('Invalid USER_REGISTERED event payload.');
    validationError.name = 'EventValidationError';
    validationError.details = validation.errors;
    throw validationError;
  }

  return event;
}

module.exports = {
  validateBaseEvent,
  validateUserRegisteredEvent,
  parseMessageContent,
  assertUserRegisteredEvent,
};
