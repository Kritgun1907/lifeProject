/**
 * ===============================================
 * OWNERSHIP SERVICE - DOMAIN-LEVEL ACCESS CONTROL
 * ===============================================
 * RBAC says WHAT you can do (permissions).
 * Ownership says ON WHAT DATA you can do it.
 * 
 * This service provides reusable helpers to ensure users
 * only access data they own or are authorized to manage.
 * 
 * OPTIMIZATIONS:
 * - Memoization support for batch IDs (reduces duplicate queries per request)
 * - Type-safe model interface for dynamic model queries
 * - Aggregation-ready patterns for future optimization
 */

import { Batch } from "../models/Batch.model";
import { BatchStudent } from "../models/BatchStudent.model";
import { Attendance } from "../models/Attendance.model";
import { AppError, AuthorizationError, NotFoundError } from "../errors";

/**
 * ===============================================
 * TYPE DEFINITIONS
 * ===============================================
 */

/**
 * Interface for models that support ownership queries
 * Avoids circular dependencies while maintaining type safety
 */
export interface OwnableModel {
  findOne(query: Record<string, any>): {
    lean(): Promise<Record<string, any> | null>;
  };
}

/**
 * Request context for memoization (attach to req.context in middleware)
 * Reduces duplicate DB queries within a single request
 */
export interface OwnershipContext {
  teacherBatchIds?: string[];
  studentBatchIds?: string[];
}

/**
 * ===============================================
 * OWNERSHIP SERVICE CLASS
 * ===============================================
 */
export class OwnershipService {
  /**
   * -----------------------------------------------
   * MEMOIZATION HELPERS
   * -----------------------------------------------
   * Use these to cache batch IDs within a request lifecycle
   */

  /**
   * Get teacher batch IDs with optional memoization
   * Pass context to cache results across multiple checks in same request
   */
  static async getTeacherBatchIdsMemoized(
    teacherId: string,
    context?: OwnershipContext
  ): Promise<string[]> {
    // Return cached if available
    if (context?.teacherBatchIds) {
      return context.teacherBatchIds;
    }

    const batchIds = await this.getTeacherBatchIds(teacherId);

    // Cache for subsequent calls in same request
    if (context) {
      context.teacherBatchIds = batchIds;
    }

    return batchIds;
  }

  /**
   * Get student batch IDs with optional memoization
   */
  static async getStudentBatchIdsMemoized(
    studentId: string,
    context?: OwnershipContext
  ): Promise<string[]> {
    if (context?.studentBatchIds) {
      return context.studentBatchIds;
    }

    const batchIds = await this.getStudentBatchIds(studentId);

    if (context) {
      context.studentBatchIds = batchIds;
    }

    return batchIds;
  }

  /**
   * -----------------------------------------------
   * BATCH OWNERSHIP CHECKS
   * -----------------------------------------------
   */

  /**
   * Ensure teacher owns/manages the specified batch
   * Use case: Teacher viewing/editing attendance, posting zoom links, etc.
   */
  static async ensureTeacherOwnsBatch(
    teacherId: string,
    batchId: string,
    action: string = "access this batch"
  ): Promise<void> {
    const batch = await Batch.findOne({
      _id: batchId,
      teacher: teacherId,
      isDeleted: false,
    }).lean();

    if (!batch) {
      throw new AuthorizationError(
        `You are not authorized to ${action}. This batch is not assigned to you.`
      );
    }
  }

  /**
   * Check if teacher owns batch (returns boolean, doesn't throw)
   * Use case: Conditional logic in services
   */
  static async teacherOwnsBatch(
    teacherId: string,
    batchId: string
  ): Promise<boolean> {
    const batch = await Batch.findOne({
      _id: batchId,
      teacher: teacherId,
      isDeleted: false,
    }).lean();

    return !!batch;
  }

  /**
   * Get all batch IDs owned by a teacher
   * Use case: Filtering queries to only show teacher's batches
   */
  static async getTeacherBatchIds(teacherId: string): Promise<string[]> {
    const batches = await Batch.find({
      teacher: teacherId,
      isDeleted: false,
    })
      .select("_id")
      .lean();

    return batches.map((b) => b._id.toString());
  }

  /**
   * -----------------------------------------------
   * STUDENT ENROLLMENT CHECKS
   * -----------------------------------------------
   */

  /**
   * Ensure student is enrolled in the specified batch
   * Use case: Student viewing batch schedule, attendance, etc.
   */
  static async ensureStudentInBatch(
    studentId: string,
    batchId: string,
    action: string = "access this batch"
  ): Promise<void> {
    const enrollment = await BatchStudent.findOne({
      student: studentId,
      batch: batchId,
      isDeleted: false,
    }).lean();

    if (!enrollment) {
      throw new AuthorizationError(
        `You are not authorized to ${action}. You are not enrolled in this batch.`
      );
    }
  }

  /**
   * Check if student is enrolled in batch (returns boolean)
   */
  static async studentInBatch(
    studentId: string,
    batchId: string
  ): Promise<boolean> {
    const enrollment = await BatchStudent.findOne({
      student: studentId,
      batch: batchId,
      isDeleted: false,
    }).lean();

    return !!enrollment;
  }

