/**
 * error.ts
 *
 * Standardized error handling for MCP tools
 * Provides consistent error codes, retryability, and status codes
 */

/**
 * Standard error codes for MCP tool execution
 */
export enum ToolErrorCode {
  /** User provided invalid arguments */
  INVALID_ARGS = 'invalid_args',

  /** Tool execution exceeded timeout */
  TIMEOUT = 'timeout',

  /** Rate limit exceeded for this tool */
  RATE_LIMITED = 'rate_limited',

  /** Tool execution failed with external error */
  EXECUTION_FAILED = 'execution_failed',

  /** External API returned error */
  EXTERNAL_API_ERROR = 'external_api_error',

  /** Resource not found */
  NOT_FOUND = 'not_found',

  /** Security validation failed (ReDoS, SSRF, etc.) */
  SECURITY_ERROR = 'security_error',

  /** Resource exhaustion (memory, CPU, connections) */
  RESOURCE_EXHAUSTED = 'resource_exhausted',
}

/**
 * Standard error class for MCP tools
 * Provides consistent error handling across all tools
 */
export class ToolError extends Error {
  code: ToolErrorCode;
  retryable: boolean;
  statusCode?: number;

  constructor(
    message: string,
    code: ToolErrorCode,
    options?: {
      retryable?: boolean;
      statusCode?: number;
    },
  ) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.retryable = options?.retryable ?? false;
    this.statusCode = options?.statusCode;

    // Maintain prototype chain
    Object.setPrototypeOf(this, ToolError.prototype);
  }

  /**
   * Convert to JSON for logging/transport
   */
  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Determine if an error is retryable
 * Useful for deciding whether to retry failed tool executions
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ToolError) {
    return error.retryable;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Network errors are typically retryable
    return (
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('etimedout') ||
      message.includes('timeout')
    );
  }
  return false;
}

/**
 * Convert standard errors to ToolError
 * Useful in tool error handlers to ensure consistent error format
 */
export function wrapError(error: unknown, toolName: string): ToolError {
  if (error instanceof ToolError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network timeout
    if (message.includes('timeout')) {
      return new ToolError(
        `${toolName}: Request timeout`,
        ToolErrorCode.TIMEOUT,
        { retryable: true },
      );
    }

    // Connection refused
    if (message.includes('econnrefused')) {
      return new ToolError(
        `${toolName}: Connection refused`,
        ToolErrorCode.EXTERNAL_API_ERROR,
        { retryable: true, statusCode: 503 },
      );
    }

    // Default to execution failed
    return new ToolError(
      `${toolName}: ${error.message}`,
      ToolErrorCode.EXECUTION_FAILED,
      { retryable: false },
    );
  }

  return new ToolError(
    `${toolName}: Unknown error`,
    ToolErrorCode.EXECUTION_FAILED,
    { retryable: false },
  );
}

/**
 * Helper to create validation errors
 */
export function validationError(
  toolName: string,
  field: string,
  reason: string,
): ToolError {
  return new ToolError(
    `${toolName}: Invalid ${field} - ${reason}`,
    ToolErrorCode.INVALID_ARGS,
  );
}

/**
 * Helper to create timeout errors
 */
export function timeoutError(toolName: string, durationMs: number): ToolError {
  return new ToolError(
    `${toolName}: Execution timeout after ${durationMs}ms`,
    ToolErrorCode.TIMEOUT,
    { retryable: true },
  );
}

/**
 * Helper to create rate limit errors
 */
export function rateLimitError(
  toolName: string,
  retryAfter: number,
): ToolError {
  const error = new ToolError(
    `${toolName}: Rate limit exceeded. Retry after ${retryAfter}s`,
    ToolErrorCode.RATE_LIMITED,
    { retryable: true, statusCode: 429 },
  );
  return error;
}

/**
 * Helper to create security errors
 */
export function securityError(toolName: string, reason: string): ToolError {
  return new ToolError(
    `${toolName}: Security validation failed - ${reason}`,
    ToolErrorCode.SECURITY_ERROR,
  );
}
