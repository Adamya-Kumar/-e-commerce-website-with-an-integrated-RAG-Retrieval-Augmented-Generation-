import 'dotenv/config';
import app from './app.js';
import { connectDb } from './config/db.js';
import { logger } from './utils/logger.js';

const port = Number(process.env.PORT) || 5000;

try {
  await connectDb();
  app.listen(port, () => {
    logger.info({ port }, 'Server listening');
  });
} catch (err) {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
}
