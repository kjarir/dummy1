/**
 * Production-safe logger utility
 * Removes console logs in production builds for security and performance
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

class Logger {
  private shouldLog(level: LogLevel): boolean {
    // Only log in development or if explicitly enabled
    if (isDevelopment) return true;
    
    // In production, only log errors and warnings
    return level === 'error' || level === 'warn';
  }

  private sanitizeMessage(message: unknown): string {
    if (typeof message === 'string') {
      // Remove potential sensitive data patterns
      return message
        .replace(/api[_-]?key["\s:=]+([^\s"',}\]]+)/gi, 'api_key=***')
        .replace(/token["\s:=]+([^\s"',}\]]+)/gi, 'token=***')
        .replace(/password["\s:=]+([^\s"',}\]]+)/gi, 'password=***')
        .replace(/secret["\s:=]+([^\s"',}\]]+)/gi, 'secret=***')
        .replace(/authorization["\s:]+Bearer\s+([^\s"',}\]]+)/gi, 'authorization: Bearer ***');
    }
    
    try {
      const stringified = JSON.stringify(message);
      return this.sanitizeMessage(stringified);
    } catch {
      return '[Non-serializable object]';
    }
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(...args.map(arg => this.sanitizeMessage(arg)));
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(...args.map(arg => this.sanitizeMessage(arg)));
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(...args.map(arg => this.sanitizeMessage(arg)));
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(...args.map(arg => this.sanitizeMessage(arg)));
    }
  }

  group(...args: unknown[]): void {
    if (isDevelopment && console.group) {
      console.group(...args);
    }
  }

  groupEnd(): void {
    if (isDevelopment && console.groupEnd) {
      console.groupEnd();
    }
  }
}

export const logger = new Logger();

