/**
 * ===============================================
 * BATCH REQUESTS CONTROLLER
 * ===============================================
 * HTTP handlers for batch change requests.
 * Ownership enforced in service layer.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  paginatedResponse,
  getAuthContext,
  getPaginationParams,
  validateObjectId,
  validateRequired,
} from "../shared";
import * as BatchRequestsService from "./batch-requests.service";
import { auditService, AUDIT_ACTIONS } from "../../services/audit.service";
import { getRequestContext } from "../../middleware/requestLogger.middleware";

export class BatchRequestsController {
  // ===============================================
  // STUDENT ENDPOINTS
  // ===============================================

  /**
   * POST /api/batch-requests
   * Student creates batch change request
   */
  static createRequest = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    validateRequired(req.body, ["currentBatchId", "requestedBatchId"]);
    validateObjectId(req.body.currentBatchId, "currentBatchId");
    validateObjectId(req.body.requestedBatchId, "requestedBatchId");

    const request = await BatchRequestsService.createRequest({
      studentId: userId,
      currentBatchId: req.body.currentBatchId,
      requestedBatchId: req.body.requestedBatchId,
      reason: req.body.reason,
    });

    successResponse(res, request, "Batch change request submitted", 201);
  });

  /**
   * GET /api/batch-requests/my
   * Student views their own requests
   */
  static getMyRequests = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { page, limit } = getPaginationParams(req.query);

    const result = await BatchRequestsService.getMyRequests(userId, page, limit);

    paginatedResponse(
      res,
      result.requests,
      { total: result.total, page: result.page, limit: result.limit },
      "Your batch change requests"
    );
  });

  // ===============================================
  // TEACHER ENDPOINTS
  // ===============================================

  /**
   * GET /api/batch-requests/teacher
   * Teacher lists requests for their batches
   */
  static getTeacherRequests = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { page, limit } = getPaginationParams(req.query);

    const result = await BatchRequestsService.getRequestsForTeacher(userId, page, limit);

    paginatedResponse(
      res,
      result.requests,
      { total: result.total, page: result.page, limit: result.limit },
      "Batch change requests for your batches"
    );
  });

  /**
   * POST /api/batch-requests/:id/teacher-review
   * Teacher approves/rejects request for their batches
   */
  static teacherReview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, role } = getAuthContext(req);
    validateObjectId(id, "requestId");
    validateRequired(req.body, ["decision"]);

    const { decision } = req.body;
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      throw new Error("Decision must be APPROVED or REJECTED");
    }

    const request = await BatchRequestsService.reviewRequestAsTeacher(userId, id, decision);

    // Audit log batch change request review
    const action = decision === "APPROVED" 
      ? AUDIT_ACTIONS.BATCH_CHANGE_APPROVED 
      : AUDIT_ACTIONS.BATCH_CHANGE_REJECTED;
    
    await auditService.log({
      action,
      performedBy: userId,
      performerRole: role,
      targetModel: 'BatchChangeRequest',
      targetId: id,
      description: `Batch change request ${decision.toLowerCase()} by teacher`,
      newState: { decision },
      requestContext: getRequestContext(req),
    });

    successResponse(res, request, "Request " + decision.toLowerCase());
  });

  // ===============================================
  // ADMIN ENDPOINTS
  // ===============================================

  /**
   * GET /api/batch-requests
   * Admin lists all requests
   */
  static getAllRequests = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req.query);
    const { status, batchId, studentId } = req.query;

    const result = await BatchRequestsService.getAllRequests({
      status: status as string,
      batchId: batchId as string,
      studentId: studentId as string,
      page,
      limit,
    });

    paginatedResponse(
      res,
      result.requests,
      { total: result.total, page: result.page, limit: result.limit },
      "All batch change requests"
    );
  });

  /**
   * GET /api/batch-requests/:id
   * Get single request
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    validateObjectId(id, "requestId");

    const request = await BatchRequestsService.getRequestById(id);

    successResponse(res, request, "Batch change request details");
  });

  /**
   * POST /api/batch-requests/:id/admin-review
   * Admin approves/rejects any request (full authority)
   */
  static adminReview = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, role } = getAuthContext(req);
    validateObjectId(id, "requestId");
    validateRequired(req.body, ["decision"]);

    const { decision } = req.body;
    if (!["APPROVED", "REJECTED"].includes(decision)) {
      throw new Error("Decision must be APPROVED or REJECTED");
    }

    const request = await BatchRequestsService.reviewRequestAsAdmin(userId, id, decision);

    // Audit log admin override (WARNING level)
    await auditService.logWarning({
      action: AUDIT_ACTIONS.BATCH_CHANGE_ADMIN_OVERRIDE,
      performedBy: userId,
      performerRole: role,
      targetModel: 'BatchChangeRequest',
      targetId: id,
      description: `Admin ${decision.toLowerCase()} batch change request`,
      newState: { decision },
      requestContext: getRequestContext(req),
    });

    successResponse(res, request, "Request " + decision.toLowerCase() + " by admin");
  });

  /**
   * POST /api/batch-requests/admin-reassign
   * Admin directly reassigns student (bypasses request flow)
   */
  static adminReassign = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    validateRequired(req.body, ["studentId", "fromBatchId", "toBatchId"]);
    validateObjectId(req.body.studentId, "studentId");
    validateObjectId(req.body.fromBatchId, "fromBatchId");
    validateObjectId(req.body.toBatchId, "toBatchId");

    const enrollment = await BatchRequestsService.adminReassignBatch(
      userId,
      req.body.studentId,
      req.body.fromBatchId,
      req.body.toBatchId
    );

    // Audit log direct batch reassignment (CRITICAL)
    await auditService.logCritical({
      action: AUDIT_ACTIONS.BATCH_REASSIGNED,
      performedBy: userId,
      performerRole: role,
      targetModel: 'User',
      targetId: req.body.studentId,
      description: `Admin directly reassigned student to new batch`,
      previousState: { batchId: req.body.fromBatchId },
      newState: { batchId: req.body.toBatchId },
      metadata: { studentId: req.body.studentId, fromBatchId: req.body.fromBatchId, toBatchId: req.body.toBatchId },
      requestContext: getRequestContext(req),
    });

    successResponse(res, enrollment, "Student reassigned to new batch");
  });
}
