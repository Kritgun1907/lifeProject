/**
 * ===============================================
 * AUTH ROUTES
 * ===============================================
 * Route definitions for authentication.
 * Public + Protected routes.
 */

import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate, optionalAuthenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../constants/permissions";

const router = Router();

// ===============================================
// PUBLIC ROUTES (no authentication required)
// ===============================================

/**
 * @route   POST /auth/register
 * @desc    Register a new user (GUEST role by default)
 * @access  Public
 */
router.post("/register", AuthController.register);

/**
 * @route   POST /auth/login
 * @desc    Login with email and password
 * @access  Public
 */
router.post("/login", AuthController.login);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token using refresh token cookie
 * @access  Public (uses cookie)
 */
router.post("/refresh", AuthController.refresh);

/**
 * @route   POST /auth/logout
 * @desc    Logout user, optionally from all devices
 * @access  Public (optional auth for logout everywhere)
 * @body    { everywhere?: boolean }
 */
router.post("/logout", optionalAuthenticate, AuthController.logout);

// ===============================================
// PROTECTED ROUTES (authentication required)
// ===============================================

/**
 * @route   GET /auth/me
 * @desc    Get current user profile
 * @access  Protected
 */
router.get("/me", authenticate, AuthController.getMe);

/**
 * @route   PATCH /auth/profile
 * @desc    Update own profile (name, mobile)
 * @access  Protected
 */
router.patch(
  "/profile",
  authenticate,
  authorize([PERMISSIONS.PROFILE_UPDATE_SELF_LIMITED]),
  AuthController.updateProfile
);

/**
 * @route   POST /auth/change-password
 * @desc    Change own password
 * @access  Protected
 */
router.post(
  "/change-password",
  authenticate,
  authorize([PERMISSIONS.PASSWORD_CHANGE_SELF]),
  AuthController.changePassword
);

export default router;
