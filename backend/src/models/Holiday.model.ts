import { Schema, model, InferSchemaType } from "mongoose";

const HolidaySchema = new Schema(
  {
    date: { 
      type: Date, 
      required: true 
    },

    batch: { 
      type: Schema.Types.ObjectId, 
      ref: 'Batch', 
      required: true 
    },

    appliedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },

    appliedByRole: {
      type: String,
      enum: ['ADMIN', 'TEACHER'],
      required: true,
    },

    reason: { 
      type: String, 
      required: true 
    },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
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
HolidaySchema.index({ batch: 1, date: 1 });
HolidaySchema.index({ batch: 1 });
HolidaySchema.index({ appliedBy: 1 });
HolidaySchema.index({ status: 1 });
HolidaySchema.index({ date: 1 });
HolidaySchema.index({ isDeleted: 1 });

// Compound indexes for common queries
HolidaySchema.index({ batch: 1, status: 1 }); // Batch holidays by status
HolidaySchema.index({ status: 1, date: 1 }); // Pending holidays by date
HolidaySchema.index({ batch: 1, date: 1, status: 1 }); // Batch holidays by date and status

export type HolidayDocument = InferSchemaType<typeof HolidaySchema>;
export const Holiday = model<HolidayDocument>("Holiday", HolidaySchema);
