/**
 * ===============================================
 * HOLIDAYS CONTROLLER
 * ===============================================
 * HTTP handlers for holiday operations.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  paginatedResponse,
  getPaginationParams,
  getAuthContext,
  validateObjectId,
  validateRequired,
} from "../shared";
import * as HolidayService from "./holidays.service";
import { OwnershipService } from "../../services/ownership.service";
import { AuthorizationError } from "../../errors";
import { auditService, AUDIT_ACTIONS } from "../../services/audit.service";
import { getRequestContext } from "../../middleware/requestLogger.middleware";

export class HolidayController {
  /**
   * GET /holidays/me
   * Get upcoming holidays for current user's batches
   */
  static getMyHolidays = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { page, limit } = getPaginationParams(req.query);

    const result = await HolidayService.getMyUpcomingHolidays(
      userId,
      role,
      page,
      limit
    );

    paginatedResponse(res, result.holidays, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /holidays/batch/:batchId
   * Get holidays for a specific batch
   */
  static getBatchHolidays = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { batchId } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    validateObjectId(batchId, "batchId");

    // Ownership check for teachers
    if (role === "TEACHER") {
      await OwnershipService.ensureTeacherOwnsBatch(
        userId,
        batchId,
        "view holidays for this batch"
      );
    } else if (role === "STUDENT") {
      // Students can only see holidays for batches they're enrolled in
      const isEnrolled = await OwnershipService.studentInBatch(userId, batchId);
      if (!isEnrolled) {
        throw new AuthorizationError("You can only view holidays for your batches");
      }
    }
    // Admin can view any batch

    const result = await HolidayService.getBatchHolidays(batchId, page, limit);

    paginatedResponse(res, result.holidays, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /holidays
   * Get all holidays with filters (admin only)
   */
  static getAllHolidays = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req.query);
    const { batchId, status, fromDate, toDate } = req.query;

    const filters = {
      batchId: batchId as string,
      status: status as "PENDING" | "APPROVED" | "REJECTED",
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const result = await HolidayService.getAllHolidays(filters, page, limit);

    paginatedResponse(res, result.holidays, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /holidays/:id
   * Get single holiday by ID
   */
  static getHolidayById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "holidayId");

    const holiday = await HolidayService.getHolidayById(id);
    successResponse(res, holiday);
  });

  /**
   * POST /holidays
   * Create a new holiday
   */
  static createHoliday = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);

    validateRequired(req.body, ["date", "batchId", "reason"]);

    const { date, batchId, reason } = req.body;
    validateObjectId(batchId, "batchId");

    const holiday = await HolidayService.createHoliday({
      date: new Date(date),
      batchId,
      reason,
      userId,
      userRole: role as "ADMIN" | "TEACHER",
    });

    // Audit log holiday creation
    await auditService.log({
      action: AUDIT_ACTIONS.HOLIDAY_CREATED,
      performedBy: userId,
      performerRole: role,
      targetModel: 'Holiday',
      targetId: holiday._id,
      description: `Holiday created for batch on ${date}: ${reason}`,
      newState: { date, batchId, reason },
      requestContext: getRequestContext(req),
    });

    successResponse(res, holiday, "Holiday created successfully", 201);
  });

  /**
   * PATCH /holidays/:id/status
   * Update holiday status (admin only)
   */
  static updateHolidayStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const { userId, role } = getAuthContext(req);

    validateObjectId(id, "holidayId");
    validateRequired(req.body, ["status"]);

    if (!["APPROVED", "REJECTED"].includes(status)) {
      throw new Error("Status must be APPROVED or REJECTED");
    }

    // Get holiday before update for audit
    const oldHoliday = await HolidayService.getHolidayById(id);
    const holiday = await HolidayService.updateHolidayStatus(id, status);

    // Audit log holiday approval/rejection (CRITICAL for approvals)
    const action = status === "APPROVED" 
      ? AUDIT_ACTIONS.HOLIDAY_APPROVED 
      : AUDIT_ACTIONS.HOLIDAY_REJECTED;

    await auditService.log({
      action,
      severity: status === "APPROVED" ? "WARNING" : "INFO",
      performedBy: userId,
      performerRole: role,
      targetModel: "Holiday",
      targetId: id,
      description: `Holiday ${status.toLowerCase()} for batch`,
      previousState: { status: oldHoliday.status },
      newState: { status },
      requestContext: getRequestContext(req),
    });

    successResponse(res, holiday, `Holiday ${status.toLowerCase()}`);
  });

  /**
   * PATCH /holidays/:id
   * Update holiday details
   */
  static updateHoliday = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { id } = req.params;
    const { date, reason } = req.body;

    validateObjectId(id, "holidayId");

    const updates: { date?: Date; reason?: string } = {};
    if (date) updates.date = new Date(date);
    if (reason) updates.reason = reason;

    const holiday = await HolidayService.updateHoliday(id, updates, userId, role);

    successResponse(res, holiday, "Holiday updated successfully");
  });

  /**
   * DELETE /holidays/:id
   * Delete a holiday
   */
  static deleteHoliday = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "holidayId");

    const holiday = await HolidayService.getHolidayById(id);
    await HolidayService.deleteHoliday(id, userId, role);

    // Audit log holiday deletion
    await auditService.log({
      action: AUDIT_ACTIONS.HOLIDAY_DELETED,
      performedBy: userId,
      performerRole: role,
      targetModel: 'Holiday',
      targetId: id,
      description: `Holiday deleted: ${holiday.reason}`,
      previousState: { date: holiday.date, reason: holiday.reason },
      requestContext: getRequestContext(req),
    });

    successResponse(res, null, "Holiday deleted successfully");
  });
}

export default HolidayController;
