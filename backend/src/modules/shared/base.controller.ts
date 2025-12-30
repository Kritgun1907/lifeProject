/**
 * ===============================================
 * BASE CONTROLLER - SHARED UTILITIES
 * ===============================================
 * Provides common patterns for all module controllers.
 * Reduces boilerplate and ensures consistency.
 */

import { Request, Response, NextFunction } from "express";
import { AppError, NotFoundError, ValidationError } from "../../errors";

/**
 * Async handler wrapper - eliminates try/catch boilerplate
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Standard success response
 */
export const successResponse = (
  res: Response,
  data: any,
  message?: string,
  statusCode: number = 200
) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Paginated response helper
 */
export const paginatedResponse = (
  res: Response,
  data: any[],
  pagination: {
    total: number;
    page: number;
    limit: number;
  },
  message?: string
) => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  
  res.json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages,
      hasNext: pagination.page < totalPages,
      hasPrev: pagination.page > 1,
    },
  });
};

/**
 * Extract pagination params from query
 */
export const getPaginationParams = (query: any) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  
  return { page, limit, skip };
};

/**
 * Get auth context from request (throws if not authenticated)
 */
export const getAuthContext = (req: Request) => {
  if (!req.auth) {
    throw new AppError("Authentication required", 401);
  }
  return req.auth;
};

/**
 * Validate required fields in request body
 */
export const validateRequired = (body: any, fields: string[]) => {
  const missing = fields.filter((f) => !body[f]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(", ")}`);
  }
};

/**
 * Validate MongoDB ObjectId format
 */
export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Ensure valid ObjectId or throw
 */
export const validateObjectId = (id: string, fieldName: string = "ID") => {
  if (!isValidObjectId(id)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
};
