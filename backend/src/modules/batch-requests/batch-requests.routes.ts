/**
 * ===============================================
 * BATCH REQUESTS ROUTES
 * ===============================================
 * Routes for batch change requests.
 *
 * Base path: /api/batch-requests
 */

import { Router } from "express";
import { BatchRequestsController } from "./batch-requests.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===============================================
// STUDENT ROUTES
// ===============================================

// POST /api/batch-requests - Create request
router.post(
  "/",
  authorize([PERMISSIONS.BATCH_CHANGE_CREATE]),
  BatchRequestsController.createRequest
);

// GET /api/batch-requests/my - Student's own requests
router.get(
  "/my",
  BatchRequestsController.getMyRequests
);

// ===============================================
// TEACHER ROUTES
// ===============================================

// GET /api/batch-requests/teacher - Teacher's batch requests
router.get(
  "/teacher",
  authorize([PERMISSIONS.BATCH_CHANGE_READ_UNDER_BATCH]),
  BatchRequestsController.getTeacherRequests
);

// POST /api/batch-requests/:id/teacher-review - Teacher reviews
router.post(
  "/:id/teacher-review",
  authorize([PERMISSIONS.BATCH_CHANGE_APPROVE_UNDER_BATCH]),
  BatchRequestsController.teacherReview
);

// ===============================================
// ADMIN ROUTES
// ===============================================

// POST /api/batch-requests/admin-reassign - Admin direct reassign
router.post(
  "/admin-reassign",
  authorize([PERMISSIONS.BATCH_CHANGE_APPROVE_ANY]),
  BatchRequestsController.adminReassign
);

// GET /api/batch-requests - Admin lists all
router.get(
  "/",
  authorize([PERMISSIONS.BATCH_CHANGE_READ_ANY]),
  BatchRequestsController.getAllRequests
);

// GET /api/batch-requests/:id - Get single
router.get(
  "/:id",
  authorize([PERMISSIONS.BATCH_CHANGE_READ_ANY, PERMISSIONS.BATCH_CHANGE_READ_UNDER_BATCH]),
  BatchRequestsController.getById
);

// POST /api/batch-requests/:id/admin-review - Admin reviews
router.post(
  "/:id/admin-review",
  authorize([PERMISSIONS.BATCH_CHANGE_APPROVE_ANY]),
  BatchRequestsController.adminReview
);

export default router;
