/**
 * Admin System Routes
 * System configuration and maintenance
 */

import { Router } from "express";
import { systemController } from "./system.controller";
import { authenticate } from "../../../middleware/auth.middleware";
import { authorize } from "../../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /admin/system/health
 * System health check
 */
router.get(
  "/health",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.getSystemHealth
);

/**
 * GET /admin/system/statuses
 * List all status options
 */
router.get(
  "/statuses",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.getStatuses
);

/**
 * POST /admin/system/statuses
 * Create new status
 */
router.post(
  "/statuses",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.createStatus
);

/**
 * GET /admin/system/archived
 * Get archived stats
 */
router.get(
  "/archived",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.getArchivedStats
);

/**
 * POST /admin/system/archive/attendance
 * Archive old attendance
 */
router.post(
  "/archive/attendance",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.archiveAttendance
);

/**
 * POST /admin/system/archive/payments
 * Archive old payments
 */
router.post(
  "/archive/payments",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.archivePayments
);

/**
 * POST /admin/system/archive/announcements
 * Archive old announcements
 */
router.post(
  "/archive/announcements",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.archiveAnnouncements
);

/**
 * POST /admin/system/bulk/status
 * Bulk update user status
 */
router.post(
  "/bulk/status",
  authorize([PERMISSIONS.STUDENT_UPDATE_STATUS_ANY]),
  systemController.bulkUpdateStatus
);

/**
 * POST /admin/system/bulk/archive
 * Bulk archive users
 */
router.post(
  "/bulk/archive",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.bulkArchiveUsers
);

/**
 * POST /admin/system/restore
 * Restore archived records
 */
router.post(
  "/restore",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.restoreArchived
);

/**
 * GET /admin/system/audit
 * Get audit log
 */
router.get(
  "/audit",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.getAuditLog
);

/**
 * GET /admin/system/audit/stats
 * Get audit log statistics
 */
router.get(
  "/audit/stats",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.getAuditStats
);

/**
 * GET /admin/system/audit/critical
 * Get critical security events
 */
router.get(
  "/audit/critical",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.getCriticalEvents
);

/**
 * POST /admin/system/sync-permissions
 * Sync permissions from code
 */
router.post(
  "/sync-permissions",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  systemController.syncPermissions
);

export { router as systemRouter };
