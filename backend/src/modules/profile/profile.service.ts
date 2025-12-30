import { User } from '../../models/User.model';
import { Batch } from '../../models/Batch.model';
import { BatchStudent } from '../../models/BatchStudent.model';
import { AppError } from '../../errors';
import bcrypt from 'bcryptjs';

// =============================================================================
// PROFILE MODULE - DDD OWNERSHIP BOUNDARIES
// =============================================================================
// Student: View and edit own profile (limited fields)
// Teacher: View and edit profiles of students in their batches
// Admin: Full CRUD on all user profiles
// =============================================================================

interface ProfileUpdate {
  name?: string;
  mobile?: string;
  // Other fields that users can update
}

interface FullProfileUpdate extends ProfileUpdate {
  email?: string;
  role?: string;
  status?: string;
}

// =============================================================================
// SELF OPERATIONS - View and edit own profile
// =============================================================================

/**
 * Get own profile
 */
export async function getMyProfile(userId: string) {
  const user = await User.findById(userId)
    .populate('role', 'name permissions')
    .populate('status', 'name')
    .select('-password');

  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  return user;
}

/**
 * Update own profile (limited fields)
 */
export async function updateMyProfile(userId: string, updates: ProfileUpdate) {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  // Only allow limited fields to be updated
  const allowedFields = ['name', 'mobile'];
  const sanitizedUpdates: any = {};

  for (const field of allowedFields) {
    if (updates[field as keyof ProfileUpdate] !== undefined) {
      sanitizedUpdates[field] = updates[field as keyof ProfileUpdate];
    }
  }

  Object.assign(user, sanitizedUpdates);
  await user.save();

  return user;
}

/**
 * Change own password
 */
export async function changeMyPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await User.findById(userId).select('+password');
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  if (user.authProvider !== 'local') {
    throw new AppError('Password cannot be changed for OAuth users', 400);
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.password!);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 401);
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  return { message: 'Password changed successfully' };
}

// =============================================================================
// TEACHER OPERATIONS - View/edit students in their batches
// =============================================================================

/**
 * Get profile of a student in teacher's batch
 */
export async function getStudentProfileAsTeacher(teacherId: string, studentId: string) {
  // Get all batches this teacher owns
  const teacherBatches = await Batch.find({ 
    teacher: teacherId, 
    isDeleted: false 
  }).select('_id');
  const batchIds = teacherBatches.map((b: any) => b._id);

  if (batchIds.length === 0) {
    throw new AppError('You do not have any batches', 403);
  }

  // Check if student is in any of teacher's batches
  const enrollment = await BatchStudent.findOne({
    student: studentId,
    batch: { $in: batchIds }
  });

  if (!enrollment) {
    throw new AppError('This student is not in any of your batches', 403);
  }

  const student = await User.findById(studentId)
    .populate('role', 'name')
    .populate('status', 'name')
    .select('-password');

  if (!student || student.isDeleted) {
    throw new AppError('Student not found', 404);
  }

  return student;
}

/**
 * Update profile of a student in teacher's batch (limited fields)
 */
export async function updateStudentProfileAsTeacher(
  teacherId: string,
  studentId: string,
  updates: ProfileUpdate
) {
  // Get all batches this teacher owns
  const teacherBatches = await Batch.find({ 
    teacher: teacherId, 
    isDeleted: false 
  }).select('_id');
  const batchIds = teacherBatches.map((b: any) => b._id);

  if (batchIds.length === 0) {
    throw new AppError('You do not have any batches', 403);
  }

  // Check if student is in any of teacher's batches
  const enrollment = await BatchStudent.findOne({
    student: studentId,
    batch: { $in: batchIds }
  });

  if (!enrollment) {
    throw new AppError('This student is not in any of your batches', 403);
  }

  const student = await User.findById(studentId);
  if (!student || student.isDeleted) {
    throw new AppError('Student not found', 404);
  }

  // Only allow limited fields to be updated by teacher
  const allowedFields = ['name', 'mobile'];
  const sanitizedUpdates: any = {};

  for (const field of allowedFields) {
    if (updates[field as keyof ProfileUpdate] !== undefined) {
      sanitizedUpdates[field] = updates[field as keyof ProfileUpdate];
    }
  }

  Object.assign(student, sanitizedUpdates);
  await student.save();

  return student;
}

/**
 * Get all students in teacher's batches
 */
export async function getStudentsInMyBatches(teacherId: string) {
  // Get all batches this teacher owns
  const teacherBatches = await Batch.find({ 
    teacher: teacherId, 
    isDeleted: false 
  }).select('_id batchName');

  if (teacherBatches.length === 0) {
    return [];
  }

  const batchIds = teacherBatches.map((b: any) => b._id);

  // Get all student enrollments
  const enrollments = await BatchStudent.find({
    batch: { $in: batchIds }
  }).populate({
    path: 'student',
    select: 'name email mobile status',
    populate: { path: 'status', select: 'name' }
  }).populate('batch', 'batchName');

  return enrollments.map((e: any) => ({
    student: e.student,
    batch: e.batch
  }));
}

// =============================================================================
// ADMIN OPERATIONS - Full CRUD
// =============================================================================

/**
 * Get any user profile (admin)
 */
export async function getUserProfileAsAdmin(userId: string) {
  const user = await User.findById(userId)
    .populate('role', 'name permissions')
    .populate('status', 'name')
    .select('-password');

  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  return user;
}

/**
 * Update any user profile (admin - full access)
 */
export async function updateUserProfileAsAdmin(userId: string, updates: FullProfileUpdate) {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  // Admin can update more fields
  const allowedFields = ['name', 'email', 'mobile', 'role', 'status'];
  const sanitizedUpdates: any = {};

  for (const field of allowedFields) {
    if (updates[field as keyof FullProfileUpdate] !== undefined) {
      sanitizedUpdates[field] = updates[field as keyof FullProfileUpdate];
    }
  }

  Object.assign(user, sanitizedUpdates);
  await user.save();

  return user;
}

/**
 * Get all users (admin)
 */
export async function getAllUsers(filters: {
  role?: string;
  status?: string;
  search?: string;
}) {
  const query: any = { isDeleted: false };

  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }

  const users = await User.find(query)
    .populate('role', 'name')
    .populate('status', 'name')
    .select('-password')
    .sort({ createdAt: -1 });

  return users;
}

/**
 * Reset user password (admin)
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  const user = await User.findById(userId).select('+password');
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  if (user.authProvider !== 'local') {
    throw new AppError('Password cannot be reset for OAuth users', 400);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();

  return { message: 'Password reset successfully' };
}

/**
 * Soft delete user (admin)
 */
export async function deleteUser(userId: string) {
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError('User not found', 404);
  }

  user.isDeleted = true;
  user.deletedAt = new Date();
  await user.save();

  return { message: 'User deleted successfully' };
}

export default {
  // Self
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  // Teacher
  getStudentProfileAsTeacher,
  updateStudentProfileAsTeacher,
  getStudentsInMyBatches,
  // Admin
  getUserProfileAsAdmin,
  updateUserProfileAsAdmin,
  getAllUsers,
  resetUserPassword,
  deleteUser
};
