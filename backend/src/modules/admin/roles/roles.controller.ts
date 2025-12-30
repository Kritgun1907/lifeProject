/**
 * ===============================================
 * ADMIN ROLES CONTROLLER
 * ===============================================
 * HTTP handlers for role and permission management.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  validateObjectId,
  validateRequired,
} from "../../shared";
import * as RolesService from "./roles.service";

export class AdminRolesController {
  /**
   * GET /admin/roles
   * List all roles
   */
  static listRoles = asyncHandler(async (req: Request, res: Response) => {
    const roles = await RolesService.listRoles();
    successResponse(res, roles);
  });

  /**
   * GET /admin/roles/:id
   * Get role details
   */
  static getRoleById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "roleId");

    const role = await RolesService.getRoleById(id);
    successResponse(res, role);
  });

  /**
   * GET /admin/roles/name/:name
   * Get role by name
   */
  static getRoleByName = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    const role = await RolesService.getRoleByName(name);
    successResponse(res, role);
  });

  /**
   * PUT /admin/roles/:id/permissions
   * Update role permissions
   */
  static updateRolePermissions = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permissions } = req.body;

    validateObjectId(id, "roleId");
    validateRequired(req.body, ["permissions"]);

    if (!Array.isArray(permissions)) {
      throw new Error("Permissions must be an array");
    }

    const role = await RolesService.updateRolePermissions(id, permissions);
    successResponse(res, role, "Role permissions updated");
  });

  /**
   * POST /admin/roles/:id/permissions
   * Add permission to role
   */
  static addPermission = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { permission } = req.body;

    validateObjectId(id, "roleId");
    validateRequired(req.body, ["permission"]);

    const role = await RolesService.addPermissionToRole(id, permission);
    successResponse(res, role, "Permission added to role");
  });

  /**
   * DELETE /admin/roles/:id/permissions/:permission
   * Remove permission from role
   */
  static removePermission = asyncHandler(async (req: Request, res: Response) => {
    const { id, permission } = req.params;
    validateObjectId(id, "roleId");

    const role = await RolesService.removePermissionFromRole(id, permission);
    successResponse(res, role, "Permission removed from role");
  });

  /**
   * GET /admin/permissions
   * List all permissions
   */
  static listPermissions = asyncHandler(async (req: Request, res: Response) => {
    const result = await RolesService.listPermissions();
    successResponse(res, result);
  });

  /**
   * GET /admin/permissions/:name
   * Get permission details
   */
  static getPermission = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    const permission = await RolesService.getPermissionByName(name);
    successResponse(res, permission);
  });

  /**
   * GET /admin/roles/stats
   * Get role distribution statistics
   */
  static getRoleStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await RolesService.getRoleStats();
    successResponse(res, stats);
  });
}

export default AdminRolesController;
