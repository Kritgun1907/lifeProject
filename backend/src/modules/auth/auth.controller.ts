/**
 * ===============================================
 * AUTH CONTROLLER
 * ===============================================
 * HTTP handlers for authentication operations.
 * Thin layer - delegates to service.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  getAuthContext,
  validateRequired,
} from "../shared";
import * as AuthService from "./auth.service";
import { REFRESH_COOKIE_OPTIONS } from "../../utils/jwt";
import { ValidationError } from "../../errors";
import { auditService, AUDIT_ACTIONS } from "../../services/audit.service";
import { getRequestContext } from "../../middleware/requestLogger.middleware";

// ===============================================
// VALIDATION HELPERS
// ===============================================

function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
}

function validateMobile(mobile: string): void {
  const mobileRegex = /^[0-9]{10}$/;
  if (!mobileRegex.test(mobile)) {
    throw new ValidationError("Mobile number must be 10 digits");
  }
}

function validatePassword(password: string): void {
  if (password.length < 4) {
    throw new ValidationError("Password must be at least 4 characters");
  }
}

// ===============================================
// AUTH CONTROLLER
// ===============================================

export class AuthController {
  /**
   * POST /auth/register
   * Register a new user (GUEST by default)
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, mobile, password } = req.body;

    // Validation
    validateRequired(req.body, ["name", "email", "mobile", "password"]);
    validateEmail(email);
    validateMobile(mobile);
    validatePassword(password);

    // Register user
    const user = await AuthService.registerUser({ name, email, mobile, password });

    // Generate tokens
    const { accessToken, refreshToken } = await AuthService.issueTokens(user);

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    const userRole = user.role as any;

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: userRole.name,
        permissions: userRole.permissions,
      },
    });
  });

  /**
   * POST /auth/login
   * Login existing user
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    validateRequired(req.body, ["email", "password"]);

    // Login user
    const user = await AuthService.loginUser(email, password);

    // Generate tokens
    const { accessToken, refreshToken } = await AuthService.issueTokens(user);

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

    const userRole = user.role as any;

    // Audit log successful login
    await auditService.log({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      performedBy: user._id,
      performerRole: userRole.name,
      targetModel: 'User',
      targetId: user._id,
      description: `User ${user.name} (${user.email}) logged in`,
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      },
      requestContext: getRequestContext(req),
    });

    res.json({
      success: true,
      message: "Login successful",
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: userRole.name,
        permissions: userRole.permissions,
      },
    });
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token from cookie
   */
  static refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token missing. Please login again.",
      });
      return;
    }

    // Refresh tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await AuthService.refreshAccessToken(refreshToken);

    // Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      token: accessToken,
    });
  });

  /**
   * POST /auth/logout
   * Logout user - clears refresh token cookie
   */
  static logout = asyncHandler(async (req: Request, res: Response) => {
    const { everywhere } = req.body || {};

    // Clear refresh token cookie
    res.clearCookie("refreshToken", { path: "/auth" });

    // If "logout everywhere" and user is authenticated
    if (everywhere && req.auth?.userId) {
      await AuthService.invalidateAllTokens(req.auth.userId);
    }

    // Audit log logout
    if (req.auth?.userId) {
      await auditService.log({
        action: AUDIT_ACTIONS.LOGOUT,
        performedBy: req.auth.userId,
        performerRole: req.auth.role || 'UNKNOWN',
        targetModel: 'User',
        targetId: req.auth.userId,
        description: everywhere ? 'User logged out from all devices' : 'User logged out',
        metadata: { everywhere: !!everywhere },
        requestContext: getRequestContext(req),
      });
    }

    successResponse(
      res,
      null,
      everywhere ? "Logged out from all devices" : "Logged out successfully"
    );
  });

  /**
   * GET /auth/me
   * Get current user profile
   */
  static getMe = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);

    const userProfile = await AuthService.getUserProfile(userId);

    successResponse(res, userProfile);
  });

  /**
   * PATCH /auth/profile
   * Update own profile (limited fields)
   */
  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { name, mobile } = req.body;

    const user = await AuthService.updateOwnProfile(userId, { name, mobile });

    const userRole = user.role as any;
    const userStatus = user.status as any;

    successResponse(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: userRole.name,
      status: userStatus.name,
    }, "Profile updated successfully");
  });

  /**
   * POST /auth/change-password
   * Change own password
   */
  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { currentPassword, newPassword } = req.body;

    validateRequired(req.body, ["currentPassword", "newPassword"]);
    validatePassword(newPassword);

    await AuthService.changePassword(userId, currentPassword, newPassword);

    // Audit log password change (WARNING level - security sensitive)
    await auditService.logWarning({
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      performedBy: userId,
      performerRole: req.auth?.role || 'UNKNOWN',
      targetModel: 'User',
      targetId: userId,
      description: 'User changed their password',
      requestContext: getRequestContext(req),
    });

    // Clear refresh token to force re-login
    res.clearCookie("refreshToken", { path: "/auth" });

    successResponse(res, null, "Password changed. Please login again.");
  });
}

export default AuthController;
