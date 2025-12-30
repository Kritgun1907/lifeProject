/**
 * ===============================================
 * ADMIN USERS SERVICE
 * ===============================================
 * Business logic for admin user management.
 * CRUD operations for all users.
 */

import { User } from "../../../models/User.model";
import { Role } from "../../../models/Role.model";
import { Status } from "../../../models/Status.model";
import { BatchStudent } from "../../../models/BatchStudent.model";
import { Batch } from "../../../models/Batch.model";
import { Payment } from "../../../models/Payment.model";
import { NotFoundError, ValidationError } from "../../../errors";
import * as AuthService from "../../auth/auth.service";

// ===============================================
// TYPES
// ===============================================

interface ListUsersFilters {
  role?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface CreateUserData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  roleName: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  mobile?: string;
  statusId?: string;
}

// ===============================================
// LIST & GET OPERATIONS
// ===============================================

/**
 * List all users with pagination and filters
 */
export async function listUsers(filters: ListUsersFilters) {
  const { role, status, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const query: Record<string, any> = { isDeleted: false };

  // Filter by role name
  if (role) {
    const roleDoc = await Role.findOne({ name: role.toUpperCase() });
    if (roleDoc) {
      query.role = roleDoc._id;
    }
  }

  // Filter by status name
  if (status) {
    const statusDoc = await Status.findOne({ name: status.toUpperCase() });
    if (statusDoc) {
      query.status = statusDoc._id;
    }
  }

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .populate("role", "name permissions")
      .populate("status", "name")
      .select("name email mobile role status createdAt")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users: users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      role: (u.role as any)?.name,
      permissions: (u.role as any)?.permissions,
      status: (u.status as any)?.name,
      createdAt: u.createdAt,
    })),
    total,
    page,
    limit,
  };
}

/**
 * Get user by ID with full details
 */
export async function getUserById(userId: string) {
  const user = await User.findOne({ _id: userId, isDeleted: false })
    .populate("role", "name permissions")
    .populate("status", "name")
    .select("-password")
    .lean();

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  // Get enrolled batches if student
  let enrolledBatches: any[] = [];
  const userRole = (user.role as any)?.name;

  if (userRole === "STUDENT") {
    const enrollments = await BatchStudent.find({
      student: userId,
      isDeleted: false,
    })
      .populate("batch", "batchName teacher")
      .lean();

    enrolledBatches = enrollments.map((e) => e.batch);
  }

  // Get owned batches if teacher
  let ownedBatches: any[] = [];
  if (userRole === "TEACHER") {
    ownedBatches = await Batch.find({
      teacher: userId,
      isDeleted: false,
    })
      .select("batchName maxStudents")
      .lean();
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: userRole,
    permissions: (user.role as any)?.permissions,
    status: (user.status as any)?.name,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    enrolledBatches,
    ownedBatches,
  };
}

// ===============================================
// CREATE OPERATIONS
// ===============================================

/**
 * Create a new user (admin can create any role)
 */
export async function createUser(data: CreateUserData) {
  const { name, email, mobile, password, roleName } = data;

  // Check if user exists
  const existing = await User.findOne({
    $or: [{ email }, { mobile }],
    isDeleted: false,
  });

  if (existing) {
    throw new ValidationError("User already exists with this email or mobile");
  }

  // Get role
  const role = await Role.findOne({ name: roleName.toUpperCase(), isActive: true });
  if (!role) {
    throw new NotFoundError("Role", roleName);
  }

  // Get active status
  const status = await Status.findOne({ name: "ACTIVE" });
  if (!status) {
    throw new NotFoundError("Status", "ACTIVE");
  }

  // Hash password
  const bcrypt = require("bcryptjs");
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    mobile,
    password: hashedPassword,
    role: role._id,
    status: status._id,
  });

  await user.populate("role", "name permissions");
  await user.populate("status", "name");

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: (user.role as any).name,
    status: (user.status as any).name,
  };
}

// ===============================================
// UPDATE OPERATIONS
// ===============================================

/**
 * Update user details (admin)
 */
