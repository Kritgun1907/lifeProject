import { Schema, model, InferSchemaType } from "mongoose";

const PaymentSchema = new Schema(
  {
    student: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },

    batch: {
      type: Schema.Types.ObjectId,
      ref: 'Batch',
    },

    classPlan: {
      type: Schema.Types.ObjectId,
      ref: 'ClassPlan',
    },

    amount: { 
      type: Number, 
      required: true, 
      min: 0 
    },

    paymentMethod: { 
      type: String, 
      required: true 
    },

    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
    },

    transactionId: { 
      type: String,
      unique: true,
      sparse: true, // allows null but enforces uniqueness when present
    },

    paidAt: { 
      type: Date 
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
PaymentSchema.index({ student: 1 });
PaymentSchema.index({ batch: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ isDeleted: 1 });

// Compound indexes for common queries
PaymentSchema.index({ student: 1, createdAt: -1 }); // Student payment history
PaymentSchema.index({ student: 1, status: 1 }); // Student payments by status
PaymentSchema.index({ batch: 1, status: 1 }); // Batch payments by status
PaymentSchema.index({ student: 1, batch: 1 }); // Student payments for specific batch

export type PaymentDocument = InferSchemaType<typeof PaymentSchema>;
export const Payment = model<PaymentDocument>("Payment", PaymentSchema);
