/**
 * Admin Reports Controller
 * Handles report generation and export endpoints
 */

import { Request, Response } from "express";
import { reportsService, ReportFilters } from "./reports.service";
import {
  asyncHandler,
  successResponse,
} from "../../shared/base.controller";

export class ReportsController {
  /**
   * GET /admin/reports/payments
   * Generate payment report
   */
  getPaymentReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, batchId, studentId, status, format } = req.query;

    const filters: ReportFilters = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      batchId: batchId as string | undefined,
      studentId: studentId as string | undefined,
      status: status as string | undefined,
    };

    const report = await reportsService.generatePaymentReport(filters);

    if (format === "csv") {
      const csv = reportsService.toCSV(report.data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=payment-report.csv");
      return res.send(csv);
    }

    return successResponse(res, {
      ...report,
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        batchId: filters.batchId,
        studentId: filters.studentId,
        status: filters.status,
      },
    }, "Payment report generated successfully");
  });

  /**
   * GET /admin/reports/attendance
   * Generate attendance report
   */
  getAttendanceReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, batchId, studentId, status, format } = req.query;

    const filters: ReportFilters = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      batchId: batchId as string | undefined,
      studentId: studentId as string | undefined,
      status: status as string | undefined,
    };

    const report = await reportsService.generateAttendanceReport(filters);

    if (format === "csv") {
      const csv = reportsService.toCSV(report.data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=attendance-report.csv");
      return res.send(csv);
    }

    return successResponse(res, {
      ...report,
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        batchId: filters.batchId,
        studentId: filters.studentId,
        status: filters.status,
      },
    }, "Attendance report generated successfully");
  });

  /**
   * GET /admin/reports/students
   * Generate student report
   */
  getStudentReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, role, status, format } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      role: role as string | undefined,
      status: status as string | undefined,
    };

    const report = await reportsService.generateStudentReport(filters);

    if (format === "csv") {
      const csv = reportsService.toCSV(report.data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=student-report.csv");
      return res.send(csv);
    }

    return successResponse(res, {
      ...report,
      filters,
    }, "Student report generated successfully");
  });

  /**
   * GET /admin/reports/batches
   * Generate batch report
   */
  getBatchReport = asyncHandler(async (req: Request, res: Response) => {
    const { format } = req.query;

    const report = await reportsService.generateBatchReport();

    if (format === "csv") {
      const csv = reportsService.toCSV(report.data);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=batch-report.csv");
      return res.send(csv);
    }

    return successResponse(res, report, "Batch report generated successfully");
  });

  /**
   * GET /admin/reports/summary
   * Generate overall summary report
   */
  getSummaryReport = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const dateFilters: ReportFilters = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const [paymentReport, attendanceReport, studentReport, batchReport] = await Promise.all([
      reportsService.generatePaymentReport(dateFilters),
      reportsService.generateAttendanceReport(dateFilters),
      reportsService.generateStudentReport({}),
      reportsService.generateBatchReport(),
    ]);

    return successResponse(res, {
      period: {
        startDate: dateFilters.startDate,
        endDate: dateFilters.endDate,
      },
      payments: paymentReport.summary,
      attendance: attendanceReport.summary,
      students: studentReport.summary,
      batches: batchReport.summary,
    }, "Summary report generated successfully");
  });
}

export const reportsController = new ReportsController();