export async function updateUser(userId: string, updates: UpdateUserData) {
  const updateFields: Record<string, any> = {};

  if (updates.name) updateFields.name = updates.name;
  if (updates.email) updateFields.email = updates.email;
  if (updates.mobile) {
    if (!/^[0-9]{10}$/.test(updates.mobile)) {
      throw new ValidationError("Mobile must be 10 digits");
    }
    updateFields.mobile = updates.mobile;
  }
  if (updates.statusId) updateFields.status = updates.statusId;

  if (Object.keys(updateFields).length === 0) {
    throw new ValidationError("No valid update fields provided");
  }

  const user = await User.findByIdAndUpdate(userId, updateFields, { new: true })
    .populate("role", "name permissions")
    .populate("status", "name")
    .select("-password");

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: (user.role as any).name,
    status: (user.status as any).name,
  };
}

/**
 * Update user role (GUEST → STUDENT, etc.)
 */
export async function updateUserRole(userId: string, roleIdOrName: string) {
  let roleId = roleIdOrName;

  // If it's a name, look up the ID
  if (!/^[0-9a-fA-F]{24}$/.test(roleIdOrName)) {
    const role = await Role.findOne({ name: roleIdOrName.toUpperCase(), isActive: true });
    if (!role) {
      throw new NotFoundError("Role", roleIdOrName);
    }
    roleId = role._id.toString();
  }

  return AuthService.updateUserRole(userId, roleId);
}

/**
 * Update user status (ACTIVE, INACTIVE, SUSPENDED)
 */
export async function updateUserStatus(userId: string, statusName: string) {
  const status = await Status.findOne({ name: statusName.toUpperCase() });
  if (!status) {
    throw new NotFoundError("Status", statusName);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { status: status._id },
    { new: true }
  )
    .populate("role", "name")
    .populate("status", "name");

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return {
    _id: user._id,
    name: user.name,
    status: (user.status as any).name,
  };
}

// ===============================================
// DELETE OPERATIONS
// ===============================================

/**
 * Soft delete user
 */
export async function deleteUser(userId: string) {
  const user = await User.findByIdAndUpdate(
    userId,
    {
      isDeleted: true,
      deletedAt: new Date(),
      $inc: { tokenVersion: 1 }, // Invalidate tokens
    },
    { new: true }
  );

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return { success: true };
}

/**
 * Invalidate all tokens for a user
 */
export async function invalidateUserTokens(userId: string) {
  return AuthService.invalidateAllTokens(userId);
}

// ===============================================
// GUEST → STUDENT LIFECYCLE
// ===============================================

/**
 * List all pending guests (users with GUEST role who have paid)
 * These are ready for admin approval
 */
