/**
 * ===============================================
 * AUTH MODULE - CENTRAL EXPORTS
 * ===============================================
 * Single import point for all authentication functionality.
 * 
 * Usage:
 * import { useAuthStore, authService, ProtectedRoute, tokenManager } from "@/src/auth";
 */

// ===============================================
// API CLIENT & TOKEN MANAGEMENT
// ===============================================
export { tokenManager, apiClient } from "./lib/api";
export type { ApiResponse, PaginatedResponse, ApiError } from "./lib/api";

// ===============================================
// AUTH SERVICE
// ===============================================
export { authService, roleHelpers } from "./services/auth.service";
export type { 
  User, 
  UserRole, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse,
  ProfileUpdateData,
  PasswordChangeData,
} from "./services/auth.service";

// ===============================================
// AUTH STORE (Zustand)
// ===============================================
export { 
  useAuthStore, 
  useUser, 
  useRole,
  useIsAuthenticated,
  useIsLoading,
  useAuthError,
  useHasRole,
  useIsAdmin,
  useIsTeacher,
  useIsStudent,
  useIsGuest,
  useDashboardPath,
  getAuthState,
  getCurrentUser,
  getCurrentRole,
} from "./store/auth.store";
export type { AuthState, AuthStatus } from "./store/auth.store";

// ===============================================
// COMPONENTS
// ===============================================
export { ProtectedRoute, GuestRoute } from "./components";

// ===============================================
// PROVIDERS
// ===============================================
export { AuthProvider } from "./providers/AuthProvider";
