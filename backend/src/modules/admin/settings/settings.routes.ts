/**
 * ===============================================
 * ADMIN SETTINGS ROUTES
 * ===============================================
 * Route definitions for system settings.
 */

import { Router } from "express";
import { AdminSettingsController } from "./settings.controller";
import { authorize } from "../../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../../constants/permissions";

const router = Router();

// Note: Authentication and admin role check applied at parent router level

// ===============================================
// WORKING DAYS
// ===============================================

router.get("/working-days", AdminSettingsController.listWorkingDays);

router.post(
  "/working-days",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  AdminSettingsController.createWorkingDay
);

router.patch(
  "/working-days/:id",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  AdminSettingsController.updateWorkingDay
);

router.delete(
  "/working-days/:id",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  AdminSettingsController.deleteWorkingDay
);

// ===============================================
// WORKING TIMES
// ===============================================

router.get("/working-times", AdminSettingsController.listWorkingTimes);

router.post(
  "/working-times",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  AdminSettingsController.createWorkingTime
);

router.patch(
  "/working-times/:id",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  AdminSettingsController.updateWorkingTime
);

router.delete(
  "/working-times/:id",
  authorize([PERMISSIONS.SYSTEM_CONFIGURE]),
  AdminSettingsController.deleteWorkingTime
);

// ===============================================
// STATUSES
// ===============================================

router.get("/statuses", AdminSettingsController.listStatuses);

export default router;
