import { Schema, model, InferSchemaType } from "mongoose";
import { CLASS_PLAN_CODES } from "../constants/enums";

const ClassPlanSchema = new Schema(
  {
    code: {
      type: String,
      enum: CLASS_PLAN_CODES as readonly string[],
      required: true,
      unique: true,
    },
    durationDays: {
      type: Number,
      required: true,
      min: 1,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export type ClassPlanDocument = InferSchemaType<typeof ClassPlanSchema>;
export const ClassPlan = model<ClassPlanDocument>("ClassPlan", ClassPlanSchema);
