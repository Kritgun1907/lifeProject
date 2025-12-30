/**
 * ===============================================
 * ANALYTICS SERVICE
 * ===============================================
 * Aggregations and statistics for dashboards.
 * Supports student, teacher, batch, and admin views.
 */

import { Payment } from "../../models/Payment.model";
import { Attendance } from "../../models/Attendance.model";
import { Batch } from "../../models/Batch.model";
import { BatchStudent } from "../../models/BatchStudent.model";
import { User } from "../../models/User.model";
import { Holiday } from "../../models/Holiday.model";
import { Status } from "../../models/Status.model";
import OwnershipService from "../../services/ownership.service";
import { NotFoundError, AuthorizationError } from "../../errors";
import PDFDocument from 'pdfkit';

/**
 * Date range helper
 */
interface DateRange {
  fromDate?: Date;
  toDate?: Date;
}

/**
 * ===========================================
 * STUDENT ANALYTICS
 * ===========================================
 */

/**
 * Get student's personal dashboard stats
 */
export async function getStudentDashboard(studentId: string) {
  // Get student's batch enrollments
  const enrollments = await BatchStudent.find({
    student: studentId,
    isDeleted: false,
  })
    .populate("batch", "batchName")
    .lean();

  const batchIds = enrollments.map((e) => e.batch._id);

  // Aggregate attendance stats
  const attendanceStats = await Attendance.aggregate([
    {
      $match: {
        student: studentId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const attendance = {
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
  };

  attendanceStats.forEach((s) => {
    if (s._id === "PRESENT") attendance.present = s.count;
    if (s._id === "ABSENT") attendance.absent = s.count;
    attendance.total += s.count;
  });

  if (attendance.total > 0) {
    attendance.percentage = Math.round(
      (attendance.present / attendance.total) * 100
    );
  }

  // Payment stats
  const paymentStats = await Payment.aggregate([
    {
      $match: {
        student: studentId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const payments = {
    totalPaid: 0,
    pending: 0,
    successCount: 0,
  };

  paymentStats.forEach((s) => {
    if (s._id === "SUCCESS") {
      payments.totalPaid = s.total;
      payments.successCount = s.count;
    } else if (s._id === "PENDING") {
      payments.pending = s.total;
    }
  });

  // Upcoming holidays
  const upcomingHolidays = await Holiday.find({
    batch: { $in: batchIds },
    date: { $gte: new Date() },
    status: "APPROVED",
    isDeleted: false,
  })
    .populate("batch", "batchName")
    .sort({ date: 1 })
    .limit(5)
    .lean();

  return {
    enrolledBatches: enrollments.length,
    batches: enrollments.map((e) => e.batch),
    attendance,
    payments,
    upcomingHolidays,
  };
}

/**
 * Get student's attendance history
 */
export async function getStudentAttendance(
  studentId: string,
  dateRange?: DateRange,
  page: number = 1,
  limit: number = 30
) {
  const skip = (page - 1) * limit;

  const query: Record<string, any> = {
    student: studentId,
    isDeleted: false,
  };

  if (dateRange?.fromDate || dateRange?.toDate) {
    query.date = {};
    if (dateRange.fromDate) query.date.$gte = dateRange.fromDate;
    if (dateRange.toDate) query.date.$lte = dateRange.toDate;
  }

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .populate("batch", "batchName")
      .populate("markedBy", "name")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return { records, total, page, limit };
}

/**
 * ===========================================
 * TEACHER/BATCH ANALYTICS
 * ===========================================
 */

/**
 * Get teacher's dashboard stats
 */
export async function getTeacherDashboard(teacherId: string) {
  // Get teacher's batches
  const batches = await Batch.find({
    teacher: teacherId,
    isDeleted: false,
  })
    .select("_id batchName maxStudents")
    .lean();

  const batchIds = batches.map((b) => b._id);

  // Get total students
  const totalStudents = await BatchStudent.countDocuments({
    batch: { $in: batchIds },
    isDeleted: false,
  });

  // Today's attendance summary
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttendance = await Attendance.aggregate([
    {
      $match: {
        batch: { $in: batchIds },
        date: { $gte: today, $lt: tomorrow },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const todayStats = { present: 0, absent: 0 };
  todayAttendance.forEach((s) => {
    if (s._id === "PRESENT") todayStats.present = s.count;
    if (s._id === "ABSENT") todayStats.absent = s.count;
  });

  // Pending holidays
  const pendingHolidays = await Holiday.countDocuments({
    batch: { $in: batchIds },
    status: "PENDING",
    isDeleted: false,
  });

  // Payment summary for batches
  const studentIds = await BatchStudent.find({
    batch: { $in: batchIds },
    isDeleted: false,
  }).distinct("student");

  const paymentSummary = await Payment.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const payments = { collected: 0, pending: 0 };
  paymentSummary.forEach((s) => {
    if (s._id === "SUCCESS") payments.collected = s.total;
    if (s._id === "PENDING") payments.pending = s.total;
  });

  return {
    totalBatches: batches.length,
    totalStudents,
    todayAttendance: todayStats,
    pendingHolidays,
    payments,
    batches,
  };
}

/**
 * Get analytics for a specific batch
 * WITH OWNERSHIP CHECK - Teacher can only view their own batches, Admin can view all
 * INTEGRATION: Excludes holidays from attendance calculations
 */
export async function getBatchAnalytics(
  userId: string,
  userRole: string,
  batchId: string,
  dateRange?: DateRange
) {
  // Ownership check: Teacher can only view their own batches
  if (userRole === 'TEACHER') {
    await OwnershipService.ensureTeacherOwnsBatch(userId, batchId, 'view analytics for');
  }
  // Admin can view all batches (no ownership check needed)

  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: false,
  })
    .populate("teacher", "name email")
    .lean();

  if (!batch) {
    throw new NotFoundError("Batch", batchId);
  }

  // Get enrolled students
  const enrollments = await BatchStudent.find({
    batch: batchId,
    isDeleted: false,
  })
    .populate("student", "name email mobile")
    .lean();

  const studentIds = enrollments.map((e) => e.student._id);

  // Get approved holiday dates for this batch (to exclude from attendance)
  const holidayQuery: any = {
    batch: batchId,
    status: 'APPROVED',
    isDeleted: false,
  };
  
  if (dateRange?.fromDate || dateRange?.toDate) {
    holidayQuery.date = {};
    if (dateRange?.fromDate) holidayQuery.date.$gte = dateRange.fromDate;
    if (dateRange?.toDate) holidayQuery.date.$lte = dateRange.toDate;
  }
  
  const approvedHolidays = await Holiday.find(holidayQuery).select('date').lean();
  const holidayDates = approvedHolidays.map(h => h.date);

  // Attendance analytics - EXCLUDING HOLIDAYS
  const attendanceQuery: Record<string, any> = {
    batch: batchId,
    isDeleted: false,
  };

  // Exclude holiday dates from attendance aggregation
  if (holidayDates.length > 0) {
    attendanceQuery.date = { $nin: holidayDates };
  }

  if (dateRange?.fromDate || dateRange?.toDate) {
    attendanceQuery.date = attendanceQuery.date || {};
    if (dateRange.fromDate) attendanceQuery.date.$gte = dateRange.fromDate;
    if (dateRange.toDate) attendanceQuery.date.$lte = dateRange.toDate;
  }

  const attendanceStats = await Attendance.aggregate([
    { $match: attendanceQuery },
    {
      $group: {
        _id: { student: "$student", status: "$status" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Process per-student attendance
  const studentAttendance: Record<string, { present: number; absent: number }> =
    {};

  attendanceStats.forEach((s) => {
    const studentId = s._id.student.toString();
    if (!studentAttendance[studentId]) {
      studentAttendance[studentId] = { present: 0, absent: 0 };
    }
    if (s._id.status === "PRESENT") {
      studentAttendance[studentId].present = s.count;
    } else {
      studentAttendance[studentId].absent = s.count;
    }
  });

  // Payment stats
  const paymentStats = await Payment.aggregate([
    {
      $match: {
        student: { $in: studentIds },
        batch: batchId,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const payments = { collected: 0, pending: 0, failed: 0 };
  paymentStats.forEach((s) => {
    if (s._id === "SUCCESS") payments.collected = s.total;
    if (s._id === "PENDING") payments.pending = s.total;
    if (s._id === "FAILED") payments.failed = s.total;
  });

  // Holidays
  const holidays = await Holiday.find({
    batch: batchId,
    status: "APPROVED",
    isDeleted: false,
  })
    .sort({ date: -1 })
    .limit(10)
    .lean();

  return {
    batch,
    studentCount: enrollments.length,
    students: enrollments.map((e) => ({
      ...e.student,
      attendance: studentAttendance[e.student._id.toString()] || {
        present: 0,
        absent: 0,
      },
    })),
    payments,
    holidays,
    // Holiday integration info
    attendanceNote: holidayDates.length > 0 
      ? `Attendance calculations exclude ${holidayDates.length} approved holiday(s)`
      : null,
    excludedHolidays: holidayDates.length,
  };
}

/**
 * ===========================================
 * ADMIN ANALYTICS
 * ===========================================
 */

/**
 * Get admin dashboard overview
 */
export async function getAdminDashboard() {
  // User counts by role
  const userCounts = await User.aggregate([
    { $match: { isDeleted: false } },
    {
      $lookup: {
        from: "roles",
        localField: "role",
        foreignField: "_id",
        as: "roleInfo",
      },
    },
    { $unwind: "$roleInfo" },
    {
      $group: {
        _id: "$roleInfo.name",
        count: { $sum: 1 },
      },
    },
  ]);

  const users: Record<string, number> = {};
  userCounts.forEach((u) => {
    users[u._id.toLowerCase()] = u.count;
  });

  // Batch stats
  const totalBatches = await Batch.countDocuments({ isDeleted: false });
  
  // Get ACTIVE status ObjectId for batch query
  const activeStatus = await Status.findOne({ name: 'ACTIVE' });
  const activeBatches = activeStatus 
    ? await Batch.countDocuments({
        isDeleted: false,
        status: activeStatus._id,
      })
    : 0;

  // Revenue stats (this month)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthlyRevenue = await Payment.aggregate([
    {
      $match: {
        status: "SUCCESS",
        paidAt: { $gte: startOfMonth },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Today's attendance
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttendance = await Attendance.aggregate([
    {
      $match: {
        date: { $gte: today, $lt: tomorrow },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const attendance = { present: 0, absent: 0 };
  todayAttendance.forEach((a) => {
    if (a._id === "PRESENT") attendance.present = a.count;
    if (a._id === "ABSENT") attendance.absent = a.count;
  });

  // Pending items
  const pendingHolidays = await Holiday.countDocuments({
    status: "PENDING",
    isDeleted: false,
  });

  return {
    users,
    batches: {
      total: totalBatches,
      active: activeBatches,
    },
    revenue: {
      thisMonth: monthlyRevenue[0]?.total || 0,
      transactionCount: monthlyRevenue[0]?.count || 0,
    },
    todayAttendance: attendance,
    pendingHolidays,
  };
}

/**
 * Get revenue report (admin)
 */
export async function getRevenueReport(dateRange: DateRange) {
  const match: Record<string, any> = {
    status: "SUCCESS",
    isDeleted: false,
  };

  if (dateRange.fromDate || dateRange.toDate) {
    match.paidAt = {};
    if (dateRange.fromDate) match.paidAt.$gte = dateRange.fromDate;
    if (dateRange.toDate) match.paidAt.$lte = dateRange.toDate;
  }

  // Daily breakdown
  const dailyRevenue = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$paidAt" },
        },
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // By payment method
  const byMethod = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$paymentMethod",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  // By batch
  const byBatch = await Payment.aggregate([
    { $match: { ...match, batch: { $exists: true } } },
    {
      $group: {
        _id: "$batch",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $lookup: {
        from: "batches",
        localField: "_id",
        foreignField: "_id",
        as: "batchInfo",
      },
    },
    { $unwind: "$batchInfo" },
    {
      $project: {
        batchName: "$batchInfo.batchName",
        total: 1,
        count: 1,
      },
    },
  ]);

  const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.total, 0);

  return {
    totalRevenue,
    totalTransactions: dailyRevenue.reduce((sum, d) => sum + d.count, 0),
    dailyBreakdown: dailyRevenue,
    byPaymentMethod: byMethod,
    byBatch,
  };
}

/**
 * Get attendance report (admin)
 */
export async function getAttendanceReport(dateRange: DateRange, batchId?: string) {
  const match: Record<string, any> = { isDeleted: false };

  if (batchId) {
    match.batch = batchId;
  }

  if (dateRange.fromDate || dateRange.toDate) {
    match.date = {};
    if (dateRange.fromDate) match.date.$gte = dateRange.fromDate;
    if (dateRange.toDate) match.date.$lte = dateRange.toDate;
  }

  // Overall stats
  const overallStats = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const overall = { present: 0, absent: 0, total: 0 };
  overallStats.forEach((s) => {
    if (s._id === "PRESENT") overall.present = s.count;
    if (s._id === "ABSENT") overall.absent = s.count;
    overall.total += s.count;
  });

  // By batch
  const byBatch = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: { batch: "$batch", status: "$status" },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.batch",
        stats: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
      },
    },
    {
      $lookup: {
        from: "batches",
        localField: "_id",
        foreignField: "_id",
        as: "batchInfo",
      },
    },
    { $unwind: "$batchInfo" },
    {
      $project: {
        batchName: "$batchInfo.batchName",
        stats: 1,
      },
    },
  ]);

  // Daily trend
  const dailyTrend = await Attendance.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: "$_id.date",
        stats: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    overall,
    attendanceRate:
      overall.total > 0
        ? Math.round((overall.present / overall.total) * 100)
        : 0,
    byBatch,
    dailyTrend,
  };
}

/**
 * ===========================================
 * PDF GENERATION
 * ===========================================
 */

/**
 * Generate PDF for student attendance report
 */
export async function generateStudentAttendancePDF(
  studentId: string,
  dateRange?: DateRange
): Promise<Buffer> {
  // Get student info
  const student = await User.findById(studentId).select('name email').lean();
  if (!student) {
    throw new NotFoundError('Student', studentId);
  }

  // Get attendance data
  const { records } = await getStudentAttendance(studentId, dateRange, 1, 1000);
  
  // Calculate summary stats
  const stats = {
    present: records.filter((r: any) => r.status === 'PRESENT').length,
    absent: records.filter((r: any) => r.status === 'ABSENT').length,
    total: records.length,
    percentage: 0
  };
  stats.percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Student Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Student: ${student.name}`);
    doc.text(`Email: ${student.email}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    
    if (dateRange?.fromDate || dateRange?.toDate) {
      doc.text(
        `Period: ${dateRange.fromDate?.toLocaleDateString() || 'Start'} - ${dateRange.toDate?.toLocaleDateString() || 'End'}`
      );
    }
    doc.moveDown();

    // Summary Stats
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(11);
    doc.text(`Total Classes: ${stats.total}`);
    doc.text(`Present: ${stats.present}`);
    doc.text(`Absent: ${stats.absent}`);
    doc.text(`Attendance Rate: ${stats.percentage}%`);
    doc.moveDown();

    // Attendance Records Table
    doc.fontSize(14).text('Attendance Records', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    const tableTop = doc.y;
    doc.text('Date', 50, tableTop, { width: 100 });
    doc.text('Batch', 150, tableTop, { width: 150 });
    doc.text('Status', 300, tableTop, { width: 100 });
    doc.text('Marked By', 400, tableTop, { width: 150 });
    
    doc.moveDown();
    doc.font('Helvetica');

    // Table rows
    records.forEach((record: any, index: number) => {
      const y = doc.y;
      
      // Page break if needed
      if (y > 700) {
        doc.addPage();
      }

      doc.text(new Date(record.date).toLocaleDateString(), 50, doc.y, { width: 100 });
      doc.text(record.batch?.batchName || 'N/A', 150, y, { width: 150 });
      doc.text(record.status, 300, y, { width: 100 });
      doc.text(record.markedBy?.name || 'N/A', 400, y, { width: 150 });
      doc.moveDown(0.5);
    });

    // Footer
    doc.fontSize(8).text(
      `Report generated by Music School Management System - ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
}

/**
 * Generate PDF for batch analytics report
 */
export async function generateBatchAnalyticsPDF(
  userId: string,
  userRole: string,
  batchId: string,
  dateRange?: DateRange
): Promise<Buffer> {
  // Get batch analytics with ownership check
  const analytics = await getBatchAnalytics(userId, userRole, batchId, dateRange);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Batch Analytics Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Batch: ${analytics.batch.batchName}`);
    const teacher = analytics.batch.teacher as any;
    doc.text(`Teacher: ${teacher?.name || 'N/A'}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    
    if (dateRange?.fromDate || dateRange?.toDate) {
      doc.text(
        `Period: ${dateRange.fromDate?.toLocaleDateString() || 'Start'} - ${dateRange.toDate?.toLocaleDateString() || 'End'}`
      );
    }
    doc.moveDown();

    // Summary Stats
    doc.fontSize(14).text('Overview', { underline: true });
    doc.fontSize(11);
    doc.text(`Total Students: ${analytics.studentCount}`);
    doc.moveDown();

    // Payment Stats
    doc.fontSize(14).text('Payment Summary', { underline: true });
    doc.fontSize(11);
    doc.text(`Collected: ₹${analytics.payments.collected.toLocaleString()}`);
    doc.text(`Pending: ₹${analytics.payments.pending.toLocaleString()}`);
    doc.text(`Failed: ₹${analytics.payments.failed.toLocaleString()}`);
    doc.moveDown();

    // Student-wise Attendance
    doc.fontSize(14).text('Student Attendance', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Student Name', 50, doc.y, { width: 150 });
    doc.text('Present', 210, doc.y, { width: 80 });
    doc.text('Absent', 300, doc.y, { width: 80 });
    doc.text('Rate', 390, doc.y, { width: 80 });
    doc.moveDown();
    doc.font('Helvetica');

    // Student rows
    analytics.students.forEach((student: any) => {
      const y = doc.y;
      
      // Page break if needed
      if (y > 700) {
        doc.addPage();
      }

      const total = student.attendance.present + student.attendance.absent;
      const rate = total > 0 ? Math.round((student.attendance.present / total) * 100) : 0;

      doc.text(student.name, 50, y, { width: 150 });
      doc.text(student.attendance.present.toString(), 210, y, { width: 80 });
      doc.text(student.attendance.absent.toString(), 300, y, { width: 80 });
      doc.text(`${rate}%`, 390, y, { width: 80 });
      doc.moveDown(0.5);
    });

    // Footer
    doc.fontSize(8).text(
      `Report generated by Music School Management System - ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
}

/**
 * Generate PDF for attendance report (Admin)
 */
export async function generateAttendanceReportPDF(
  dateRange: DateRange,
  batchId?: string
): Promise<Buffer> {
  const report = await getAttendanceReport(dateRange, batchId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
    
    if (dateRange?.fromDate || dateRange?.toDate) {
      doc.text(
        `Period: ${dateRange.fromDate?.toLocaleDateString() || 'Start'} - ${dateRange.toDate?.toLocaleDateString() || 'End'}`
      );
    }
    doc.moveDown();

    // Overall Stats
    doc.fontSize(14).text('Overall Statistics', { underline: true });
    doc.fontSize(11);
    doc.text(`Total Records: ${report.overall.total}`);
    doc.text(`Present: ${report.overall.present}`);
    doc.text(`Absent: ${report.overall.absent}`);
    doc.text(`Attendance Rate: ${report.attendanceRate}%`);
    doc.moveDown();

    // Batch-wise Breakdown
    doc.fontSize(14).text('Batch-wise Breakdown', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Batch Name', 50, doc.y, { width: 200 });
    doc.text('Present', 260, doc.y, { width: 100 });
    doc.text('Absent', 370, doc.y, { width: 100 });
    doc.text('Rate', 480, doc.y, { width: 100 });
    doc.moveDown();
    doc.font('Helvetica');

    // Batch rows
    report.byBatch.forEach((batch: any) => {
      const y = doc.y;
      
      // Page break if needed
      if (y > 500) {
        doc.addPage();
      }

      const present = batch.stats.find((s: any) => s.status === 'PRESENT')?.count || 0;
      const absent = batch.stats.find((s: any) => s.status === 'ABSENT')?.count || 0;
      const total = present + absent;
      const rate = total > 0 ? Math.round((present / total) * 100) : 0;

      doc.text(batch.batchName, 50, y, { width: 200 });
      doc.text(present.toString(), 260, y, { width: 100 });
      doc.text(absent.toString(), 370, y, { width: 100 });
      doc.text(`${rate}%`, 480, y, { width: 100 });
      doc.moveDown(0.5);
    });

    // Footer
    doc.fontSize(8).text(
      `Report generated by Music School Management System - ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
}

/**
 * Generate PDF for revenue report (Admin)
 */
export async function generateRevenueReportPDF(dateRange: DateRange): Promise<Buffer> {
  const report = await getRevenueReport(dateRange);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('Revenue Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString()}`);
    
    if (dateRange?.fromDate || dateRange?.toDate) {
      doc.text(
        `Period: ${dateRange.fromDate?.toLocaleDateString() || 'Start'} - ${dateRange.toDate?.toLocaleDateString() || 'End'}`
      );
    }
    doc.moveDown();

    // Summary
    doc.fontSize(14).text('Summary', { underline: true });
    doc.fontSize(11);
    doc.text(`Total Revenue: ₹${report.totalRevenue.toLocaleString()}`);
    doc.text(`Total Transactions: ${report.totalTransactions}`);
    doc.moveDown();

    // By Payment Method
    doc.fontSize(14).text('Revenue by Payment Method', { underline: true });
    doc.fontSize(11);
    report.byPaymentMethod.forEach((method: any) => {
      doc.text(`${method._id || 'Unknown'}: ₹${method.total.toLocaleString()} (${method.count} transactions)`);
    });
    doc.moveDown();

    // By Batch
    doc.fontSize(14).text('Revenue by Batch', { underline: true });
    doc.moveDown(0.5);

    // Table headers
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Batch Name', 50, doc.y, { width: 250 });
    doc.text('Revenue', 310, doc.y, { width: 120 });
    doc.text('Transactions', 440, doc.y, { width: 100 });
    doc.moveDown();
    doc.font('Helvetica');

    // Batch rows
    report.byBatch.forEach((batch: any) => {
      const y = doc.y;
      
      // Page break if needed
      if (y > 700) {
        doc.addPage();
      }

      doc.text(batch.batchName, 50, y, { width: 250 });
      doc.text(`₹${batch.total.toLocaleString()}`, 310, y, { width: 120 });
      doc.text(batch.count.toString(), 440, y, { width: 100 });
      doc.moveDown(0.5);
    });

    // Footer
    doc.fontSize(8).text(
      `Report generated by Music School Management System - ${new Date().toLocaleString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );

    doc.end();
  });
}
