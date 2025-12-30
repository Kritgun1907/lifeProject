import { Attendance } from '../../models/Attendance.model';
import { Batch } from '../../models/Batch.model';
import { User } from '../../models/User.model';
import { Holiday } from '../../models/Holiday.model';
import { AppError, ValidationError } from '../../errors';
import OwnershipService from '../../services/ownership.service';
import mongoose, { Types } from 'mongoose';

// =============================================================================
// ATTENDANCE MODULE - DDD OWNERSHIP BOUNDARIES
// =============================================================================
// Student: View own attendance records only
// Teacher: Mark/edit attendance for students in their batches
// Admin: Full audit access, can override any attendance record
// 
// HOLIDAY INTEGRATION:
// - Attendance cannot be marked on approved holidays
// - Attendance analytics exclude holiday dates
// - API responses include holiday context for UI indicators
// =============================================================================

// =============================================================================
// HOLIDAY HELPER FUNCTIONS
// =============================================================================

/**
 * Check if a date is an approved holiday for a batch
 */
async function isHolidayForBatch(batchId: string, date: Date): Promise<boolean> {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const holiday = await Holiday.findOne({
    batch: batchId,
    date: { $gte: dateStart, $lte: dateEnd },
    status: 'APPROVED',
    isDeleted: false,
  });

  return !!holiday;
}

/**
 * Get holiday info for a specific date and batch
 */
async function getHolidayInfo(batchId: string, date: Date): Promise<{ isHoliday: boolean; reason?: string }> {
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const holiday = await Holiday.findOne({
    batch: batchId,
    date: { $gte: dateStart, $lte: dateEnd },
    status: 'APPROVED',
    isDeleted: false,
  }).lean();

  return holiday 
    ? { isHoliday: true, reason: holiday.reason }
    : { isHoliday: false };
}

/**
 * Get all approved holiday dates for a batch within a date range
 */
async function getHolidayDatesForBatch(
  batchId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<Date[]> {
  const query: any = {
    batch: batchId,
    status: 'APPROVED',
    isDeleted: false,
  };

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) query.date.$gte = fromDate;
    if (toDate) query.date.$lte = toDate;
  }

  const holidays = await Holiday.find(query).select('date').lean();
  return holidays.map(h => h.date);
}

/**
 * Enrich attendance records with holiday context for UI
 */
async function enrichWithHolidayContext(
  records: any[],
  batchId: string
): Promise<any[]> {
  if (records.length === 0) return records;

  // Get date range from records
  const dates = records.map(r => new Date(r.date));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Get all holidays in this range
  const holidays = await Holiday.find({
    batch: batchId,
    date: { $gte: minDate, $lte: maxDate },
    status: 'APPROVED',
    isDeleted: false,
  }).lean();

  // Create a map for quick lookup (normalize dates to YYYY-MM-DD)
  const holidayMap = new Map<string, any>();
  holidays.forEach(h => {
    const dateKey = h.date.toISOString().split('T')[0];
    holidayMap.set(dateKey, h);
  });

  // Enrich records
  return records.map(record => {
    const recordDateKey = new Date(record.date).toISOString().split('T')[0];
    const holiday = holidayMap.get(recordDateKey);
    
    return {
      ...record,
      isHoliday: !!holiday,
      holidayReason: holiday?.reason || null,
    };
  });
}

interface AttendanceFilter {
  studentId?: string;
  batchId?: string;
  fromDate?: Date;
  toDate?: Date;
  status?: 'PRESENT' | 'ABSENT';
}

// =============================================================================
// STUDENT OPERATIONS - View own attendance only
// =============================================================================

/**
 * Get attendance records for a specific student (their own)
 * INTEGRATION: Enriches response with holiday context for UI
 */
export async function getMyAttendance(
  studentId: string,
  filters: { batchId?: string; fromDate?: Date; toDate?: Date }
) {
  const query: any = { student: studentId, isDeleted: false };

  if (filters.batchId) {
    query.batch = filters.batchId;
  }

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = filters.fromDate;
    if (filters.toDate) query.date.$lte = filters.toDate;
  }

  const records = await Attendance.find(query)
    .populate('batch', 'batchName instrument')
    .sort({ date: -1 })
    .lean();

  // Enrich with holiday context if specific batch is requested
  if (filters.batchId && records.length > 0) {
    const enrichedRecords = await enrichWithHolidayContext(records, filters.batchId);
    
    // Also fetch upcoming holidays for this batch
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const upcomingHolidays = await Holiday.find({
      batch: filters.batchId,
      date: { $gte: new Date(), $lte: futureDate },
      status: 'APPROVED',
      isDeleted: false,
    })
      .select('date reason')
      .sort({ date: 1 })
      .lean();

    return { records: enrichedRecords, upcomingHolidays };
  }

  return { records, upcomingHolidays: [] };
}

