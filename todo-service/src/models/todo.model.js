'use strict';

const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      default: 'WELCOME',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    sourceEventId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

todoSchema.index({ userId: 1, type: 1 }, { unique: true });

const Todo = mongoose.model('Todo', todoSchema);

module.exports = {
  Todo,
};
