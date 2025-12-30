/**
 * ===============================================
 * HOLIDAYS SERVICE
 * ===============================================
 * Business logic for holiday management.
 * Supports batch-specific and global holidays.
 */

import { Holiday } from "../../models/Holiday.model";
import { Batch } from "../../models/Batch.model";
import { NotFoundError, ValidationError, AuthorizationError } from "../../errors";
import { OwnershipService } from "../../services/ownership.service";

/**
 * Holiday query filters
 */
interface HolidayFilters {
  batchId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  fromDate?: Date;
  toDate?: Date;
}

/**
 * Create holiday data shape
 */
interface CreateHolidayData {
  date: Date;
  batchId: string;
  reason: string;
  userId: string;
  userRole: "ADMIN" | "TEACHER";
}

/**
 * Get holidays for a specific batch
 */
export async function getBatchHolidays(
  batchId: string,
  page: number = 1,
  limit: number = 50
) {
  const skip = (page - 1) * limit;

  const query = {
    batch: batchId,
    isDeleted: false,
  };

  const [holidays, total] = await Promise.all([
    Holiday.find(query)
      .populate("appliedBy", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Holiday.countDocuments(query),
  ]);

  return { holidays, total, page, limit };
}

/**
 * Get all holidays with filters (admin view)
 */
export async function getAllHolidays(
  filters: HolidayFilters,
  page: number = 1,
  limit: number = 50
) {
  const skip = (page - 1) * limit;

  const query: Record<string, any> = { isDeleted: false };

  if (filters.batchId) {
    query.batch = filters.batchId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.fromDate || filters.toDate) {
    query.date = {};
    if (filters.fromDate) query.date.$gte = filters.fromDate;
    if (filters.toDate) query.date.$lte = filters.toDate;
  }

  const [holidays, total] = await Promise.all([
    Holiday.find(query)
      .populate("batch", "batchName")
      .populate("appliedBy", "name email")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Holiday.countDocuments(query),
  ]);

  return { holidays, total, page, limit };
}

/**
 * Get upcoming holidays for user's batches
 * - Students: see approved holidays in their enrolled batches
 * - Teachers: see all holidays in their batches (any status)
 */
export async function getMyUpcomingHolidays(
  userId: string,
  role: string,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  let batchIds: string[];

  if (role === "TEACHER") {
    batchIds = await OwnershipService.getTeacherBatchIds(userId);
  } else {
    batchIds = await OwnershipService.getStudentBatchIds(userId);
  }

  const query: Record<string, any> = {
    batch: { $in: batchIds },
    date: { $gte: new Date() },
    isDeleted: false,
  };

  // Students only see approved holidays
  if (role === "STUDENT") {
    query.status = "APPROVED";
  }

  const [holidays, total] = await Promise.all([
    Holiday.find(query)
      .populate("batch", "batchName")
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Holiday.countDocuments(query),
  ]);

  return { holidays, total, page, limit };
}

/**
 * Create a holiday (teacher for their batch, admin for any)
 */
export async function createHoliday(data: CreateHolidayData) {
  // Validate batch exists
  const batch = await Batch.findOne({
    _id: data.batchId,
    isDeleted: false,
  });

  if (!batch) {
    throw new NotFoundError("Batch", data.batchId);
  }

  // Teachers can only declare for their own batches
  if (data.userRole === "TEACHER") {
    await OwnershipService.ensureTeacherOwnsBatch(
      data.userId,
      data.batchId,
      "declare holiday for this batch"
    );
  }

  // Check for duplicate holiday on same date for same batch
  const existing = await Holiday.findOne({
    batch: data.batchId,
    date: data.date,
    isDeleted: false,
  });

  if (existing) {
    throw new ValidationError("A holiday already exists for this batch on this date");
  }

  const holiday = await Holiday.create({
    date: data.date,
    batch: data.batchId,
    appliedBy: data.userId,
    appliedByRole: data.userRole,
    reason: data.reason,
    // Admin-created holidays are auto-approved
    status: data.userRole === "ADMIN" ? "APPROVED" : "PENDING",
  });

  return holiday;
}

/**
 * Update holiday status (admin only)
 */
export async function updateHolidayStatus(
  holidayId: string,
  status: "APPROVED" | "REJECTED"
) {
  const holiday = await Holiday.findOneAndUpdate(
    { _id: holidayId, isDeleted: false },
    { status },
    { new: true }
  )
    .populate("batch", "batchName")
    .populate("appliedBy", "name email");

  if (!holiday) {
    throw new NotFoundError("Holiday", holidayId);
  }

  return holiday;
}

/**
 * Update holiday details (teacher: own pending, admin: any)
 */
export async function updateHoliday(
  holidayId: string,
  updates: { date?: Date; reason?: string },
  userId: string,
  userRole: string
) {
  const holiday = await Holiday.findOne({
    _id: holidayId,
    isDeleted: false,
  });

  if (!holiday) {
    throw new NotFoundError("Holiday", holidayId);
  }

  // Teachers can only update their own pending holidays
  if (userRole === "TEACHER") {
    if (holiday.appliedBy.toString() !== userId) {
      throw new AuthorizationError("You can only update your own holidays");
    }
    if (holiday.status !== "PENDING") {
      throw new ValidationError("Cannot update holiday that is not pending");
    }
  }

  if (updates.date) holiday.date = updates.date;
  if (updates.reason) holiday.reason = updates.reason;

  await holiday.save();

  return holiday;
}

/**
 * Delete holiday (soft delete)
 */
export async function deleteHoliday(
  holidayId: string,
  userId: string,
  userRole: string
) {
  const holiday = await Holiday.findOne({
    _id: holidayId,
    isDeleted: false,
  });

  if (!holiday) {
    throw new NotFoundError("Holiday", holidayId);
  }

  // Teachers can only delete their own pending holidays
  if (userRole === "TEACHER") {
    if (holiday.appliedBy.toString() !== userId) {
      throw new AuthorizationError("You can only delete your own holidays");
    }
    if (holiday.status !== "PENDING") {
      throw new ValidationError("Cannot delete holiday that is not pending");
    }
  }

  holiday.isDeleted = true;
  holiday.deletedAt = new Date();
  await holiday.save();

  return { success: true };
}

/**
 * Get holiday by ID
 */
export async function getHolidayById(holidayId: string) {
  const holiday = await Holiday.findOne({
    _id: holidayId,
    isDeleted: false,
  })
    .populate("batch", "batchName teacher")
    .populate("appliedBy", "name email")
    .lean();

  if (!holiday) {
    throw new NotFoundError("Holiday", holidayId);
  }

  return holiday;
}

/**
 * Check if a date is a holiday for a batch
 */
export async function isHolidayForBatch(
  batchId: string,
  date: Date
): Promise<boolean> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holiday = await Holiday.findOne({
    batch: batchId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: "APPROVED",
    isDeleted: false,
  });

  return !!holiday;
}
