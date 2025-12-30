import { Schema, model, InferSchemaType } from 'mongoose';

const StudentBatchApplicationSchema = new Schema(
  {
    guestUser: { 
        type: Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },

    preferredInstrument: { 
        type: Schema.Types.ObjectId, 
        ref: 'Instrument', 
        required: true 
    },

    preferredDay: { 
        type: Schema.Types.ObjectId, 
        ref: 'WorkingDay', 
        required: true 
    },

    preferredTiming: { 
        type: Schema.Types.ObjectId, 
        ref: 'WorkingTiming', 
        required: true 
    },

    mode: { 
        type: String, 
        enum: ['ONLINE', 'OFFLINE'], 
        required: true 
    },

    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },

    assignedBatch: { 
        type: Schema.Types.ObjectId, 
        ref: 'Batch' 
    },
    handledBy: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
  },
  { timestamps: true }
);

export type StudentBatchApplicationDocument = InferSchemaType<typeof StudentBatchApplicationSchema>;
export const StudentBatchApplication = model<StudentBatchApplicationDocument>("StudentBatchApplication", StudentBatchApplicationSchema);