export async function listPendingGuests(page: number = 1, limit: number = 20) {
  const skip = (page - 1) * limit;

  // Get GUEST role
  const guestRole = await Role.findOne({ name: "GUEST" });
  if (!guestRole) {
    return { users: [], total: 0, page, limit };
  }

  // Find guests with successful payments
  const guestsWithPayments = await Payment.aggregate([
    {
      $match: {
        status: "SUCCESS",
        isDeleted: { $ne: true },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "student",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.role": guestRole._id,
        "user.isDeleted": { $ne: true },
      },
    },
    {
      $group: {
        _id: "$student",
        user: { $first: "$user" },
        totalPaid: { $sum: "$amount" },
        lastPayment: { $max: "$paidAt" },
        paymentCount: { $sum: 1 },
      },
    },
    { $sort: { lastPayment: -1 } },
    { $skip: skip },
    { $limit: limit },
  ]);

  // Get total count
  const totalAgg = await Payment.aggregate([
    {
      $match: {
        status: "SUCCESS",
        isDeleted: { $ne: true },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "student",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $match: {
        "user.role": guestRole._id,
        "user.isDeleted": { $ne: true },
      },
    },
    {
      $group: { _id: "$student" },
    },
    { $count: "total" },
  ]);

  const total = totalAgg[0]?.total || 0;

  const users = guestsWithPayments.map((g) => ({
    _id: g._id,
    name: g.user.name,
    email: g.user.email,
    mobile: g.user.mobile,
    totalPaid: g.totalPaid,
    lastPayment: g.lastPayment,
    paymentCount: g.paymentCount,
    createdAt: g.user.createdAt,
  }));

  return { users, total, page, limit };
}

/**
 * Approve GUEST → STUDENT upgrade
 * Validates:
 * 1. User is GUEST
 * 2. User has successful payment
 * 3. Batch has capacity (if batchId provided)
 */
export async function approveGuestToStudent(
  userId: string,
  batchId?: string
): Promise<{
  user: any;
  enrollment?: any;
}> {
  // 1. Verify user exists and is GUEST
  const user = await User.findOne({ _id: userId, isDeleted: false })
    .populate("role", "name")
    .lean();

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  const currentRole = (user.role as any)?.name;
  if (currentRole !== "GUEST") {
    throw new ValidationError(`User is already ${currentRole}, not GUEST`);
  }

  // 2. Verify payment exists
  const payment = await Payment.findOne({
    student: userId,
    status: "SUCCESS",
    isDeleted: false,
  });

  if (!payment) {
    throw new ValidationError("User has not made a successful payment");
  }

  // 3. If batch provided, verify capacity and assign
  let enrollment = null;
  if (batchId) {
    const batch = await Batch.findOne({ _id: batchId, isDeleted: false });
    if (!batch) {
      throw new NotFoundError("Batch", batchId);
    }

    const currentEnrollment = await BatchStudent.countDocuments({ batch: batchId });
    if (currentEnrollment >= batch.maxStudents) {
      throw new ValidationError("Selected batch is full");
    }

    // Check if already enrolled
    const existingEnrollment = await BatchStudent.findOne({
      student: userId,
      batch: batchId,
    });

    if (!existingEnrollment) {
      enrollment = await BatchStudent.create({
        student: userId,
        batch: batchId,
        joinedAt: new Date(),
      });

      // Update payment with batch
      payment.batch = batchId as any;
      await payment.save();
    }
  }

  // 4. Upgrade role to STUDENT
  const updatedUser = await AuthService.updateUserRole(userId, "STUDENT");

  return {
    user: updatedUser,
    enrollment,
  };
}

/**
 * Admin directly assigns student to batch
 */
export async function assignStudentToBatch(
  studentId: string,
  batchId: string
): Promise<any> {
  // Verify user is STUDENT
  const user = await User.findOne({ _id: studentId, isDeleted: false })
    .populate("role", "name")
    .lean();

  if (!user) {
    throw new NotFoundError("User", studentId);
  }

  const userRole = (user.role as any)?.name;
  if (userRole !== "STUDENT") {
    throw new ValidationError(`User must be STUDENT. Current role: ${userRole}`);
  }

  // Verify batch exists and has capacity
  const batch = await Batch.findOne({ _id: batchId, isDeleted: false });
  if (!batch) {
    throw new NotFoundError("Batch", batchId);
  }

  const currentEnrollment = await BatchStudent.countDocuments({ batch: batchId });
  if (currentEnrollment >= batch.maxStudents) {
    throw new ValidationError("Batch is full");
  }

  // Check if already enrolled
  const existingEnrollment = await BatchStudent.findOne({
    student: studentId,
    batch: batchId,
  });

  if (existingEnrollment) {
    throw new ValidationError("Student is already enrolled in this batch");
  }

  // Create enrollment
  const enrollment = await BatchStudent.create({
    student: studentId,
    batch: batchId,
    joinedAt: new Date(),
  });

  return enrollment.populate("batch", "batchName");
}

/**
 * Admin removes student from batch
 */
export async function removeStudentFromBatch(
  studentId: string,
  batchId: string
): Promise<void> {
  const result = await BatchStudent.deleteOne({
    student: studentId,
    batch: batchId,
  });

  if (result.deletedCount === 0) {
    throw new ValidationError("Student is not enrolled in this batch");
  }
}
