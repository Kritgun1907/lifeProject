/**
 * ===============================================
 * AUDIT SERVICE
 * ===============================================
 * Service for creating and querying audit logs.
 * 
 * Usage in controllers/services:
 * ```typescript
 * import { auditService, AUDIT_ACTIONS, AUDIT_SEVERITY } from "../services/audit.service";
 * 
 * await auditService.log({
 *   action: AUDIT_ACTIONS.ROLE_CHANGED,
 *   performedBy: adminId,
 *   performerRole: "ADMIN",
 *   targetModel: "User",
 *   targetId: userId,
 *   description: `Admin changed user role from ${oldRole} to ${newRole}`,
 *   previousState: { role: oldRole },
 *   newState: { role: newRole },
 *   severity: AUDIT_SEVERITY.CRITICAL,
 *   requestContext: { requestId, ip, userAgent },
 * });
 * ```
 */

import { Types } from "mongoose";
import {
  AuditLog,
  AuditLogDocument,
  AUDIT_ACTIONS,
  AUDIT_SEVERITY,
  AuditAction,
  AuditSeverity,
} from "../models/AuditLog.model";

// Re-export for convenience
export { AUDIT_ACTIONS, AUDIT_SEVERITY };
export type { AuditAction, AuditSeverity };

// Input type for creating audit logs
export interface CreateAuditLogInput {
  action: AuditAction | string;
  performedBy: string | Types.ObjectId;
  performerRole: string;
  targetModel: string;
  targetId?: string | Types.ObjectId;
  description: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
  severity?: AuditSeverity;
  requestContext?: {
    requestId?: string;
    ip?: string;
    userAgent?: string;
  };
}

// Query filters for retrieving audit logs
export interface AuditLogFilters {
  performedBy?: string;
  targetModel?: string;
  targetId?: string;
  action?: string | string[];
  severity?: AuditSeverity | AuditSeverity[];
  fromDate?: Date;
  toDate?: Date;
}

class AuditService {
  /**
   * Create an audit log entry
   * This is the primary method for logging actions
   */
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await AuditLog.create({
        action: input.action,
        severity: input.severity || AUDIT_SEVERITY.INFO,
        performedBy: new Types.ObjectId(input.performedBy.toString()),
        performerRole: input.performerRole,
        targetModel: input.targetModel,
        targetId: input.targetId ? new Types.ObjectId(input.targetId.toString()) : undefined,
        description: input.description,
        previousState: input.previousState,
        newState: input.newState,
        metadata: input.metadata,
        requestContext: input.requestContext,
      });
    } catch (error) {
      // Don't throw - audit failures shouldn't break the main operation
      console.error("[AUDIT ERROR] Failed to create audit log:", error);
    }
  }

  /**
   * Log a critical security event
   * Convenience method for security-sensitive actions
   */
  async logCritical(input: Omit<CreateAuditLogInput, "severity">): Promise<void> {
    await this.log({ ...input, severity: AUDIT_SEVERITY.CRITICAL });
  }

  /**
   * Log a warning event
   */
  async logWarning(input: Omit<CreateAuditLogInput, "severity">): Promise<void> {
    await this.log({ ...input, severity: AUDIT_SEVERITY.WARNING });
  }

  /**
   * Query audit logs with filters and pagination
   */
  async query(
    filters: AuditLogFilters,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    logs: AuditLogDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {};

    if (filters.performedBy) {
      query.performedBy = new Types.ObjectId(filters.performedBy);
    }

    if (filters.targetModel) {
      query.targetModel = filters.targetModel;
    }

    if (filters.targetId) {
      query.targetId = new Types.ObjectId(filters.targetId);
    }

    if (filters.action) {
      if (Array.isArray(filters.action)) {
        query.action = { $in: filters.action };
      } else {
        query.action = filters.action;
      }
    }

    if (filters.severity) {
      if (Array.isArray(filters.severity)) {
        query.severity = { $in: filters.severity };
      } else {
        query.severity = filters.severity;
      }
    }

    if (filters.fromDate || filters.toDate) {
      query.createdAt = {};
      if (filters.fromDate) {
        query.createdAt.$gte = filters.fromDate;
      }
      if (filters.toDate) {
        query.createdAt.$lte = filters.toDate;
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate("performedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      logs: logs as AuditLogDocument[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityHistory(
    model: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditLogDocument[]> {
    const logs = await AuditLog.find({
      targetModel: model,
      targetId: new Types.ObjectId(entityId),
    })
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs as AuditLogDocument[];
  }

  /**
   * Get all actions performed by a user
   */
  async getUserActions(
    userId: string,
    fromDate?: Date,
    limit: number = 100
  ): Promise<AuditLogDocument[]> {
    const query: Record<string, any> = {
      performedBy: new Types.ObjectId(userId),
    };

    if (fromDate) {
      query.createdAt = { $gte: fromDate };
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs as AuditLogDocument[];
  }

  /**
   * Get critical security events
   */
  async getCriticalEvents(
    fromDate?: Date,
    limit: number = 100
  ): Promise<AuditLogDocument[]> {
    const query: Record<string, any> = {
      severity: AUDIT_SEVERITY.CRITICAL,
    };

    if (fromDate) {
      query.createdAt = { $gte: fromDate };
    }

    const logs = await AuditLog.find(query)
      .populate("performedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return logs as AuditLogDocument[];
  }

  /**
   * Get audit stats summary
   */
  async getStats(fromDate: Date): Promise<{
    total: number;
    byAction: Record<string, number>;
    bySeverity: Record<string, number>;
    byModel: Record<string, number>;
  }> {
    const [total, actionStats, severityStats, modelStats] = await Promise.all([
      AuditLog.countDocuments({ createdAt: { $gte: fromDate } }),
      
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: fromDate } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]),
      
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: fromDate } } },
        { $group: { _id: "$severity", count: { $sum: 1 } } },
      ]),
      
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: fromDate } } },
        { $group: { _id: "$targetModel", count: { $sum: 1 } } },
      ]),
    ]);

    const byAction: Record<string, number> = {};
    actionStats.forEach((s: any) => {
      byAction[s._id] = s.count;
    });

    const bySeverity: Record<string, number> = {};
    severityStats.forEach((s: any) => {
      bySeverity[s._id] = s.count;
    });

    const byModel: Record<string, number> = {};
    modelStats.forEach((s: any) => {
      byModel[s._id] = s.count;
    });

    return { total, byAction, bySeverity, byModel };
  }
}

// Singleton instance
export const auditService = new AuditService();
export default auditService;
