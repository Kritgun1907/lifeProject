import { Schema, model, InferSchemaType } from "mongoose";
import { ROLES } from "../constants/enums";

const roleSchema = new Schema(
  {
    name: { 
      type: String, 
      enum: ROLES as readonly string[], 
      unique: true, 
      required: true 
    },

    permissions: {
      type: [String],
      default: [],
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
roleSchema.index({ name: 1 });
roleSchema.index({ isActive: 1 });

// Instance method to check if role has a permission
roleSchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission);
};

// Static method to get role by name with permissions
roleSchema.statics.findByNameWithPermissions = function(roleName: string) {
  return this.findOne({ name: roleName, isActive: true });
};

export type RoleDocument = InferSchemaType<typeof roleSchema>;
export const Role = model<RoleDocument>("Role", roleSchema);