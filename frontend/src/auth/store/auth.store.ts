/**
 * ===============================================
 * AUTH STORE (Zustand)
 * ===============================================
 * Frontend "session memory" for authentication.
 * 
 * Purpose:
 * - Know who is logged in
 * - Know what role they have
 * - Know if they're authenticated
 * 
 * Important:
 * - Backend enforces permissions
 * - Frontend only handles experience & routing
 * - Role drives routing only, NO permission checks in frontend
 * 
 * This mirrors your backend RBAC cleanly.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authService, User, UserRole, LoginCredentials, RegisterData, roleHelpers } from "../services/auth.service";

// ===============================================
// TYPES
// ===============================================

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthState {
  // State
  user: User | null;
  status: AuthStatus;
  error: string | null;
  isInitialized: boolean;

  // Computed (via getters in actions)
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: (everywhere?: boolean) => Promise<void>;
  initialize: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User) => void;
}

// ===============================================
// AUTH STORE
// ===============================================

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // ===============================================
      // INITIAL STATE
      // ===============================================
      user: null,
      status: "idle",
      error: null,
      isInitialized: false,

      // Computed values as getters
      get isAuthenticated() {
        return get().status === "authenticated" && get().user !== null;
      },
      get isLoading() {
        return get().status === "loading";
      },
      get role() {
        return get().user?.role || null;
      },

      // ===============================================
      // ACTIONS
      // ===============================================

      /**
       * Login user with credentials
       * Updates store on success, sets error on failure
       */
      login: async (credentials: LoginCredentials) => {
        set({ status: "loading", error: null });

        try {
          const response = await authService.login(credentials);
          
          set({
            user: response.user,
            status: "authenticated",
            error: null,
            isInitialized: true,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || "Login failed";
          
          set({
            user: null,
            status: "unauthenticated",
            error: message,
            isInitialized: true,
          });
          
          throw new Error(message);
        }
      },

      /**
       * Register new user
       * Updates store on success, sets error on failure
       */
      register: async (data: RegisterData) => {
        set({ status: "loading", error: null });

        try {
          const response = await authService.register(data);
          
          set({
            user: response.user,
            status: "authenticated",
            error: null,
            isInitialized: true,
          });
        } catch (error: any) {
          const message = error.response?.data?.message || error.message || "Registration failed";
          
          set({
            user: null,
            status: "unauthenticated",
            error: message,
            isInitialized: true,
          });
          
          throw new Error(message);
        }
      },

      /**
       * Logout user
       * Clears store and calls backend
       */
      logout: async (everywhere: boolean = false) => {
        set({ status: "loading" });

        try {
          await authService.logout(everywhere);
        } finally {
          set({
            user: null,
            status: "unauthenticated",
            error: null,
            isInitialized: true,
          });
        }
      },

      /**
       * Initialize auth state on app load
       * Checks if user has valid token and fetches user data
       * Called once on app startup
       */
      initialize: async () => {
        // Already initialized? Skip
        if (get().isInitialized && get().status !== "idle") {
          return;
        }

        // No token? User is unauthenticated
        if (!authService.hasToken()) {
          set({
            user: null,
            status: "unauthenticated",
            isInitialized: true,
          });
          return;
        }

        // Has token, try to fetch user
        set({ status: "loading" });

        try {
          const user = await authService.getMe();
          
          set({
            user,
            status: "authenticated",
            error: null,
            isInitialized: true,
          });
        } catch (error: any) {
          // Token invalid or expired, user needs to login again
          console.warn("Token validation failed:", error.message);
          
          set({
            user: null,
            status: "unauthenticated",
            error: null,
            isInitialized: true,
          });
        }
      },

      /**
       * Refresh user data from server
       * Use after profile updates
       */
      refreshUser: async () => {
        if (!authService.hasToken()) {
          return;
        }

        try {
          const user = await authService.getMe();
          set({ user });
        } catch (error) {
          console.warn("Failed to refresh user:", error);
        }
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Manually set user (used for optimistic updates)
       */
      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not status
      partialize: (state) => ({
        user: state.user,
        isInitialized: state.isInitialized,
      }),
    }
  )
);

// ===============================================
// SELECTOR HOOKS (for cleaner component usage)
// ===============================================

/**
 * Get current user
 */
export const useUser = () => useAuthStore((state) => state.user);

/**
 * Get current user's role
 */
export const useRole = () => useAuthStore((state) => state.user?.role || null);

/**
 * Check if user is authenticated
 */
export const useIsAuthenticated = () =>
  useAuthStore((state) => state.status === "authenticated" && state.user !== null);

/**
 * Check if auth is loading
 */
export const useIsLoading = () => useAuthStore((state) => state.status === "loading");

/**
 * Get auth error
 */
export const useAuthError = () => useAuthStore((state) => state.error);

/**
 * Check if user has specific role
 */
export const useHasRole = (role: UserRole) =>
  useAuthStore((state) => state.user?.role === role);

/**
 * Check if user is admin
 */
export const useIsAdmin = () => useAuthStore((state) => state.user?.role === "ADMIN");

/**
 * Check if user is teacher
 */
export const useIsTeacher = () => useAuthStore((state) => state.user?.role === "TEACHER");

/**
 * Check if user is student
 */
export const useIsStudent = () => useAuthStore((state) => state.user?.role === "STUDENT");

/**
 * Check if user is guest
 */
export const useIsGuest = () => useAuthStore((state) => state.user?.role === "GUEST");

/**
 * Get dashboard path for current user
 */
export const useDashboardPath = () =>
  useAuthStore((state) => 
    state.user?.role ? roleHelpers.getDashboardPath(state.user.role) : "/"
  );

// ===============================================
// NON-HOOK HELPERS (for use outside components)
// ===============================================

/**
 * Get auth store state directly (for use in non-React code)
 */
export const getAuthState = () => useAuthStore.getState();

/**
 * Check if user is authenticated (non-hook)
 */
export const isAuthenticated = () => {
  const state = getAuthState();
  return state.status === "authenticated" && state.user !== null;
};

/**
 * Get current user (non-hook)
 */
export const getCurrentUser = () => getAuthState().user;

/**
 * Get current role (non-hook)
 */
export const getCurrentRole = () => getAuthState().user?.role || null;

export default useAuthStore;
