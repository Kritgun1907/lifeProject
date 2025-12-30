/**
 * ===============================================
 * ADMIN SETTINGS SERVICE
 * ===============================================
 * Business logic for system settings:
 * - Working days (suitable days)
 * - Working times (suitable times)
 * - Status configurations
 */

import { WorkingDay } from "../../../models/WorkingDay.model";
import { WorkingTimings } from "../../../models/WorkingTime.model";
import { Status } from "../../../models/Status.model";
import { NotFoundError, ValidationError } from "../../../errors";

// ===============================================
// WORKING DAYS (Suitable Days)
// ===============================================

/**
 * List all working day configurations
 */
export async function listWorkingDays() {
  const days = await WorkingDay.find({ isActive: true })
    .populate("createdBy", "name")
    .sort({ name: 1 })
    .lean();

  return days;
}

/**
 * Create working day configuration
 */
export async function createWorkingDay(
  name: string,
  daysArray: string[],
  createdBy: string
) {
  // Validate days
  const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
  type DayCode = typeof validDays[number];
  
  const upperDays = daysArray.map((d) => d.toUpperCase());
  const invalidDays = upperDays.filter((d) => !validDays.includes(d as DayCode));

  if (invalidDays.length > 0) {
    throw new ValidationError(`Invalid days: ${invalidDays.join(", ")}`);
  }

  // Check for duplicate name
  const existing = await WorkingDay.findOne({ name, isActive: true });
  if (existing) {
    throw new ValidationError(`Working day configuration "${name}" already exists`);
  }

  const workingDay = await WorkingDay.create({
    name,
    daysArray: upperDays as DayCode[],
    createdBy,
  });

  return workingDay;
}

/**
 * Update working day configuration
 */
export async function updateWorkingDay(
  id: string,
  updates: { name?: string; daysArray?: string[] }
) {
  const updateFields: Record<string, any> = {};

  if (updates.name) updateFields.name = updates.name;
  if (updates.daysArray) {
    const validDays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
    type DayCode = typeof validDays[number];
    
    const upperDays = updates.daysArray.map((d) => d.toUpperCase());
    const invalidDays = upperDays.filter((d) => !validDays.includes(d as DayCode));

    if (invalidDays.length > 0) {
      throw new ValidationError(`Invalid days: ${invalidDays.join(", ")}`);
    }

    updateFields.daysArray = upperDays;
  }

  const workingDay = await WorkingDay.findByIdAndUpdate(id, updateFields, {
    new: true,
  });

  if (!workingDay) {
    throw new NotFoundError("WorkingDay", id);
  }

  return workingDay;
}

/**
 * Delete working day configuration (soft delete)
 */
export async function deleteWorkingDay(id: string) {
  const result = await WorkingDay.findByIdAndUpdate(id, { isActive: false });

  if (!result) {
    throw new NotFoundError("WorkingDay", id);
  }

  return { success: true };
}

// ===============================================
// WORKING TIMES (Suitable Times)
// ===============================================

/**
 * List all working time slots
 */
export async function listWorkingTimes() {
  const times = await WorkingTimings.find({ is_active: true })
    .populate("created_by", "name")
    .sort({ start_time: 1 })
    .lean();

  return times;
}

/**
 * Create working time slot
 */
export async function createWorkingTime(
  startTime: string,
  endTime: string,
  createdBy: string
) {
  // Validate time format (HH:MM)
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new ValidationError("Time must be in HH:MM format");
  }

  // Validate start < end
  if (startTime >= endTime) {
    throw new ValidationError("Start time must be before end time");
  }

  const timeRange = `${startTime} - ${endTime}`;

  // Check for duplicate
  const existing = await WorkingTimings.findOne({ time_range: timeRange, is_active: true });
  if (existing) {
    throw new ValidationError(`Time slot "${timeRange}" already exists`);
  }

  const workingTime = await WorkingTimings.create({
    time_range: timeRange,
    start_time: startTime,
    end_time: endTime,
    created_by: createdBy,
  });

  return workingTime;
}

/**
 * Update working time slot
 */
export async function updateWorkingTime(
  id: string,
  updates: { startTime?: string; endTime?: string }
) {
  const current = await WorkingTimings.findById(id);
  if (!current) {
    throw new NotFoundError("WorkingTime", id);
  }

  const startTime = updates.startTime || current.start_time;
  const endTime = updates.endTime || current.end_time;

  // Validate time format
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
    throw new ValidationError("Time must be in HH:MM format");
  }

  if (startTime >= endTime) {
    throw new ValidationError("Start time must be before end time");
  }

  const timeRange = `${startTime} - ${endTime}`;

  const workingTime = await WorkingTimings.findByIdAndUpdate(
    id,
    {
      time_range: timeRange,
      start_time: startTime,
      end_time: endTime,
    },
    { new: true }
  );

  return workingTime;
}

/**
 * Delete working time slot (soft delete)
 */
export async function deleteWorkingTime(id: string) {
  const result = await WorkingTimings.findByIdAndUpdate(id, { is_active: false });

  if (!result) {
    throw new NotFoundError("WorkingTime", id);
  }

  return { success: true };
}

// ===============================================
// STATUS CONFIGURATIONS
// ===============================================

/**
 * List all status configurations
 */
export async function listStatuses() {
  const statuses = await Status.find().sort({ name: 1 }).lean();
  return statuses;
}

/**
 * Get status by name
 */
export async function getStatusByName(name: string) {
  const status = await Status.findOne({ name: name.toUpperCase() }).lean();

  if (!status) {
    throw new NotFoundError("Status", name);
  }

  return status;
}
