'use strict';

const { listTodos, listTodosByUserId } = require('./todo.service');

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

function parsePagination(query = {}) {
  const { limit, offset } = query;
  const details = [];

  if (limit !== undefined) {
    const parsed = Number.parseInt(limit, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      details.push('limit must be a positive integer.');
    }
  }

  if (offset !== undefined) {
    const parsed = Number.parseInt(offset, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      details.push('offset must be a non-negative integer.');
    }
  }

  if (details.length > 0) {
    throw new ValidationError('Invalid query parameters.', details);
  }

  return {
    limit,
    offset,
  };
}

function parseUserId(params = {}) {
  const userId = typeof params.userId === 'string' ? params.userId.trim() : '';

  if (!userId) {
    throw new ValidationError('userId is required in path parameter.');
  }

  if (userId.length > 128) {
    throw new ValidationError('userId must be 128 characters or fewer.');
  }

  return userId;
}

async function getAllTodos(req, res, next) {
  try {
    const pagination = parsePagination(req.query);
    const result = await listTodos(pagination);

    res.status(200).json({
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function getTodosByUserId(req, res, next) {
  try {
    const userId = parseUserId(req.params);
    const pagination = parsePagination(req.query);
    const result = await listTodosByUserId(userId, pagination);

    res.status(200).json({
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  ValidationError,
  getAllTodos,
  getTodosByUserId,
};