  /**
   * Get all batch IDs a student is enrolled in
   * Use case: Filtering announcements, zoom links, etc.
   */
  static async getStudentBatchIds(studentId: string): Promise<string[]> {
    const enrollments = await BatchStudent.find({
      student: studentId,
      isDeleted: false,
    })
      .select("batch")
      .lean();

    return enrollments.map((e) => e.batch.toString());
  }

  /**
   * -----------------------------------------------
   * ATTENDANCE OWNERSHIP CHECKS
   * -----------------------------------------------
   */

  /**
   * Ensure student owns the attendance record
   * Use case: Student viewing their own attendance
   */
  static async ensureStudentOwnsAttendance(
    studentId: string,
    attendanceId: string
  ): Promise<void> {
    const attendance = await Attendance.findOne({
      _id: attendanceId,
      isDeleted: false,
    }).lean();

    if (!attendance) {
      throw new NotFoundError("Attendance record", attendanceId);
    }

    if (attendance.student.toString() !== studentId) {
      throw new AuthorizationError(
        "You are not authorized to view this attendance record."
      );
    }
  }

  /**
   * Ensure teacher can access attendance (owns the batch)
   * Use case: Teacher viewing/editing student attendance
   */
  static async ensureTeacherCanAccessAttendance(
    teacherId: string,
    attendanceId: string,
    action: string = "access this attendance record"
  ): Promise<void> {
    const attendance = await Attendance.findOne({
      _id: attendanceId,
      isDeleted: false,
    }).lean();

    if (!attendance) {
      throw new NotFoundError("Attendance record", attendanceId);
    }

    // Check if teacher owns the batch this attendance belongs to
    await this.ensureTeacherOwnsBatch(teacherId, attendance.batch.toString(), action);
  }

  /**
   * -----------------------------------------------
   * USER/PROFILE OWNERSHIP CHECKS
   * -----------------------------------------------
   */

  /**
   * Ensure user is accessing their own profile
   * Use case: Profile updates (email, name changes)
   */
  static ensureOwnProfile(
    requesterId: string,
    targetUserId: string,
    action: string = "modify this profile"
  ): void {
    if (requesterId !== targetUserId) {
      throw new AuthorizationError(
        `You are not authorized to ${action}. You can only ${action.replace("this profile", "your own profile")}.`
      );
    }
  }

  /**
   * Ensure teacher can access a student's profile
   * Teacher can only access students in their batches
   */
  static async ensureTeacherCanAccessStudent(
    teacherId: string,
    studentId: string,
    action: string = "access this student",
    context?: OwnershipContext // Optional memoization context
  ): Promise<void> {
    // Get all batches the teacher owns (with memoization)
    const teacherBatchIds = await this.getTeacherBatchIdsMemoized(teacherId, context);

    if (teacherBatchIds.length === 0) {
      throw new AuthorizationError(
        `You are not authorized to ${action}. You have no assigned batches.`
      );
    }

    // Check if student is in any of teacher's batches
    const enrollment = await BatchStudent.findOne({
      student: studentId,
      batch: { $in: teacherBatchIds },
      isDeleted: false,
    }).lean();

    if (!enrollment) {
      throw new AuthorizationError(
        `You are not authorized to ${action}. This student is not in any of your batches.`
      );
    }
  }

  /**
   * -----------------------------------------------
   * BATCH CHANGE REQUEST OWNERSHIP
   * -----------------------------------------------
   */

  /**
   * Ensure student owns the batch change request
   * Use case: Student viewing their own request
   */
  static async ensureStudentOwnsBatchChangeRequest(
    studentId: string,
    requestId: string,
    model: OwnableModel // Type-safe model interface
  ): Promise<void> {
    const request = await model.findOne({
      _id: requestId,
      isDeleted: false,
    }).lean();

    if (!request) {
      throw new NotFoundError("Batch change request", requestId);
    }

    if (request.student.toString() !== studentId) {
      throw new AuthorizationError(
        "You are not authorized to access this batch change request."
      );
    }
  }

  /**
   * Ensure teacher can approve/reject batch change request
   * Teacher can only manage requests from students in their batches
   */
  static async ensureTeacherCanManageBatchChangeRequest(
    teacherId: string,
    requestId: string,
    model: OwnableModel, // Type-safe model interface
    action: string = "manage this batch change request",
    context?: OwnershipContext // Optional memoization context
  ): Promise<void> {
    const request = await model.findOne({
      _id: requestId,
      isDeleted: false,
    }).lean();

    if (!request) {
      throw new NotFoundError("Batch change request", requestId);
    }

    // Teacher must own either the current batch OR the requested batch
    // Use memoized version to avoid duplicate queries
    const teacherBatchIds = await this.getTeacherBatchIdsMemoized(teacherId, context);

    const canAccess =
      teacherBatchIds.includes(request.currentBatch?.toString()) ||
      teacherBatchIds.includes(request.requestedBatch?.toString());

    if (!canAccess) {
      throw new AuthorizationError(
        `You are not authorized to ${action}. This request involves batches not assigned to you.`
      );
    }
  }

