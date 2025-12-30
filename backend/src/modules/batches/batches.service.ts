import { Batch } from '../../models/Batch.model';
import { BatchStudent } from '../../models/BatchStudent.model';
import { ZoomSession } from '../../models/ZoomSession.model';
import { User } from '../../models/User.model';
import { AppError } from '../../errors';
import OwnershipService from '../../services/ownership.service';
import mongoose from 'mongoose';

// =============================================================================
// BATCHES MODULE - DDD OWNERSHIP BOUNDARIES
// =============================================================================
// Student: View batches they're enrolled in, see schedules and zoom links
// Teacher: View/edit batches they teach, manage schedules
// Admin: Full CRUD on all batches
// =============================================================================

interface BatchFilter {
  teacherId?: string;
  instrumentId?: string;
  mode?: 'ONLINE' | 'OFFLINE';
  status?: string;
}

// =============================================================================
// STUDENT OPERATIONS - View enrolled batches
// =============================================================================

/**
 * Get batches the student is enrolled in
 */
export async function getMyBatches(studentId: string) {
  // Find all batch-student relationships for this student
  const enrollments = await BatchStudent.find({ 
    student: studentId
  }).select('batch');

  const batchIds = enrollments.map((e: any) => e.batch);

  const batches = await Batch.find({ 
    _id: { $in: batchIds },
    isDeleted: false
  })
    .populate('instrument', 'name')
    .populate('teacher', 'name email')
    .populate('workingDay', 'day')
    .populate('workingTiming', 'startTime endTime')
    .populate('status', 'name');

  return batches;
}

/**
 * Get schedule for a student's batch (verify enrollment)
 */
