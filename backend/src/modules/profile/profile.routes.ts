import { Router } from 'express';
import ProfileController from './profile.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { PERMISSIONS } from '../../constants/permissions';

const router = Router();

// All routes require authentication
router.use(authenticate);

// =============================================================================
// SELF ROUTES - View and edit own profile
// =============================================================================

// GET /api/profile/me - Get own profile
router.get('/me', 
  authorize([PERMISSIONS.PROFILE_READ_SELF]),
  ProfileController.getMyProfile
);

// PUT /api/profile/me - Update own profile
router.put('/me',
  authorize([PERMISSIONS.PROFILE_UPDATE_SELF_LIMITED]),
  ProfileController.updateMyProfile
);

// POST /api/profile/me/change-password - Change own password
router.post('/me/change-password',
  authorize([PERMISSIONS.PASSWORD_CHANGE_SELF]),
  ProfileController.changeMyPassword
);

// =============================================================================
// TEACHER ROUTES - View/edit students in their batches
// =============================================================================

// GET /api/profile/students - Teacher gets all students in their batches
router.get('/students',
  authorize([PERMISSIONS.STUDENT_READ_UNDER_BATCH]),
  ProfileController.getStudentsInMyBatches
);

// GET /api/profile/students/:studentId - Teacher gets student profile
router.get('/students/:studentId',
  authorize([PERMISSIONS.STUDENT_READ_UNDER_BATCH]),
  ProfileController.getStudentProfile
);

// PUT /api/profile/students/:studentId - Teacher updates student profile
router.put('/students/:studentId',
  authorize([PERMISSIONS.PROFILE_UPDATE_STUDENT_UNDER_BATCH]),
  ProfileController.updateStudentProfile
);

// =============================================================================
// ADMIN ROUTES - Full CRUD on all users
// =============================================================================

// GET /api/profile/users - Admin gets all users
router.get('/users',
  authorize([PERMISSIONS.STUDENT_READ_ANY]),
  ProfileController.getAllUsers
);

// GET /api/profile/users/:userId - Admin gets any user profile
router.get('/users/:userId',
  authorize([PERMISSIONS.STUDENT_READ_ANY]),
  ProfileController.getUserProfile
);

// PUT /api/profile/users/:userId - Admin updates any user profile
router.put('/users/:userId',
  authorize([PERMISSIONS.PROFILE_UPDATE_STUDENT_ANY]),
  ProfileController.updateUserProfile
);

// POST /api/profile/users/:userId/reset-password - Admin resets user password
router.post('/users/:userId/reset-password',
  authorize([PERMISSIONS.PROFILE_UPDATE_STUDENT_ANY]),
  ProfileController.resetUserPassword
);

// DELETE /api/profile/users/:userId - Admin deletes user
router.delete('/users/:userId',
  authorize([PERMISSIONS.STUDENT_UPDATE_STATUS_ANY]),
  ProfileController.deleteUser
);

export default router;
