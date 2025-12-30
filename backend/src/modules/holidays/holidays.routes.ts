/**
 * ===============================================
 * HOLIDAYS ROUTES
 * ===============================================
 * Route definitions for holiday management.
 */

import { Router } from "express";
import { HolidayController } from "./holidays.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize, authorizeAny } from "../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/holidays/me
 * @desc    Get upcoming holidays for user's batches
 * @access  Student, Teacher
 */
router.get(
  "/me",
  authorize([PERMISSIONS.HOLIDAY_READ]),
  HolidayController.getMyHolidays
);

/**
 * @route   GET /api/holidays/batch/:batchId
 * @desc    Get holidays for a specific batch
 * @access  Student (enrolled), Teacher (own batch), Admin (any)
 */
router.get(
  "/batch/:batchId",
  authorize([PERMISSIONS.HOLIDAY_READ]),
  HolidayController.getBatchHolidays
);

/**
 * @route   GET /api/holidays
 * @desc    Get all holidays with filters
 * @access  Admin only
 */
router.get(
  "/",
  authorize([PERMISSIONS.HOLIDAY_DECLARE_ANY]),
  HolidayController.getAllHolidays
);

/**
 * @route   GET /api/holidays/:id
 * @desc    Get single holiday by ID
 * @access  Authenticated users
 */
router.get(
  "/:id",
  authorize([PERMISSIONS.HOLIDAY_READ]),
  HolidayController.getHolidayById
);

/**
 * @route   POST /api/holidays
 * @desc    Create a new holiday
 * @access  Teacher (own batch), Admin (any batch)
 */
router.post(
  "/",
  authorizeAny([PERMISSIONS.HOLIDAY_DECLARE_UNDER_BATCH, PERMISSIONS.HOLIDAY_DECLARE_ANY]),
  HolidayController.createHoliday
);

/**
 * @route   PATCH /api/holidays/:id/status
 * @desc    Update holiday status (approve/reject)
 * @access  Admin only
 */
router.patch(
  "/:id/status",
  authorize([PERMISSIONS.HOLIDAY_DECLARE_ANY]),
  HolidayController.updateHolidayStatus
);

/**
 * @route   PATCH /api/holidays/:id
 * @desc    Update holiday details
 * @access  Teacher (own pending), Admin (any)
 */
router.patch(
  "/:id",
  authorizeAny([PERMISSIONS.HOLIDAY_DECLARE_UNDER_BATCH, PERMISSIONS.HOLIDAY_DECLARE_ANY]),
  HolidayController.updateHoliday
);

/**
 * @route   DELETE /api/holidays/:id
 * @desc    Delete a holiday
 * @access  Teacher (own pending), Admin (any)
 */
router.delete(
  "/:id",
  authorizeAny([PERMISSIONS.HOLIDAY_DECLARE_UNDER_BATCH, PERMISSIONS.HOLIDAY_DECLARE_ANY]),
  HolidayController.deleteHoliday
);

export default router;
