import { Announcement } from "../../models/Announcement.model";
import { AnnouncementBatch } from "../../models/AnnouncementBatch.model";
import { AnnouncementRead } from "../../models/AnnouncementRead.model";
import { BatchStudent } from "../../models/BatchStudent.model";
import mongoose from "mongoose";
import {
  AnnouncementNotFoundError,
  UnauthorizedAnnouncementAccessError,
} from "../../errors";
import { AnnouncementUrgency } from "../../validators";
import { OwnershipService } from "../../services/ownership.service";
import "../../models/Batch.model";

/**
 * ===============================================
 * TYPE DEFINITIONS (ENHANCED)
 * ===============================================
 */

export { AnnouncementUrgency } from "../../validators";

export enum AttachmentType {
  IMAGE = "IMAGE",
  AUDIO = "AUDIO",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  LINK = "LINK",
}

export enum ContentType {
  PLAIN = "PLAIN",
  HTML = "HTML",
  MARKDOWN = "MARKDOWN",
}

export enum TargetAudience {
  STUDENTS = "STUDENTS",
  TEACHERS = "TEACHERS",
  ALL = "ALL",
}

export interface AttachmentDTO {
  type: AttachmentType;
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  thumbnail?: string;
}

export interface CreateAnnouncementDTO {
  title: string;
  description: string;
  contentType?: ContentType;
  urgency?: AnnouncementUrgency;
  attachments?: AttachmentDTO[];
  batchIds?: string[]; // Empty or undefined = broadcast (admin only)
  isBroadcast?: boolean; // Admin-only flag
  targetAudience?: TargetAudience;
  isPinned?: boolean;
  expiresAt?: Date;
  createdBy: string;
}

export interface UpdateAnnouncementDTO {
  title?: string;
  description?: string;
  contentType?: ContentType;
  urgency?: AnnouncementUrgency;
  attachments?: AttachmentDTO[];
  batchIds?: string[];
  targetAudience?: TargetAudience;
  isPinned?: boolean;
  expiresAt?: Date;
}

export interface AnnouncementFilters {
  urgency?: AnnouncementUrgency;
  createdBy?: string;
  batchId?: string; // Filter by specific batch
  userId?: string; // For student portal (shows only their batch announcements)
  isPinned?: boolean;
  isActive?: boolean; // Filter out expired
  limit?: number;
  page?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * ===============================================
 * ANNOUNCEMENT SERVICE (ENHANCED)
 * ===============================================
 */

export class AnnouncementService {
  /**
   * ===============================================
   * PRIVATE HELPER METHODS
   * ===============================================
   */

  private static async validateOwnership(
    announcementId: string,
    userId: string,
    action: string
  ): Promise<void> {
    const announcement = await Announcement.findOne({
      _id: announcementId,
      isDeleted: false,
    }).lean();

    if (!announcement) {
      throw new AnnouncementNotFoundError(announcementId);
    }

    if (announcement.createdBy.toString() !== userId) {
      throw new UnauthorizedAnnouncementAccessError(action);
    }
  }

  private static async linkAnnouncementToBatches(
    announcementId: mongoose.Types.ObjectId,
    batchIds: string[],
    session?: mongoose.ClientSession
  ): Promise<void> {
    if (!batchIds || batchIds.length === 0) return;

    const announcementBatches = batchIds.map((batchId) => ({
      announcement: announcementId,
      batch: batchId,
    }));

    await AnnouncementBatch.insertMany(announcementBatches, { session });
  }

  private static async unlinkAnnouncementFromBatches(
    announcementId: string,
    session?: mongoose.ClientSession
  ): Promise<void> {
    await AnnouncementBatch.deleteMany(
      { announcement: announcementId },
      { session }
    );
  }

  /**
   * Get batch IDs for a specific user (student or teacher)
   * Uses OwnershipService for centralized batch access logic
   */
  private static async getUserBatchIds(userId: string, userRole?: string): Promise<string[]> {
    // Determine role if not provided (backwards compatibility)
    if (!userRole) {
      // Try student first
      const studentBatches = await OwnershipService.getStudentBatchIds(userId);
      if (studentBatches.length > 0) {
        return studentBatches;
      }
      // Fallback to teacher
      return await OwnershipService.getTeacherBatchIds(userId);
    }

    // Role-based batch retrieval using OwnershipService
    if (userRole === "STUDENT") {
      return await OwnershipService.getStudentBatchIds(userId);
    } else if (userRole === "TEACHER") {
      return await OwnershipService.getTeacherBatchIds(userId);
    }

    return [];
  }

  /**
   * ===============================================
   * PUBLIC API METHODS
   * ===============================================
   */

