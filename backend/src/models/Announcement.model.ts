import { Schema, model, InferSchemaType } from "mongoose";

/**
 * ===============================================
 * ANNOUNCEMENT MODEL (ENHANCED)
 * ===============================================
 * Supports:
 * - Text, links, images, audio, video attachments
 * - Batch-specific or broadcast (all batches)
 * - Read receipts tracking
 * - Rich content formatting
 */

const AttachmentSchema = new Schema({
  type: {
    type: String,
    enum: ['IMAGE', 'AUDIO', 'VIDEO', 'DOCUMENT', 'LINK'],
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  filename: String,
  mimeType: String,
  size: Number, // in bytes
  thumbnail: String, // for videos/images
});

const AnnouncementSchema = new Schema(
  {
    title: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200,
    },

    description: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 5000, // Increased for rich content
    },

    // Rich content (HTML or Markdown)
    contentType: {
      type: String,
      enum: ['PLAIN', 'HTML', 'MARKDOWN'],
      default: 'PLAIN',
    },

    urgency: {
      type: String,
      enum: ['URGENT', 'NORMAL', 'REGULAR'],
      default: 'REGULAR',
    },

    // Media attachments (images, audio, files, links)
    attachments: [AttachmentSchema],

    // Broadcast mode (admin only)
    isBroadcast: {
      type: Boolean,
      default: false,
      // If true, visible to ALL batches (admin feature)
    },

    // Target audience
    targetAudience: {
      type: String,
      enum: ['STUDENTS', 'TEACHERS', 'ALL'],
      default: 'STUDENTS',
    },

    createdBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },

    // Metadata
    viewCount: {
      type: Number,
      default: 0,
    },

    isPinned: {
      type: Boolean,
      default: false, // Admins can pin important announcements
    },

    expiresAt: {
      type: Date, // Optional expiry date
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for checking if announcement is expired
AnnouncementSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for read count
AnnouncementSchema.virtual('readCount', {
  ref: 'AnnouncementRead',
  localField: '_id',
  foreignField: 'announcement',
  count: true,
});

// Performance indexes
AnnouncementSchema.index({ createdBy: 1 });
AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ urgency: 1 });
AnnouncementSchema.index({ isDeleted: 1 });
AnnouncementSchema.index({ isBroadcast: 1 });
AnnouncementSchema.index({ isPinned: -1, createdAt: -1 }); // Pinned first
AnnouncementSchema.index({ expiresAt: 1 }); // For cleanup jobs

export type AnnouncementDocument = InferSchemaType<typeof AnnouncementSchema>;
export const Announcement = model<AnnouncementDocument>("Announcement", AnnouncementSchema);