/**
 * Get attendance summary/statistics for a student
 * INTEGRATION: Excludes holidays from attendance rate calculations
 */
export async function getMyAttendanceSummary(
  studentId: string,
  batchId?: string,
  dateRange?: { fromDate?: Date; toDate?: Date }
) {
  const matchQuery: any = { 
    student: new mongoose.Types.ObjectId(studentId),
    isDeleted: false
  };
  
  if (batchId) {
    matchQuery.batch = new mongoose.Types.ObjectId(batchId);
    
    // Get holiday dates for this batch to exclude
    const holidayDates = await getHolidayDatesForBatch(
      batchId,
      dateRange?.fromDate,
      dateRange?.toDate
    );
    
    if (holidayDates.length > 0) {
      matchQuery.date = { $nin: holidayDates };
    }
  }

  if (dateRange?.fromDate || dateRange?.toDate) {
    matchQuery.date = matchQuery.date || {};
    if (dateRange.fromDate) matchQuery.date.$gte = dateRange.fromDate;
    if (dateRange.toDate) matchQuery.date.$lte = dateRange.toDate;
  }

  const summary = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result: {
    present: number;
    absent: number;
    total: number;
    attendanceRate: string;
    excludedHolidays?: number;
  } = {
    present: 0,
    absent: 0,
    total: 0,
    attendanceRate: '0'
  };

  summary.forEach((item: { _id: string; count: number }) => {
    if (item._id === 'PRESENT') result.present = item.count;
    else if (item._id === 'ABSENT') result.absent = item.count;
    result.total += item.count;
  });

  result.attendanceRate = result.total > 0 
    ? ((result.present / result.total) * 100).toFixed(1)
    : '0';

  // Add info about excluded holidays
  if (batchId) {
    const holidayCount = (await getHolidayDatesForBatch(
      batchId,
      dateRange?.fromDate,
      dateRange?.toDate
    )).length;
    result.excludedHolidays = holidayCount;
  }

  return result;
}

// =============================================================================
// TEACHER OPERATIONS - Manage attendance for their batches
// =============================================================================

/**
 * Mark attendance for students in a batch (teacher must own the batch)
 * INTEGRATION: Rejects attendance marking on approved holidays
 */
export async function markAttendanceAsTeacher(
  teacherId: string,
  batchId: string,
  date: Date,
  records: Array<{ studentId: string; status: 'PRESENT' | 'ABSENT' }>
) {
  // Verify teacher owns this batch
  await OwnershipService.ensureTeacherOwnsBatch(teacherId, batchId, 'mark attendance for');

  // CHECK: Prevent attendance marking on holidays
  const holidayCheck = await isHolidayForBatch(batchId, date);
  if (holidayCheck) {
    const holidayInfo = await getHolidayInfo(batchId, date);
    throw new ValidationError(
      `Cannot mark attendance for ${date.toLocaleDateString()} - this is an approved holiday${holidayInfo.reason ? `: ${holidayInfo.reason}` : ''}`
    );
  }

  // Verify all students are in this batch
  for (const record of records) {
    await OwnershipService.ensureStudentInBatch(record.studentId, batchId);
  }

  // Normalize date to start of day
  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  // Check for existing attendance on this date for this batch
  const existingRecords = await Attendance.find({
    batch: batchId,
    date: { $gte: dateStart, $lt: dateEnd },
    isDeleted: false
  });

  const existingMap = new Map<string, any>(
    existingRecords.map((r: any) => [r.student.toString(), r])
  );

  const results = [];

  for (const record of records) {
    const existing = existingMap.get(record.studentId);

    if (existing) {
      // Update existing record
      existing.status = record.status;
      existing.markedBy = teacherId;
      await existing.save();
      results.push(existing);
    } else {
      // Create new record
      const newRecord = await Attendance.create({
        student: record.studentId,
        batch: batchId,
        date: dateStart,
        status: record.status,
        markedBy: teacherId
      });
      results.push(newRecord);
    }
  }

  return results;
}

