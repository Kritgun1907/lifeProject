import { Schema, model, InferSchemaType } from "mongoose";

const workingDaySchema = new Schema(
  {
    name: {
      type: String,
      required: true // "Mon-Wed-Fri", "Tue-Thu-Sat"
    },

    daysArray: {
      type: [String],
      required: true, // schedule depends on this
      enum: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
    },

    isActive: {
      type: Boolean,
      default: true
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export type DayCode = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export type WorkingDayDocument = InferSchemaType<typeof workingDaySchema>;
export const WorkingDay = model<WorkingDayDocument>("WorkingDay", workingDaySchema);

