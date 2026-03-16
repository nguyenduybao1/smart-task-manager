import app from './app';
import { config } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

async function main() {
  app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.env}]`);
  });
}

main().catch(async (err) => {
  logger.error('Fatal error', err);
  await prisma.$disconnect();
  process.exit(1);
});