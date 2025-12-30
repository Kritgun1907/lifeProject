/**
 * ===============================================
 * ADMIN MODULE ROUTES
 * ===============================================
 * Main admin router that combines all sub-modules.
 * All routes require authentication + ADMIN role.
 */

import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";

// Sub-module routers
import usersRouter from "./users/users.routes";
import rolesRouter from "./roles/roles.routes";
import settingsRouter from "./settings/settings.routes";
import { reportsRouter } from "./reports";
import { systemRouter } from "./system";

const router = Router();

// ===============================================
// GLOBAL MIDDLEWARE
// All admin routes require authentication and ADMIN role
// ===============================================
router.use(authenticate);
router.use(requireRole("ADMIN"));

// ===============================================
// SUB-MODULE ROUTES
// ===============================================

/**
 * User management routes
 * GET    /admin/users          - List users
 * GET    /admin/users/:id      - Get user
 * POST   /admin/users          - Create user
 * PATCH  /admin/users/:id      - Update user
 * PUT    /admin/users/:id/role - Update role
 * PUT    /admin/users/:id/status - Update status
 * DELETE /admin/users/:id      - Delete user
 * POST   /admin/users/:id/invalidate-tokens - Force logout
 */
router.use("/users", usersRouter);

/**
 * Role & permission management routes
 * GET    /admin/roles          - List roles
 * GET    /admin/roles/stats    - Role statistics
 * GET    /admin/roles/:id      - Get role
 * PUT    /admin/roles/:id/permissions - Update permissions
 * POST   /admin/roles/:id/permissions - Add permission
 * DELETE /admin/roles/:id/permissions/:permission - Remove permission
 */
router.use("/roles", rolesRouter);

/**
 * System settings routes
 * GET    /admin/settings/working-days   - List working days
 * POST   /admin/settings/working-days   - Create working day
 * PATCH  /admin/settings/working-days/:id - Update
 * DELETE /admin/settings/working-days/:id - Delete
 * 
 * GET    /admin/settings/working-times  - List time slots
 * POST   /admin/settings/working-times  - Create time slot
 * PATCH  /admin/settings/working-times/:id - Update
 * DELETE /admin/settings/working-times/:id - Delete
 * 
 * GET    /admin/settings/statuses       - List statuses
 */
router.use("/settings", settingsRouter);

/**
 * Reports & exports routes
 * GET    /admin/reports/summary     - Overall summary
 * GET    /admin/reports/payments    - Payment report (csv)
 * GET    /admin/reports/attendance  - Attendance report (csv)
 * GET    /admin/reports/students    - Student report (csv)
 * GET    /admin/reports/batches     - Batch report (csv)
 */
router.use("/reports", reportsRouter);

/**
 * System management routes
 * GET    /admin/system/health       - System health
 * GET    /admin/system/statuses     - List statuses
 * POST   /admin/system/statuses     - Create status
 * GET    /admin/system/archived     - Archived stats
 * POST   /admin/system/archive/*    - Archive old data
 * POST   /admin/system/bulk/status  - Bulk status update
 * POST   /admin/system/bulk/archive - Bulk archive
 * POST   /admin/system/restore      - Restore archived
 * GET    /admin/system/audit        - Audit log
 * POST   /admin/system/sync-permissions - Sync permissions
 */
router.use("/system", systemRouter);

/**
 * Permissions list (for UI dropdowns)
 * GET /admin/permissions
 */
import { AdminRolesController } from "./roles/roles.controller";
router.get("/permissions", AdminRolesController.listPermissions);
router.get("/permissions/:name", AdminRolesController.getPermission);

export default router;
