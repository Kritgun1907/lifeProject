/**
 * Admin System Service
 * System configuration, status management, and data archival
 */

import { User } from "../../../models/User.model";
import { Batch } from "../../../models/Batch.model";
import { Payment } from "../../../models/Payment.model";
import { Attendance } from "../../../models/Attendance.model";
import { Announcement } from "../../../models/Announcement.model";
import { Holiday } from "../../../models/Holiday.model";
import { Status } from "../../../models/Status.model";
import { Permission } from "../../../models/Permission.model";
import { Role } from "../../../models/Role.model";
import { Types } from "mongoose";
import { AppError } from "../../../errors/AppError";

export interface SystemHealth {
  database: {
    connected: boolean;
    collections: Record<string, number>;
  };
  timestamp: Date;
  uptime: number;
}

export interface ArchiveResult {
  archived: number;
  model: string;
  archivedAt: Date;
}

export class SystemService {
  /**
   * Get system health and stats
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const collections: Record<string, number> = {};

    // Count documents in each collection
    const [
      userCount,
      batchCount,
      paymentCount,
      attendanceCount,
      announcementCount,
      holidayCount,
      statusCount,
      permissionCount,
      roleCount,
    ] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Batch.countDocuments({ isDeleted: { $ne: true } }),
      Payment.countDocuments({ isDeleted: { $ne: true } }),
      Attendance.countDocuments({ isDeleted: { $ne: true } }),
      Announcement.countDocuments({ isDeleted: { $ne: true } }),
      Holiday.countDocuments({ isDeleted: { $ne: true } }),
      Status.countDocuments(),
      Permission.countDocuments(),
      Role.countDocuments(),
    ]);

    collections.users = userCount;
    collections.batches = batchCount;
    collections.payments = paymentCount;
    collections.attendance = attendanceCount;
    collections.announcements = announcementCount;
    collections.holidays = holidayCount;
    collections.statuses = statusCount;
    collections.permissions = permissionCount;
    collections.roles = roleCount;

    return {
      database: {
        connected: true,
        collections,
      },
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  /**
   * Get all status options
   */
  async getAllStatuses() {
    return Status.find().sort({ name: 1 }).lean();
  }

  /**
   * Create a new status
   */
  async createStatus(name: string) {
    const existing = await Status.findOne({ name });
    if (existing) {
      throw new AppError(`Status '${name}' already exists`, 400);
    }
    return Status.create({ name });
  }

  /**
   * Archive old records (soft delete records older than specified date)
   */
  async archiveOldAttendance(beforeDate: Date): Promise<ArchiveResult> {
    const result = await Attendance.updateMany(
      {
        date: { $lt: beforeDate },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      archived: result.modifiedCount,
      model: "Attendance",
      archivedAt: new Date(),
    };
  }

  /**
   * Archive old payments
   */
  async archiveOldPayments(beforeDate: Date): Promise<ArchiveResult> {
    const result = await Payment.updateMany(
      {
        createdAt: { $lt: beforeDate },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      archived: result.modifiedCount,
      model: "Payment",
      archivedAt: new Date(),
    };
  }

  /**
   * Archive old announcements
   */
  async archiveOldAnnouncements(beforeDate: Date): Promise<ArchiveResult> {
    const result = await Announcement.updateMany(
      {
        createdAt: { $lt: beforeDate },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    return {
      archived: result.modifiedCount,
      model: "Announcement",
      archivedAt: new Date(),
    };
  }

  /**
   * Bulk update user status
   */
  async bulkUpdateUserStatus(
    userIds: string[],
    statusId: string,
    adminId: string
  ): Promise<{ updated: number }> {
    // Validate status exists
    const status = await Status.findById(statusId);
    if (!status) {
      throw new AppError("Invalid status ID", 400);
    }

    const objectIds = userIds.map((id) => new Types.ObjectId(id));

    const result = await User.updateMany(
      {
        _id: { $in: objectIds },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          status: new Types.ObjectId(statusId),
          updatedBy: new Types.ObjectId(adminId),
        },
      }
    );

    return { updated: result.modifiedCount };
  }

  /**
   * Bulk archive users (soft delete)
   */
  async bulkArchiveUsers(
    userIds: string[],
    adminId: string
  ): Promise<{ archived: number }> {
    const objectIds = userIds.map((id) => new Types.ObjectId(id));

    const result = await User.updateMany(
      {
        _id: { $in: objectIds },
        isDeleted: { $ne: true },
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: new Types.ObjectId(adminId),
        },
      }
    );

    return { archived: result.modifiedCount };
  }

  /**
   * Get archived records count
   */
  async getArchivedStats(): Promise<Record<string, number>> {
    const [users, batches, payments, attendance, announcements, holidays] =
      await Promise.all([
        User.countDocuments({ isDeleted: true }),
        Batch.countDocuments({ isDeleted: true }),
        Payment.countDocuments({ isDeleted: true }),
        Attendance.countDocuments({ isDeleted: true }),
        Announcement.countDocuments({ isDeleted: true }),
        Holiday.countDocuments({ isDeleted: true }),
      ]);

    return {
      users,
      batches,
      payments,
      attendance,
      announcements,
      holidays,
      total: users + batches + payments + attendance + announcements + holidays,
    };
  }

  /**
   * Restore archived records by model and IDs
   */
  async restoreArchivedRecords(
    model: "User" | "Batch" | "Payment" | "Attendance" | "Announcement" | "Holiday",
    ids: string[]
  ): Promise<{ restored: number }> {
    const objectIds = ids.map((id) => new Types.ObjectId(id));

    let result;
    const updateData = {
      $set: { isDeleted: false },
      $unset: { deletedAt: 1, deletedBy: 1 },
    };

    switch (model) {
      case "User":
        result = await User.updateMany({ _id: { $in: objectIds } }, updateData);
        break;
      case "Batch":
        result = await Batch.updateMany({ _id: { $in: objectIds } }, updateData);
        break;
      case "Payment":
        result = await Payment.updateMany({ _id: { $in: objectIds } }, updateData);
        break;
      case "Attendance":
        result = await Attendance.updateMany({ _id: { $in: objectIds } }, updateData);
        break;
      case "Announcement":
        result = await Announcement.updateMany({ _id: { $in: objectIds } }, updateData);
        break;
      case "Holiday":
        result = await Holiday.updateMany({ _id: { $in: objectIds } }, updateData);
        break;
      default:
        throw new AppError("Invalid model specified", 400);
    }

    return { restored: result.modifiedCount };
  }

  /**
   * Get system audit log (recent admin actions)
   * This is a placeholder - in production, you'd have a separate AuditLog model
   */
  async getRecentAdminActions(): Promise<
    Array<{
      action: string;
      model: string;
      count: number;
      timestamp: Date;
    }>
  > {
    // Get recent deletions as a proxy for admin actions
    const recentDeleted = await User.find({
      isDeleted: true,
      deletedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .select("deletedAt")
      .lean();

    return [
      {
        action: "archive",
        model: "User",
        count: recentDeleted.length,
        timestamp: new Date(),
      },
    ];
  }

  /**
   * Seed permissions from constants
   */
  async syncPermissions(permissions: string[]): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const perm of permissions) {
      const exists = await Permission.findOne({ name: perm });
      if (!exists) {
        await Permission.create({ name: perm });
        created++;
      } else {
        existing++;
      }
    }

    return { created, existing };
  }
}

export const systemService = new SystemService();
