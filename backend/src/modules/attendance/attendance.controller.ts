import { Request, Response, NextFunction } from 'express';
import AttendanceService from './attendance.service';
import { getAuthContext } from '../shared';
import { auditService, AUDIT_ACTIONS } from '../../services/audit.service';
import { getRequestContext } from '../../middleware/requestLogger.middleware';

// =============================================================================
// ATTENDANCE CONTROLLER - HTTP Handlers
// =============================================================================
// Ownership checks delegated to service layer
// Controller just handles HTTP request/response
// =============================================================================

// =============================================================================
// STUDENT ENDPOINTS
// =============================================================================

/**
 * GET /api/attendance/my
 * Student views their own attendance
 */
export async function getMyAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const studentId = auth.userId;
    const { batchId, fromDate, toDate } = req.query;

    const filters = {
      batchId: batchId as string | undefined,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined
    };

    const records = await AttendanceService.getMyAttendance(studentId, filters);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/attendance/my/summary
 * Student views their attendance summary
 */
export async function getMyAttendanceSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const studentId = auth.userId;
    const { batchId } = req.query;

    const summary = await AttendanceService.getMyAttendanceSummary(
      studentId,
      batchId as string | undefined
    );
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// TEACHER ENDPOINTS
// =============================================================================

/**
 * POST /api/attendance/mark
 * Teacher marks attendance for their batch
 */
export async function markAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { batchId, date, records } = req.body;

    const result = await AttendanceService.markAttendanceAsTeacher(
      teacherId,
      batchId,
      new Date(date),
      records
    );
    
    // Audit log attendance marking
    await auditService.log({
      action: AUDIT_ACTIONS.ATTENDANCE_MARKED,
      performedBy: teacherId,
      performerRole: auth.role,
      targetModel: 'Attendance',
      description: `Attendance marked for batch on ${date}`,
      metadata: { batchId, date, recordCount: records?.length || 0 },
      requestContext: getRequestContext(req),
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/attendance/:id
 * Teacher edits a single attendance record
 */
export async function editAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { id } = req.params;
    const { status } = req.body;

    const oldRecord = await AttendanceService.getAttendanceById(id);
    const result = await AttendanceService.editAttendanceAsTeacher(teacherId, id, status);
    
    // Audit log attendance update
    await auditService.log({
      action: AUDIT_ACTIONS.ATTENDANCE_UPDATED,
      performedBy: teacherId,
      performerRole: auth.role,
      targetModel: 'Attendance',
      targetId: id,
      description: `Attendance record updated`,
      previousState: { status: oldRecord.status },
      newState: { status },
      requestContext: getRequestContext(req),
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/attendance/teacher
 * Teacher views attendance for their batches
 */
export async function getTeacherAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { batchId, date, studentId } = req.query;

    const filters = {
      batchId: batchId as string | undefined,
      date: date ? new Date(date as string) : undefined,
      studentId: studentId as string | undefined
    };

    const records = await AttendanceService.getAttendanceForTeacher(teacherId, filters);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/attendance/teacher/batch/:batchId/summary
 * Teacher views summary for their batch
 */
export async function getBatchSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { batchId } = req.params;

    const summary = await AttendanceService.getBatchAttendanceSummary(teacherId, batchId);
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * GET /api/attendance
 * Admin views all attendance records
 */
export async function getAllAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId, batchId, status, fromDate, toDate } = req.query;

    const filters = {
      studentId: studentId as string | undefined,
      batchId: batchId as string | undefined,
      status: status as 'PRESENT' | 'ABSENT' | undefined,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined
    };

    const records = await AttendanceService.getAllAttendance(filters);
    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/attendance/:id
 * Get single attendance record
 */
export async function getAttendanceById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const record = await AttendanceService.getAttendanceById(id);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/attendance/admin
 * Admin creates attendance record directly
 */
export async function adminCreateAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const adminId = auth.userId;
    const { studentId, batchId, date, status } = req.body;

    const record = await AttendanceService.createAttendanceAsAdmin(adminId, {
      studentId,
      batchId,
      date: new Date(date),
      status
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/attendance/admin/:id
 * Admin overrides any attendance record
 */
export async function adminOverrideAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const adminId = auth.userId;
    const { id } = req.params;
    const { status } = req.body;

    const oldRecord = await AttendanceService.getAttendanceById(id);
    const record = await AttendanceService.overrideAttendanceAsAdmin(adminId, id, status);
    
    // Audit log attendance override (WARNING - admin override)
    await auditService.logWarning({
      action: AUDIT_ACTIONS.ATTENDANCE_OVERRIDE,
      performedBy: adminId,
      performerRole: auth.role,
      targetModel: 'Attendance',
      targetId: id,
      description: `Admin override: attendance changed from ${oldRecord.status} to ${status}`,
      previousState: { status: oldRecord.status },
      newState: { status },
      requestContext: getRequestContext(req),
    });
    
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/attendance/admin/:id
 * Admin deletes attendance record
 */
export async function adminDeleteAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await AttendanceService.deleteAttendanceAsAdmin(id);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export default {
  // Student
  getMyAttendance,
  getMyAttendanceSummary,
  // Teacher
  markAttendance,
  editAttendance,
  getTeacherAttendance,
  getBatchSummary,
  // Admin
  getAllAttendance,
  getAttendanceById,
  adminCreateAttendance,
  adminOverrideAttendance,
  adminDeleteAttendance
};
