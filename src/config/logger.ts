import winston from 'winston';

/**
 * Create a centralized logger instance for the application
 * Winston handles logging to files and console with different levels
 */
const logger = winston.createLogger({
  /**
   * Log level depends on environment:
   * - production → info and above
   * - development → debug and above
   */
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  /**
   * Define how logs should be formatted
   */
  format: winston.format.combine(
    // Add timestamp to every log entry
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),

    // Capture and print full error stack traces
    winston.format.errors({ stack: true }),

    // Enable string interpolation (e.g. logger.info('%s logged in', user))
    winston.format.splat(),

    // Output logs in JSON format (good for log analysis tools)
    winston.format.json()
  ),

  /**
   * Default metadata added to every log entry
   */
  defaultMeta: { service: 'pliz-app' },

  /**
   * Define where logs are stored
   */
  transports: [
    // Store only error-level logs in a separate file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),

    // Store all logs (info, warn, error, etc.) in one file
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

/**
 * In development mode:
 * - Also log to the console
 * - Use colorized and human-readable output
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Color log levels
        winston.format.simple()    // Simple console-friendly format
      ),
    })
  );
}

export default logger;
