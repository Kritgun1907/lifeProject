/**
 * Models Index
 * Import all models here to ensure they are registered with Mongoose
 * This prevents "Schema hasn't been registered" errors
 */

// Core models
import './User.model';
import './Role.model';
import './Permission.model';
import './Status.model';

// Batch related
import './Batch.model';
import './BatchStudent.model';
import './BatchChangeRequest.model';

// Instrument and scheduling
import './Instrument.model';
import './WorkingDay.model';
import './WorkingTime.model';

// Student related
import './StudentEnrollment.model';
import './StudentBatchApplication.model';

// Attendance
import './Attendance.model';

// Holidays
import './Holiday.model';

// Announcements
import './Announcement.model';
import './AnnouncementBatch.model';
import './AnnouncementRead.model';

// Payments
import './Payment.model';

// Class management
import './ClassPlan.model';
import './ZoomSession.model';

// Audit logging
import './AuditLog.model';

// Export models for convenience (named exports)
export { User } from './User.model';
export { Role } from './Role.model';
export { Permission } from './Permission.model';
export { Status } from './Status.model';
export { Batch } from './Batch.model';
export { BatchStudent } from './BatchStudent.model';
export { BatchChangeRequest } from './BatchChangeRequest.model';
export { Instrument } from './Instrument.model';
export { WorkingDay } from './WorkingDay.model';
export { WorkingTimings } from './WorkingTime.model';
export { StudentEnrollment } from './StudentEnrollment.model';
export { StudentBatchApplication } from './StudentBatchApplication.model';
export { Attendance } from './Attendance.model';
export { Holiday } from './Holiday.model';
export { Announcement } from './Announcement.model';
export { AnnouncementBatch } from './AnnouncementBatch.model';
export { AnnouncementRead } from './AnnouncementRead.model';
export { Payment } from './Payment.model';
export { ClassPlan } from './ClassPlan.model';
export { ZoomSession } from './ZoomSession.model';
export { AuditLog, AUDIT_ACTIONS, AUDIT_SEVERITY } from './AuditLog.model';
