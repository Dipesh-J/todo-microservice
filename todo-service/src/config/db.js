'use strict';

const mongoose = require('mongoose');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function connectToDatabase({ mongoUri, dbName, maxRetries = 0, retryDelayMs = 1000 }, logger = console) {
  let attempt = 0;

  while (true) {
    try {
      await mongoose.connect(mongoUri, {
        dbName,
        maxPoolSize: 20,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info({ dbName }, 'Connected to MongoDB');
      return;
    } catch (error) {
      attempt += 1;
      const shouldStop = maxRetries > 0 && attempt >= maxRetries;

      logger.error(
        {
          attempt,
          shouldStop,
          error: error.message,
        },
        'Failed to connect to MongoDB'
      );

      if (shouldStop) {
        throw error;
      }

      const delay = Math.min(retryDelayMs * 2 ** (attempt - 1), 10000);
      await sleep(delay);
    }
  }
}

async function disconnectFromDatabase(logger = console) {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

module.exports = {
  connectToDatabase,
  disconnectFromDatabase,
};
