import { Schema, model, InferSchemaType} from "mongoose";
import { ENROLLMENT_STATUS } from '../constants/enums';


const StudentEnrollmentSchema = new Schema(
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

    classPlan: { 
        type: Schema.Types.ObjectId, 
        ref: 'ClassPlan', 
        required: true 
    },

    startDate: { 
        type: Date, 
        required: true 
    },

    endDate: { 
        type: Date,
        required: true
    },

    status: {
      type: String,
      enum: ENROLLMENT_STATUS as readonly string[],
      default: 'ACTIVE',
    },

    payment: { 
        type: Schema.Types.ObjectId, 
        ref: 'Payment' 
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

// Unique constraint: student can't enroll in same batch twice
StudentEnrollmentSchema.index({ student: 1, batch: 1 }, { unique: true });

// Performance indexes
StudentEnrollmentSchema.index({ student: 1 });
StudentEnrollmentSchema.index({ batch: 1 });
StudentEnrollmentSchema.index({ status: 1 });
StudentEnrollmentSchema.index({ startDate: 1 });
StudentEnrollmentSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
StudentEnrollmentSchema.index({ student: 1, status: 1 }); // Student's active enrollments
StudentEnrollmentSchema.index({ batch: 1, status: 1 }); // Batch's active students
StudentEnrollmentSchema.index({ student: 1, isDeleted: 1 }); // Student's non-deleted enrollments

StudentEnrollmentSchema.pre("validate", function () {
  if (this.endDate <= this.startDate) {
    throw new Error("endDate must be after startDate");
  }
});

export type StudentEnrollmentDocument = InferSchemaType<typeof StudentEnrollmentSchema>;
export const StudentEnrollment = model<StudentEnrollmentDocument>("StudentEnrollment", StudentEnrollmentSchema);
