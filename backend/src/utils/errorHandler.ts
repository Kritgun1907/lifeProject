import { Response } from "express";
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  UnprocessableEntityError,
} from "../errors/AppError";

/**
 * ===============================================
 * ERROR RESPONSE FORMATTER
 * ===============================================
 * Formats errors into consistent API response structure
 */

interface ErrorResponse {
  success: false;
  message: string;
  errorType: string;
  statusCode?: number;
  errors?: any[];
  stack?: string;
}

/**
 * Centralized error response handler
 * Formats all errors into consistent API responses
 * 
 * @param error - The error object to handle
 * @param res - Express response object
 * @param defaultMessage - Fallback message if error has no message
 */
export const handleError = (
  error: any,
  res: Response,
  defaultMessage: string = "An error occurred"
): void => {
  // Log error for debugging (in production, use proper logger like Winston)
  console.error(`[Error Handler]:`, {
    name: error.name,
    message: error.message,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });

  // Handle custom AppError instances
  if (error instanceof AppError) {
    const errorResponse: ErrorResponse = {
      success: false,
      message: error.message,
      errorType: error.name,
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.stack = error.stack;
    }

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle Mongoose validation errors
  if (error.name === "ValidationError" && error.errors) {
    const errors = Object.values(error.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));

    res.status(400).json({
      success: false,
      message: "Validation failed",
      errorType: "ValidationError",
      errors,
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (error.name === "CastError") {
    res.status(400).json({
      success: false,
      message: `Invalid ${error.path}: ${error.value}`,
      errorType: "CastError",
    });
    return;
  }

  // Handle Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    res.status(409).json({
      success: false,
      message: `${field} already exists`,
      errorType: "DuplicateKeyError",
    });
    return;
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    res.status(401).json({
      success: false,
      message: "Invalid token",
      errorType: "JsonWebTokenError",
    });
    return;
  }

  if (error.name === "TokenExpiredError") {
    res.status(401).json({
      success: false,
      message: "Token expired",
      errorType: "TokenExpiredError",
    });
    return;
  }

  // Default to 500 Internal Server Error
  res.status(500).json({
    success: false,
    message: defaultMessage,
    errorType: "InternalServerError",
    ...(process.env.NODE_ENV === "development" && {
      error: error.message,
      stack: error.stack,
    }),
  });
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Eliminates the need for try-catch blocks in every controller
 * 
 * @param fn - Async function to wrap
 * @returns Wrapped function that catches errors
 * 
 * @example
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await UserService.getAll();
 *   res.json({ success: true, data: users });
 * }));
 */
export const asyncHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Express error handling middleware
 * Should be registered as the last middleware in the app
 * 
 * @example
 * app.use(errorMiddleware);
 */
export const errorMiddleware = (error: any, req: any, res: Response, next: any) => {
  handleError(error, res);
};
