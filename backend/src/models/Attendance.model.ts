import { Schema, model, InferSchemaType } from "mongoose";

const AttendanceSchema = new Schema(
  {
    student: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },

    batch: { 
      type: Schema.Types.ObjectId, 
      ref: 'Batch', 
      required: true 
    },

    status: { 
      type: String, 
      enum: ['PRESENT', 'ABSENT'], 
      required: true 
    },

    date: { 
      type: Date, 
      required: true 
    },

    markedBy: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
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

// Indexes for performance
AttendanceSchema.index({ student: 1, batch: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ student: 1 });
AttendanceSchema.index({ batch: 1 });
AttendanceSchema.index({ createdAt: -1 });
AttendanceSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
AttendanceSchema.index({ batch: 1, date: 1 }); // Batch attendance by date
AttendanceSchema.index({ student: 1, date: -1 }); // Student attendance history
AttendanceSchema.index({ batch: 1, status: 1 }); // Batch attendance by status (PRESENT/ABSENT)

export type AttendanceDocument = InferSchemaType<typeof AttendanceSchema>;
export const Attendance = model<AttendanceDocument>("Attendance", AttendanceSchema);
