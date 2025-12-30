/**
 * ===============================================
 * PAYMENTS ROUTES
 * ===============================================
 * Route definitions for payment operations.
 * Uses RBAC + ownership middleware.
 */

import { Router } from "express";
import { PaymentController } from "./payments.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize, authorizeAny } from "../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/payments/me
 * @desc    Get current user's payments
 * @access  Student (own payments only)
 */
router.get(
  "/me",
  authorize([PERMISSIONS.PAYMENT_READ_SELF]),
  PaymentController.getMyPayments
);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Admin only
 */
router.get(
  "/stats",
  authorize([PERMISSIONS.PAYMENT_READ_ANY]),
  PaymentController.getPaymentStats
);

/**
 * @route   GET /api/payments/batch/:batchId
 * @desc    Get payments for students in a specific batch
 * @access  Teacher (their batches) or Admin (any batch)
 */
router.get(
  "/batch/:batchId",
  authorizeAny([PERMISSIONS.PAYMENT_READ_UNDER_BATCH, PERMISSIONS.PAYMENT_READ_ANY]),
  PaymentController.getBatchPayments
);

/**
 * @route   GET /api/payments/student/:studentId
 * @desc    Get all payments for a specific student
 * @access  Admin only
 */
router.get(
  "/student/:studentId",
  authorize([PERMISSIONS.PAYMENT_READ_ANY]),
  PaymentController.getStudentPayments
);

/**
 * @route   GET /api/payments
 * @desc    Get all payments with filters
 * @access  Admin only
 */
router.get(
  "/",
  authorize([PERMISSIONS.PAYMENT_READ_ANY]),
  PaymentController.getAllPayments
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get single payment by ID
 * @access  Student (own), Teacher (batch), Admin (any)
 */
router.get(
  "/:id",
  authorizeAny([
    PERMISSIONS.PAYMENT_READ_SELF,
    PERMISSIONS.PAYMENT_READ_UNDER_BATCH,
    PERMISSIONS.PAYMENT_READ_ANY,
  ]),
  PaymentController.getPaymentById
);

/**
 * @route   POST /api/payments/dummy
 * @desc    Create dummy payment for testing
 * @access  Admin only
 */
router.post(
  "/dummy",
  authorize([PERMISSIONS.PAYMENT_READ_ANY]), // Using read_any as proxy for admin
  PaymentController.createDummyPayment
);

/**
 * @route   POST /api/payments/:id/assign-batch
 * @desc    Assign batch to student after successful payment
 * @access  Admin only
 */
router.post(
  "/:id/assign-batch",
  authorize([PERMISSIONS.PAYMENT_READ_ANY]),
  PaymentController.assignBatchAfterPayment
);

export default router;
