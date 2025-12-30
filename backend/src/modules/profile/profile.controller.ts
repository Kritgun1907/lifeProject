import { Request, Response, NextFunction } from 'express';
import ProfileService from './profile.service';
import { getAuthContext } from '../shared';

// =============================================================================
// PROFILE CONTROLLER - HTTP Handlers
// =============================================================================

// =============================================================================
// SELF ENDPOINTS
// =============================================================================

/**
 * GET /api/profile/me
 * Get own profile
 */
export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const userId = auth.userId;
    const profile = await ProfileService.getMyProfile(userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile/me
 * Update own profile
 */
export async function updateMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const userId = auth.userId;
    const profile = await ProfileService.updateMyProfile(userId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/me/change-password
 * Change own password
 */
export async function changeMyPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const userId = auth.userId;
    const { currentPassword, newPassword } = req.body;
    const result = await ProfileService.changeMyPassword(userId, currentPassword, newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// TEACHER ENDPOINTS
// =============================================================================

/**
 * GET /api/profile/students
 * Teacher gets all students in their batches
 */
export async function getStudentsInMyBatches(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const students = await ProfileService.getStudentsInMyBatches(teacherId);
    res.json({ success: true, data: students });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profile/students/:studentId
 * Teacher gets profile of student in their batch
 */
export async function getStudentProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { studentId } = req.params;
    const profile = await ProfileService.getStudentProfileAsTeacher(teacherId, studentId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile/students/:studentId
 * Teacher updates student profile
 */
export async function updateStudentProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuthContext(req);
    const teacherId = auth.userId;
    const { studentId } = req.params;
    const profile = await ProfileService.updateStudentProfileAsTeacher(teacherId, studentId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

// =============================================================================
// ADMIN ENDPOINTS
// =============================================================================

/**
 * GET /api/profile/users
 * Admin gets all users
 */
export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, status, search } = req.query;
    const filters = {
      role: role as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined
    };
    const users = await ProfileService.getAllUsers(filters);
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profile/users/:userId
 * Admin gets any user profile
 */
export async function getUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const profile = await ProfileService.getUserProfileAsAdmin(userId);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/profile/users/:userId
 * Admin updates any user profile
 */
export async function updateUserProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const profile = await ProfileService.updateUserProfileAsAdmin(userId, req.body);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/profile/users/:userId/reset-password
 * Admin resets user password
 */
export async function resetUserPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const result = await ProfileService.resetUserPassword(userId, newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/profile/users/:userId
 * Admin deletes user
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req.params;
    const result = await ProfileService.deleteUser(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export default {
  // Self
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  // Teacher
  getStudentsInMyBatches,
  getStudentProfile,
  updateStudentProfile,
  // Admin
  getAllUsers,
  getUserProfile,
  updateUserProfile,
  resetUserPassword,
  deleteUser
};
