import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import FileStreamRotator from 'file-stream-rotator';
import log4js from 'log4js';

import { loadConfig } from '@/config/Config';

let configured = false;

function configure(): void {
  if (configured) return;
  const { logging, env } = loadConfig();
  const appenders: Record<string, log4js.Appender> = { console: { type: 'console' } };
  const used = ['console'];
  if (env !== 'test') {
    mkdirSync(logging.dir, { recursive: true });
    appenders.file = {
      type: 'dateFile',
      filename: join(logging.dir, 'app.log'),
      pattern: 'yyyy-MM-dd',
      numBackups: 14,
      compress: true,
    };
    used.push('file');
  }
  log4js.configure({ appenders, categories: { default: { appenders: used, level: logging.level } } });
  configured = true;
}

export function getLogger(category = 'app'): log4js.Logger {
  configure();
  return log4js.getLogger(category);
}

/** morgan erişim logları için günlük dönen dosya akışı. */
export function createAccessLogStream(): NodeJS.WritableStream {
  const { logging } = loadConfig();
  mkdirSync(logging.dir, { recursive: true });
  return FileStreamRotator.getStream({
    filename: join(logging.dir, 'access-%DATE%.log'),
    frequency: 'daily',
    date_format: 'YYYY-MM-DD',
    max_logs: '14d',
    verbose: false,
  }) as NodeJS.WritableStream;
}
