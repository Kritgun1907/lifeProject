import { Schema, model, InferSchemaType } from "mongoose";

/**
 * Permission Model - For tracking and auditing permissions
 * This is optional but useful for enterprise systems
 */
const PermissionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        'PROFILE',
        'STUDENT',
        'TEACHER',
        'BATCH',
        'ATTENDANCE',
        'BATCH_CHANGE',
        'ANNOUNCEMENT',
        'PRACTICE',
        'ZOOM',
        'ANALYTICS',
        'SYSTEM',
      ],
      required: true,
    },

    description: {
      type: String,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
PermissionSchema.index({ code: 1 });
PermissionSchema.index({ category: 1 });
PermissionSchema.index({ isActive: 1 });

export type PermissionDocument = InferSchemaType<typeof PermissionSchema>;
export const Permission = model<PermissionDocument>("Permission", PermissionSchema);
