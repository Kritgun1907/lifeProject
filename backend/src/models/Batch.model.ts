import { Schema, model, InferSchemaType } from "mongoose";

const BatchSchema = new Schema(
  {
    batchName: { 
        type: String, 
        required: true, 
        trim: true 
    },

    instrument: { 
        type: Schema.Types.ObjectId, 
        ref: 'Instrument', 
        required: true 
    },

    teacher: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    workingDay: { 
        type: Schema.Types.ObjectId, 
        ref: 'WorkingDay', 
        required: true 
    },

    workingTiming: { 
        type: Schema.Types.ObjectId, 
        ref: 'WorkingTiming', 
        required: true 
    },

    mode: { 
        type: String, 
        enum: ['ONLINE', 'OFFLINE'], 
        required: true 
    },

    maxStudents: { 
        type: Number, 
        required: true, 
        min: 1 
    },

    status: { 
        type: Schema.Types.ObjectId, 
        ref: 'Status', 
        required: true 
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
BatchSchema.index({ teacher: 1 });
BatchSchema.index({ instrument: 1 });
BatchSchema.index({ status: 1 });
BatchSchema.index({ workingDay: 1, workingTiming: 1 });
BatchSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
BatchSchema.index({ teacher: 1, status: 1 }); // Teacher's active batches
BatchSchema.index({ instrument: 1, status: 1 }); // Active batches by instrument
BatchSchema.index({ teacher: 1, isDeleted: 1 }); // Teacher's non-deleted batches
BatchSchema.index({ mode: 1, status: 1 }); // Online/Offline active batches

export type BatchDocument = InferSchemaType<typeof BatchSchema>;
export const Batch = model<BatchDocument>("Batch", BatchSchema);
