/**
 * ===============================================
 * ANALYTICS CONTROLLER
 * ===============================================
 * HTTP handlers for analytics and reporting.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  paginatedResponse,
  getPaginationParams,
  getAuthContext,
  validateObjectId,
} from "../shared";
import * as AnalyticsService from "./analytics.service";
import { OwnershipService } from "../../services/ownership.service";
import { AuthorizationError } from "../../errors";

export class AnalyticsController {
  /**
   * GET /analytics/dashboard
   * Get role-appropriate dashboard stats
   */
  static getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);

    let dashboard;

    if (role === "STUDENT") {
      dashboard = await AnalyticsService.getStudentDashboard(userId);
    } else if (role === "TEACHER") {
      dashboard = await AnalyticsService.getTeacherDashboard(userId);
    } else if (role === "ADMIN") {
      dashboard = await AnalyticsService.getAdminDashboard();
    } else {
      // Guest or unknown role
      dashboard = { message: "No dashboard available for your role" };
    }

    successResponse(res, dashboard);
  });

  /**
   * GET /analytics/student/attendance
   * Get student's attendance history
   */
  static getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { page, limit } = getPaginationParams(req.query);
    const { studentId, fromDate, toDate } = req.query;

    // Determine which student to query
    let targetStudentId = userId;

    if (studentId) {
      validateObjectId(studentId as string, "studentId");

      // Students can only view their own attendance
      if (role === "STUDENT" && studentId !== userId) {
        throw new AuthorizationError("You can only view your own attendance");
      }

      // Teachers can view attendance of students in their batches
      if (role === "TEACHER") {
        const studentBatches = await OwnershipService.getStudentBatchIds(
          studentId as string
        );
        const teacherBatches = await OwnershipService.getTeacherBatchIds(userId);
        const commonBatches = studentBatches.filter((b) =>
          teacherBatches.includes(b)
        );

        if (commonBatches.length === 0) {
          throw new AuthorizationError(
            "You can only view attendance for students in your batches"
          );
        }
      }

      targetStudentId = studentId as string;
    }

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const result = await AnalyticsService.getStudentAttendance(
      targetStudentId,
      dateRange,
      page,
      limit
    );

    paginatedResponse(res, result.records, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /analytics/batch/:batchId
   * Get analytics for a specific batch
  
   */
  static getBatchAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { batchId } = req.params;
    const { fromDate, toDate } = req.query;

    validateObjectId(batchId, "batchId");

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    // Pass userId and role for ownership check in service
    const analytics = await AnalyticsService.getBatchAnalytics(
      userId,
      role,
      batchId,
      dateRange
    );

    successResponse(res, analytics);
  });

  /**
   * GET /analytics/admin/revenue
   * Get revenue report (admin only)
   */
  static getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate } = req.query;

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const report = await AnalyticsService.getRevenueReport(dateRange);

    successResponse(res, report);
  });

  /**
   * GET /analytics/admin/attendance
   * Get attendance report (admin only)
   */
  static getAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { batchId, fromDate, toDate } = req.query;

    if (batchId) {
      validateObjectId(batchId as string, "batchId");
    }

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const report = await AnalyticsService.getAttendanceReport(
      dateRange,
      batchId as string
    );

    successResponse(res, report);
  });

  /**
   * GET /analytics/student/:studentId/attendance/pdf
   * Generate PDF for student attendance report
   */
  static getStudentAttendancePDF = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { studentId } = req.params;
    const { fromDate, toDate } = req.query;

    validateObjectId(studentId, "studentId");

    // Students can only view their own, teachers can view students in their batches, admins can view any
    if (role === "STUDENT" && studentId !== userId) {
      throw new AuthorizationError("You can only view your own attendance report");
    }

    if (role === "TEACHER") {
      const studentBatches = await OwnershipService.getStudentBatchIds(studentId);
      const teacherBatches = await OwnershipService.getTeacherBatchIds(userId);
      const commonBatches = studentBatches.filter((b) =>
        teacherBatches.includes(b)
      );

      if (commonBatches.length === 0) {
        throw new AuthorizationError(
          "You can only generate reports for students in your batches"
        );
      }
    }

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const pdfBuffer = await AnalyticsService.generateStudentAttendancePDF(
      studentId,
      dateRange
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="student-attendance-${studentId}.pdf"`
    );
    res.send(pdfBuffer);
  });

  /**
   * GET /analytics/batch/:batchId/pdf
   * Generate PDF for batch analytics
   */
  static getBatchAnalyticsPDF = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { batchId } = req.params;
    const { fromDate, toDate } = req.query;

    validateObjectId(batchId, "batchId");

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const pdfBuffer = await AnalyticsService.generateBatchAnalyticsPDF(
      userId,
      role,
      batchId,
      dateRange
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="batch-analytics-${batchId}.pdf"`
    );
    res.send(pdfBuffer);
  });

  /**
   * GET /analytics/admin/attendance/pdf
   * Generate PDF for attendance report (admin only)
   */
  static getAttendanceReportPDF = asyncHandler(async (req: Request, res: Response) => {
    const { batchId, fromDate, toDate } = req.query;

    if (batchId) {
      validateObjectId(batchId as string, "batchId");
    }

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const pdfBuffer = await AnalyticsService.generateAttendanceReportPDF(
      dateRange,
      batchId as string
    );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-report.pdf"`
    );
    res.send(pdfBuffer);
  });

  /**
   * GET /analytics/admin/revenue/pdf
   * Generate PDF for revenue report (admin only)
   */
  static getRevenueReportPDF = asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate } = req.query;

    const dateRange = {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const pdfBuffer = await AnalyticsService.generateRevenueReportPDF(dateRange);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="revenue-report.pdf"`
    );
    res.send(pdfBuffer);
  });
}

export default AnalyticsController;