  /**
   * -----------------------------------------------
   * ZOOM SESSION OWNERSHIP
   * -----------------------------------------------
   */

  /**
   * Ensure teacher can post zoom link for a batch
   */
  static async ensureTeacherCanPostZoom(
    teacherId: string,
    batchId: string
  ): Promise<void> {
    await this.ensureTeacherOwnsBatch(teacherId, batchId, "post zoom link for this batch");
  }

  /**
   * Ensure student can view zoom link for a batch
   */
  static async ensureStudentCanViewZoom(
    studentId: string,
    batchId: string
  ): Promise<void> {
    await this.ensureStudentInBatch(studentId, batchId, "view zoom link for this batch");
  }

  /**
   * -----------------------------------------------
   * ROLE-AWARE HELPERS
   * -----------------------------------------------
   * These combine role checks with ownership for common patterns
   */

  /**
   * Check if user can access batch data based on role
   * - ADMIN: any batch
   * - TEACHER: only their batches
   * - STUDENT: only batches they're enrolled in
   */
  static async ensureCanAccessBatch(
    userId: string,
    userRole: string,
    batchId: string,
    action: string = "access this batch"
  ): Promise<void> {
    if (userRole === "ADMIN") {
      // Admin can access any batch
      return;
    }

    if (userRole === "TEACHER") {
      await this.ensureTeacherOwnsBatch(userId, batchId, action);
      return;
    }

    if (userRole === "STUDENT") {
      await this.ensureStudentInBatch(userId, batchId, action);
      return;
    }

    // GUEST or unknown role
    throw new AuthorizationError(`You are not authorized to ${action}.`);
  }

  /**
   * Check if user can access student data based on role
   * - ADMIN: any student
   * - TEACHER: only students in their batches
   * - STUDENT: only themselves
   */
  static async ensureCanAccessStudent(
    userId: string,
    userRole: string,
    targetStudentId: string,
    action: string = "access this student"
  ): Promise<void> {
    if (userRole === "ADMIN") {
      return;
    }

    if (userRole === "TEACHER") {
      await this.ensureTeacherCanAccessStudent(userId, targetStudentId, action);
      return;
    }

    if (userRole === "STUDENT") {
      this.ensureOwnProfile(userId, targetStudentId, action);
      return;
    }

    throw new AuthorizationError(`You are not authorized to ${action}.`);
  }

  /**
   * Check if user can modify profile based on role and target
   * - ADMIN: can modify anyone's full profile
   * - TEACHER: can modify students in their batches (except phone)
   * - STUDENT: can modify own profile (except phone)
   * - GUEST: can view own profile only
   */
  static async canModifyProfile(
    userId: string,
    userRole: string,
    targetUserId: string,
    fieldsToModify: string[],
    context?: OwnershipContext // Optional memoization context
  ): Promise<{ allowed: boolean; restrictedFields: string[] }> {
    const restrictedFields: string[] = [];

    // Phone number is restricted for non-admins
    if (userRole !== "ADMIN" && fieldsToModify.includes("mobile")) {
      restrictedFields.push("mobile");
    }

    if (userRole === "ADMIN") {
      return { allowed: true, restrictedFields: [] };
    }

    if (userRole === "TEACHER") {
      if (userId === targetUserId) {
        // Teacher modifying own profile
        return { allowed: true, restrictedFields };
      }
      // Check if target is a student in teacher's batches
      try {
        await this.ensureTeacherCanAccessStudent(userId, targetUserId, "modify profile", context);
        return { allowed: true, restrictedFields };
      } catch {
        return { allowed: false, restrictedFields };
      }
    }

    if (userRole === "STUDENT" || userRole === "GUEST") {
      if (userId === targetUserId) {
        return { allowed: true, restrictedFields };
      }
      return { allowed: false, restrictedFields };
    }

    return { allowed: false, restrictedFields };
  }

  /**
   * -----------------------------------------------
   * AGGREGATION HELPERS (Future Optimization)
   * -----------------------------------------------
   * These methods combine multiple checks in a single query
   * Use when performance becomes critical
   */

  /**
   * Check teacher's access to student in one query
   * Combines getTeacherBatchIds + enrollment check
   * @future Optimize to single aggregation pipeline
   */
  static async teacherHasAccessToStudent(
    teacherId: string,
    studentId: string
  ): Promise<boolean> {
    // Future: Replace with aggregation pipeline
    // db.batches.aggregate([
    //   { $match: { teacher: teacherId, isDeleted: false } },
    //   { $lookup: { from: "batchstudents", ... } },
    //   { $match: { "enrollments.student": studentId } }
    // ])
    
    const teacherBatchIds = await this.getTeacherBatchIds(teacherId);
    if (teacherBatchIds.length === 0) return false;

    const enrollment = await BatchStudent.findOne({
      student: studentId,
      batch: { $in: teacherBatchIds },
      isDeleted: false,
    }).lean();

    return !!enrollment;
  }
}

export default OwnershipService;