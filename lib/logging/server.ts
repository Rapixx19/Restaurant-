/**
 * Server-Side Logging Utilities
 *
 * Standardized logging for server-side code with structured error tracking.
 * In production, these could be extended to send to external logging services.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  operation?: string;
  userId?: string;
  organizationId?: string;
  restaurantId?: string;
  [key: string]: unknown;
}

interface ErrorContext extends LogContext {
  error: unknown;
  stack?: string;
}

/**
 * Determine if we're in production environment.
 */
function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Structured logger that outputs JSON in production.
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...context,
  };

  if (isProduction()) {
    // In production, output structured JSON for log aggregation
    console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
      JSON.stringify(logEntry)
    );
  } else {
    // In development, use readable format
    const prefix = `[${level.toUpperCase()}] ${timestamp}`;
    if (context && Object.keys(context).length > 0) {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        prefix,
        message,
        context
      );
    } else {
      console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](
        prefix,
        message
      );
    }
  }
}

/**
 * Log debug information (only in development).
 */
export function logDebug(message: string, context?: LogContext): void {
  if (!isProduction()) {
    log('debug', message, context);
  }
}

/**
 * Log informational message.
 */
export function logInfo(message: string, context?: LogContext): void {
  log('info', message, context);
}

/**
 * Log warning message.
 */
export function logWarn(message: string, context?: LogContext): void {
  log('warn', message, context);
}

/**
 * Log error with full context.
 */
export function logError(message: string, context?: ErrorContext): void {
  const errorContext = { ...context };

  // Extract useful error information
  if (context?.error) {
    if (context.error instanceof Error) {
      errorContext.errorMessage = context.error.message;
      errorContext.errorName = context.error.name;
      if (!isProduction()) {
        errorContext.stack = context.error.stack;
      }
    } else if (typeof context.error === 'string') {
      errorContext.errorMessage = context.error;
    } else {
      errorContext.errorMessage = String(context.error);
    }
    delete errorContext.error;
  }

  log('error', message, errorContext);
}

/**
 * Create a scoped logger for a specific component.
 */
export function createLogger(component: string) {
  return {
    debug: (message: string, context?: Omit<LogContext, 'component'>) =>
      logDebug(message, { component, ...context }),
    info: (message: string, context?: Omit<LogContext, 'component'>) =>
      logInfo(message, { component, ...context }),
    warn: (message: string, context?: Omit<LogContext, 'component'>) =>
      logWarn(message, { component, ...context }),
    error: (message: string, context?: Omit<ErrorContext, 'component'>) =>
      logError(message, { component, error: context?.error ?? 'Unknown error', ...context }),
  };
}
