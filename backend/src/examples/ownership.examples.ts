/**
 * ===============================================
 * OWNERSHIP SERVICE - USAGE EXAMPLES
 * ===============================================
 * This file demonstrates how to use OwnershipService
 * in your controllers and services for data-level access control.
 */

import { Request, Response, NextFunction } from "express";
import { OwnershipService } from "../services/ownership.service";
import { PERMISSIONS } from "../constants/permissions";
import { hasPermission } from "../middleware/rbac.middleware";

/**
 * EXAMPLE 1: Student viewing their own attendance
 * -------------------------------------------
 * RBAC: Student has ATTENDANCE:READ:SELF
 * Ownership: Only their own attendance records
 */
export async function getStudentAttendance(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const userRole = req.auth!.role;

    // For students, ensure they're enrolled in the batch
    if (userRole === "STUDENT") {
      await OwnershipService.ensureStudentInBatch(
        userId,
        batchId,
        "view attendance for this batch"
      );
    }

    // For teachers, ensure they own the batch
    if (userRole === "TEACHER") {
      await OwnershipService.ensureTeacherOwnsBatch(
        userId,
        batchId,
        "view attendance for this batch"
      );
    }

    // Admin can view any batch - no ownership check needed

    // ... fetch and return attendance
    res.json({ success: true, message: "Attendance retrieved" });
  } catch (error) {
    next(error);
  }
}

/**
 * EXAMPLE 2: Teacher editing student attendance
 * -------------------------------------------
 * RBAC: Teacher has ATTENDANCE:UPDATE:UNDER_BATCH
 * Ownership: Only for students in their batches
 */
export async function updateStudentAttendance(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { batchId, studentId } = req.params;
    const userId = req.auth!.userId;
    const userRole = req.auth!.role;

    if (userRole === "TEACHER") {
      // Check teacher owns the batch
      await OwnershipService.ensureTeacherOwnsBatch(
        userId,
        batchId,
        "update attendance for this batch"
      );

      // Check student is in that batch
      await OwnershipService.ensureStudentInBatch(
        studentId,
        batchId,
        "update attendance - student not in this batch"
      );
    }

    // Admin can update any - no ownership check

    // ... update attendance
    res.json({ success: true, message: "Attendance updated" });
  } catch (error) {
    next(error);
  }
}

/**
 * EXAMPLE 3: Teacher editing student profile
 * -------------------------------------------
 * RBAC: Teacher has PROFILE:UPDATE:STUDENT_UNDER_BATCH
 * Ownership: Only students in their batches, and can't change phone
 */
export async function updateStudentProfile(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { studentId } = req.params;
    const userId = req.auth!.userId;
    const userRole = req.auth!.role;
    const fieldsToUpdate = Object.keys(req.body);

    // Use the comprehensive helper
    const { allowed, restrictedFields } = await OwnershipService.canModifyProfile(
      userId,
      userRole,
      studentId,
      fieldsToUpdate
    );

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to modify this profile",
      });
    }

    // Remove restricted fields from update
    if (restrictedFields.length > 0) {
      restrictedFields.forEach((field) => delete req.body[field]);
    }

    // ... update profile
    res.json({
      success: true,
      message: "Profile updated",
      restrictedFields: restrictedFields.length > 0 ? restrictedFields : undefined,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * EXAMPLE 4: Using role-aware helper for batch access
 * -------------------------------------------
 * Single function handles all roles appropriately
 */
export async function getBatchDetails(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const userRole = req.auth!.role;

    // This single call handles:
    // - ADMIN: passes through
    // - TEACHER: checks batch ownership
    // - STUDENT: checks enrollment
    // - GUEST: throws 403
    await OwnershipService.ensureCanAccessBatch(
      userId,
      userRole,
      batchId,
      "view batch details"
    );

    // ... fetch and return batch
    res.json({ success: true, message: "Batch details retrieved" });
  } catch (error) {
    next(error);
  }
}

/**
 * EXAMPLE 5: Teacher posting zoom link
 * -------------------------------------------
 * RBAC: Teacher has ZOOM:POST:UNDER_BATCH
 * Ownership: Only for their batches
 */
export async function postZoomLink(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const userRole = req.auth!.role;

    if (userRole === "TEACHER") {
      await OwnershipService.ensureTeacherCanPostZoom(userId, batchId);
    }
    // Admin can post to any batch

    // ... create zoom session
    res.json({ success: true, message: "Zoom link posted" });
  } catch (error) {
    next(error);
  }
}

/**
 * EXAMPLE 6: Student viewing zoom link
 * -------------------------------------------
 * RBAC: Student has ZOOM:VIEW:UNDER_BATCH
 * Ownership: Only for batches they're enrolled in
 */
export async function getZoomLink(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { batchId } = req.params;
    const userId = req.auth!.userId;
    const userRole = req.auth!.role;

    if (userRole === "STUDENT") {
      await OwnershipService.ensureStudentCanViewZoom(userId, batchId);
    } else if (userRole === "TEACHER") {
      await OwnershipService.ensureTeacherOwnsBatch(
        userId,
        batchId,
        "view zoom link for this batch"
      );
    }
    // Admin can view all

    // ... fetch and return zoom link
    res.json({ success: true, message: "Zoom link retrieved" });
  } catch (error) {
    next(error);
  }
}

/**
 * MIDDLEWARE EXAMPLE: Ownership check as middleware
 * -------------------------------------------
 * Can be used in routes for common patterns
 */
export const ensureBatchAccess = (action: string = "access this batch") => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const batchId = req.params.batchId;
      const userId = req.auth!.userId;
      const userRole = req.auth!.role;

      await OwnershipService.ensureCanAccessBatch(userId, userRole, batchId, action);
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Usage in routes:
// router.get('/batches/:batchId/schedule', authenticate, ensureBatchAccess('view schedule'), getBatchSchedule);