  /**
   * Create announcement with media attachments
   * Supports broadcast mode (admin only)
   */
  static async createAnnouncement(data: CreateAnnouncementDTO, userRole: string) {
    // NOTE: Transactions are disabled in development because MongoDB
    // standalone instances do not support them. The original
    // session/transaction-based implementation is kept below as comments
    // for production / replica-set setups.

    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
      // Validate broadcast permission (admin only)
      if (data.isBroadcast && userRole !== "ADMIN") {
        throw new UnauthorizedAnnouncementAccessError("create broadcast announcements");
      }

      // Teachers can only create announcements for their own batches
      if (userRole === "TEACHER" && data.batchIds && data.batchIds.length > 0) {
        const teacherBatchIds = await OwnershipService.getTeacherBatchIds(data.createdBy);
        const invalidBatches = data.batchIds.filter(
          (batchId) => !teacherBatchIds.includes(batchId)
        );
        
        if (invalidBatches.length > 0) {
          throw new UnauthorizedAnnouncementAccessError(
            "create announcements for batches you don't teach"
          );
        }
      }

      // Create announcement document (no session in dev)
      const [newAnnouncement] = await Announcement.create([
        {
          title: data.title.trim(),
          description: data.description.trim(),
          contentType: data.contentType || ContentType.PLAIN,
          urgency: data.urgency || AnnouncementUrgency.REGULAR,
          attachments: data.attachments || [],
          isBroadcast: data.isBroadcast || false,
          targetAudience: data.targetAudience || TargetAudience.STUDENTS,
          isPinned: data.isPinned && userRole === "ADMIN" ? data.isPinned : false,
          expiresAt: data.expiresAt,
          createdBy: data.createdBy,
        },
      ]);

      // Link to specific batches (unless broadcast)
      if (!data.isBroadcast && data.batchIds && data.batchIds.length > 0) {
        await this.linkAnnouncementToBatches(newAnnouncement._id, data.batchIds);
      }

      // await session.commitTransaction();

      // Fetch and return populated announcement
      return await Announcement.findById(newAnnouncement._id)
        .populate("createdBy", "name email")
        .lean();
    } catch (error) {
      // await session.abortTransaction();
      throw error;
    } finally {
      // session.endSession();
    }
  }

