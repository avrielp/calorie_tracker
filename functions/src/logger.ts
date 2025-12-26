import { logger } from 'firebase-functions';

export const log = {
  debug: (msg: string, meta?: any) => logger.debug(msg, meta),
  info: (msg: string, meta?: any) => logger.info(msg, meta),
  warn: (msg: string, meta?: any) => logger.warn(msg, meta),
  error: (msg: string, meta?: any) => logger.error(msg, meta),
};


