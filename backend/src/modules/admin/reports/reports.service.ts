/**
 * Admin Reports Service
 * Generates reports and exports for admin dashboards
 */

import { Payment } from "../../../models/Payment.model";
import { Attendance } from "../../../models/Attendance.model";
import { User } from "../../../models/User.model";
import { Batch } from "../../../models/Batch.model";
import { BatchStudent } from "../../../models/BatchStudent.model";
import { Holiday } from "../../../models/Holiday.model";
import { Types } from "mongoose";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportFilters extends DateRange {
  batchId?: string;
  studentId?: string;
  status?: string;
}

export interface PaymentReportRow {
  studentId: string;
  studentName: string;
  email: string;
  batchName: string | null;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

export interface AttendanceReportRow {
  studentId: string;
  studentName: string;
  email: string;
  batchName: string;
  date: Date;
  status: "PRESENT" | "ABSENT";
  markedBy: string;
}

export interface StudentReportRow {
  userId: string;
  name: string;
  email: string;
  mobile: string | null;
  role: string;
  status: string;
  batchCount: number;
  totalPayments: number;
  attendanceRate: number;
  createdAt: Date;
}

export class ReportsService {
  /**
   * Generate payment report data
   */
  async generatePaymentReport(filters: ReportFilters): Promise<{
    data: PaymentReportRow[];
    summary: {
      totalAmount: number;
      successfulPayments: number;
      pendingPayments: number;
      failedPayments: number;
      totalCount: number;
    };
  }> {
    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
      createdAt: { $gte: filters.startDate, $lte: filters.endDate },
    };

    if (filters.batchId) {
      query.batch = new Types.ObjectId(filters.batchId);
    }

