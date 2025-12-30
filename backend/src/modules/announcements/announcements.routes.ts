/**
 * ===============================================
 * ANNOUNCEMENTS ROUTES
 * ===============================================
 * Route definitions for announcement operations.
 */

import { Router } from "express";
import { AnnouncementsController } from "./announcements.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/authorize.middleware";
import { PERMISSIONS } from "../../constants/permissions";

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/announcements
 * @desc    Create new announcement
 * @access  Teacher, Admin
 */
router.post(
  "/",
  authorize([PERMISSIONS.ANNOUNCEMENT_CREATE]),
  AnnouncementsController.create
);

/**
 * @route   GET /api/announcements
 * @desc    Get all announcements (filtered for students)
 * @access  All authenticated
 */
router.get(
  "/",
  authorize([PERMISSIONS.ANNOUNCEMENT_READ]),
  AnnouncementsController.getAll
);

/**
 * @route   GET /api/announcements/batch/:batchId
 * @desc    Get announcements for specific batch
 * @access  All authenticated
 */
router.get(
  "/batch/:batchId",
  authorize([PERMISSIONS.ANNOUNCEMENT_READ]),
  AnnouncementsController.getByBatch
);

/**
 * @route   GET /api/announcements/:id
 * @desc    Get single announcement
 * @access  All authenticated
 */
router.get(
  "/:id",
  authorize([PERMISSIONS.ANNOUNCEMENT_READ]),
  AnnouncementsController.getById
);

/**
 * @route   POST /api/announcements/:id/read
 * @desc    Mark announcement as read
 * @access  All authenticated
 */
router.post(
  "/:id/read",
  authorize([PERMISSIONS.ANNOUNCEMENT_READ]),
  AnnouncementsController.markAsRead
);

/**
 * @route   GET /api/announcements/:id/readers
 * @desc    Get read receipts
 * @access  Creator, Admin
 */
router.get(
  "/:id/readers",
  authorize([PERMISSIONS.ANNOUNCEMENT_READ]),
  AnnouncementsController.getReaders
);

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update announcement
 * @access  Creator, Admin
 */
router.put(
  "/:id",
  authorize([PERMISSIONS.ANNOUNCEMENT_UPDATE]),
  AnnouncementsController.update
);

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete announcement
 * @access  Creator, Admin
 */
router.delete(
  "/:id",
  authorize([PERMISSIONS.ANNOUNCEMENT_DELETE]),
  AnnouncementsController.delete
);

export default router;
