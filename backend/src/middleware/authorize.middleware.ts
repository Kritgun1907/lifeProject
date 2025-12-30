/**
 * ===============================================
 * AUTHORIZATION MIDDLEWARE - PERMISSION-BASED ACCESS
 * ===============================================
 * 
 * This middleware enforces permission-based access control.
 * Use AFTER authenticate middleware to check specific permissions.
 * 
 * Usage:
 *   router.post("/resource", authenticate, authorize(["RESOURCE_CREATE"]), controller);
 *   router.put("/resource/:id", authenticate, authorize(["RESOURCE_UPDATE"]), controller);
 * 
 * Supports:
 *   - Single permission: authorize(["ATTENDANCE_CREATE"])
 *   - Multiple permissions (ALL required): authorize(["BATCH_READ", "STUDENT_READ"])
 *   - Any of permissions: authorizeAny(["ADMIN_ACCESS", "TEACHER_ACCESS"])
 */

import { Request, Response, NextFunction } from "express";

/**
 * Require ALL specified permissions
 * User must have every permission in the array
 */
export const authorize =
  (requiredPermissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    // Check if user is authenticated
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userPermissions = req.auth.permissions || [];

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      const missing = requiredPermissions.filter(
        (perm) => !userPermissions.includes(perm)
      );

      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        required: requiredPermissions,
        missing,
        yourPermissions: userPermissions,
      });
      return;
    }

    next();
  };

/**
 * Require ANY of the specified permissions
 * User must have at least one permission from the array
 */
export const authorizeAny =
  (requiredPermissions: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userPermissions = req.auth.permissions || [];

    // Check if user has ANY of the required permissions
    const hasAnyPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAnyPermission) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
        requiredAnyOf: requiredPermissions,
        yourPermissions: userPermissions,
      });
      return;
    }

    next();
  };

/**
 * Check if user has a specific permission (helper for controllers)
 * Returns boolean, doesn't throw
 */
export const hasPermission = (req: Request, permission: string): boolean => {
  if (!req.auth) return false;
  return (req.auth.permissions || []).includes(permission);
};

/**
 * Check if user has ALL specified permissions (helper for controllers)
 */
export const hasAllPermissions = (
  req: Request,
  permissions: string[]
): boolean => {
  if (!req.auth) return false;
  const userPermissions = req.auth.permissions || [];
  return permissions.every((perm) => userPermissions.includes(perm));
};

/**
 * Check if user has ANY of the specified permissions (helper for controllers)
 */
export const hasAnyPermission = (
  req: Request,
  permissions: string[]
): boolean => {
  if (!req.auth) return false;
  const userPermissions = req.auth.permissions || [];
  return permissions.some((perm) => userPermissions.includes(perm));
};

export default authorize;
