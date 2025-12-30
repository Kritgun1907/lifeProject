/**
 * ===============================================
 * ADMIN SETTINGS CONTROLLER
 * ===============================================
 * HTTP handlers for system settings.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  getAuthContext,
  validateObjectId,
  validateRequired,
} from "../../shared";
import * as SettingsService from "./settings.service";

export class AdminSettingsController {
  // ===============================================
  // WORKING DAYS
  // ===============================================

  /**
   * GET /admin/settings/working-days
   */
  static listWorkingDays = asyncHandler(async (req: Request, res: Response) => {
    const days = await SettingsService.listWorkingDays();
    successResponse(res, days);
  });

  /**
   * POST /admin/settings/working-days
   */
  static createWorkingDay = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { name, daysArray } = req.body;

    validateRequired(req.body, ["name", "daysArray"]);

    if (!Array.isArray(daysArray)) {
      throw new Error("daysArray must be an array");
    }

    const workingDay = await SettingsService.createWorkingDay(name, daysArray, userId);
    successResponse(res, workingDay, "Working day created", 201);
  });

  /**
   * PATCH /admin/settings/working-days/:id
   */
  static updateWorkingDay = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, daysArray } = req.body;

    validateObjectId(id, "workingDayId");

    const workingDay = await SettingsService.updateWorkingDay(id, { name, daysArray });
    successResponse(res, workingDay, "Working day updated");
  });

  /**
   * DELETE /admin/settings/working-days/:id
   */
  static deleteWorkingDay = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "workingDayId");

    await SettingsService.deleteWorkingDay(id);
    successResponse(res, null, "Working day deleted");
  });

  // ===============================================
  // WORKING TIMES
  // ===============================================

  /**
   * GET /admin/settings/working-times
   */
  static listWorkingTimes = asyncHandler(async (req: Request, res: Response) => {
    const times = await SettingsService.listWorkingTimes();
    successResponse(res, times);
  });

  /**
   * POST /admin/settings/working-times
   */
  static createWorkingTime = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { startTime, endTime } = req.body;

    validateRequired(req.body, ["startTime", "endTime"]);

    const workingTime = await SettingsService.createWorkingTime(startTime, endTime, userId);
    successResponse(res, workingTime, "Working time created", 201);
  });

  /**
   * PATCH /admin/settings/working-times/:id
   */
  static updateWorkingTime = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    validateObjectId(id, "workingTimeId");

    const workingTime = await SettingsService.updateWorkingTime(id, { startTime, endTime });
    successResponse(res, workingTime, "Working time updated");
  });

  /**
   * DELETE /admin/settings/working-times/:id
   */
  static deleteWorkingTime = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "workingTimeId");

    await SettingsService.deleteWorkingTime(id);
    successResponse(res, null, "Working time deleted");
  });

  // ===============================================
  // STATUSES
  // ===============================================

  /**
   * GET /admin/settings/statuses
   */
  static listStatuses = asyncHandler(async (req: Request, res: Response) => {
    const statuses = await SettingsService.listStatuses();
    successResponse(res, statuses);
  });
}

export default AdminSettingsController;
