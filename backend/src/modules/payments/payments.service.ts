/**
 * ===============================================
 * PAYMENTS SERVICE
 * ===============================================
 * Business logic for payment operations.
 * Supports dummy payments now, real gateway later.
 */

import { Payment } from "../../models/Payment.model";
import { Batch } from "../../models/Batch.model";
import { BatchStudent } from "../../models/BatchStudent.model";
import { User } from "../../models/User.model";
import { NotFoundError, ValidationError, AuthorizationError } from "../../errors";
import { OwnershipService } from "../../services/ownership.service";

/**
 * Payment query filters
 */
interface PaymentFilters {
  studentId?: string;
  batchId?: string;
  status?: string;
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Get student's own payments
 */
export async function getStudentPayments(
  studentId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const query = {
    student: studentId,
    isDeleted: false,
  };

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate("batch", "batchName")
      .populate("classPlan", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  return { payments, total, page, limit };
}

/**
 * Get payments for a specific batch (teacher view)
 */
export async function getBatchPayments(
  batchId: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  // Get all students in batch
  const enrollments = await BatchStudent.find({
    batch: batchId,
    isDeleted: false,
  }).select("student");

  const studentIds = enrollments.map((e) => e.student);

  const query = {
    student: { $in: studentIds },
    isDeleted: false,
  };

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate("student", "name email")
      .populate("batch", "batchName")
      .populate("classPlan", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  return { payments, total, page, limit };
}

/**
 * Get all payments (admin view) with filters
 */
export async function getAllPayments(
  filters: PaymentFilters,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const query: Record<string, any> = { isDeleted: false };

  if (filters.studentId) {
    query.student = filters.studentId;
  }

  if (filters.batchId) {
    query.batch = filters.batchId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.fromDate || filters.toDate) {
    query.createdAt = {};
    if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
    if (filters.toDate) query.createdAt.$lte = filters.toDate;
  }

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .populate("student", "name email mobile")
      .populate("batch", "batchName")
      .populate("classPlan", "name price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payment.countDocuments(query),
  ]);

  return { payments, total, page, limit };
}

/**
 * Get single payment by ID
 */
export async function getPaymentById(paymentId: string) {
  const payment = await Payment.findOne({
    _id: paymentId,
    isDeleted: false,
  })
    .populate("student", "name email mobile")
    .populate("batch", "batchName teacher")
    .populate("classPlan", "name price duration")
    .lean();

  if (!payment) {
    throw new NotFoundError("Payment", paymentId);
  }

  return payment;
}

/**
 * Create dummy payment (for testing/admin)
 * In production, this would integrate with payment gateway
 */
export async function createDummyPayment(data: {
  studentId: string;
  batchId?: string;
  amount: number;
  paymentMethod: string;
  status?: "PENDING" | "SUCCESS" | "FAILED";
}) {
  // Verify student exists
  const student = await User.findOne({
    _id: data.studentId,
    isDeleted: false,
  });

  if (!student) {
    throw new NotFoundError("Student", data.studentId);
  }

  // Verify batch if provided
  if (data.batchId) {
    const batch = await Batch.findOne({
      _id: data.batchId,
      isDeleted: false,
    });

    if (!batch) {
      throw new NotFoundError("Batch", data.batchId);
    }
  }

  // Generate transaction ID
  const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  const payment = await Payment.create({
    student: data.studentId,
    batch: data.batchId,
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    status: data.status || "SUCCESS",
    transactionId,
    paidAt: data.status === "SUCCESS" ? new Date() : undefined,
  });

  return payment;
}

/**
 * Auto-assign batch after successful payment
 * Called when payment status becomes SUCCESS
 */
export async function autoAssignBatchAfterPayment(
  paymentId: string,
  batchId: string
) {
  const payment = await Payment.findById(paymentId);

  if (!payment) {
    throw new NotFoundError("Payment", paymentId);
  }

  if (payment.status !== "SUCCESS") {
    throw new ValidationError("Payment must be successful to assign batch");
  }

  // Check batch exists and has capacity
  const batch = await Batch.findOne({
    _id: batchId,
    isDeleted: false,
  });

  if (!batch) {
    throw new NotFoundError("Batch", batchId);
  }

  // Check current enrollment count
  const currentCount = await BatchStudent.countDocuments({
    batch: batchId,
    isDeleted: false,
  });

  if (currentCount >= batch.maxStudents) {
    throw new ValidationError("Batch is full. Cannot assign student.");
  }

  // Check if student is already enrolled
  const existingEnrollment = await BatchStudent.findOne({
    student: payment.student,
    batch: batchId,
    isDeleted: false,
  });

  if (existingEnrollment) {
    throw new ValidationError("Student is already enrolled in this batch");
  }

  // Create enrollment
  await BatchStudent.create({
    student: payment.student,
    batch: batchId,
    joinedAt: new Date(),
  });

  // Update payment with batch reference
  payment.batch = batchId as any;
  await payment.save();

  return { payment, batchId };
}

/**
 * Get payment statistics (admin)
 */
export async function getPaymentStats(fromDate?: Date, toDate?: Date) {
  const match: Record<string, any> = { isDeleted: false };

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = fromDate;
    if (toDate) match.createdAt.$lte = toDate;
  }

  const stats = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const result = {
    total: 0,
    totalAmount: 0,
    success: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
    failed: { count: 0, amount: 0 },
  };

  stats.forEach((s) => {
    result.total += s.count;
    result.totalAmount += s.total;

    if (s._id === "SUCCESS") {
      result.success = { count: s.count, amount: s.total };
    } else if (s._id === "PENDING") {
      result.pending = { count: s.count, amount: s.total };
    } else if (s._id === "FAILED") {
      result.failed = { count: s.count, amount: s.total };
    }
  });

  return result;
}
