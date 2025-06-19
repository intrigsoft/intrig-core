import log from 'loglevel';

// Set the default logging level (can be overridden via environment variables)
log.setLevel((process.env.LOG_LEVEL as log.LogLevelDesc) || 'error');

const logWrapper = {
  info: (msg: string, meta?: object) =>
    meta ? log.info(msg, meta) : log.info(msg),
  warn: (msg: string, meta?: object) =>
    meta ? log.warn(msg, meta) : log.warn(msg),
  error: (msg: string, meta?: object) =>
    meta ? log.error(msg, meta) : log.error(msg),
  debug: (msg: string, meta?: object) =>
    meta ? log.debug(msg, meta) : log.debug(msg),
};

export default logWrapper;
