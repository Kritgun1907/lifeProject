import { Request, Response, NextFunction } from "express";
import { User } from "../models/User.model";
import { verifyAccessToken, TokenPayload } from "../utils/jwt";

// Strong typing for auth context
export interface AuthContext {
  userId: string;
  role: string;
  permissions: string[];
}

// Extend Express Request to include auth context
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token using centralized JWT utility
    let decoded: TokenPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (error: any) {
      res.status(401).json({
        success: false,
        message: error.message || "Invalid token.",
      });
      return;
    }

    // Find user with role and permissions
    const user = await User.findOne({
      _id: decoded.sub,
      isDeleted: false,
    })
      .populate({
        path: "role",
        match: { isActive: true },
      })
      .populate("status")
      .select("name email mobile role status isDeleted tokenVersion");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User not found or inactive.",
      });
      return;
    }

    // Check token version for invalidated tokens (after role change, logout all, etc.)
    if (decoded.tokenVersion !== undefined) {
      const userTokenVersion = (user as any).tokenVersion || 0;
      if (decoded.tokenVersion !== userTokenVersion) {
        res.status(401).json({
          success: false,
          message: "Token has been invalidated. Please login again.",
        });
        return;
      }
    }

    if (!user.role) {
      res.status(403).json({
        success: false,
        message: "User role is inactive or missing.",
      });
      return;
    }

    // Check if user status is active
    const status = user.status as any;
    if (status && status.name !== "ACTIVE") {
      res.status(403).json({
        success: false,
        message: `Account is ${status.name}. Please contact administrator.`,
      });
      return;
    }

    // Get role with permissions (permissions are stored as strings in the role)
    const userRole = user.role as any;
    const dbPermissions: string[] = userRole.permissions || [];

    // ═══════════════════════════════════════════════════════════════
    // PERMISSION MISMATCH HARDENING
    // Prevents using old JWTs after role permissions have changed
    // ═══════════════════════════════════════════════════════════════
    const tokenPermissions: string[] = decoded.permissions || [];
    
    const permissionsMatch =
      tokenPermissions.length === dbPermissions.length &&
      tokenPermissions.every((p: string) => dbPermissions.includes(p)) &&
      dbPermissions.every((p: string) => tokenPermissions.includes(p));

    if (!permissionsMatch) {
      res.status(401).json({
        success: false,
        message: "Permissions have changed. Please login again.",
        hint: "Your role permissions were updated. Re-authenticate to continue.",
      });
      return;
    }

    // Attach normalized auth context (not full Mongoose documents)
    req.auth = {
      userId: user._id.toString(),
      role: userRole.name,
      permissions: userRole.permissions || [],
    };

    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
      return;
    }

    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Token expired.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Authentication failed.",
      error: error.message,
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is present, but doesn't fail if not
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token using centralized JWT utility
    let decoded: TokenPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      // If token is invalid, just continue without auth
      next();
      return;
    }

    const user = await User.findOne({
      _id: decoded.sub,
      isDeleted: false,
    })
      .populate({
        path: "role",
        match: { isActive: true },
      })
      .populate("status")
      .select("-password");

    if (user && user.role) {
      const userRole = user.role as any;
      
      // Attach normalized auth context
      req.auth = {
        userId: user._id.toString(),
        role: userRole.name,
        permissions: userRole.permissions || [],
      };
    }

    next();
  } catch (error) {
    // If token verification fails, just continue without user
    next();
  }
};
