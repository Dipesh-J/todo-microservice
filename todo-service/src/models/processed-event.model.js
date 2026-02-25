'use strict';

const mongoose = require('mongoose');

const processedEventSchema = new mongoose.Schema(
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
    processedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    timestamps: false,
  }
);

const ProcessedEvent = mongoose.model('ProcessedEvent', processedEventSchema);

module.exports = {
  ProcessedEvent,
};
