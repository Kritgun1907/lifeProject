import { Schema, model, InferSchemaType } from "mongoose";

const workingTimingsSchema = new Schema(
  {
    time_range: {
      type: String,
      required: true // "09:00 - 10:00"
    },

    start_time: {
      type: String,
      required: true // "09:00"
    },

    end_time: {
      type: String,
      required: true // "10:00"
    },

    is_active: {
      type: Boolean,
      default: true
    },

    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export type WorkingTimingsDocument = InferSchemaType<typeof workingTimingsSchema>;
export const WorkingTimings = model<WorkingTimingsDocument>("WorkingTiming", workingTimingsSchema);