/**
 * Edit a single attendance record (teacher must own the batch)
 * INTEGRATION: Rejects edits on holiday dates
 */
export async function editAttendanceAsTeacher(
  teacherId: string,
  attendanceId: string,
  status: 'PRESENT' | 'ABSENT'
) {
  const record = await Attendance.findById(attendanceId).populate('batch');
  if (!record || record.isDeleted) {
    throw new AppError('Attendance record not found', 404);
  }

  const batchId = (record.batch as any)._id?.toString() || record.batch.toString();
  
  // Use OwnershipService to verify teacher owns the batch
  await OwnershipService.ensureTeacherOwnsBatch(teacherId, batchId, 'edit attendance for');

  // CHECK: Prevent edits on holiday dates
  const holidayCheck = await isHolidayForBatch(batchId, record.date);
  if (holidayCheck) {
    const holidayInfo = await getHolidayInfo(batchId, record.date);
    throw new ValidationError(
      `Cannot edit attendance for ${record.date.toLocaleDateString()} - this is an approved holiday${holidayInfo.reason ? `: ${holidayInfo.reason}` : ''}`
    );
  }

  record.status = status;
  record.markedBy = new mongoose.Types.ObjectId(teacherId);

  await record.save();
  return record;
}

/**
 * Get attendance records for a teacher's batches
 * INTEGRATION: Enriches response with holiday context for UI
 */
export async function getAttendanceForTeacher(
  teacherId: string,
  filters: { batchId?: string; date?: Date; studentId?: string }
) {
  // Get all batches this teacher owns
  const teacherBatches = await Batch.find({ teacher: teacherId, isDeleted: false }).select('_id');
  const batchIds = teacherBatches.map((b: any) => b._id);

  if (batchIds.length === 0) {
    return { records: [], upcomingHolidays: [] };
  }

  const query: any = { batch: { $in: batchIds }, isDeleted: false };
  let targetBatchId = filters.batchId;

  if (filters.batchId) {
    // Verify teacher owns this specific batch
    if (!batchIds.some((id: Types.ObjectId) => id.toString() === filters.batchId)) {
      throw new AppError('You do not have access to this batch', 403);
    }
    query.batch = filters.batchId;
  }

  if (filters.date) {
    const dateStart = new Date(filters.date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(filters.date);
    dateEnd.setHours(23, 59, 59, 999);
    query.date = { $gte: dateStart, $lte: dateEnd };
  }

  if (filters.studentId) {
    query.student = filters.studentId;
  }

  const records = await Attendance.find(query)
    .populate('student', 'name email')
    .populate('batch', 'batchName')
    .sort({ date: -1 })
    .lean();

  // Enrich with holiday context if a specific batch is requested
  let enrichedRecords = records;
  let upcomingHolidays: any[] = [];

  if (targetBatchId) {
    enrichedRecords = await enrichWithHolidayContext(records, targetBatchId);
    
    // Also fetch upcoming holidays for this batch (next 30 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    upcomingHolidays = await Holiday.find({
      batch: targetBatchId,
      date: { $gte: new Date(), $lte: futureDate },
      status: 'APPROVED',
      isDeleted: false,
    })
      .select('date reason')
      .sort({ date: 1 })
      .lean();
  }

  return { records: enrichedRecords, upcomingHolidays };
}

/**
 * Get attendance summary for a batch (teacher must own)
 * INTEGRATION: Excludes holidays from attendance calculations
 */
