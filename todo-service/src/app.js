'use strict';

const express = require('express');
const helmet = require('helmet');

const todoRouter = require('./modules/todo/todo.routes');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));

  app.get('/healthz', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'todo-service',
    });
  });

  app.use('/', todoRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: 'Route not found.',
    });
  });

  app.use((error, _req, res, _next) => {
    const statusCode = error.statusCode || 500;

    const response = {
      error: error.message || 'Internal server error.',
    };

    if (error.details) {
      response.details = error.details;
    }

    if (process.env.NODE_ENV !== 'production' && error.stack) {
      response.stack = error.stack;
    }

    res.status(statusCode).json(response);
  });

  return app;
}

module.exports = {
  createApp,
};
