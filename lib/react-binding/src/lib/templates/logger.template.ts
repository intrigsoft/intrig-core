import {typescript} from "common";
import * as path from 'path'

export function loggerTemplate(_path: string) {
  const ts = typescript(path.resolve(_path, 'src', 'logger.ts'))

  return ts`
// logger.ts

import log, { LogLevelDesc } from 'loglevel';

// Extend the global interfaces
declare global {
  interface Window {
    setLogLevel?: (level: LogLevelDesc) => void;
  }
}

// 1) Build-time default via Vite (if available)
//    Cast import.meta to any to avoid TS errors if env isn't typed
const buildDefault =
  typeof import.meta !== 'undefined'
    ? ((import.meta as any).env?.VITE_LOG_LEVEL as string | undefined)
    : undefined;

// 2) Stored default in localStorage
const storedLevel =
  typeof localStorage !== 'undefined'
    ? (localStorage.getItem('LOG_LEVEL') as string | null)
    : null;

// Determine initial log level: build-time → stored → 'error'
const defaultLevel: LogLevelDesc =
  (buildDefault as LogLevelDesc) ?? (storedLevel as LogLevelDesc) ?? 'error';

// Apply initial level
log.setLevel(defaultLevel);

// Expose a console setter to change level at runtime
if (typeof window !== 'undefined') {
  window.setLogLevel = (level: LogLevelDesc): void => {
    log.setLevel(level);
    try {
      localStorage.setItem('LOG_LEVEL', String(level));
    } catch {
      // ignore if storage is unavailable
    }
    console.log(\`✏️  loglevel set to '\${level}'\`);
  };
}

// Consistent wrapper API
export const logger = {
  info: (msg: unknown, meta?: unknown): void =>
    meta ? log.info(msg, meta) : log.info(msg),
  warn: (msg: unknown, meta?: unknown): void =>
    meta ? log.warn(msg, meta) : log.warn(msg),
  error: (msg: unknown, meta?: unknown): void =>
    meta ? log.error(msg, meta) : log.error(msg),
  debug: (msg: unknown, meta?: unknown): void =>
    meta ? log.debug(msg, meta) : log.debug(msg),
};

export default logger;

`
}
