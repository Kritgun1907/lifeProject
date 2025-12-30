/**
 * ===============================================
 * ANALYTICS ROUTES
 * ===============================================
 * Route definitions for analytics and reporting.
 */

import { Router } from "express";
import { AnalyticsController } from "./analytics.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize, authorizeAny } from "../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get role-appropriate dashboard
 * @access  All authenticated users
 */
router.get("/dashboard", AnalyticsController.getDashboard);

/**
 * @route   GET /api/analytics/student/attendance
 * @desc    Get student attendance history
 * @access  Student (own), Teacher (batch students), Admin (any)
 */
router.get(
  "/student/attendance",
  authorizeAny([
    PERMISSIONS.ATTENDANCE_READ_SELF,
    PERMISSIONS.ATTENDANCE_READ_UNDER_BATCH,
    PERMISSIONS.ATTENDANCE_READ_ANY,
  ]),
  AnalyticsController.getStudentAttendance
);

/**
 * @route   GET /api/analytics/batch/:batchId
 * @desc    Get batch analytics
 * @access  Teacher (own batches), Admin (any)
 */
router.get(
  "/batch/:batchId",
  authorizeAny([
    PERMISSIONS.ANALYTICS_VIEW_UNDER_BATCH,
    PERMISSIONS.ANALYTICS_VIEW_ANY,
  ]),
  AnalyticsController.getBatchAnalytics
);

/**
 * @route   GET /api/analytics/admin/revenue
 * @desc    Get revenue report
 * @access  Admin only
 */
router.get(
  "/admin/revenue",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  AnalyticsController.getRevenueReport
);

/**
 * @route   GET /api/analytics/admin/attendance
 * @desc    Get attendance report
 * @access  Admin only
 */
router.get(
  "/admin/attendance",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  AnalyticsController.getAttendanceReport
);

/**
 * @route   GET /api/analytics/student/:studentId/attendance/pdf
 * @desc    Generate PDF for student attendance report
 * @access  Student (own), Teacher (batch students), Admin (any)
 */
router.get(
  "/student/:studentId/attendance/pdf",
  authorizeAny([
    PERMISSIONS.ATTENDANCE_READ_SELF,
    PERMISSIONS.ATTENDANCE_READ_UNDER_BATCH,
    PERMISSIONS.ATTENDANCE_READ_ANY,
  ]),
  AnalyticsController.getStudentAttendancePDF
);

/**
 * @route   GET /api/analytics/batch/:batchId/pdf
 * @desc    Generate PDF for batch analytics
 * @access  Teacher (own batches), Admin (any)
 */
router.get(
  "/batch/:batchId/pdf",
  authorizeAny([
    PERMISSIONS.ANALYTICS_VIEW_UNDER_BATCH,
    PERMISSIONS.ANALYTICS_VIEW_ANY,
  ]),
  AnalyticsController.getBatchAnalyticsPDF
);

/**
 * @route   GET /api/analytics/admin/attendance/pdf
 * @desc    Generate PDF for attendance report
 * @access  Admin only
 */
router.get(
  "/admin/attendance/pdf",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  AnalyticsController.getAttendanceReportPDF
);

/**
 * @route   GET /api/analytics/admin/revenue/pdf
 * @desc    Generate PDF for revenue report
 * @access  Admin only
 */
router.get(
  "/admin/revenue/pdf",
  authorize([PERMISSIONS.ANALYTICS_VIEW_ANY]),
  AnalyticsController.getRevenueReportPDF
);

export default router;
