import { Schema, model, InferSchemaType } from "mongoose";

const ZoomSessionSchema = new Schema(
  {
    batch: { 
      type: Schema.Types.ObjectId, 
      ref: 'Batch', 
      required: true 
    },

    teacher: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },

    zoomLink: { 
      type: String, 
      required: true 
    },

    classDate: { 
      type: Date, 
      required: true 
    },

    startTime: { 
      type: String, 
      required: true 
    },

    endTime: { 
      type: String, 
      required: true 
    },

    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'],
      default: 'SCHEDULED',
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Performance indexes
ZoomSessionSchema.index({ batch: 1, classDate: 1 });
ZoomSessionSchema.index({ teacher: 1 });
ZoomSessionSchema.index({ status: 1 });
ZoomSessionSchema.index({ classDate: 1 });
ZoomSessionSchema.index({ isDeleted: 1 });

export type ZoomSessionDocument = InferSchemaType<typeof ZoomSessionSchema>;
export const ZoomSession = model<ZoomSessionDocument>("ZoomSession", ZoomSessionSchema);
