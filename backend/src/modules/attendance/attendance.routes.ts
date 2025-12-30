import { Router } from 'express';
import AttendanceController from './attendance.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// STUDENT ROUTES - View own attendance
// =============================================================================

// GET /api/attendance/my - Student views their attendance
router.get('/my', 
  authorize([PERMISSIONS.ATTENDANCE_READ_SELF]),
  AttendanceController.getMyAttendance
);

// GET /api/attendance/my/summary - Student views attendance summary
router.get('/my/summary',
  authorize([PERMISSIONS.ATTENDANCE_READ_SELF]),
  AttendanceController.getMyAttendanceSummary
);

// =============================================================================
// TEACHER ROUTES - Manage attendance for their batches
// =============================================================================

// POST /api/attendance/mark - Teacher marks attendance
router.post('/mark',
  authorize([PERMISSIONS.ATTENDANCE_UPDATE_UNDER_BATCH]),
  AttendanceController.markAttendance
);

// GET /api/attendance/teacher - Teacher views their batch attendance
router.get('/teacher',
  authorize([PERMISSIONS.ATTENDANCE_READ_UNDER_BATCH]),
  AttendanceController.getTeacherAttendance
);

// GET /api/attendance/teacher/batch/:batchId/summary - Teacher views batch summary
router.get('/teacher/batch/:batchId/summary',
  authorize([PERMISSIONS.ATTENDANCE_READ_UNDER_BATCH]),
  AttendanceController.getBatchSummary
);

// PUT /api/attendance/:id - Teacher edits attendance (ownership checked in service)
router.put('/:id',
  authorize([PERMISSIONS.ATTENDANCE_UPDATE_UNDER_BATCH]),
  AttendanceController.editAttendance
);

// =============================================================================
// ADMIN ROUTES - Full access
// =============================================================================

// GET /api/attendance - Admin views all attendance
router.get('/',
  authorize([PERMISSIONS.ATTENDANCE_READ_ANY]),
  AttendanceController.getAllAttendance
);

// GET /api/attendance/:id - Get single record
router.get('/:id',
  authorize([PERMISSIONS.ATTENDANCE_READ_ANY]),
  AttendanceController.getAttendanceById
);

// POST /api/attendance/admin - Admin creates attendance directly
router.post('/admin',
  authorize([PERMISSIONS.ATTENDANCE_UPDATE_ANY]),
  AttendanceController.adminCreateAttendance
);

// PUT /api/attendance/admin/:id - Admin overrides any attendance
router.put('/admin/:id',
  authorize([PERMISSIONS.ATTENDANCE_UPDATE_ANY]),
  AttendanceController.adminOverrideAttendance
);

// DELETE /api/attendance/admin/:id - Admin deletes attendance
router.delete('/admin/:id',
  authorize([PERMISSIONS.ATTENDANCE_UPDATE_ANY]),
  AttendanceController.adminDeleteAttendance
);

export default router;
