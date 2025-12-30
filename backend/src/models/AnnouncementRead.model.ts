import { Schema, model, InferSchemaType } from "mongoose";

/**
 * ===============================================
 * ANNOUNCEMENT READ TRACKING MODEL
 * ===============================================
 * Tracks which users have read which announcements
 * Enables "seen by" and read receipt features
 */

const AnnouncementReadSchema = new Schema(
  {
    announcement: {
      type: Schema.Types.ObjectId,
      ref: 'Announcement',
      required: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    readAt: {
      type: Date,
      default: Date.now,
    },

    // Optional: track if user interacted
    hasInteracted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index to ensure one read record per user per announcement
AnnouncementReadSchema.index({ announcement: 1, user: 1 }, { unique: true });

// Index for queries
AnnouncementReadSchema.index({ announcement: 1, readAt: -1 });
AnnouncementReadSchema.index({ user: 1, readAt: -1 });

export type AnnouncementReadDocument = InferSchemaType<typeof AnnouncementReadSchema>;
export const AnnouncementRead = model<AnnouncementReadDocument>("AnnouncementRead", AnnouncementReadSchema);
