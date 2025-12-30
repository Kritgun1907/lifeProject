/**
 * ===============================================
 * ADMIN USERS CONTROLLER
 * ===============================================
 * HTTP handlers for admin user management.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  paginatedResponse,
  getPaginationParams,
  validateObjectId,
  validateRequired,
  getAuthContext,
} from "../../shared";
import * as UsersService from "./users.service";
import { auditService, AUDIT_ACTIONS } from "../../../services/audit.service";
import { getRequestContext } from "../../../middleware/requestLogger.middleware";

export class AdminUsersController {
  /**
   * GET /admin/users
   * List all users with filters
   */
  static listUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req.query);
    const { role, status, search } = req.query;

    const result = await UsersService.listUsers({
      role: role as string,
      status: status as string,
      search: search as string,
      page,
      limit,
    });

    paginatedResponse(res, result.users, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /admin/users/:id
   * Get user details
   */
  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "userId");

    const user = await UsersService.getUserById(id);

    successResponse(res, user);
  });

  /**
   * POST /admin/users
   * Create a new user
   */
  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    validateRequired(req.body, ["name", "email", "mobile", "password", "roleName"]);

    const { name, email, mobile, password, roleName } = req.body;

    const user = await UsersService.createUser({
      name,
      email,
      mobile,
      password,
      roleName,
    });

    // Audit log user creation
    await auditService.log({
      action: AUDIT_ACTIONS.USER_CREATED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'User',
      targetId: user._id,
      description: `User "${name}" (${email}) created with role ${roleName}`,
      newState: { name, email, roleName },
      requestContext: getRequestContext(req),
    });

    successResponse(res, user, "User created successfully", 201);
  });

  /**
   * PATCH /admin/users/:id
   * Update user details
   */
  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "userId");

    const { name, email, mobile } = req.body;

    const user = await UsersService.updateUser(id, { name, email, mobile });

    successResponse(res, user, "User updated successfully");
  });

  /**
   * PUT /admin/users/:id/role
   * Update user's role
   */
  static updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const { id } = req.params;
    const { roleId, roleName } = req.body;

    validateObjectId(id, "userId");

    if (!roleId && !roleName) {
      throw new Error("Either roleId or roleName is required");
    }

    const oldUser = await UsersService.getUserById(id);
    const oldRole = (oldUser.role as any)?.name || 'UNKNOWN';
    const user = await UsersService.updateUserRole(id, roleId || roleName);

    const userRole = user.role as any;

    // Audit log role change (CRITICAL - security sensitive)
    await auditService.logCritical({
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'User',
      targetId: id,
      description: `User role changed from ${oldRole} to ${userRole.name}`,
      previousState: { role: oldRole },
      newState: { role: userRole.name },
      requestContext: getRequestContext(req),
    });

    successResponse(
      res,
      {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: userRole.name,
        permissions: userRole.permissions,
      },
      `Role updated to ${userRole.name}. User must re-login.`
    );
  });

  /**
   * PUT /admin/users/:id/status
   * Update user's status
   */
  static updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const { id } = req.params;
    const { status } = req.body;

    validateObjectId(id, "userId");
    validateRequired(req.body, ["status"]);

    const oldUser = await UsersService.getUserById(id);
    const oldStatus = (oldUser.status as any)?.name || oldUser.status || 'UNKNOWN';
    const user = await UsersService.updateUserStatus(id, status);

    // Audit log status change (WARNING - affects user access)
    await auditService.logWarning({
      action: AUDIT_ACTIONS.USER_STATUS_CHANGED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'User',
      targetId: id,
      description: `User status changed from ${oldStatus} to ${status}`,
      previousState: { status: oldStatus },
      newState: { status },
      requestContext: getRequestContext(req),
    });

    successResponse(res, user, `Status updated to ${user.status}`);
  });

  /**
   * DELETE /admin/users/:id
   * Soft delete user
   */
  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const { id } = req.params;
    validateObjectId(id, "userId");

    const user = await UsersService.getUserById(id);
    await UsersService.deleteUser(id);

    // Audit log user deletion (CRITICAL)
    await auditService.logCritical({
      action: AUDIT_ACTIONS.USER_DELETED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'User',
      targetId: id,
      description: `User "${user.name}" (${user.email}) deleted`,
      previousState: { name: user.name, email: user.email },
      requestContext: getRequestContext(req),
    });

    successResponse(res, null, "User deleted successfully");
  });

  /**
   * POST /admin/users/:id/invalidate-tokens
   * Force logout user from all devices
   */
  static invalidateTokens = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "userId");

    await UsersService.invalidateUserTokens(id);

    successResponse(res, null, "All user tokens invalidated");
  });

  // ===============================================
  // GUEST → STUDENT LIFECYCLE
  // ===============================================

  /**
   * GET /admin/users/pending-guests
   * List guests who have paid and are waiting for approval
   */
  static listPendingGuests = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req.query);

    const result = await UsersService.listPendingGuests(page, limit);

    paginatedResponse(
      res,
      result.users,
      { total: result.total, page: result.page, limit: result.limit },
      "Pending guests retrieved"
    );
  });

  /**
   * POST /admin/users/:id/approve
   * Approve GUEST → STUDENT upgrade
   */
  static approveGuestToStudent = asyncHandler(async (req: Request, res: Response) => {
    const auth = getAuthContext(req);
    const { id } = req.params;
    const { batchId } = req.body;

    validateObjectId(id, "userId");
    if (batchId) {
      validateObjectId(batchId, "batchId");
    }

    const result = await UsersService.approveGuestToStudent(id, batchId);

    // Audit log guest approval (role change)
    await auditService.logWarning({
      action: AUDIT_ACTIONS.ROLE_CHANGED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'User',
      targetId: id,
      description: `Guest approved and upgraded to STUDENT`,
      previousState: { role: 'GUEST' },
      newState: { role: 'STUDENT', batchId: batchId || null },
      requestContext: getRequestContext(req),
    });

    successResponse(
      res,
      result,
      `Guest approved and upgraded to STUDENT${result.enrollment ? " with batch assignment" : ""}`
    );
  });

  /**
   * POST /admin/users/:id/assign-batch
   * Assign a student to a batch
   */
  static assignToBatch = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { batchId } = req.body;

    validateObjectId(id, "userId");
    validateRequired(req.body, ["batchId"]);
    validateObjectId(batchId, "batchId");

    const enrollment = await UsersService.assignStudentToBatch(id, batchId);

    successResponse(res, enrollment, "Student assigned to batch", 201);
  });

  /**
   * DELETE /admin/users/:id/batch/:batchId
   * Remove student from a batch
   */
  static removeFromBatch = asyncHandler(async (req: Request, res: Response) => {
    const { id, batchId } = req.params;

    validateObjectId(id, "userId");
    validateObjectId(batchId, "batchId");

    await UsersService.removeStudentFromBatch(id, batchId);

    successResponse(res, null, "Student removed from batch");
  });
}

export default AdminUsersController;
