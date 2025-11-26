/**
 * Production-ready logging utility
 * Provides conditional logging based on environment
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogOptions {
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.isProduction = import.meta.env.PROD;
  }

  /**
   * Format log message with context
   */
  private formatMessage(level: LogLevel, message: string, options?: LogOptions): string {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    return `[${timestamp}]${context} ${message}`;
  }

  /**
   * Log development-only messages
   * Disabled in production
   */
  log(message: string, options?: LogOptions): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage('log', message, options);
      console.log(formatted, options?.data ||'');
    }
  }

  /**
   * Log informational messages
   * Shown in development only
   */
  info(message: string, options?: LogOptions): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage('info', message, options);
      console.info(formatted, options?.data || '');
    }
  }

  /**
   * Log warnings
   * Always shown (important for production monitoring)
   */
  warn(message: string, options?: LogOptions): void {
    const formatted = this.formatMessage('warn', message, options);
    console.warn(formatted, options?.data || '');
  }

  /**
   * Log errors
   * Always shown (critical for production monitoring)
   */
  error(message: string, error?: Error | any, options?: LogOptions): void {
    const formatted = this.formatMessage('error', message, options);
    console.error(formatted, error || '', options?.data || '');
    
    // In production, could send to error tracking service
    if (this.isProduction) {
      // TODO: Send to Sentry/LogRocket/etc
    }
  }

  /**
   * Debug logging (development only)
   */
  debug(message: string, options?: LogOptions): void {
    if (this.isDevelopment) {
      const formatted = this.formatMessage('debug', message, options);
      console.debug(formatted, options?.data || '');
    }
  }

  /**
   * Group related logs (development only)
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Log API requests (development only)
   */
  apiRequest(method: string, url: string, data?: any): void {
    if (this.isDevelopment) {
      this.log(`API ${method} ${url}`, {
        context: 'API',
        data,
      });
    }
  }

  /**
   * Log API responses (development only)
   */
  apiResponse(method: string, url: string, status: number, data?: any): void {
    if (this.isDevelopment) {
      this.log(`API ${method} ${url} - ${status}`, {
        context: 'API',
        data,
      });
    }
  }

  /**
   * Log API errors (always shown)
   */
  apiError(method: string, url: string, error: any): void {
    this.error(`API ${method} ${url} failed`, error, {
      context: 'API',
    });
  }
}

// Create and export logger instance
export const logger = new Logger();

// Export type for consumers
export type { LogOptions };
