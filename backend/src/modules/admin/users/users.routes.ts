/**
 * ===============================================
 * ADMIN USERS ROUTES
 * ===============================================
 * Route definitions for admin user management.
 */

import { Router } from "express";
import { AdminUsersController } from "./users.controller";
import { authorize } from "../../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../../constants/permissions";

const router = Router();

// Note: Authentication and admin role check applied at parent router level

/**
 * @route   GET /admin/users
 * @desc    List all users with pagination
 * @query   role, status, search, page, limit
 */
router.get("/", AdminUsersController.listUsers);

/**
 * @route   GET /admin/users/pending-guests
 * @desc    List guests who have paid and need approval
 * Note: Must be before /:id route to avoid being captured
 */
router.get(
  "/pending-guests",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminUsersController.listPendingGuests
);

/**
 * @route   GET /admin/users/:id
 * @desc    Get user details
 */
router.get("/:id", AdminUsersController.getUserById);

/**
 * @route   POST /admin/users
 * @desc    Create a new user
 * @body    { name, email, mobile, password, roleName }
 */
router.post(
  "/",
  authorize([PERMISSIONS.STUDENT_CREATE]),
  AdminUsersController.createUser
);

/**
 * @route   PATCH /admin/users/:id
 * @desc    Update user details
 */
router.patch(
  "/:id",
  authorize([PERMISSIONS.STUDENT_UPDATE_STATUS_ANY]),
  AdminUsersController.updateUser
);

/**
 * @route   PUT /admin/users/:id/role
 * @desc    Update user role (GUEST → STUDENT, etc.)
 */
router.put(
  "/:id/role",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminUsersController.updateUserRole
);

/**
 * @route   PUT /admin/users/:id/status
 * @desc    Update user status (ACTIVE, INACTIVE, SUSPENDED)
 */
router.put(
  "/:id/status",
  authorize([PERMISSIONS.STUDENT_UPDATE_STATUS_ANY]),
  AdminUsersController.updateUserStatus
);

/**
 * @route   DELETE /admin/users/:id
 * @desc    Soft delete user
 */
router.delete(
  "/:id",
  authorize([PERMISSIONS.STUDENT_UPDATE_STATUS_ANY]),
  AdminUsersController.deleteUser
);

/**
 * @route   POST /admin/users/:id/invalidate-tokens
 * @desc    Force logout user from all devices
 */
router.post(
  "/:id/invalidate-tokens",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminUsersController.invalidateTokens
);

// ===============================================
// GUEST → STUDENT LIFECYCLE ROUTES
// ===============================================

/**
 * @route   POST /admin/users/:id/approve
 * @desc    Approve GUEST → STUDENT upgrade
 * @body    { batchId? } - optional batch to assign
 */
router.post(
  "/:id/approve",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminUsersController.approveGuestToStudent
);

/**
 * @route   POST /admin/users/:id/assign-batch
 * @desc    Assign a student to a batch
 * @body    { batchId }
 */
router.post(
  "/:id/assign-batch",
  authorize([PERMISSIONS.BATCH_UPDATE]),
  AdminUsersController.assignToBatch
);

/**
 * @route   DELETE /admin/users/:id/batch/:batchId
 * @desc    Remove student from a batch
 */
router.delete(
  "/:id/batch/:batchId",
  authorize([PERMISSIONS.BATCH_UPDATE]),
  AdminUsersController.removeFromBatch
);

export default router;
