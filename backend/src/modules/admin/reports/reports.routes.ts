/**
 * Admin Reports Routes
 * Export and report generation endpoints
 */

import { Router } from "express";
import { reportsController } from "./reports.controller";
import { authenticate } from "../../../middleware/auth.middleware";
import { authorize } from "../../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /admin/reports/summary
 * Overall summary report
 */
router.get(
  "/summary",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  reportsController.getSummaryReport
);

/**
 * GET /admin/reports/payments
 * Payment report with optional CSV export
 * Query params: startDate, endDate, batchId, studentId, status, format=csv
 */
router.get(
  "/payments",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  reportsController.getPaymentReport
);

/**
 * GET /admin/reports/attendance
 * Attendance report with optional CSV export
 * Query params: startDate, endDate, batchId, studentId, status, format=csv
 */
router.get(
  "/attendance",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  reportsController.getAttendanceReport
);

/**
 * GET /admin/reports/students
 * Student report with optional CSV export
 * Query params: startDate, endDate, role, status, format=csv
 */
router.get(
  "/students",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  reportsController.getStudentReport
);

/**
 * GET /admin/reports/batches
 * Batch report with statistics
 * Query params: format=csv
 */
router.get(
  "/batches",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  reportsController.getBatchReport
);

export { router as reportsRouter };
