/**
 * ===============================================
 * ANNOUNCEMENTS CONTROLLER
 * ===============================================
 * HTTP handlers for announcement operations.
 * Uses shared utilities for consistent responses.
 */

import { Request, Response } from "express";
import {
  asyncHandler,
  successResponse,
  getAuthContext,
  validateObjectId,
  validateRequired,
} from "../shared";
import {
  AnnouncementService,
  AnnouncementUrgency,
  ContentType,
  TargetAudience,
  AttachmentType,
} from "./announcement.service";
import { AuthorizationError } from "../../errors";
import { auditService, AUDIT_ACTIONS } from "../../services/audit.service";
import { getRequestContext } from "../../middleware/requestLogger.middleware";

// ===============================================
// TYPES
// ===============================================

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

interface RequestWithFiles extends Request {
  files?: MulterFile[];
}

// ===============================================
// HELPERS
// ===============================================

function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith("image/")) return AttachmentType.IMAGE;
  if (mimeType.startsWith("audio/")) return AttachmentType.AUDIO;
  if (mimeType.startsWith("video/")) return AttachmentType.VIDEO;
  if (mimeType === "application/pdf" || mimeType.includes("document"))
    return AttachmentType.DOCUMENT;
  return AttachmentType.DOCUMENT;
}

function parseBoolean(value: any): boolean | undefined {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
}

// ===============================================
// CONTROLLER
// ===============================================

export class AnnouncementsController {
  /**
   * POST /announcements
   * Create new announcement with optional attachments
   */
  static create = asyncHandler(async (req: RequestWithFiles, res: Response) => {
    const { userId, role } = getAuthContext(req);

    const {
      title,
      description,
      urgency,
      batchIds,
      contentType,
      targetAudience,
      isBroadcast,
      isPinned,
      expiresAt,
      attachments: bodyAttachments,
    } = req.body;

    validateRequired(req.body, ["title", "description"]);

    // Parse batch IDs
    const parsedBatchIds =
      typeof batchIds === "string" ? JSON.parse(batchIds) : batchIds;

    // Process attachments
    let attachments: any[] = Array.isArray(bodyAttachments) ? bodyAttachments : [];

    if (req.files && req.files.length > 0) {
      attachments = req.files.map((file) => ({
        type: getAttachmentType(file.mimetype),
        url: `/uploads/${file.filename}`,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }));
    }

    const announcement = await AnnouncementService.createAnnouncement(
      {
        title,
        description,
        contentType: contentType || ContentType.PLAIN,
        urgency: urgency || AnnouncementUrgency.REGULAR,
        attachments,
        batchIds: parsedBatchIds,
        isBroadcast: parseBoolean(isBroadcast),
        targetAudience: targetAudience || TargetAudience.STUDENTS,
        isPinned: parseBoolean(isPinned),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        createdBy: userId,
      },
      role
    );

    // Audit log announcement creation
    await auditService.log({
      action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATED,
      performedBy: userId,
      performerRole: role,
      targetModel: 'Announcement',
      targetId: announcement?._id,
      description: `Announcement "${title}" created`,
      newState: { title, urgency: urgency || 'REGULAR', isBroadcast: parseBoolean(isBroadcast) },
      requestContext: getRequestContext(req),
    });

    successResponse(res, announcement, "Announcement created successfully", 201);
  });

  /**
   * GET /announcements
   * Get all announcements with filters
   */
  static getAll = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { urgency, createdBy, batchId, isPinned, isActive, limit, page } = req.query;

    const filters = {
      urgency: urgency as AnnouncementUrgency | undefined,
      createdBy: createdBy as string | undefined,
      batchId: batchId as string | undefined,
      userId,
      isPinned: parseBoolean(isPinned),
      isActive: parseBoolean(isActive),
      limit: limit ? parseInt(limit as string) : 20,
      page: page ? parseInt(page as string) : 1,
    };

    const result = await AnnouncementService.getAllAnnouncements(filters, role);

    res.json({
      success: true,
      ...result,
    });
  });

  /**
   * GET /announcements/:id
   * Get single announcement by ID
   */
  static getById = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "announcementId");

    const announcement = await AnnouncementService.getAnnouncementById(id, userId);

    successResponse(res, announcement);
  });

  /**
   * GET /announcements/batch/:batchId
   * Get announcements for a specific batch
   */
  static getByBatch = asyncHandler(async (req: Request, res: Response) => {
    const { batchId } = req.params;

    validateObjectId(batchId, "batchId");

    const announcements = await AnnouncementService.getAnnouncementsForBatch(batchId);

    successResponse(res, announcements);
  });

  /**
   * POST /announcements/:id/read
   * Mark announcement as read
   */
  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "announcementId");

    await AnnouncementService.markAsRead(id, userId);

    successResponse(res, null, "Announcement marked as read");
  });

  /**
   * GET /announcements/:id/readers
   * Get read receipts (creator/admin only)
   */
  static getReaders = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "announcementId");

    // Verify ownership or admin
    const announcement = await AnnouncementService.getAnnouncementById(id);
    const isCreator = announcement.createdBy._id.toString() === userId;
    const isAdmin = role === "ADMIN";

    if (!isCreator && !isAdmin) {
      throw new AuthorizationError("Only creators and admins can view read receipts");
    }

    const readers = await AnnouncementService.getReadReceipts(id);

    successResponse(res, readers);
  });

  /**
   * PUT /announcements/:id
   * Update announcement
   */
  static update = asyncHandler(async (req: RequestWithFiles, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "announcementId");

    const {
      title,
      description,
      urgency,
      batchIds,
      contentType,
      targetAudience,
      isPinned,
      expiresAt,
    } = req.body;

    // Process attachments
    const attachments = req.files
      ? req.files.map((file) => ({
          type: getAttachmentType(file.mimetype),
          url: `/uploads/${file.filename}`,
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        }))
      : undefined;

    const announcement = await AnnouncementService.updateAnnouncement(
      id,
      {
        title,
        description,
        contentType,
        urgency,
        attachments,
        batchIds: typeof batchIds === "string" ? JSON.parse(batchIds) : batchIds,
        targetAudience,
        isPinned: parseBoolean(isPinned),
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
      userId,
      role
    );

    successResponse(res, announcement, "Announcement updated successfully");
  });

  /**
   * DELETE /announcements/:id
   * Soft delete announcement
   */
  static delete = asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = getAuthContext(req);
    const { id } = req.params;

    validateObjectId(id, "announcementId");

    const announcement = await AnnouncementService.getAnnouncementById(id);
    await AnnouncementService.deleteAnnouncement(id, userId, role);

    // Audit log announcement deletion
    await auditService.log({
      action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETED,
      performedBy: userId,
      performerRole: role,
      targetModel: 'Announcement',
      targetId: id,
      description: `Announcement "${announcement.title}" deleted`,
      previousState: { title: announcement.title },
      requestContext: getRequestContext(req),
    });

    successResponse(res, null, "Announcement deleted successfully");
  });
}

export default AnnouncementsController;
