import { Schema, model, InferSchemaType } from "mongoose";

const AnnouncementBatchSchema = new Schema(
  {
    announcement: { 
      type: Schema.Types.ObjectId, 
      ref: 'Announcement', 
      required: true 
    },

    batch: { 
      type: Schema.Types.ObjectId, 
      ref: 'Batch', 
      required: true 
    },
  },
  { timestamps: false }
);

AnnouncementBatchSchema.index({ announcement: 1, batch: 1 }, { unique: true });
AnnouncementBatchSchema.index({ announcement: 1 }); // Get all batches for an announcement
AnnouncementBatchSchema.index({ batch: 1 }); // Get all announcements for a batch

export type AnnouncementBatchDocument = InferSchemaType<typeof AnnouncementBatchSchema>;
export const AnnouncementBatch = model<AnnouncementBatchDocument>("AnnouncementBatch", AnnouncementBatchSchema);