export async function getBatchAttendanceSummary(
  teacherId: string,
  batchId: string,
  dateRange?: { fromDate?: Date; toDate?: Date }
) {
  // Use OwnershipService to verify teacher owns the batch
  await OwnershipService.ensureTeacherOwnsBatch(teacherId, batchId, 'view attendance for');

  // Get approved holiday dates for this batch
  const holidayDates = await getHolidayDatesForBatch(
    batchId,
    dateRange?.fromDate,
    dateRange?.toDate
  );

  // Build match query excluding holidays
  const matchQuery: any = { 
    batch: new mongoose.Types.ObjectId(batchId), 
    isDeleted: false 
  };

  // Exclude holiday dates from calculation
  if (holidayDates.length > 0) {
    matchQuery.date = { $nin: holidayDates };
  }

  if (dateRange?.fromDate || dateRange?.toDate) {
    matchQuery.date = matchQuery.date || {};
    if (dateRange.fromDate) matchQuery.date.$gte = dateRange.fromDate;
    if (dateRange.toDate) matchQuery.date.$lte = dateRange.toDate;
  }

  const summary = await Attendance.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: { student: '$student', status: '$status' },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.student',
        statuses: {
          $push: { status: '$_id.status', count: '$count' }
        }
      }
    }
  ]);

  // Populate student names
  const studentIds = summary.map((s: any) => s._id);
  const students = await User.find({ _id: { $in: studentIds } }).select('name email');
  const studentMap = new Map(students.map((s: any) => [s._id.toString(), s]));

  // Get upcoming holidays for this batch
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);
  
  const upcomingHolidays = await Holiday.find({
    batch: batchId,
    date: { $gte: new Date(), $lte: futureDate },
    status: 'APPROVED',
    isDeleted: false,
  })
    .select('date reason')
    .sort({ date: 1 })
    .lean();

  return {
    students: summary.map((s: any) => ({
      student: studentMap.get(s._id.toString()),
      attendance: s.statuses
    })),
    excludedHolidays: holidayDates.length,
    upcomingHolidays,
  };
}

// =============================================================================
// ADMIN OPERATIONS - Full audit access
// =============================================================================

/**
 * Get all attendance records (admin full access)
 */
export async function getAllAttendance(filters: AttendanceFilter) {
  const query: any = { isDeleted: false };

  if (filters.studentId) query.student = filters.studentId;
  if (filters.batchId) query.batch = filters.batchId;
  if (filters.status) query.status = filters.status;

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = filters.fromDate;
    if (filters.toDate) query.date.$lte = filters.toDate;
  }

  const records = await Attendance.find(query)
    .populate('student', 'name email')
    .populate('batch', 'batchName teacher')
    .populate('markedBy', 'name')
    .sort({ date: -1 });

  return records;
}

/**
 * Override/edit any attendance record (admin)
 */
export async function overrideAttendanceAsAdmin(
  adminId: string,
  attendanceId: string,
  status: 'PRESENT' | 'ABSENT'
) {
  const record = await Attendance.findById(attendanceId);
  if (!record || record.isDeleted) {
    throw new AppError('Attendance record not found', 404);
  }

  record.status = status;
  record.markedBy = new mongoose.Types.ObjectId(adminId);

  await record.save();
  return record;
}

/**
 * Create attendance record directly (admin)
 */
export async function createAttendanceAsAdmin(
  adminId: string,
  data: { studentId: string; batchId: string; date: Date; status: 'PRESENT' | 'ABSENT' }
) {
  // Verify student exists and is in the batch
  await OwnershipService.ensureStudentInBatch(data.studentId, data.batchId);

  const record = await Attendance.create({
    student: data.studentId,
    batch: data.batchId,
    date: data.date,
    status: data.status,
    markedBy: adminId
  });

  return record;
}

/**
 * Soft delete attendance record (admin only)
 */
export async function deleteAttendanceAsAdmin(attendanceId: string) {
  const record = await Attendance.findById(attendanceId);
  if (!record || record.isDeleted) {
    throw new AppError('Attendance record not found', 404);
  }

  record.isDeleted = true;
  record.deletedAt = new Date();
  await record.save();

  return { message: 'Attendance record deleted' };
}

/**
 * Get attendance by ID
 */
export async function getAttendanceById(attendanceId: string) {
  const record = await Attendance.findById(attendanceId)
    .populate('student', 'name email')
    .populate('batch', 'batchName teacher')
    .populate('markedBy', 'name');

  if (!record || record.isDeleted) {
    throw new AppError('Attendance record not found', 404);
  }

  return record;
}

export default {
  // Student
  getMyAttendance,
  getMyAttendanceSummary,
  // Teacher
  markAttendanceAsTeacher,
  editAttendanceAsTeacher,
  getAttendanceForTeacher,
  getBatchAttendanceSummary,
  // Admin
  getAllAttendance,
  overrideAttendanceAsAdmin,
  createAttendanceAsAdmin,
  deleteAttendanceAsAdmin,
  getAttendanceById
};
