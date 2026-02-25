'use strict';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

function validateRegisterPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const password = typeof payload.password === 'string' ? payload.password : '';

  const details = [];

  if (!EMAIL_REGEX.test(email)) {
    details.push('email must be a valid email address.');
  }

  if (password.length < 8 || password.length > 72) {
    details.push('password must be between 8 and 72 characters.');
  }

  if (details.length > 0) {
    throw new ValidationError('Invalid registration payload.', details);
  }

  return {
    email,
    password,
  };
}

module.exports = {
  ValidationError,
  validateRegisterPayload,
};
