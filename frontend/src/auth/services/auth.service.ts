/**
 * ===============================================
 * AUTH SERVICE
 * ===============================================
 * Pure API communication for authentication.
 * 
 * Rules:
 * - NO routing logic
 * - NO toast/notifications
 * - NO state management
 * - Just clean API calls that return promises
 * 
 * Think of this as a "backend SDK for auth"
 * Matches backend routes 1:1
 */

import { apiClient, tokenManager, ApiResponse } from "../lib/api";

// ===============================================
// TYPES (matches backend response exactly)
// ===============================================

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  permissions: string[];
  status?: string;
}

export type UserRole = "ADMIN" | "TEACHER" | "STUDENT" | "GUEST";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  mobile: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface ProfileUpdateData {
  name?: string;
  mobile?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

// ===============================================
// AUTH SERVICE
// Matches backend routes: /api/auth/*
// ===============================================

export const authService = {
  /**
   * POST /auth/login
   * Login with email and password
   * Sets access token in localStorage
   * Refresh token is set as httpOnly cookie by backend
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", credentials);
    
    // Extract token (backend returns it at root level)
    const token = (response as any).token || response.data?.token;
    const user = (response as any).user || response.data?.user;
    
    if (token) {
      tokenManager.setAccessToken(token);
    }

    return {
      success: true,
      message: (response as any).message || "Login successful",
      token,
      user,
    };
  },

  /**
   * POST /auth/register
   * Register a new user (becomes GUEST by default)
   * Sets access token in localStorage
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    
    const token = (response as any).token || response.data?.token;
    const user = (response as any).user || response.data?.user;
    
    if (token) {
      tokenManager.setAccessToken(token);
    }

    return {
      success: true,
      message: (response as any).message || "Registration successful",
      token,
      user,
    };
  },

  /**
   * POST /auth/logout
   * Logout current user
   * Clears access token from localStorage
   * Backend clears refresh token cookie
   */
  logout: async (everywhere: boolean = false): Promise<void> => {
    try {
      await apiClient.post("/auth/logout", { everywhere });
    } catch (error) {
      // Even if logout fails on server, clear local token
      console.warn("Logout request failed, clearing local token anyway");
    } finally {
      tokenManager.removeAccessToken();
    }
  },

  /**
   * POST /auth/refresh
   * Refresh access token using httpOnly cookie
   * 
   * NOTE: Usually handled automatically by api.ts interceptor on 401.
   * This method exists for edge cases where manual refresh is needed.
   * The interceptor already handles token storage, so we skip it here.
   */
  refresh: async (): Promise<{ token: string }> => {
    const response = await apiClient.post<{ token: string }>("/auth/refresh");
    const token = (response as any).token || response.data?.token;
    // Token storage is handled by api.ts interceptor, no need to duplicate
    return { token };
  },

  /**
   * GET /auth/me
   * Get current user profile
   * Used to verify token and get user data on app load
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>("/auth/me");
    return response.data as User;
  },

  /**
   * PATCH /auth/profile
   * Update own profile (limited fields: name, mobile)
   */
  updateProfile: async (data: ProfileUpdateData): Promise<User> => {
    const response = await apiClient.patch<User>("/auth/profile", data);
    return response.data as User;
  },

  /**
   * POST /auth/change-password
   * Change own password
   * User will need to re-login after this
   */
  changePassword: async (data: PasswordChangeData): Promise<void> => {
    await apiClient.post("/auth/change-password", data);
    // Backend clears refresh token, so clear access token too
    tokenManager.removeAccessToken();
  },

  /**
   * Check if user has access token (quick sync check)
   * Does NOT validate token - just checks if it exists
   */
  hasToken: (): boolean => {
    return tokenManager.hasAccessToken();
  },

  /**
   * Get the current access token
   * Used for debugging or special cases
   */
  getToken: (): string | null => {
    return tokenManager.getAccessToken();
  },
};

// ===============================================
// ROLE HELPERS
// Frontend only uses role for routing/UI
// Backend enforces actual permissions
// ===============================================

export const roleHelpers = {
  /**
   * Check if role is admin
   */
  isAdmin: (role: UserRole): boolean => role === "ADMIN",

  /**
   * Check if role is teacher
   */
  isTeacher: (role: UserRole): boolean => role === "TEACHER",

  /**
   * Check if role is student
   */
  isStudent: (role: UserRole): boolean => role === "STUDENT",

  /**
   * Check if role is guest
   */
  isGuest: (role: UserRole): boolean => role === "GUEST",

  /**
   * Get the dashboard path for a role
   */
  getDashboardPath: (role: UserRole): string => {
    switch (role) {
      case "ADMIN":
        return "/admin";
      case "TEACHER":
        return "/teacher";
      case "STUDENT":
        return "/student";
      case "GUEST":
        return "/public";
      default:
        return "/";
    }
  },

  /**
   * Get role display name
   */
  getRoleDisplayName: (role: UserRole): string => {
    switch (role) {
      case "ADMIN":
        return "Administrator";
      case "TEACHER":
        return "Teacher";
      case "STUDENT":
        return "Student";
      case "GUEST":
        return "Guest";
      default:
        return "Unknown";
    }
  },
};

export default authService;
