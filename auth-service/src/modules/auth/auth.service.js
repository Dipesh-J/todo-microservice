'use strict';

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { buildUserRegisteredEvent } = require('../../../../shared/events');
const { User } = require('../../models/user.model');
const { Outbox } = require('../../models/outbox.model');

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

async function registerUser({ email, password }) {
  const session = await mongoose.startSession();
  const normalizedEmail = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  let createdUser = null;

  try {
    await session.withTransaction(
      async () => {
        const existingUser = await User.findOne({ email: normalizedEmail }).session(session).lean();

        if (existingUser) {
          throw new ConflictError('Email is already registered.');
        }

        const [user] = await User.create(
          [
            {
              email: normalizedEmail,
              passwordHash,
            },
          ],
          { session }
        );

        createdUser = user;

        const event = buildUserRegisteredEvent({
          userId: user.id,
          email: user.email,
        });

        await Outbox.create(
          [
            {
              eventId: event.eventId,
              eventType: event.eventType,
              occurredAt: new Date(event.occurredAt),
              payload: event.payload,
              status: 'PENDING',
            },
          ],
          { session }
        );
      },
      {
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
      }
    );

    return {
      userId: createdUser.id,
      email: createdUser.email,
    };
  } catch (error) {
    if (error instanceof ConflictError) {
      throw error;
    }

    if (error && error.code === 11000) {
      throw new ConflictError('Email is already registered.');
    }

    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  ConflictError,
  registerUser,
};
