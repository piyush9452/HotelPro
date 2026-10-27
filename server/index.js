import { assertProductionConfig, env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { expireStalePendingBookings, startExpirySweeper } from './services/bookingService.js';
import { logger } from './utils/logger.js';

async function start() {
  try {
    assertProductionConfig();
  } catch (err) {
    logger.error(err.message);
    process.exit(1);
  }

  try {
    await connectDB();
  } catch (err) {
    logger.error(`Could not connect to MongoDB at ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}: ${err.message}`);
    logger.error('Is MongoDB running? See README > Troubleshooting.');
    process.exit(1);
  }

  await expireStalePendingBookings();
  const sweeper = startExpirySweeper();

  const app = createApp();
  const server = app.listen(env.port, () => {
    logger.info(`HotelPro API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    if (env.mockPaymentsEnabled) logger.warn('Razorpay is not configured: using the DEVELOPMENT MOCK payment gateway');
  });

  server.on('error', (err) => {
    logger.error(err.code === 'EADDRINUSE' ? `Port ${env.port} is already in use` : err.message);
    process.exit(1);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received, shutting down gracefully`);
    clearInterval(sweeper);
    server.close(async () => {
      await disconnectDB().catch(() => {});
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason?.stack || reason}`));
}

start();
