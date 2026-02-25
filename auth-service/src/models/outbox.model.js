'use strict';

const mongoose = require('mongoose');

const outboxSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SENT'],
      default: 'PENDING',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lockedAt: {
      type: Date,
      default: null,
      index: true,
    },
    lastError: {
      type: String,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

outboxSchema.index({ status: 1, nextAttemptAt: 1, lockedAt: 1, createdAt: 1 });

const Outbox = mongoose.model('Outbox', outboxSchema);

module.exports = {
  Outbox,
};