    if (filters.studentId) {
      query.student = new Types.ObjectId(filters.studentId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const payments = await Payment.find(query)
      .populate("student", "name email")
      .populate("batch", "batchName")
      .sort({ createdAt: -1 })
      .lean();

    const data: PaymentReportRow[] = payments.map((p) => ({
      studentId: (p.student as { _id: Types.ObjectId })?._id?.toString() || "",
      studentName: (p.student as { name?: string })?.name || "Unknown",
      email: (p.student as { email?: string })?.email || "",
      batchName: (p.batch as { batchName?: string })?.batchName || null,
      amount: p.amount,
      status: p.status || "PENDING",
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId || null,
      paidAt: p.paidAt || null,
      createdAt: p.createdAt as Date,
    }));

    // Calculate summary
    const summary = {
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      successfulPayments: payments.filter((p) => p.status === "SUCCESS").length,
      pendingPayments: payments.filter((p) => p.status === "PENDING").length,
      failedPayments: payments.filter((p) => p.status === "FAILED").length,
      totalCount: payments.length,
    };

    return { data, summary };
  }

  /**
   * Generate attendance report data
   */
  async generateAttendanceReport(filters: ReportFilters): Promise<{
    data: AttendanceReportRow[];
    summary: {
      totalPresent: number;
      totalAbsent: number;
      attendanceRate: number;
      totalRecords: number;
    };
  }> {
    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
      date: { $gte: filters.startDate, $lte: filters.endDate },
    };

    if (filters.batchId) {
      query.batch = new Types.ObjectId(filters.batchId);
    }

    if (filters.studentId) {
      query.student = new Types.ObjectId(filters.studentId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const attendance = await Attendance.find(query)
      .populate("student", "name email")
      .populate("batch", "batchName")
      .populate("markedBy", "name")
      .sort({ date: -1 })
      .lean();

    const data: AttendanceReportRow[] = attendance.map((a) => ({
      studentId: (a.student as { _id: Types.ObjectId })?._id?.toString() || "",
      studentName: (a.student as { name?: string })?.name || "Unknown",
      email: (a.student as { email?: string })?.email || "",
      batchName: (a.batch as { batchName?: string })?.batchName || "",
      date: a.date,
      status: a.status as "PRESENT" | "ABSENT",
      markedBy: (a.markedBy as { name?: string })?.name || "Unknown",
    }));

    const totalPresent = attendance.filter((a) => a.status === "PRESENT").length;
    const totalAbsent = attendance.filter((a) => a.status === "ABSENT").length;
    const total = attendance.length;

    const summary = {
      totalPresent,
      totalAbsent,
      attendanceRate: total > 0 ? Math.round((totalPresent / total) * 100) : 0,
      totalRecords: total,
    };

    return { data, summary };
  }

  /**
   * Generate student report data
   */
  async generateStudentReport(filters: {
    role?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    data: StudentReportRow[];
    summary: {
      totalStudents: number;
      activeStudents: number;
      inactiveStudents: number;
      byRole: Record<string, number>;
    };
  }> {
    const query: Record<string, unknown> = {
      isDeleted: { $ne: true },
    };

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      query.createdAt = { $gte: filters.startDate, $lte: filters.endDate };
    }

    const users = await User.find(query)
      .populate("role", "name")
      .populate("status", "name")
      .sort({ createdAt: -1 })
      .lean();

    const data: StudentReportRow[] = await Promise.all(
      users.map(async (u) => {
        // Get batch count
        const batchCount = await Batch.countDocuments({
          $or: [{ students: u._id }, { teacher: u._id }],
          isDeleted: { $ne: true },
        });

        // Get total payments
        const paymentAgg = await Payment.aggregate([
          { $match: { student: u._id, status: "SUCCESS", isDeleted: { $ne: true } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalPayments = paymentAgg[0]?.total || 0;

        // Get attendance rate
        const attendanceAgg = await Attendance.aggregate([
          { $match: { student: u._id, isDeleted: { $ne: true } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } },
            },
          },
        ]);
        const attendanceRate =
          attendanceAgg[0]?.total > 0
            ? Math.round((attendanceAgg[0].present / attendanceAgg[0].total) * 100)
            : 0;

        return {
          userId: u._id.toString(),
          name: u.name,
          email: u.email,
          mobile: u.mobile || null,
          role: (u.role as { name?: string })?.name || "Unknown",
          status: (u.status as { name?: string })?.name || "Unknown",
          batchCount,
          totalPayments,
          attendanceRate,
          createdAt: u.createdAt as Date,
        };
      })
    );

    // Calculate summary
    const byRole: Record<string, number> = {};
    data.forEach((d) => {
      byRole[d.role] = (byRole[d.role] || 0) + 1;
    });

    const summary = {
      totalStudents: data.length,
      activeStudents: data.filter((d) => d.status === "ACTIVE").length,
      inactiveStudents: data.filter((d) => d.status !== "ACTIVE").length,
      byRole,
    };

    return { data, summary };
  }

  /**
   * Generate batch report with statistics
   */
  async generateBatchReport(): Promise<{
    data: Array<{
      batchId: string;
      batchName: string;
      teacherName: string;
      studentCount: number;
      totalRevenue: number;
      attendanceRate: number;
      holidayCount: number;
      createdAt: Date;
    }>;
    summary: {
      totalBatches: number;
      activeBatches: number;
      totalStudents: number;
      totalRevenue: number;
    };
  }> {
    const batches = await Batch.find({ isDeleted: { $ne: true } })
      .populate("teacher", "name")
      .lean();

    const data = await Promise.all(
      batches.map(async (b) => {
        // Get student count from BatchStudent junction table
        const studentCount = await BatchStudent.countDocuments({ batch: b._id });

        // Revenue from this batch
        const revenueAgg = await Payment.aggregate([
          { $match: { batch: b._id, status: "SUCCESS", isDeleted: { $ne: true } } },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        // Attendance rate for batch
        const attendanceAgg = await Attendance.aggregate([
          { $match: { batch: b._id, isDeleted: { $ne: true } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } },
            },
          },
        ]);
        const attendanceRate =
          attendanceAgg[0]?.total > 0
            ? Math.round((attendanceAgg[0].present / attendanceAgg[0].total) * 100)
            : 0;

        // Holiday count
        const holidayCount = await Holiday.countDocuments({
          batch: b._id,
          isDeleted: { $ne: true },
        });

        return {
          batchId: b._id.toString(),
          batchName: b.batchName,
          teacherName: (b.teacher as { name?: string })?.name || "Unassigned",
          studentCount,
          totalRevenue,
          attendanceRate,
          holidayCount,
          createdAt: b.createdAt as Date,
        };
      })
    );

    const summary = {
      totalBatches: data.length,
      activeBatches: data.filter((b) => b.studentCount > 0).length,
      totalStudents: data.reduce((sum, b) => sum + b.studentCount, 0),
      totalRevenue: data.reduce((sum, b) => sum + b.totalRevenue, 0),
    };

    return { data, summary };
  }

  /**
   * Convert report data to CSV format
   */
  toCSV<T extends object>(
    data: T[],
    headers?: string[]
  ): string {
    if (data.length === 0) return "";

    const keys = headers || Object.keys(data[0]);
    const headerRow = keys.join(",");

    const rows = data.map((row) =>
      keys
        .map((key) => {
          const value = (row as Record<string, unknown>)[key];
          if (value === null || value === undefined) return "";
          if (value instanceof Date) return value.toISOString();
          if (typeof value === "string" && value.includes(",")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return String(value);
        })
        .join(",")
    );

    return [headerRow, ...rows].join("\n");
  }
}

export const reportsService = new ReportsService();
