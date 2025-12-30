import { Schema, model, InferSchemaType } from "mongoose";


const BatchStudentSchema = new Schema(
  {
    batch: { 
        type: Schema.Types.ObjectId, 
        ref: 'Batch', 
        required: true 
    },

    student: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    joinedAt: { 
        type: Date, 
        default: Date.now 
    },

    isDeleted: {
        type: Boolean,
        default: false
    }
  },
  { timestamps: false }
);

BatchStudentSchema.index({ batch: 1, student: 1 }, { unique: true });

export type BatchStudentDocument = InferSchemaType<typeof BatchStudentSchema>;
export const BatchStudent = model<BatchStudentDocument>("BatchStudent", BatchStudentSchema);