  /**
   * Get announcements with filtering for students
   * Students only see announcements for their batches or broadcasts
   */
  static async getAllAnnouncements(
    filters: AnnouncementFilters = {},
    userRole?: string
  ): Promise<PaginatedResponse<any>> {
    const {
      urgency,
      createdBy,
      batchId,
      userId,
      isPinned,
      isActive,
      limit = 20,
      page = 1,
    } = filters;

    // Build query dynamically
    const query: Record<string, any> = { isDeleted: false };
    if (urgency) query.urgency = urgency;
    if (createdBy) query.createdBy = createdBy;
    if (isPinned !== undefined) query.isPinned = isPinned;

    // Filter expired announcements
    if (isActive) {
      query.$or = [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ];
    }

    // Student-specific filtering
    let announcementIds: string[] | undefined;
    if (userId && userRole === "STUDENT") {
      const userBatchIds = await this.getUserBatchIds(userId, userRole);

      // Get batch-specific announcements
      const batchAnnouncements = await AnnouncementBatch.find({
        batch: { $in: userBatchIds },
      }).distinct("announcement");

      // Get broadcast announcements
      const broadcasts = await Announcement.find({
        isBroadcast: true,
        isDeleted: false,
      }).distinct("_id");

      // Combine both
      announcementIds = [
        ...batchAnnouncements.map((id) => id.toString()),
        ...broadcasts.map((id) => id.toString()),
      ];

      query._id = { $in: announcementIds };
    }

    // Batch-specific filtering
    if (batchId) {
      const batchAnnouncements = await AnnouncementBatch.find({
        batch: batchId,
      }).distinct("announcement");

      // Include broadcasts too
      const broadcasts = await Announcement.find({
        isBroadcast: true,
        isDeleted: false,
      }).distinct("_id");

      const combinedIds = [
        ...batchAnnouncements.map((id) => id.toString()),
        ...broadcasts.map((id) => id.toString()),
      ];

      query._id = { $in: combinedIds };
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute parallel queries for data and count
    const [announcements, total] = await Promise.all([
      Announcement.find(query)
        .populate("createdBy", "name email")
        .sort({ isPinned: -1, createdAt: -1 }) // Pinned first
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      Announcement.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: announcements,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get announcement by ID with batches and read stats
   */
  static async getAnnouncementById(announcementId: string, userId?: string) {
    const announcement = await Announcement.findOne({
      _id: announcementId,
      isDeleted: false,
    })
      .populate("createdBy", "name email")
      .lean()
      .exec();

    if (!announcement) {
      throw new AnnouncementNotFoundError(announcementId);
    }

    // Get associated batches
    const batches = await AnnouncementBatch.find({
      announcement: announcementId,
    })
      .populate("batch", "name startDate")
      .lean()
      .exec();

    // Get read count
    const readCount = await AnnouncementRead.countDocuments({
      announcement: announcementId,
    });

    // Check if current user has read it
    let hasRead = false;
    if (userId) {
      const readRecord = await AnnouncementRead.findOne({
        announcement: announcementId,
        user: userId,
      });
      hasRead = !!readRecord;
    }

    return {
      ...announcement,
      batches: batches.map((ab) => ab.batch),
      stats: {
        readCount,
        hasRead,
      },
    };
  }

  /**
   * Mark announcement as read by user
   */
  static async markAsRead(announcementId: string, userId: string): Promise<void> {
    try {
      await AnnouncementRead.findOneAndUpdate(
        { announcement: announcementId, user: userId },
        { readAt: new Date(), hasInteracted: true },
        { upsert: true, new: true }
      );

      // Increment view count
      await Announcement.findByIdAndUpdate(announcementId, {
        $inc: { viewCount: 1 },
      });
    } catch (error: any) {
      // Ignore duplicate key errors (user already read it)
      if (error.code !== 11000) {
        throw error;
      }
    }
  }

  /**
   * Get users who have read an announcement
   */
  static async getReadReceipts(announcementId: string) {
    const reads = await AnnouncementRead.find({
      announcement: announcementId,
    })
      .populate("user", "name email")
      .sort({ readAt: -1 })
      .lean()
      .exec();

    return reads;
  }

  /**
   * Update announcement
   */
  static async updateAnnouncement(
    announcementId: string,
    data: UpdateAnnouncementDTO,
    userId: string,
    userRole: string
  ) {
    if (userRole !== "ADMIN") {
      await this.validateOwnership(announcementId, userId, "update");
    }

    // NOTE: Transactions are disabled in development because MongoDB
    // standalone instances do not support them. The original
    // session/transaction-based implementation is kept below as comments
    // for production / replica-set setups.

    // const session = await mongoose.startSession();
    // session.startTransaction();

    try {
      const updateData: Record<string, any> = {};
      if (data.title) updateData.title = data.title.trim();
      if (data.description) updateData.description = data.description.trim();
      if (data.contentType) updateData.contentType = data.contentType;
      if (data.urgency) updateData.urgency = data.urgency;
      if (data.attachments) updateData.attachments = data.attachments;
      if (data.targetAudience) updateData.targetAudience = data.targetAudience;
      if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

      // Only admins can pin
      if (data.isPinned !== undefined && userRole === "ADMIN") {
        updateData.isPinned = data.isPinned;
      }

      const updatedAnnouncement = await Announcement.findByIdAndUpdate(
        announcementId,
        updateData,
        { new: true, runValidators: true }
        // session
      )
        .populate("createdBy", "name email")
        .exec();

      // Update batch associations if provided
      if (data.batchIds !== undefined) {
        // Teachers can only assign announcements to their own batches
        if (userRole === "TEACHER" && data.batchIds.length > 0) {
          const teacherBatchIds = await OwnershipService.getTeacherBatchIds(userId);
          const invalidBatches = data.batchIds.filter(
            (batchId) => !teacherBatchIds.includes(batchId)
          );
          
          if (invalidBatches.length > 0) {
            throw new UnauthorizedAnnouncementAccessError(
              "assign announcements to batches you don't teach"
            );
          }
        }

        await this.unlinkAnnouncementFromBatches(announcementId /*, session*/);
        await this.linkAnnouncementToBatches(
          new mongoose.Types.ObjectId(announcementId),
          data.batchIds
          // session
        );
      }

      // await session.commitTransaction();
      return updatedAnnouncement;
    } catch (error) {
      // await session.abortTransaction();
      throw error;
    } finally {
      // session.endSession();
    }
  }

  /**
   * Delete announcement
   */
  static async deleteAnnouncement(
    announcementId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    // Non-admins must be the creator; admins can delete any announcement
    if (userRole !== "ADMIN") {
      await this.validateOwnership(announcementId, userId, "delete");
    }

    await Announcement.findByIdAndUpdate(announcementId, {
      isDeleted: true,
      deletedAt: new Date(),
    }).exec();
  }

  /**
   * Get announcements for a specific batch
   */
  static async getAnnouncementsForBatch(batchId: string) {
    const batchAnnouncements = await AnnouncementBatch.find({
      batch: batchId,
    })
      .populate({
        path: "announcement",
        match: { isDeleted: false },
        populate: {
          path: "createdBy",
          select: "name email",
        },
      })
      .lean()
      .exec();

    // Get broadcast announcements
    const broadcasts = await Announcement.find({
      isBroadcast: true,
      isDeleted: false,
    })
      .populate("createdBy", "name email")
      .lean()
      .exec();

    // Combine and remove duplicates
    const batchSpecific = batchAnnouncements
      .filter((ab) => ab.announcement !== null)
      .map((ab) => ab.announcement);

    return [...batchSpecific, ...broadcasts];
  }
}
