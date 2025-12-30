/**
 * ===============================================
 * ADMIN ROLES ROUTES
 * ===============================================
 * Route definitions for role and permission management.
 */

import { Router } from "express";
import { AdminRolesController } from "./roles.controller";
import { authorize } from "../../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../../constants/permissions";

const router = Router();

// Note: Authentication and admin role check applied at parent router level

// ===============================================
// ROLE ROUTES
// ===============================================

/**
 * @route   GET /admin/roles
 * @desc    List all roles
 */
router.get("/", AdminRolesController.listRoles);

/**
 * @route   GET /admin/roles/stats
 * @desc    Get role distribution statistics
 */
router.get("/stats", AdminRolesController.getRoleStats);

/**
 * @route   GET /admin/roles/name/:name
 * @desc    Get role by name
 */
router.get("/name/:name", AdminRolesController.getRoleByName);

/**
 * @route   GET /admin/roles/:id
 * @desc    Get role details
 */
router.get("/:id", AdminRolesController.getRoleById);

/**
 * @route   PUT /admin/roles/:id/permissions
 * @desc    Update role permissions (replace all)
 */
router.put(
  "/:id/permissions",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminRolesController.updateRolePermissions
);

/**
 * @route   POST /admin/roles/:id/permissions
 * @desc    Add single permission to role
 */
router.post(
  "/:id/permissions",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminRolesController.addPermission
);

/**
 * @route   DELETE /admin/roles/:id/permissions/:permission
 * @desc    Remove permission from role
 */
router.delete(
  "/:id/permissions/:permission",
  authorize([PERMISSIONS.ROLE_ASSIGN]),
  AdminRolesController.removePermission
);

export default router;
