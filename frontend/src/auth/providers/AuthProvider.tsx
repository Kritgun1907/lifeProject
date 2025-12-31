/**
 * ===============================================
 * AUTH PROVIDER
 * ===============================================
 * Wraps the app to initialize authentication state.
 * 
 * Responsibilities:
 * - Initialize auth store on app mount
 * - Show loading state while checking auth
 * - Provides auth context to entire app
 */

"use client";

import { useEffect, ReactNode } from "react";
import { useAuthStore } from "../store/auth.store";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, status } = useAuthStore();

  useEffect(() => {
    // Initialize auth state on mount
    initialize();
  }, [initialize]);

  // Show loading state while initializing
  if (!isInitialized || status === "idle") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default AuthProvider;
