/**
 * ===============================================
 * BATCH REQUESTS SERVICE
 * ===============================================
 * Handles batch change request workflow:
 * - Student creates request
 * - Teacher reviews (own batches only)
 * - Admin overrides any request
 *
 * Ownership enforced via OwnershipService.
 */

import { BatchStudent } from "../../models/BatchStudent.model";
import { Batch } from "../../models/Batch.model";
import { BatchChangeRequest } from "../../models/BatchChangeRequest.model";
import { NotFoundError, ValidationError, AuthorizationError } from "../../errors";
import { OwnershipService } from "../../services/ownership.service";

// ===============================================
// TYPES
// ===============================================

export interface CreateRequestData {
  studentId: string;
  currentBatchId: string;
  requestedBatchId: string;
  reason?: string;
}

// ===============================================
// STUDENT: Create Request
// ===============================================

/**
 * Student creates batch change request
 * Uses: OwnershipService.ensureStudentInBatch
 */
export async function createRequest(data: CreateRequestData): Promise<any> {
  const { studentId, currentBatchId, requestedBatchId, reason } = data;

  // Validate student is enrolled in currentBatch
  await OwnershipService.ensureStudentInBatch(studentId, currentBatchId);

  // Verify requested batch exists
  const requestedBatch = await Batch.findOne({ _id: requestedBatchId, isDeleted: false });
  if (!requestedBatch) {
    throw new NotFoundError("Batch", requestedBatchId);
  }

  // Check capacity of requested batch
  const currentEnrollment = await BatchStudent.countDocuments({ batch: requestedBatchId });
  if (currentEnrollment >= requestedBatch.maxStudents) {
    throw new ValidationError("Requested batch is full");
  }

  // Check for existing pending request
  const existingRequest = await BatchChangeRequest.findOne({
    student: studentId,
    finalStatus: "PENDING",
    isDeleted: false,
  });

  if (existingRequest) {
    throw new ValidationError("You already have a pending batch change request");
  }

  // Create request with PENDING status - NO approval logic here
  const request = await BatchChangeRequest.create({
    student: studentId,
    fromBatch: currentBatchId,
    toBatch: requestedBatchId,
    reason: reason || "",
    fromTeacherApproval: "PENDING",
    toTeacherApproval: "PENDING",
    finalStatus: "PENDING",
  });

  return request.populate([
    { path: "fromBatch", select: "batchName teacher" },
    { path: "toBatch", select: "batchName teacher" },
  ]);
}

/**
 * Student views their own requests
 */
