/**
 * ===============================================
 * REQUEST LOGGING MIDDLEWARE
 * ===============================================
 * Tracks every HTTP request with:
 * - Unique Request ID (UUID)
 * - User ID (if authenticated)
 * - Route & Method
 * - Response time
 * - Status code
 * 
 * Adds X-Request-ID header to all responses for tracing.
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

// Extend Express Request to include requestId and startTime
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// Color codes for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// Get color based on status code
function getStatusColor(status: number): string {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  if (status >= 200) return colors.green;
  return colors.reset;
}

// Get color based on response time
function getTimeColor(ms: number): string {
  if (ms > 1000) return colors.red;
  if (ms > 500) return colors.yellow;
  if (ms > 100) return colors.cyan;
  return colors.green;
}

// Format method with fixed width
function formatMethod(method: string): string {
  return method.padEnd(7);
}

/**
 * Request Logger Middleware
 * Must be used early in the middleware chain
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate unique request ID
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader("X-Request-ID", requestId);

  // Capture the original end function
  const originalEnd = res.end;
  
  // Override res.end to log after response
  res.end = function (this: Response, ...args: any[]): Response {
    const responseTime = Date.now() - (req.startTime || Date.now());
    const statusCode = res.statusCode;
    
    // Get user ID from authenticated request
    const userId = (req as any).user?.sub || (req as any).user?.id || "anonymous";
    const userRole = (req as any).user?.role || "-";
    
    // Format log entry
    const timestamp = new Date().toISOString();
    const method = formatMethod(req.method);
    const url = req.originalUrl || req.url;
    const statusColor = getStatusColor(statusCode);
    const timeColor = getTimeColor(responseTime);
    
    // Log format: [timestamp] REQUEST_ID | METHOD URL | STATUS | TIME | USER
    console.log(
      `${colors.dim}[${timestamp}]${colors.reset} ` +
      `${colors.magenta}${requestId.slice(0, 8)}${colors.reset} | ` +
      `${colors.bright}${method}${colors.reset} ${url} | ` +
      `${statusColor}${statusCode}${colors.reset} | ` +
      `${timeColor}${responseTime}ms${colors.reset} | ` +
      `${colors.blue}${userId === "anonymous" ? "anon" : userId.slice(-8)}${colors.reset} ` +
      `${colors.dim}(${userRole})${colors.reset}`
    );

    // Call original end function
    return originalEnd.apply(this, args as any);
  };

  next();
}

/**
 * Get request context for use in services/controllers
 * Useful for including request ID in error messages or audit logs
 */
export function getRequestContext(req: Request): {
  requestId: string;
  userId: string;
  userRole: string;
  ip: string;
  userAgent: string;
} {
  return {
    requestId: req.requestId || "unknown",
    userId: (req as any).user?.sub || (req as any).user?.id || "anonymous",
    userRole: (req as any).user?.role || "guest",
    ip: req.ip || req.socket.remoteAddress || "unknown",
    userAgent: req.get("user-agent") || "unknown",
  };
}

export default requestLogger;
