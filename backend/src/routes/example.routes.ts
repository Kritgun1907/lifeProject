import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  requirePermission,
  requireAllPermissions,
  requireAnyPermission,
  requireRole,
  requireAdmin,
  requireTeacherOrAdmin,
  requireOwnership,
} from "../middleware/rbac.middleware";
import { PERMISSIONS } from "../constants/permissions";

const router = Router();

/**
 * EXAMPLE ROUTES - Demonstrating RBAC Usage
 * Replace these with your actual controllers
 */

// ========================================
// PUBLIC ROUTES (No auth required)
// ========================================
router.get("/announcements/public", (req, res) => {
  res.json({ message: "Public announcements" });
});

// ========================================
// AUTHENTICATED ROUTES
// ========================================

// Get own profile - requires authentication + PROFILE:READ:SELF
router.get(
  "/profile/me",
  authenticate,
  requirePermission(PERMISSIONS.PROFILE_READ_SELF),
  (req, res) => {
    res.json({
      success: true,
      auth: req.auth,
    });
  }
);

// Update own profile - requires PROFILE:UPDATE:SELF_LIMITED
router.put(
  "/profile/me",
  authenticate,
  requirePermission(PERMISSIONS.PROFILE_UPDATE_SELF_LIMITED),
  (req, res) => {
    res.json({
      success: true,
      message: "Profile updated",
    });
  }
);

// ========================================
// STUDENT ROUTES
// ========================================

// Get own attendance - Student can read their own
router.get(
  "/attendance/me",
  authenticate,
  requirePermission(PERMISSIONS.ATTENDANCE_READ_SELF),
  (req, res) => {
    res.json({
      success: true,
      attendance: [],
    });
  }
);

// Get own batches - Student can read their batches
router.get(
  "/batches/my-batches",
  authenticate,
  requirePermission(PERMISSIONS.BATCH_READ_OWN),
  (req, res) => {
    res.json({
      success: true,
      batches: [],
    });
  }
);

// Create batch change request
router.post(
  "/batch-changes",
  authenticate,
  requirePermission(PERMISSIONS.BATCH_CHANGE_CREATE),
  (req, res) => {
    res.json({
      success: true,
      message: "Batch change request created",
    });
  }
);

// ========================================
// TEACHER ROUTES
// ========================================

// Get students in teacher's batches
router.get(
  "/students/my-batches",
  authenticate,
  requirePermission(PERMISSIONS.STUDENT_READ_UNDER_BATCH),
  (req, res) => {
    res.json({
      success: true,
      students: [],
    });
  }
);

// Mark attendance for teacher's batches
router.post(
  "/attendance/mark",
  authenticate,
  requirePermission(PERMISSIONS.ATTENDANCE_UPDATE_UNDER_BATCH),
  (req, res) => {
    res.json({
      success: true,
      message: "Attendance marked",
    });
  }
);

// Create announcement (Teacher or Admin)
// router.post(
//   "/announcements",
//   authenticate,
//   requirePermission(PERMISSIONS.ANNOUNCEMENT_CREATE),
//   (req, res) => {
//     res.json({
//       success: true,
//       message: "Announcement created",
//     });
//   }
// );

// Post Zoom link for teacher's batches
router.post(
  "/zoom/my-batches",
  authenticate,
  requirePermission(PERMISSIONS.ZOOM_POST_UNDER_BATCH),
  (req, res) => {
    res.json({
      success: true,
      message: "Zoom link posted",
    });
  }
);

// ========================================
// ADMIN ROUTES
// ========================================

// Get all students - Admin only
router.get(
  "/students/all",
  authenticate,
  requirePermission(PERMISSIONS.STUDENT_READ_ANY),
  (req, res) => {
    res.json({
      success: true,
      students: [],
    });
  }
);

// Create new student - Admin only
router.post(
  "/students",
  authenticate,
  requirePermission(PERMISSIONS.STUDENT_CREATE),
  (req, res) => {
    res.json({
      success: true,
      message: "Student created",
    });
  }
);

