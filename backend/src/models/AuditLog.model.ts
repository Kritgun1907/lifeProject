/**
 * ===============================================
 * AUDIT LOG MODEL
 * ===============================================
 * Security-grade logging for critical actions:
 * - Role changes
 * - Batch reassignment
 * - Holiday approval/rejection
 * - Attendance overrides
 * - Admin actions
 * - User status changes
 * 
 * This creates an immutable audit trail for compliance and debugging.
 */

import { Schema, model, InferSchemaType, Types } from "mongoose";

// Audit action categories
export const AUDIT_ACTIONS = {
  // User Management
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DELETED: "USER_DELETED",
  USER_ARCHIVED: "USER_ARCHIVED",
  USER_RESTORED: "USER_RESTORED",
  USER_STATUS_CHANGED: "USER_STATUS_CHANGED",
  
  // Role Management
  ROLE_ASSIGNED: "ROLE_ASSIGNED",
  ROLE_CHANGED: "ROLE_CHANGED",
  ROLE_REMOVED: "ROLE_REMOVED",
  
  // Batch Management
  BATCH_CREATED: "BATCH_CREATED",
  BATCH_UPDATED: "BATCH_UPDATED",
  BATCH_DELETED: "BATCH_DELETED",
  STUDENT_ADDED_TO_BATCH: "STUDENT_ADDED_TO_BATCH",
  STUDENT_REMOVED_FROM_BATCH: "STUDENT_REMOVED_FROM_BATCH",
  BATCH_REASSIGNED: "BATCH_REASSIGNED",
  
  // Batch Change Requests
  BATCH_CHANGE_REQUESTED: "BATCH_CHANGE_REQUESTED",
  BATCH_CHANGE_APPROVED: "BATCH_CHANGE_APPROVED",
  BATCH_CHANGE_REJECTED: "BATCH_CHANGE_REJECTED",
  BATCH_CHANGE_ADMIN_OVERRIDE: "BATCH_CHANGE_ADMIN_OVERRIDE",
  
  // Holiday Management
  HOLIDAY_CREATED: "HOLIDAY_CREATED",
  HOLIDAY_APPROVED: "HOLIDAY_APPROVED",
  HOLIDAY_REJECTED: "HOLIDAY_REJECTED",
  HOLIDAY_DELETED: "HOLIDAY_DELETED",
  
  // Attendance
  ATTENDANCE_MARKED: "ATTENDANCE_MARKED",
  ATTENDANCE_UPDATED: "ATTENDANCE_UPDATED",
  ATTENDANCE_OVERRIDE: "ATTENDANCE_OVERRIDE",
  
  // Announcements
  ANNOUNCEMENT_CREATED: "ANNOUNCEMENT_CREATED",
  ANNOUNCEMENT_UPDATED: "ANNOUNCEMENT_UPDATED",
  ANNOUNCEMENT_DELETED: "ANNOUNCEMENT_DELETED",
  
  // Payments
  PAYMENT_RECORDED: "PAYMENT_RECORDED",
  PAYMENT_UPDATED: "PAYMENT_UPDATED",
  PAYMENT_VOIDED: "PAYMENT_VOIDED",
  
  // System
  SYSTEM_CONFIG_CHANGED: "SYSTEM_CONFIG_CHANGED",
  BULK_OPERATION: "BULK_OPERATION",
  DATA_EXPORT: "DATA_EXPORT",
  DATA_IMPORT: "DATA_IMPORT",
  
  // Authentication
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET: "PASSWORD_RESET",
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

// Severity levels for filtering/alerting
export const AUDIT_SEVERITY = {
  INFO: "INFO",       // Regular actions
  WARNING: "WARNING", // Unusual but not critical
  CRITICAL: "CRITICAL", // Security-sensitive actions
} as const;

export type AuditSeverity = typeof AUDIT_SEVERITY[keyof typeof AUDIT_SEVERITY];

const auditLogSchema = new Schema(
  {
    // What happened
    action: {
      type: String,
      required: true,
      index: true,
    },
    
    // Severity level
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITY),
      default: AUDIT_SEVERITY.INFO,
      index: true,
    },
    
    // Who did it
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    
    // What role they had when doing it
    performerRole: {
      type: String,
      required: true,
    },
    
    // What was affected (entity type)
    targetModel: {
      type: String,
      required: true,
      index: true,
    },
    
    // ID of affected entity
    targetId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    
    // Human-readable description
    description: {
      type: String,
      required: true,
    },
    
    // Before state (for updates)
    previousState: {
      type: Schema.Types.Mixed,
    },
    
    // After state (for updates)
    newState: {
      type: Schema.Types.Mixed,
    },
    
    // Additional metadata
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    
    // Request context for tracing
    requestContext: {
      requestId: String,
      ip: String,
      userAgent: String,
    },
  },
  {
    timestamps: true,
    // Audit logs should be immutable - no updates
    strict: true,
  }
);

// Compound indexes for common queries
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// TTL index to auto-delete old logs after 1 year (optional, remove if you want to keep forever)
// auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export type AuditLogDocument = InferSchemaType<typeof auditLogSchema>;
export const AuditLog = model<AuditLogDocument>("AuditLog", auditLogSchema);