export async function getMyRequests(
  studentId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const query = { student: studentId, isDeleted: false };

  const [requests, total] = await Promise.all([
    BatchChangeRequest.find(query)
      .populate("fromBatch", "batchName")
      .populate("toBatch", "batchName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BatchChangeRequest.countDocuments(query),
  ]);

  return { requests, total, page, limit };
}

// ===============================================
// TEACHER: Review (Own Batches Only)
// ===============================================

/**
 * Teacher reviews request for their own batches
 * Uses: OwnershipService.ensureTeacherCanManageBatchChangeRequest
 */
export async function reviewRequestAsTeacher(
  teacherId: string,
  requestId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<any> {
  const request = await BatchChangeRequest.findOne({
    _id: requestId,
    isDeleted: false,
  }).populate([
    { path: "fromBatch", select: "batchName teacher" },
    { path: "toBatch", select: "batchName teacher" },
  ]);

  if (!request) {
    throw new NotFoundError("BatchChangeRequest", requestId);
  }

  if (request.finalStatus !== "PENDING") {
    throw new ValidationError(`Request is already ${request.finalStatus}`);
  }

  // Ensure teacher can manage this request (owns fromBatch or toBatch)
  const fromBatchTeacher = (request.fromBatch as any)?.teacher?.toString();
  const toBatchTeacher = (request.toBatch as any)?.teacher?.toString();

  const ownsFromBatch = fromBatchTeacher === teacherId;
  const ownsToBatch = toBatchTeacher === teacherId;

  if (!ownsFromBatch && !ownsToBatch) {
    throw new AuthorizationError("You can only review requests for your own batches");
  }

  // Update approval based on which batch teacher owns
  if (ownsFromBatch) {
    request.fromTeacherApproval = decision;
  }
  if (ownsToBatch) {
    request.toTeacherApproval = decision;
  }

  // Auto-reject if either teacher rejects
  if (decision === "REJECTED") {
    request.finalStatus = "REJECTED";
  }

  // Auto-approve and execute if both teachers approve
  if (
    request.fromTeacherApproval === "APPROVED" &&
    request.toTeacherApproval === "APPROVED"
  ) {
    request.finalStatus = "APPROVED";
    await executeBatchTransfer(request);
  }

  await request.save();
  return request;
}

/**
 * Teacher lists requests for their batches
 */
export async function getRequestsForTeacher(
  teacherId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  // Get teacher's batch IDs
  const teacherBatches = await Batch.find({ teacher: teacherId, isDeleted: false }).select("_id");
  const batchIds = teacherBatches.map((b) => b._id);

  const query = {
    $or: [{ fromBatch: { $in: batchIds } }, { toBatch: { $in: batchIds } }],
    isDeleted: false,
  };

  const [requests, total] = await Promise.all([
    BatchChangeRequest.find(query)
      .populate("student", "name email")
      .populate("fromBatch", "batchName")
      .populate("toBatch", "batchName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BatchChangeRequest.countDocuments(query),
  ]);

  return { requests, total, page, limit };
}

// ===============================================
// ADMIN: Override Any Request
// ===============================================

/**
 * Admin reviews any request (full authority)
 * Permission check only (BATCH_CHANGE_APPROVE_ANY)
 */
export async function reviewRequestAsAdmin(
  adminId: string,
  requestId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<any> {
  const request = await BatchChangeRequest.findOne({
    _id: requestId,
    isDeleted: false,
  });

  if (!request) {
    throw new NotFoundError("BatchChangeRequest", requestId);
  }

  if (request.finalStatus !== "PENDING") {
    throw new ValidationError(`Request is already ${request.finalStatus}`);
  }

  // Admin can override teacher decisions
  request.finalStatus = decision;
  request.finalizedBy = adminId as any;

  if (decision === "APPROVED") {
    await executeBatchTransfer(request);
  }

  await request.save();

  return request.populate([
    { path: "student", select: "name email" },
    { path: "fromBatch", select: "batchName" },
    { path: "toBatch", select: "batchName" },
  ]);
}

/**
 * Admin can directly reassign student to batch (bypass request flow)
 */
export async function adminReassignBatch(
  adminId: string,
  studentId: string,
  fromBatchId: string,
  toBatchId: string
): Promise<any> {
  // Verify student is in fromBatch
  const enrollment = await BatchStudent.findOne({
    student: studentId,
    batch: fromBatchId,
  });

  if (!enrollment) {
    throw new ValidationError("Student is not enrolled in the source batch");
  }

  // Verify toBatch exists and has capacity
  const toBatch = await Batch.findOne({ _id: toBatchId, isDeleted: false });
  if (!toBatch) {
    throw new NotFoundError("Batch", toBatchId);
  }

  const currentEnrollment = await BatchStudent.countDocuments({ batch: toBatchId });
  if (currentEnrollment >= toBatch.maxStudents) {
    throw new ValidationError("Target batch is full");
  }

  // Execute transfer directly
  await BatchStudent.deleteOne({ student: studentId, batch: fromBatchId });
  const newEnrollment = await BatchStudent.create({
    student: studentId,
    batch: toBatchId,
    joinedAt: new Date(),
  });

  return newEnrollment.populate("batch", "batchName");
}

/**
 * Admin lists all requests
 */
export async function getAllRequests(
  filters: {
    status?: string;
    batchId?: string;
    studentId?: string;
    page?: number;
    limit?: number;
  }
) {
  const { status, batchId, studentId, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const query: Record<string, any> = { isDeleted: false };

  if (status) {
    query.finalStatus = status.toUpperCase();
  }

  if (batchId) {
    query.$or = [{ fromBatch: batchId }, { toBatch: batchId }];
  }

  if (studentId) {
    query.student = studentId;
  }

  const [requests, total] = await Promise.all([
    BatchChangeRequest.find(query)
      .populate("student", "name email")
      .populate("fromBatch", "batchName teacher")
      .populate("toBatch", "batchName teacher")
      .populate("finalizedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    BatchChangeRequest.countDocuments(query),
  ]);

  return { requests, total, page, limit };
}

/**
 * Get single request by ID
 */
export async function getRequestById(requestId: string): Promise<any> {
  const request = await BatchChangeRequest.findOne({
    _id: requestId,
    isDeleted: false,
  })
    .populate("student", "name email mobile")
    .populate("fromBatch", "batchName teacher")
    .populate("toBatch", "batchName teacher")
    .populate("finalizedBy", "name")
    .lean();

  if (!request) {
    throw new NotFoundError("BatchChangeRequest", requestId);
  }

  return request;
}

// ===============================================
// INTERNAL HELPERS
// ===============================================

/**
 * Execute batch transfer after approval
 */
async function executeBatchTransfer(request: any): Promise<void> {
  // Verify toBatch still has capacity
  const toBatch = await Batch.findOne({ _id: request.toBatch, isDeleted: false });
  if (!toBatch) {
    throw new NotFoundError("Batch", request.toBatch.toString());
  }

  const currentEnrollment = await BatchStudent.countDocuments({ batch: request.toBatch });
  if (currentEnrollment >= toBatch.maxStudents) {
    throw new ValidationError("Target batch is now full. Cannot complete transfer.");
  }

  // Remove from old batch
  await BatchStudent.deleteOne({
    student: request.student,
    batch: request.fromBatch,
  });

  // Add to new batch
  await BatchStudent.create({
    student: request.student,
    batch: request.toBatch,
    joinedAt: new Date(),
  });
}
