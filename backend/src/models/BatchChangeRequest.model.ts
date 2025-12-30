import { Schema, model, InferSchemaType } from 'mongoose';

const BatchChangeRequestSchema = new Schema(
  {
    student: { 
        type: Schema.Types.ObjectId,
        ref: 'User', 
        required: true 
    },

    fromBatch: { 
        type: Schema.Types.ObjectId, 
        ref: 'Batch', 
        required: true 
    },

    toBatch: { 
        type: Schema.Types.ObjectId, 
        ref: 'Batch', 
        required: true 
    },

    reason: { 
        type: String, 
        required: true 
    },

    fromTeacherApproval: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },

    toTeacherApproval: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },

    finalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },

    finalizedBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
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
BatchChangeRequestSchema.index({ student: 1 });
BatchChangeRequestSchema.index({ fromBatch: 1 });
BatchChangeRequestSchema.index({ toBatch: 1 });
BatchChangeRequestSchema.index({ finalStatus: 1 });
BatchChangeRequestSchema.index({ createdAt: -1 });
BatchChangeRequestSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
BatchChangeRequestSchema.index({ student: 1, finalStatus: 1 }); // Student's requests by status
BatchChangeRequestSchema.index({ fromBatch: 1, finalStatus: 1 }); // Batch requests by status
BatchChangeRequestSchema.index({ toBatch: 1, finalStatus: 1 }); // Incoming requests by status
BatchChangeRequestSchema.index({ student: 1, createdAt: -1 }); // Student's request history

BatchChangeRequestSchema.pre("validate", function () {
  if (this.fromBatch.equals(this.toBatch)) {
    throw new Error("fromBatch and toBatch cannot be the same");
  }
});

export type BatchChangeRequestDocument = InferSchemaType<typeof BatchChangeRequestSchema>;
export const BatchChangeRequest = model<BatchChangeRequestDocument>("BatchChangeRequest", BatchChangeRequestSchema);
