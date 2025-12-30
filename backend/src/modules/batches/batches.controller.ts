import { Request, Response, NextFunction } from 'express';
import BatchesService from './batches.service';
import { getAuthContext } from '../shared';
import { auditService, AUDIT_ACTIONS } from '../../services/audit.service';
import { getRequestContext } from '../../middleware/requestLogger.middleware';

// =============================================================================
// BATCHES CONTROLLER - HTTP Handlers
// =============================================================================

// =============================================================================
// STUDENT ENDPOINTS
// =============================================================================

/**
 * GET /api/batches/my
 * Student views their enrolled batches
 */
export async function getMyBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const studentId = auth.userId;
    const batches = await BatchesService.getMyBatches(studentId);
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches/my/:batchId/schedule
 * Student views schedule for their batch
 */
export async function getMyBatchSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const studentId = auth.userId;
    const { batchId } = req.params;
    const schedule = await BatchesService.getMyBatchSchedule(studentId, batchId);
    res.json({ success: true, data: schedule });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches/my/:batchId/zoom
 * Student gets zoom link for their batch
 */
export async function getMyBatchZoomLink(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const studentId = auth.userId;
    const { batchId } = req.params;
    const zoomInfo = await BatchesService.getMyBatchZoomLink(studentId, batchId);
    res.json({ success: true, data: zoomInfo });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// TEACHER ENDPOINTS
// =============================================================================

/**
 * GET /api/batches/teacher
 * Teacher views their batches
 */
export async function getTeacherBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const batches = await BatchesService.getTeacherBatches(teacherId);
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches/teacher/:batchId
 * Teacher views single batch with students
 */
export async function getTeacherBatchById(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { batchId } = req.params;
    const batch = await BatchesService.getTeacherBatchById(teacherId, batchId);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches/teacher/:batchId/students
 * Teacher views students in their batch
 */
export async function getBatchStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { batchId } = req.params;
    const students = await BatchesService.getBatchStudents(teacherId, batchId);
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/batches/teacher/:batchId/zoom
 * Teacher creates zoom session for their batch
 */
export async function createZoomSession(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { batchId } = req.params;
    const { zoomLink, classDate, startTime, endTime } = req.body;

    const session = await BatchesService.createZoomSession(teacherId, batchId, {
      zoomLink,
      classDate: new Date(classDate),
      startTime,
      endTime
    });
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * GET /api/batches
 * Admin views all batches
 */
export async function getAllBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacherId, instrumentId, mode, status } = req.query;

    const filters = {
      teacherId: teacherId as string | undefined,
      instrumentId: instrumentId as string | undefined,
      mode: mode as 'ONLINE' | 'OFFLINE' | undefined,
      status: status as string | undefined
    };

    const batches = await BatchesService.getAllBatches(filters);
    res.json({ success: true, data: batches });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/batches/:id
 * Admin views single batch
 */
export async function getBatchById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const batch = await BatchesService.getBatchById(id);
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/batches
 * Admin creates new batch
 */
export async function createBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const batch = await BatchesService.createBatch(req.body);
    
    // Audit log batch creation
    await auditService.log({
      action: AUDIT_ACTIONS.BATCH_CREATED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'Batch',
      targetId: batch._id,
      description: `Batch "${batch.batchName}" created`,
      newState: { batchName: batch.batchName, teacher: batch.teacher, instrument: batch.instrument },
      requestContext: getRequestContext(req),
    });
    
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/batches/:id
 * Admin updates batch
 */
export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const { id } = req.params;
    const oldBatch = await BatchesService.getBatchById(id);
    const batch = await BatchesService.updateBatch(id, req.body);
    
    // Audit log batch update
    await auditService.log({
      action: AUDIT_ACTIONS.BATCH_UPDATED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'Batch',
      targetId: batch._id,
      description: `Batch "${batch.batchName}" updated`,
      previousState: { batchName: oldBatch.batchName },
      newState: req.body,
      requestContext: getRequestContext(req),
    });
    
    res.json({ success: true, data: batch });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/batches/:id
 * Admin deletes batch
 */
export async function deleteBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const { id } = req.params;
    const batch = await BatchesService.getBatchById(id);
    const result = await BatchesService.deleteBatch(id);
    
    // Audit log batch deletion (WARNING level)
    await auditService.logWarning({
      action: AUDIT_ACTIONS.BATCH_DELETED,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'Batch',
      targetId: id,
      description: `Batch "${batch.batchName}" deleted`,
      previousState: { batchName: batch.batchName },
      requestContext: getRequestContext(req),
    });
    
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/batches/:id/students
 * Admin adds student to batch
 */
export async function addStudentToBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const { id } = req.params;
    const { studentId } = req.body;
    const enrollment = await BatchesService.addStudentToBatch(studentId, id);
    
    // Audit log student added to batch
    await auditService.log({
      action: AUDIT_ACTIONS.STUDENT_ADDED_TO_BATCH,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'Batch',
      targetId: id,
      description: `Student added to batch`,
      metadata: { studentId, batchId: id },
      requestContext: getRequestContext(req),
    });
    
    res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/batches/:batchId/students/:studentId
 * Admin removes student from batch
 */
export async function removeStudentFromBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const { batchId, studentId } = req.params;
    const result = await BatchesService.removeStudentFromBatch(studentId, batchId);
    
    // Audit log student removed from batch
    await auditService.log({
      action: AUDIT_ACTIONS.STUDENT_REMOVED_FROM_BATCH,
      performedBy: auth.userId,
      performerRole: auth.role,
      targetModel: 'Batch',
      targetId: batchId,
      description: `Student removed from batch`,
      metadata: { studentId, batchId },
      requestContext: getRequestContext(req),
    });
    
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export default {
  // Student
  getMyBatches,
  getMyBatchSchedule,
  getMyBatchZoomLink,
  // Teacher
  getTeacherBatches,
  getTeacherBatchById,
  getBatchStudents,
  createZoomSession,
  // Admin
  getAllBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  addStudentToBatch,
  removeStudentFromBatch
};
