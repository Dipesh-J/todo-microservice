'use strict';

const { Outbox } = require('../models/outbox.model');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function computeRetryDelay(attempts, baseMs, maxMs) {
  const expDelay = baseMs * 2 ** Math.max(attempts - 1, 0);
  return Math.min(expDelay, maxMs);
}

function createOutboxRelay(
  {
    publisher,
    pollIntervalMs = 3000,
    batchSize = 20,
    lockTtlMs = 30000,
    retryBaseMs = 2000,
    retryMaxMs = 60000,
  },
  logger = console
) {
  let timer = null;
  let isPolling = false;
  let stopped = false;

  async function claimNextPendingEvent() {
    const now = new Date();
    const lockExpiryThreshold = new Date(Date.now() - lockTtlMs);

    return Outbox.findOneAndUpdate(
      {
        status: 'PENDING',
        nextAttemptAt: { $lte: now },
        $or: [{ lockedAt: null }, { lockedAt: { $lte: lockExpiryThreshold } }],
      },
      {
        $set: {
          lockedAt: now,
        },
      },
      {
        sort: { createdAt: 1 },
        new: true,
      }
    );
  }

  async function markAsSent(eventId) {
    await Outbox.updateOne(
      { eventId },
      {
        $set: {
          status: 'SENT',
          sentAt: new Date(),
          lockedAt: null,
          lastError: null,
        },
      }
    );
  }

  async function markAsFailed(event, error) {
    const attempts = (event.attempts || 0) + 1;
    const retryDelayMs = computeRetryDelay(attempts, retryBaseMs, retryMaxMs);

    await Outbox.updateOne(
      { eventId: event.eventId },
      {
        $set: {
          attempts,
          lastError: error.message,
          lockedAt: null,
          nextAttemptAt: new Date(Date.now() + retryDelayMs),
        },
      }
    );

    logger.warn(
      {
        eventId: event.eventId,
        attempts,
        retryDelayMs,
        error: error.message,
      },
      'Outbox publish failed; event rescheduled'
    );
  }

  async function processBatch() {
    let processedCount = 0;

    while (!stopped && processedCount < batchSize) {
      const event = await claimNextPendingEvent();

      if (!event) {
        return;
      }

      const outboundMessage = {
        eventId: event.eventId,
        eventType: event.eventType,
        occurredAt: event.occurredAt.toISOString(),
        payload: event.payload,
      };

      try {
        await publisher.publish(outboundMessage);
        await markAsSent(event.eventId);
        processedCount += 1;
      } catch (error) {
        await markAsFailed(event, error);
      }
    }
  }

  async function tick() {
    if (stopped || isPolling) {
      return;
    }

    isPolling = true;

    try {
      await processBatch();
    } catch (error) {
      logger.error({ error: error.message }, 'Outbox relay tick failed');
    } finally {
      isPolling = false;

      if (!stopped) {
        timer = setTimeout(() => {
          tick().catch((error) => {
            logger.error({ error: error.message }, 'Outbox relay loop crashed');
          });
        }, pollIntervalMs);
      }
    }
  }

  function start() {
    if (stopped) {
      throw new Error('Outbox relay cannot be restarted after stop.');
    }

    if (!timer && !isPolling) {
      timer = setTimeout(() => {
        tick().catch((error) => {
          logger.error({ error: error.message }, 'Outbox relay failed to start');
        });
      }, 0);

      logger.info('Outbox relay started');
    }
  }

  async function stop() {
    stopped = true;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    while (isPolling) {
      await sleep(50);
    }

    logger.info('Outbox relay stopped');
  }

  return {
    start,
    stop,
  };
}

module.exports = {
  createOutboxRelay,
};