// Create new teacher - Admin only
router.post(
  "/teachers",
  authenticate,
  requirePermission(PERMISSIONS.TEACHER_CREATE),
  (req, res) => {
    res.json({
      success: true,
      message: "Teacher created",
    });
  }
);

// Create batch - Admin only
router.post(
  "/batches",
  authenticate,
  requirePermission(PERMISSIONS.BATCH_CREATE),
  (req, res) => {
    res.json({
      success: true,
      message: "Batch created",
    });
  }
);

// Delete announcement - Admin only
router.delete(
  "/announcements/:id",
  authenticate,
  requirePermission(PERMISSIONS.ANNOUNCEMENT_DELETE),
  (req, res) => {
    res.json({
      success: true,
      message: "Announcement deleted",
    });
  }
);

// Assign role - Admin only
router.post(
  "/users/:userId/assign-role",
  authenticate,
  requirePermission(PERMISSIONS.ROLE_ASSIGN),
  (req, res) => {
    res.json({
      success: true,
      message: "Role assigned",
    });
  }
);

// ========================================
// USING MULTIPLE PERMISSIONS (AND logic)
// ========================================

// Requires BOTH permissions
router.post(
  "/batches/:batchId/delete-with-students",
  authenticate,
  requireAllPermissions([
    PERMISSIONS.BATCH_DELETE,
    PERMISSIONS.STUDENT_UPDATE_STATUS_ANY,
  ]),
  (req, res) => {
    res.json({
      success: true,
      message: "Batch and students handled",
    });
  }
);

// ========================================
// USING ANY PERMISSION (OR logic)
// ========================================

// Requires ANY of these permissions (Teacher OR Admin)
router.get(
  "/analytics/dashboard",
  authenticate,
  requireAnyPermission([
    PERMISSIONS.ANALYTICS_VIEW_UNDER_BATCH,
    PERMISSIONS.ANALYTICS_VIEW_ANY,
  ]),
  (req, res) => {
    res.json({
      success: true,
      analytics: {},
    });
  }
);

// ========================================
// USING ROLE-BASED CHECK
// ========================================

// Only Admin
router.get("/admin/dashboard", authenticate, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Admin dashboard",
  });
});

// Teacher or Admin
router.get(
  "/staff/dashboard",
  authenticate,
  requireTeacherOrAdmin,
  (req, res) => {
    res.json({
      success: true,
      message: "Staff dashboard",
    });
  }
);

// ========================================
// USING OWNERSHIP CHECK
// ========================================

// User can only access their own profile unless they have admin permissions
router.get(
  "/users/:userId/profile",
  authenticate,
  requireOwnership("userId"),
  (req, res) => {
    res.json({
      success: true,
      profile: {},
    });
  }
);

// ========================================
// PROGRAMMATIC PERMISSION CHECKS
// ========================================

import { hasPermission, hasAnyPermission } from "../middleware/rbac.middleware";

router.get("/batches/:batchId/students", authenticate, (req, res) => {
  // Check permission programmatically in the controller
  const canReadAny = hasPermission(req.auth, PERMISSIONS.STUDENT_READ_ANY);
  const canReadUnderBatch = hasPermission(
    req.auth,
    PERMISSIONS.STUDENT_READ_UNDER_BATCH
  );

  if (!canReadAny && !canReadUnderBatch) {
    return res.status(403).json({
      success: false,
      message: "Insufficient permissions",
    });
  }

  // If canReadUnderBatch, verify batch ownership
  if (!canReadAny && canReadUnderBatch) {
    // Add logic to verify teacher owns this batch
    // const batch = await Batch.findOne({ _id: req.params.batchId, teacher: req.auth?.userId });
    // if (!batch) return res.status(403).json({ message: "Not your batch" });
  }

  res.json({
    success: true,
    students: [],
  });
});

export default router;
