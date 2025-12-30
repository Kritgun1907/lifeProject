/**
 * ===============================================
 * ADMIN ROLES SERVICE
 * ===============================================
 * Business logic for role and permission management.
 */

import { Role } from "../../../models/Role.model";
import { Permission } from "../../../models/Permission.model";
import { User } from "../../../models/User.model";
import { NotFoundError, ValidationError } from "../../../errors";

// ===============================================
// ROLE OPERATIONS
// ===============================================

/**
 * List all roles
 */
export async function listRoles() {
  const roles = await Role.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  return roles.map((r) => ({
    _id: r._id,
    name: r.name,
    permissions: r.permissions,
    permissionCount: r.permissions?.length || 0,
  }));
}

/**
 * Get role by ID with user count
 */
export async function getRoleById(roleId: string) {
  const role = await Role.findById(roleId).lean();

  if (!role) {
    throw new NotFoundError("Role", roleId);
  }

  const userCount = await User.countDocuments({
    role: roleId,
    isDeleted: false,
  });

  return {
    ...role,
    userCount,
  };
}

/**
 * Get role by name
 */
export async function getRoleByName(name: string) {
  const role = await Role.findOne({ name: name.toUpperCase() }).lean();

  if (!role) {
    throw new NotFoundError("Role", name);
  }

  return role;
}

/**
 * Update role permissions
 */
export async function updateRolePermissions(roleId: string, permissions: string[]) {
  // Validate all permissions exist
  const validPermissions = await Permission.find({
    name: { $in: permissions },
    isActive: true,
  }).lean();

  if (validPermissions.length !== permissions.length) {
    const validNames = validPermissions.map((p) => p.name);
    const invalid = permissions.filter((p) => !validNames.includes(p));
    throw new ValidationError(`Invalid permissions: ${invalid.join(", ")}`);
  }

  const role = await Role.findByIdAndUpdate(
    roleId,
    { permissions },
    { new: true }
  );

  if (!role) {
    throw new NotFoundError("Role", roleId);
  }

  // Note: Users with this role need to re-login to get new permissions
  // We could optionally invalidate all their tokens here

  return role;
}

/**
 * Add permission to role
 */
export async function addPermissionToRole(roleId: string, permission: string) {
  // Validate permission exists
  const perm = await Permission.findOne({ name: permission, isActive: true });
  if (!perm) {
    throw new NotFoundError("Permission", permission);
  }

  const role = await Role.findByIdAndUpdate(
    roleId,
    { $addToSet: { permissions: permission } },
    { new: true }
  );

  if (!role) {
    throw new NotFoundError("Role", roleId);
  }

  return role;
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(roleId: string, permission: string) {
  const role = await Role.findByIdAndUpdate(
    roleId,
    { $pull: { permissions: permission } },
    { new: true }
  );

  if (!role) {
    throw new NotFoundError("Role", roleId);
  }

  return role;
}

// ===============================================
// PERMISSION OPERATIONS
// ===============================================

/**
 * List all permissions
 */
export async function listPermissions() {
  const permissions = await Permission.find({ isActive: true })
    .sort({ name: 1 })
    .lean();

  // Group by category (first part of permission name)
  const grouped: Record<string, any[]> = {};

  permissions.forEach((p) => {
    const category = p.name.split(":")[0];
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      _id: p._id,
      name: p.name,
      description: p.description,
    });
  });

  return {
    permissions,
    grouped,
    total: permissions.length,
  };
}

/**
 * Get permission by name
 */
export async function getPermissionByName(name: string) {
  const permission = await Permission.findOne({ name }).lean();

  if (!permission) {
    throw new NotFoundError("Permission", name);
  }

  // Find roles that have this permission
  const roles = await Role.find({
    permissions: name,
    isActive: true,
  }).select("name").lean();

  return {
    ...permission,
    roles: roles.map((r) => r.name),
  };
}

// ===============================================
// ROLE STATISTICS
// ===============================================

/**
 * Get role distribution stats
 */
export async function getRoleStats() {
  const stats = await User.aggregate([
    { $match: { isDeleted: false } },
    {
      $lookup: {
        from: "roles",
        localField: "role",
        foreignField: "_id",
        as: "roleInfo",
      },
    },
    { $unwind: "$roleInfo" },
    {
      $group: {
        _id: "$roleInfo.name",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const total = stats.reduce((sum, s) => sum + s.count, 0);

  return {
    distribution: stats.map((s) => ({
      role: s._id,
      count: s.count,
      percentage: Math.round((s.count / total) * 100),
    })),
    total,
  };
}
