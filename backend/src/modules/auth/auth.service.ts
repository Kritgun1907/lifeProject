/**
 * ===============================================
 * AUTH SERVICE (MODULE VERSION)
 * ===============================================
 * Core business logic for authentication.
 * Migrated from /services/auth.service.ts with improved structure.
 */

import bcrypt from "bcryptjs";
import { User } from "../../models/User.model";
import { Role } from "../../models/Role.model";
import { Status } from "../../models/Status.model";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import { ValidationError, NotFoundError, AuthenticationError, AuthorizationError } from "../../errors";

// ===============================================
// TYPES
// ===============================================

interface RegisterData {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: string;
  permissions: string[];
  status: string;
}

// ===============================================
// TOKEN OPERATIONS
// ===============================================

/**
 * Issue both access and refresh tokens for a user
 */
export async function issueTokens(user: any): Promise<TokenPair> {
  await user.populate("role");

  const userRole = user.role as any;

  if (!userRole) {
    throw new NotFoundError("Role", "user.role");
  }

  const permissions = userRole.permissions || [];
  const tokenVersion = user.tokenVersion || 0;

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: userRole.name,
    permissions,
    tokenVersion,
  });

  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    tokenVersion,
  });

  return { accessToken, refreshToken };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair> {
  let payload: { sub: string; tokenVersion: number };

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  const user = await User.findById(payload.sub)
    .populate("role")
    .populate("status");

  if (!user) {
    throw new NotFoundError("User", payload.sub);
  }

  // Validate token version
  if ((user as any).tokenVersion !== payload.tokenVersion) {
    throw new AuthenticationError("Token has been invalidated. Please login again.");
  }

  // Check user status
  const userRole = user.role as any;
  const status = user.status as any;

  if (!userRole || !userRole.isActive) {
    throw new AuthorizationError("User role is inactive");
  }

  if (status && status.name !== "ACTIVE") {
    throw new AuthorizationError(`Account is ${status.name}`);
  }

  return issueTokens(user);
}

/**
 * Invalidate all tokens for a user (logout everywhere)
 */
export async function invalidateAllTokens(userId: string): Promise<void> {
  const result = await User.findByIdAndUpdate(userId, {
    $inc: { tokenVersion: 1 },
  });

  if (!result) {
    throw new NotFoundError("User", userId);
  }
}

// ===============================================
// USER REGISTRATION & LOGIN
// ===============================================

/**
 * Register new user (GUEST by default)
 */
export async function registerUser(data: RegisterData) {
  const { name, email, mobile, password } = data;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { mobile }],
    isDeleted: false,
  });

  if (existingUser) {
    throw new ValidationError("User already exists with this email or mobile");
  }

  // Get GUEST role
  const guestRole = await Role.findOne({ name: "GUEST", isActive: true });
  if (!guestRole) {
    throw new NotFoundError("Role", "GUEST");
  }

  // Get ACTIVE status
  const activeStatus = await Status.findOne({ name: "ACTIVE" });
  if (!activeStatus) {
    throw new NotFoundError("Status", "ACTIVE");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    name,
    email,
    mobile,
    password: hashedPassword,
    role: guestRole._id,
    status: activeStatus._id,
    isDeleted: false,
  });

  await user.populate("role");
  await user.populate("status");

  return user;
}

/**
 * Login user and verify credentials
 */
export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email, isDeleted: false })
    .select("+password")
    .populate("role")
    .populate("status");

  if (!user || !user.password) {
    throw new AuthenticationError("Invalid credentials");
  }

  const userRole = user.role as any;
  if (!userRole || !userRole.isActive) {
    throw new AuthorizationError("Your role is inactive. Contact administrator.");
  }

  const status = user.status as any;
  if (status.name !== "ACTIVE") {
    throw new AuthorizationError(`Account is ${status.name}. Contact administrator.`);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError("Invalid credentials");
  }

  return user;
}

// ===============================================
// PROFILE OPERATIONS
// ===============================================

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await User.findById(userId)
    .populate("role")
    .populate("status")
    .select("-password");

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  const userRole = user.role as any;
  const userStatus = user.status as any;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    mobile: user.mobile || undefined,
    role: userRole.name,
    permissions: userRole.permissions,
    status: userStatus.name,
  };
}

/**
 * Update user's own profile (limited fields)
 */
export async function updateOwnProfile(
  userId: string,
  updates: { name?: string; mobile?: string }
) {
  const allowedUpdates: Record<string, any> = {};

  if (updates.name) allowedUpdates.name = updates.name;
  if (updates.mobile) {
    // Validate mobile format
    if (!/^[0-9]{10}$/.test(updates.mobile)) {
      throw new ValidationError("Mobile number must be 10 digits");
    }
    allowedUpdates.mobile = updates.mobile;
  }

  if (Object.keys(allowedUpdates).length === 0) {
    throw new ValidationError("No valid update fields provided");
  }

  const user = await User.findByIdAndUpdate(userId, allowedUpdates, { new: true })
    .populate("role")
    .populate("status")
    .select("-password");

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return user;
}

/**
 * Change user's own password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  // Verify current password
  const isValid = await bcrypt.compare(currentPassword, user.password!);
  if (!isValid) {
    throw new AuthenticationError("Current password is incorrect");
  }

  // Validate new password
  if (newPassword.length < 4) {
    throw new ValidationError("New password must be at least 4 characters");
  }

  // Hash and save new password
  user.password = await bcrypt.hash(newPassword, 12);
  
  // Invalidate other sessions
  (user as any).tokenVersion = ((user as any).tokenVersion || 0) + 1;
  
  await user.save();

  return { success: true };
}

// ===============================================
// ROLE MANAGEMENT (used by admin)
// ===============================================

/**
 * Update user role (admin operation)
 */
export async function updateUserRole(userId: string, newRoleId: string) {
  const role = await Role.findById(newRoleId);
  if (!role) {
    throw new NotFoundError("Role", newRoleId);
  }

  const user = await User.findByIdAndUpdate(
    userId,
    {
      role: newRoleId,
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  )
    .populate("role", "name permissions")
    .populate("status", "name");

  if (!user) {
    throw new NotFoundError("User", userId);
  }

  return user;
}
