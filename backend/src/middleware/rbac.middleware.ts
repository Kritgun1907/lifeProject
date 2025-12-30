import { Request, Response, NextFunction } from "express";
import { AuthContext } from "./auth.middleware";

/**
 * RBAC Middleware - Check if user has required permission(s)
 * Must be used AFTER authenticate middleware
 */

/**
 * Require a single permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userPermissions = req.auth.permissions || [];

    if (!userPermissions.includes(permission)) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
        required: permission,
      });
      return;
    }

    next();
  };
};

/**
 * Require ALL of the specified permissions (AND logic)
 */
export const requireAllPermissions = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userPermissions = req.auth.permissions || [];
    const hasAllPermissions = permissions.every((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
        required: permissions,
      });
      return;
    }

    next();
  };
};

/**
 * Require ANY of the specified permissions (OR logic)
 */
export const requireAnyPermission = (permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userPermissions = req.auth.permissions || [];
    const hasAnyPermission = permissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAnyPermission) {
      res.status(403).json({
        success: false,
        message: "Insufficient permissions.",
        requiredAny: permissions,
      });
      return;
    }

    next();
  };
};

/**
 * Require specific role(s)
 */
export const requireRole = (roles: string | string[]) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const userRoleName = req.auth.role;

    if (!roleArray.includes(userRoleName)) {
      res.status(403).json({
        success: false,
        message: "Insufficient role privileges.",
        required: roleArray,
        current: userRoleName,
      });
      return;
    }

    next();
  };
};

/**
 * Check if user is Admin
 */
export const requireAdmin = requireRole("ADMIN");

/**
 * Check if user is Teacher or Admin
 */
export const requireTeacherOrAdmin = requireRole(["TEACHER", "ADMIN"]);

/**
 * Check if user is authenticated (has any role)
 */
export const requireAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.auth) {
    res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
    return;
  }

  next();
};

/**
 * Helper to check permission programmatically (for use in route handlers)
 */
export function hasPermission(auth: AuthContext | undefined, permission: string): boolean {
  if (!auth || !auth.permissions) {
    return false;
  }
  return auth.permissions.includes(permission);
}

/**
 * Helper to check if user has any of the permissions
 */
export function hasAnyPermission(auth: AuthContext | undefined, permissions: string[]): boolean {
  if (!auth || !auth.permissions) {
    return false;
  }
  return permissions.some((perm) => auth.permissions.includes(perm));
}

/**
 * Helper to check if user has all permissions
 */
export function hasAllPermissions(auth: AuthContext | undefined, permissions: string[]): boolean {
  if (!auth || !auth.permissions) {
    return false;
  }
  return permissions.every((perm) => auth.permissions.includes(perm));
}

/**
 * Middleware to check ownership (for self-access permissions)
 * Example: Student can only read their own data
 */
export const requireOwnership = (
  userIdField: string = "userId" // field in route params that contains the user ID
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
      return;
    }

    const targetUserId = req.params[userIdField];
    const currentUserId = req.auth.userId;

    // Check if user is trying to access their own resource
    if (targetUserId !== currentUserId) {
      // Check if user has permission to access others' resources
      const canAccessAny = hasAnyPermission(req.auth, [
        "STUDENT:READ:ANY",
        "PROFILE:UPDATE:STUDENT_ANY",
        "TEACHER:READ:ANY",
      ]);

      if (!canAccessAny) {
        res.status(403).json({
          success: false,
          message: "You can only access your own resources.",
        });
        return;
      }
    }

    next();
  };
};
