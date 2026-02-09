/**
 * Structured logging utility for the server-side environment.
 * Supports configurable log levels via environment variables.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
  'silent': LogLevel.SILENT,
};

// Determine default log level based on environment
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_LEVEL = isProduction ? LogLevel.INFO : LogLevel.DEBUG;

// Current configured log level
const CURRENT_LEVEL = process.env.LOG_LEVEL
  ? (LOG_LEVEL_MAP[process.env.LOG_LEVEL.toLowerCase()] ?? DEFAULT_LEVEL)
  : DEFAULT_LEVEL;

export class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= CURRENT_LEVEL;
  }

  private formatMessage(message: string): string {
    return `[${this.prefix}] ${message}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(message), ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage(message), ...args);
    }
  }
}

/**
 * Factory for creating module-specific loggers
 */
export function createLogger(module: string): Logger {
  return new Logger(module);
}
