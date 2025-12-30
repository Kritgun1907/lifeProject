/**
 * Admin System Controller
 * System configuration and maintenance endpoints
 */

import { Request, Response } from "express";
import { systemService } from "./system.service";
import {
  asyncHandler,
  successResponse,
  getAuthContext,
  validateRequired,
} from "../../shared/base.controller";
import { PERMISSIONS } from "../../../constants/permissions";

export class SystemController {
  /**
   * GET /admin/system/health
   * Get system health and stats
   */
  getSystemHealth = asyncHandler(async (_req: Request, res: Response) => {
    const health = await systemService.getSystemHealth();
    return successResponse(res, health, "System health retrieved");
  });

  /**
   * GET /admin/system/statuses
   * Get all status options
   */
  getStatuses = asyncHandler(async (_req: Request, res: Response) => {
    const statuses = await systemService.getAllStatuses();
    return successResponse(res, statuses, "Statuses retrieved");
  });

  /**
   * POST /admin/system/statuses
   * Create a new status
   */
  createStatus = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["name"]);
    const { name } = req.body;

    const status = await systemService.createStatus(name);
    return successResponse(res, status, "Status created successfully", 201);
  });

  /**
   * GET /admin/system/archived
   * Get archived records statistics
   */
  getArchivedStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = await systemService.getArchivedStats();
    return successResponse(res, stats, "Archived stats retrieved");
  });

  /**
   * POST /admin/system/archive/attendance
   * Archive old attendance records
   */
  archiveAttendance = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["beforeDate"]);
    const { beforeDate } = req.body;

    const result = await systemService.archiveOldAttendance(new Date(beforeDate));
    return successResponse(res, result, `Archived ${result.archived} attendance records`);
  });

  /**
   * POST /admin/system/archive/payments
   * Archive old payment records
   */
  archivePayments = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["beforeDate"]);
    const { beforeDate } = req.body;

    const result = await systemService.archiveOldPayments(new Date(beforeDate));
    return successResponse(res, result, `Archived ${result.archived} payment records`);
  });

  /**
   * POST /admin/system/archive/announcements
   * Archive old announcement records
   */
  archiveAnnouncements = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["beforeDate"]);
    const { beforeDate } = req.body;

    const result = await systemService.archiveOldAnnouncements(new Date(beforeDate));
    return successResponse(res, result, `Archived ${result.archived} announcement records`);
  });

  /**
   * POST /admin/system/bulk/status
   * Bulk update user status
   */
  bulkUpdateStatus = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["userIds", "statusId"]);
    const { userIds, statusId } = req.body;
    const { userId } = getAuthContext(req);

    const result = await systemService.bulkUpdateUserStatus(userIds, statusId, userId);
    return successResponse(res, result, `Updated ${result.updated} users`);
  });

  /**
   * POST /admin/system/bulk/archive
   * Bulk archive users
   */
  bulkArchiveUsers = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["userIds"]);
    const { userIds } = req.body;
    const { userId } = getAuthContext(req);

    const result = await systemService.bulkArchiveUsers(userIds, userId);
    return successResponse(res, result, `Archived ${result.archived} users`);
  });

  /**
   * POST /admin/system/restore
   * Restore archived records
   */
  restoreArchived = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["model", "ids"]);
    const { model, ids } = req.body;

    const result = await systemService.restoreArchivedRecords(model, ids);
    return successResponse(res, result, `Restored ${result.restored} records`);
  });

  /**
   * GET /admin/system/audit
   * Get audit logs with filters
   */
  getAuditLog = asyncHandler(async (req: Request, res: Response) => {
    const { auditService } = await import("../../../services/audit.service");
    
    const {
      performedBy,
      targetModel,
      targetId,
      action,
      severity,
      fromDate,
      toDate,
      page = 1,
      limit = 50,
    } = req.query;

    const filters: any = {};
    if (performedBy) filters.performedBy = performedBy as string;
    if (targetModel) filters.targetModel = targetModel as string;
    if (targetId) filters.targetId = targetId as string;
    if (action) filters.action = action as string;
    if (severity) filters.severity = severity as string;
    if (fromDate) filters.fromDate = new Date(fromDate as string);
    if (toDate) filters.toDate = new Date(toDate as string);

    const result = await auditService.query(
      filters,
      Number(page),
      Number(limit)
    );

    return successResponse(res, result, "Audit logs retrieved");
  });

  /**
   * GET /admin/system/audit/stats
   * Get audit log statistics
   */
  getAuditStats = asyncHandler(async (req: Request, res: Response) => {
    const { auditService } = await import("../../../services/audit.service");
    
    const { days = 7 } = req.query;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Number(days));

    const stats = await auditService.getStats(fromDate);
    return successResponse(res, stats, `Audit stats for last ${days} days`);
  });

  /**
   * GET /admin/system/audit/critical
   * Get critical security events
   */
  getCriticalEvents = asyncHandler(async (req: Request, res: Response) => {
    const { auditService } = await import("../../../services/audit.service");
    
    const { days = 7, limit = 100 } = req.query;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Number(days));

    const events = await auditService.getCriticalEvents(fromDate, Number(limit));
    return successResponse(res, events, "Critical security events");
  });

  /**
   * POST /admin/system/sync-permissions
   * Sync permissions from constants
   */
  syncPermissions = asyncHandler(async (_req: Request, res: Response) => {
    const allPermissions = Object.values(PERMISSIONS);
    const result = await systemService.syncPermissions(allPermissions);
    return successResponse(
      res,
      result,
      `Synced permissions: ${result.created} created, ${result.existing} already exist`
    );
  });
}

export const systemController = new SystemController();
