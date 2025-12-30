/**
 * ===============================================
 * PAYMENTS CONTROLLER
 * ===============================================
 * HTTP handlers for payment operations.
 * Thin layer - delegates to service.
 */

import { Request, Response, NextFunction } from "express";
import {
  asyncHandler,
  successResponse,
  paginatedResponse,
  getPaginationParams,
  getAuthContext,
  validateObjectId,
  validateRequired,
} from "../shared";
import * as PaymentService from "./payments.service";
import { OwnershipService } from "../../services/ownership.service";
import { AuthorizationError } from "../../errors";

export class PaymentController {
  /**
   * GET /payments/me
   * Get current user's payments (student)
   */
  static getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { page, limit } = getPaginationParams(req.query);

    const result = await PaymentService.getStudentPayments(userId, page, limit);

    paginatedResponse(res, result.payments, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /payments/batch/:batchId
   * Get payments for a batch (teacher - their batch only)
   */
  static getBatchPayments = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { batchId } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    validateObjectId(batchId, "batchId");

    // Ownership check: teacher must own this batch (admin bypasses)
    if (role !== "ADMIN") {
      await OwnershipService.ensureTeacherOwnsBatch(
        userId,
        batchId,
        "view payments for this batch"
      );
    }

    const result = await PaymentService.getBatchPayments(batchId, page, limit);

    paginatedResponse(res, result.payments, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /payments/student/:studentId
   * Get payments for a specific student (admin only)
   */
  static getStudentPayments = asyncHandler(async (req: Request, res: Response) => {
    const { studentId } = req.params;
    const { page, limit } = getPaginationParams(req.query);

    validateObjectId(studentId, "studentId");

    const result = await PaymentService.getStudentPayments(studentId, page, limit);

    paginatedResponse(res, result.payments, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /payments
   * Get all payments with filters (admin only)
   */
  static getAllPayments = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = getPaginationParams(req.query);
    const { studentId, batchId, status, fromDate, toDate } = req.query;

    const filters = {
      studentId: studentId as string,
      batchId: batchId as string,
      status: status as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };

    const result = await PaymentService.getAllPayments(filters, page, limit);

    paginatedResponse(res, result.payments, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /payments/:id
   * Get single payment by ID
   */
  static getPaymentById = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "paymentId");

    const payment = await PaymentService.getPaymentById(id);

    // Ownership check
    if (role === "STUDENT") {
      // Student can only view their own payments
      if (payment.student._id.toString() !== userId) {
        throw new AuthorizationError("You can only view your own payments");
      }
    } else if (role === "TEACHER") {
      // Teacher can view payments of students in their batches
      if (payment.batch) {
        await OwnershipService.ensureTeacherOwnsBatch(
          userId,
          payment.batch._id.toString(),
          "view this payment"
        );
      } else {
        throw new AuthorizationError("Payment is not associated with a batch");
      }
    }
    // ADMIN can view any payment

    successResponse(res, payment);
  });

  /**
   * POST /payments/dummy
   * Create dummy payment (admin/testing)
   */
  static createDummyPayment = asyncHandler(async (req: Request, res: Response) => {
    validateRequired(req.body, ["studentId", "amount", "paymentMethod"]);

    const { studentId, batchId, amount, paymentMethod, status } = req.body;

    validateObjectId(studentId, "studentId");
    if (batchId) validateObjectId(batchId, "batchId");

    const payment = await PaymentService.createDummyPayment({
      studentId,
      batchId,
      amount,
      paymentMethod,
      status,
    });

    successResponse(res, payment, "Dummy payment created successfully", 201);
  });

  /**
   * POST /payments/:id/assign-batch
   * Assign batch to student after payment (admin)
   */
  static assignBatchAfterPayment = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { batchId } = req.body;

    validateObjectId(id, "paymentId");
    validateRequired(req.body, ["batchId"]);
    validateObjectId(batchId, "batchId");

    const result = await PaymentService.autoAssignBatchAfterPayment(id, batchId);

    successResponse(res, result, "Student assigned to batch successfully");
  });

  /**
   * GET /payments/stats
   * Get payment statistics (admin)
   */
  static getPaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const { fromDate, toDate } = req.query;

    const stats = await PaymentService.getPaymentStats(
      fromDate ? new Date(fromDate as string) : undefined,
      toDate ? new Date(toDate as string) : undefined
    );

    successResponse(res, stats);
  });
}

export default PaymentController;