export async function getMyBatchSchedule(studentId: string, batchId: string) {
  // Verify student is enrolled in this batch
  const enrollment = await BatchStudent.findOne({
    student: studentId,
    batch: batchId
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this batch', 403);
  }

  const batch = await Batch.findById(batchId)
    .populate('workingDay', 'day')
    .populate('workingTiming', 'startTime endTime')
    .populate('instrument', 'name');

  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  return {
    batchName: batch.batchName,
    instrument: batch.instrument,
    mode: batch.mode,
    schedule: {
      day: batch.workingDay,
      timing: batch.workingTiming
    }
  };
}

/**
 * Get zoom link for a student's batch (verify enrollment)
 */
export async function getMyBatchZoomLink(studentId: string, batchId: string) {
  // Verify student is enrolled
  const enrollment = await BatchStudent.findOne({
    student: studentId,
    batch: batchId
  });

  if (!enrollment) {
    throw new AppError('You are not enrolled in this batch', 403);
  }

  const batch = await Batch.findById(batchId);
  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  if (batch.mode !== 'ONLINE') {
    throw new AppError('This batch does not have online sessions', 400);
  }

  // Get upcoming zoom sessions for this batch
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sessions = await ZoomSession.find({
    batch: batchId,
    classDate: { $gte: today },
    isDeleted: false
  }).sort({ classDate: 1 }).limit(5);

  return {
    batchName: batch.batchName,
    mode: batch.mode,
    upcomingSessions: sessions
  };
}

// =============================================================================
// TEACHER OPERATIONS - Manage their batches
// =============================================================================

/**
 * Get batches the teacher owns
 */
export async function getTeacherBatches(teacherId: string) {
  const batches = await Batch.find({
    teacher: teacherId,
    isDeleted: false
  })
    .populate('instrument', 'name')
    .populate('workingDay', 'day')
    .populate('workingTiming', 'startTime endTime')
    .populate('status', 'name');

  return batches;
}

/**
 * Get a single batch with details (teacher must own)
 */
export async function getTeacherBatchById(teacherId: string, batchId: string) {
  const batch = await Batch.findById(batchId)
    .populate('instrument', 'name')
    .populate('teacher', 'name email')
    .populate('workingDay', 'day')
    .populate('workingTiming', 'startTime endTime')
    .populate('status', 'name');

  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  // Use OwnershipService to verify teacher owns the batch
  await OwnershipService.ensureTeacherOwnsBatch(teacherId, batchId, 'view');

  // Get students in this batch
  const students = await BatchStudent.find({
    batch: batchId
  }).populate('student', 'name email mobile');

  return {
    ...batch.toObject(),
    students: students.map((s: any) => s.student)
  };
}

/**
 * Get students in a teacher's batch
 */
export async function getBatchStudents(teacherId: string, batchId: string) {
  // Use OwnershipService to verify teacher owns the batch
  await OwnershipService.ensureTeacherOwnsBatch(teacherId, batchId, 'view students in');

  const students = await BatchStudent.find({
    batch: batchId
  }).populate('student', 'name email mobile status');

  return students.map((s: any) => s.student);
}

/**
 * Create zoom session for teacher's batch
 */
export async function createZoomSession(
  teacherId: string,
  batchId: string,
  sessionData: { zoomLink: string; classDate: Date; startTime: string; endTime: string }
) {
  // Use OwnershipService to verify teacher owns the batch
  await OwnershipService.ensureTeacherOwnsBatch(teacherId, batchId, 'create zoom session for');

  const batch = await Batch.findById(batchId);
  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  if (batch.mode !== 'ONLINE') {
    throw new AppError('This batch does not have online sessions', 400);
  }

  // Create zoom session
  const session = await ZoomSession.create({
    batch: batchId,
    teacher: teacherId,
    zoomLink: sessionData.zoomLink,
    classDate: sessionData.classDate,
    startTime: sessionData.startTime,
    endTime: sessionData.endTime,
    status: 'SCHEDULED'
  });

  return session;
}

// =============================================================================
// ADMIN OPERATIONS - Full CRUD
// =============================================================================

/**
 * Get all batches (admin full access)
 */
export async function getAllBatches(filters: BatchFilter) {
  const query: any = { isDeleted: false };

  if (filters.teacherId) query.teacher = filters.teacherId;
  if (filters.instrumentId) query.instrument = filters.instrumentId;
  if (filters.mode) query.mode = filters.mode;
  if (filters.status) query.status = filters.status;

  const batches = await Batch.find(query)
    .populate('instrument', 'name')
    .populate('teacher', 'name email')
    .populate('workingDay', 'day')
    .populate('workingTiming', 'startTime endTime')
    .populate('status', 'name');

  return batches;
}

/**
 * Get any batch by ID (admin)
 */
export async function getBatchById(batchId: string) {
  const batch = await Batch.findById(batchId)
    .populate('instrument', 'name')
    .populate('teacher', 'name email')
    .populate('workingDay', 'day')
    .populate('workingTiming', 'startTime endTime')
    .populate('status', 'name');

  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  // Get students in this batch
  const students = await BatchStudent.find({
    batch: batchId
  }).populate('student', 'name email mobile');

  return {
    ...batch.toObject(),
    students: students.map((s: any) => s.student)
  };
}

/**
 * Create new batch (admin)
 */
export async function createBatch(data: {
  batchName: string;
  instrument: string;
  teacher: string;
  workingDay: string;
  workingTiming: string;
  mode: 'ONLINE' | 'OFFLINE';
  maxStudents: number;
  status: string;
}) {
  const batch = await Batch.create(data);
  return batch;
}

/**
 * Update any batch (admin)
 */
export async function updateBatch(
  batchId: string,
  updates: Partial<{
    batchName: string;
    instrument: string;
    teacher: string;
    workingDay: string;
    workingTiming: string;
    mode: 'ONLINE' | 'OFFLINE';
    maxStudents: number;
    status: string;
  }>
) {
  const batch = await Batch.findById(batchId);
  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  Object.assign(batch, updates);
  await batch.save();

  return batch;
}

/**
 * Delete batch (soft delete - admin only)
 */
export async function deleteBatch(batchId: string) {
  const batch = await Batch.findById(batchId);
  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  batch.isDeleted = true;
  batch.deletedAt = new Date();
  await batch.save();

  return { message: 'Batch deleted successfully' };
}

/**
 * Add student to batch (admin)
 */
export async function addStudentToBatch(studentId: string, batchId: string) {
  // Verify student exists
  const student = await User.findById(studentId);
  if (!student || student.isDeleted) {
    throw new AppError('Student not found', 404);
  }

  // Verify batch exists
  const batch = await Batch.findById(batchId);
  if (!batch || batch.isDeleted) {
    throw new AppError('Batch not found', 404);
  }

  // Check if already enrolled
  const existing = await BatchStudent.findOne({
    student: studentId,
    batch: batchId
  });

  if (existing) {
    throw new AppError('Student is already enrolled in this batch', 400);
  }

  // Check batch capacity
  const currentCount = await BatchStudent.countDocuments({
    batch: batchId
  });

  if (currentCount >= batch.maxStudents) {
    throw new AppError('Batch is at full capacity', 400);
  }

  const enrollment = await BatchStudent.create({
    student: studentId,
    batch: batchId,
    joinedAt: new Date()
  });

  return enrollment;
}

/**
 * Remove student from batch (admin)
 */
export async function removeStudentFromBatch(studentId: string, batchId: string) {
  const enrollment = await BatchStudent.findOneAndDelete({
    student: studentId,
    batch: batchId
  });

  if (!enrollment) {
    throw new AppError('Student is not enrolled in this batch', 404);
  }

  return { message: 'Student removed from batch' };
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
