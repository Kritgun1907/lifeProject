import { Schema, model, InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { 
      type: String, 
      required: true 
    },

    email: { 
      type: String, 
      required: true,
      lowercase: true
    },

    mobile: { 
      type: String 
    },

    password: {
      type: String,
      select: false,
      required: function (this: any): boolean {
      return this.authProvider === "local";
  },
},


    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
      required: true
    },

    oauthId: {
      type: String,
      index: true
    },

    role: { 
      type: Schema.Types.ObjectId, 
      ref: "Role", 
      required: true 
    },

    status: { 
      type: Schema.Types.ObjectId, 
      ref: "Status", 
      required: true 
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
    },

    // Token versioning for forced logout / token invalidation
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Refresh token hash (for single-device logout)
    refreshTokenHash: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ mobile: 1 }, { unique: true, sparse: true });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ isDeleted: 1 });
userSchema.index({ authProvider: 1, oauthId: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model<UserDocument>("User", userSchema);
