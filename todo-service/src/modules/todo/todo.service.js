'use strict';

const mongoose = require('mongoose');

const { EVENT_TYPES } = require('../../../../shared/events');
const { Todo } = require('../../models/todo.model');
const { ProcessedEvent } = require('../../models/processed-event.model');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function normalizePagination({ limit, offset } = {}) {
  const parsedLimit = Number.parseInt(limit ?? DEFAULT_LIMIT, 10);
  const parsedOffset = Number.parseInt(offset ?? 0, 10);

  return {
    limit: Number.isNaN(parsedLimit) ? DEFAULT_LIMIT : Math.max(1, Math.min(parsedLimit, MAX_LIMIT)),
    offset: Number.isNaN(parsedOffset) ? 0 : Math.max(0, parsedOffset),
  };
}

async function createWelcomeTodoFromEvent(event) {
  if (event.eventType !== EVENT_TYPES.USER_REGISTERED) {
    throw new Error(`Unsupported event type: ${event.eventType}`);
  }

  const session = await mongoose.startSession();

  try {
    let created = false;
    let skipped = false;

    await session.withTransaction(
      async () => {
        const existingEvent = await ProcessedEvent.findOne({ eventId: event.eventId }).session(session).lean();
        if (existingEvent) {
          skipped = true;
          return;
        }

        const upsertResult = await Todo.updateOne(
          {
            userId: event.payload.userId,
            type: 'WELCOME',
          },
          {
            $setOnInsert: {
              userId: event.payload.userId,
              type: 'WELCOME',
              title: 'Welcome to the App',
              completed: false,
              sourceEventId: event.eventId,
            },
          },
          {
            upsert: true,
            session,
          }
        );

        await ProcessedEvent.create(
          [
            {
              eventId: event.eventId,
              eventType: event.eventType,
              processedAt: new Date(),
            },
          ],
          { session }
        );

        created = upsertResult.upsertedCount > 0;
      },
      {
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
      }
    );

    return {
      created,
      skipped,
    };
  } catch (error) {
    if (error && error.code === 11000) {
      return {
        created: false,
        skipped: true,
      };
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

async function listTodos({ limit, offset } = {}) {
  const pagination = normalizePagination({ limit, offset });

  const [items, total] = await Promise.all([
    Todo.find({})
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean(),
    Todo.countDocuments({}),
  ]);

  return {
    items,
    pagination: {
      ...pagination,
      total,
    },
  };
}

async function listTodosByUserId(userId, { limit, offset } = {}) {
  const pagination = normalizePagination({ limit, offset });
  const filter = { userId };

  const [items, total] = await Promise.all([
    Todo.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean(),
    Todo.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      ...pagination,
      total,
    },
  };
}

module.exports = {
  createWelcomeTodoFromEvent,
  listTodos,
  listTodosByUserId,
  normalizePagination,
};
