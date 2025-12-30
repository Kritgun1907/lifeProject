/**
 * ===============================================
 * BASE APPLICATION ERROR
 * ===============================================
 * Base class for all custom application errors.
 * Provides consistent error structure across the application.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ===============================================
 * VALIDATION ERROR (400)
 * ===============================================
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

/**
 * ===============================================
 * AUTHENTICATION ERROR (401)
 * ===============================================
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * ===============================================
 * AUTHORIZATION ERROR (403)
 * ===============================================
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403);
    this.name = "AuthorizationError";
  }
}

/**
 * ===============================================
 * NOT FOUND ERROR (404)
 * ===============================================
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with ID ${identifier} not found`
      : `${resource} not found`;
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * ===============================================
 * CONFLICT ERROR (409)
 * ===============================================
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * ===============================================
 * UNPROCESSABLE ENTITY ERROR (422)
 * ===============================================
 */
export class UnprocessableEntityError extends AppError {
  constructor(message: string) {
    super(message, 422);
    this.name = "UnprocessableEntityError";
  }
}

/**
 * ===============================================
 * INTERNAL SERVER ERROR (500)
 * ===============================================
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(message, 500, false); // Non-operational error
    this.name = "InternalServerError";
  }
}
